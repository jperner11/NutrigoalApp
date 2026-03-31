import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { rateLimit, getClientIp } from '@/lib/rateLimit'

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const { success } = rateLimit(`ai-checkin:${ip}`, { limit: 3, windowMs: 60_000 })
  if (!success) {
    return NextResponse.json({ message: 'Too many requests.' }, { status: 429 })
  }

  const apiKey = process.env.OPENAI_API_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!apiKey || !supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ message: 'Service not configured' }, { status: 503 })
  }

  try {
    const { userId } = await request.json()
    if (!userId) {
      return NextResponse.json({ message: 'Missing userId' }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    // Get active training plan
    const { data: activePlan } = await supabase
      .from('training_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()

    // Determine period: since last check-in or 14 days
    const { data: lastCheckIn } = await supabase
      .from('training_check_ins')
      .select('check_in_date')
      .eq('user_id', userId)
      .order('check_in_date', { ascending: false })
      .limit(1)
      .single()

    const now = new Date()
    const periodEnd = now.toISOString().split('T')[0]
    let periodStart: string

    if (lastCheckIn) {
      const lastDate = new Date(lastCheckIn.check_in_date)
      lastDate.setDate(lastDate.getDate() + 1)
      periodStart = lastDate.toISOString().split('T')[0]
    } else {
      const twoWeeksAgo = new Date(now)
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
      periodStart = twoWeeksAgo.toISOString().split('T')[0]
    }

    // Fetch workout logs for the period
    const { data: workoutLogs } = await supabase
      .from('workout_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('date', periodStart)
      .lte('date', periodEnd)
      .order('date', { ascending: true })

    const logs = workoutLogs ?? []
    const workoutsLogged = logs.length
    const workoutsPlanned = (activePlan?.days_per_week ?? 4) * 2

    // Aggregate per-exercise progress
    interface SetData { weight_kg: number; reps: number }
    const exerciseMap = new Map<string, { exercise_id: string; sessions: Map<string, SetData[]> }>()

    for (const log of logs) {
      const exercises = (log.exercises as { exercise_id: string; exercise_name: string; sets: { weight_kg: number; reps: number; completed: boolean }[] }[]) ?? []
      for (const ex of exercises) {
        const key = ex.exercise_name
        if (!exerciseMap.has(key)) {
          exerciseMap.set(key, { exercise_id: ex.exercise_id, sessions: new Map() })
        }
        const entry = exerciseMap.get(key)!
        if (!entry.sessions.has(log.date)) {
          entry.sessions.set(log.date, [])
        }
        for (const set of ex.sets) {
          if (set.completed !== false) {
            entry.sessions.get(log.date)!.push({ weight_kg: set.weight_kg, reps: set.reps })
          }
        }
      }
    }

    const exerciseProgress = Array.from(exerciseMap.entries()).map(([name, data]) => {
      const sortedDates = Array.from(data.sessions.keys()).sort()
      const allSets = Array.from(data.sessions.values()).flat()

      const firstSessionSets = data.sessions.get(sortedDates[0]) ?? []
      const lastSessionSets = data.sessions.get(sortedDates[sortedDates.length - 1]) ?? []

      const firstWeight = firstSessionSets.length > 0 ? Math.max(...firstSessionSets.map(s => s.weight_kg)) : 0
      const lastWeight = lastSessionSets.length > 0 ? Math.max(...lastSessionSets.map(s => s.weight_kg)) : 0
      const bestWeight = allSets.length > 0 ? Math.max(...allSets.map(s => s.weight_kg)) : 0
      const weightChange = lastWeight - firstWeight
      const avgReps = allSets.length > 0 ? Math.round((allSets.reduce((s, v) => s + v.reps, 0) / allSets.length) * 10) / 10 : 0

      let trend: 'improving' | 'stalled' | 'declining' = 'stalled'
      if (weightChange > 0) trend = 'improving'
      else if (weightChange < 0) trend = 'declining'

      return {
        exercise_name: name,
        exercise_id: data.exercise_id,
        first_weight: firstWeight,
        last_weight: lastWeight,
        weight_change: weightChange,
        best_weight: bestWeight,
        total_sets: allSets.length,
        avg_reps: avgReps,
        sessions_logged: sortedDates.length,
        trend,
      }
    })

    const days = Math.round((new Date(periodEnd).getTime() - new Date(periodStart).getTime()) / (1000 * 60 * 60 * 24))

    const progressTable = exerciseProgress.map(e =>
      `- ${e.exercise_name}: ${e.first_weight}kg → ${e.last_weight}kg (${e.weight_change >= 0 ? '+' : ''}${e.weight_change}kg) | ${e.sessions_logged} sessions, ${e.total_sets} sets, avg ${e.avg_reps} reps | Trend: ${e.trend}`
    ).join('\n')

    const systemPrompt = `You are an expert strength coach reviewing a client's real training data from the last ${days} days. You are thorough, data-driven, and encouraging. Celebrate wins and address problems directly.

CLIENT PROFILE:
- Age: ${profile.age ?? '?'}, Gender: ${profile.gender ?? '?'}, Weight: ${profile.weight_kg ?? '?'}kg
- Goal: ${profile.goal ?? 'maintenance'}
- Training experience: ${profile.training_experience ?? 'beginner'} (${profile.years_training ?? '?'} years)
- Planned workouts: ${workoutsPlanned} over 2 weeks (${activePlan?.days_per_week ?? 4}x/week)
- Actual workouts completed: ${workoutsLogged}

EXERCISE-BY-EXERCISE PROGRESS (real logged data):
${progressTable || 'No exercises logged in this period.'}

Return ONLY valid JSON:
{
  "overall_summary": "2-3 paragraphs assessing the period. Be specific — reference actual numbers from the data.",
  "exercise_insights": [
    { "exercise": "Exercise Name", "insight": "Specific observation", "action": "What to do next" }
  ],
  "recommendations": [
    "Actionable recommendation based on the data"
  ],
  "plan_adjustments": [
    "Specific change to make in the next training plan"
  ]
}`

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Review my training data and give me my progress report. Be specific — use my actual numbers.' },
        ],
        max_tokens: 3000,
        temperature: 0.7,
      }),
    })

    let aiAnalysis = null
    if (openaiResponse.ok) {
      const aiData = await openaiResponse.json()
      const content = aiData.choices?.[0]?.message?.content?.trim() ?? '{}'
      const tokensUsed = aiData.usage?.total_tokens ?? 0

      try {
        const jsonStr = content.replace(/^```json?\n?/, '').replace(/\n?```$/, '')
        aiAnalysis = JSON.parse(jsonStr)
      } catch {
        aiAnalysis = { overall_summary: content, exercise_insights: [], recommendations: [], plan_adjustments: [] }
      }

      await supabase.from('ai_usage').insert({
        user_id: userId,
        type: 'coaching',
        prompt: 'training-check-in',
        response: (aiAnalysis.overall_summary ?? '').substring(0, 500),
        tokens_used: tokensUsed,
      })
    }

    // Save check-in
    await supabase.from('training_check_ins').insert({
      user_id: userId,
      training_plan_id: activePlan?.id ?? null,
      check_in_date: periodEnd,
      period_start: periodStart,
      period_end: periodEnd,
      workouts_logged: workoutsLogged,
      workouts_planned: workoutsPlanned,
      exercise_progress: exerciseProgress,
      ai_summary: aiAnalysis?.overall_summary ?? null,
      ai_recommendations: JSON.stringify(aiAnalysis) ?? null,
    })

    return NextResponse.json({
      exerciseProgress,
      aiAnalysis,
      workoutsLogged,
      workoutsPlanned,
      periodStart,
      periodEnd,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ message }, { status: 500 })
  }
}
