import { NextResponse } from 'next/server'
import { rateLimit, getClientIp } from '@/lib/rateLimit'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const { success } = rateLimit(`ai-training:${ip}`, { limit: 5, windowMs: 60_000 })
  if (!success) {
    return NextResponse.json({ message: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  // Auth + tier check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'free') {
    const { count } = await supabase
      .from('ai_usage')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('type', 'workout_suggestion')
    if ((count ?? 0) > 0) {
      return NextResponse.json({ message: 'Upgrade to Pro to regenerate AI training plans.' }, { status: 403 })
    }
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ message: 'AI service not configured' }, { status: 503 })
  }

  try {
    const body = await request.json()
    const {
      goal = 'maintenance',
      daysPerWeek = 4,
      gender = 'male',
      age = 30,
      weight_kg = 70,
      height_cm = 175,
      activityLevel = 'moderately_active',
      workoutTime = '08:00',
      // Anamnesis data
      trainingExperience = 'beginner',
      equipmentAccess = 'full_gym',
      trainingStyles = ['hypertrophy'],
      injuries = [],
      medicalConditions = [],
      stressLevel = 'moderate',
      sleepQuality = 'average',
      sleepHours = 7,
      // New training fields
      secondaryTrainingGoal = 'none',
      maxSessionMinutes = 60,
      squat1rm = null,
      bench1rm = null,
      deadlift1rm = null,
      ohp1rm = null,
    } = body

    // Map equipment access to available equipment
    const equipmentMap: Record<string, string[]> = {
      full_gym: ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight'],
      home_full: ['barbell', 'dumbbell', 'bodyweight', 'band'],
      home_basic: ['dumbbell', 'bodyweight', 'band'],
      bodyweight_only: ['bodyweight'],
      outdoor: ['bodyweight', 'band'],
    }
    const equipment = equipmentMap[equipmentAccess] ?? ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight']

    // Map experience to volume/intensity guidance
    const experienceGuide: Record<string, string> = {
      never: 'ABSOLUTE BEGINNER — first time in a gym. Use only basic movement patterns, focus on motor learning and form. 2-3 sets × 12-15 reps, conservative loads. Full body or simple upper/lower only. Include form cues in notes for every exercise.',
      beginner: 'BEGINNER (< 1 year training). Foundational compound movements with simple progression. 3 sets × 10-12 reps. Linear progressive overload. Keep splits simple — full body or upper/lower.',
      intermediate: 'INTERMEDIATE (1-3 years). Can handle moderate volume and intensity. 3-4 sets × 8-12 reps. Include both compounds and targeted isolation. Standard splits. Introduce periodisation concepts.',
      advanced: 'ADVANCED (3+ years). Higher volume and intensity tolerance. 4-5 sets, varied rep ranges (3-5 for strength, 8-12 hypertrophy, 15-20 metabolic). Advanced techniques welcome (supersets, drop sets, pause reps, tempo work). Undulating periodisation.',
    }

    // Build injury avoidance section
    const injurySection = injuries.length > 0
      ? `\nINJURY RESTRICTIONS (NON-NEGOTIABLE — PATIENT SAFETY):\n${injuries.map((inj: string) => {
          const avoidMap: Record<string, string> = {
            'Lower back pain': 'AVOID: Conventional deadlifts, heavy barbell squats, good mornings, hyperextensions. SUBSTITUTE: Leg press, belt squat, trap bar deadlift (if pain-free), McGill Big 3 for core stability.',
            'Shoulder impingement': 'AVOID: Overhead press, upright rows, behind-neck movements, wide-grip bench. SUBSTITUTE: Landmine press, neutral-grip pressing, lateral raises below 90°, face pulls, band pull-aparts.',
            'Knee pain': 'AVOID: Deep squats, heavy leg extensions, plyometrics, lunges with forward knee travel. SUBSTITUTE: Leg press (partial ROM), hip-dominant movements (RDL, hip thrust), box squats to parallel.',
            'Tennis/golfer elbow': 'AVOID: Heavy curls with straight bar, wrist-heavy grips, high-volume arm work. SUBSTITUTE: Neutral grip, fat grips, hammer curls, reduce total arm isolation volume.',
            'Wrist issues': 'AVOID: Heavy barbell pressing, front squats, heavy wrist curls. SUBSTITUTE: Dumbbells, neutral grips, push-up variations on knuckles/handles.',
            'Hip pain': 'AVOID: Deep squats, wide-stance sumo movements, heavy hip adduction. SUBSTITUTE: Hip-friendly machines, limited ROM movements, glute bridges.',
            'Ankle instability': 'AVOID: Heavy calf raises, box jumps, plyometrics. SUBSTITUTE: Seated calf raises, ankle stability drills, elevated heel squats.',
            'Neck pain': 'AVOID: Shrugs, behind-neck movements, overhead press, heavy trap work. SUBSTITUTE: Neutral spine exercises, avoid loaded cervical flexion, face pulls.',
            'Herniated disc': 'AVOID: ALL axial spinal loading (back squats, deadlifts, overhead press, barbell rows). SUBSTITUTE: Machines, chest-supported rows, leg press, core stability (dead bugs, bird dogs).',
          }
          return `- ${inj}: ${avoidMap[inj] || `Avoid all exercises that load or stress this area. Substitute with pain-free alternatives that train the same muscle groups.`}`
        }).join('\n')}`
      : ''

    // Build recovery considerations
    const recoveryNotes: string[] = []
    if (stressLevel === 'high') recoveryNotes.push('HIGH LIFE STRESS — reduce total weekly volume by ~20%. Avoid training to failure on most sets. Include deload-friendly exercise choices. Prioritise compound efficiency over volume.')
    if (sleepQuality === 'poor' || (sleepHours && parseFloat(sleepHours) < 6)) recoveryNotes.push(`POOR RECOVERY (sleep: ${sleepHours}h, quality: ${sleepQuality}) — lower intensity ceiling, avoid grinding sets. Add extra rest between compounds (3+ min). Keep sessions shorter and more focused.`)
    if (medicalConditions.includes('Heart condition')) recoveryNotes.push('HEART CONDITION — avoid very heavy lifts and Valsalva-dependent movements. Keep intensity moderate (RPE 6-7 max). Include proper 5-min warm-up and cool-down. Monitor perceived exertion.')
    if (medicalConditions.includes('Asthma')) recoveryNotes.push('ASTHMA — include longer progressive warm-up (8-10 min). Avoid rapid breathing transitions. Build in extra rest if needed between high-demand sets.')
    if (age >= 50) recoveryNotes.push(`AGE CONSIDERATION (${age}) — prioritise joint-friendly exercise variations. Include mobility work. Favour machines and cables for isolation. Longer warm-ups.`)

    // Training style guidance
    const styleGuide = trainingStyles.map((style: string) => {
      const guides: Record<string, string> = {
        strength: 'Strength-focused: heavy compounds at 75-90% 1RM (3-6 reps), longer rest (3-5 min), lower total volume, focus on neural adaptations and maximal force production.',
        hypertrophy: 'Hypertrophy-focused: moderate loads at 65-80% 1RM (8-12 reps), controlled tempo (2-0-2), 60-90s rest, higher volume per muscle group, mind-muscle connection cues.',
        functional: 'Functional training: movement-based exercises, core stability integration, unilateral work for balance, mobility drills between sets.',
        endurance: 'Muscular endurance: higher reps (15-20), shorter rest (30-60s), circuit-style programming optional, emphasise work capacity.',
        mixed: 'Hybrid approach: blend strength (heavy compounds early) and hypertrophy (moderate isolation later) across the week. Periodise within sessions.',
      }
      return guides[style] || ''
    }).filter(Boolean).join(' ')

    const splitGuide = daysPerWeek <= 3
      ? 'Full body or upper/lower split'
      : daysPerWeek <= 5
      ? 'Push/Pull/Legs, Upper/Lower, or Push/Pull/Legs/Upper/Lower'
      : 'PPL x2 or body part split'

    // Build 1RM context
    const strengthContext: string[] = []
    if (squat1rm) strengthContext.push(`Squat 1RM: ${squat1rm}kg`)
    if (bench1rm) strengthContext.push(`Bench Press 1RM: ${bench1rm}kg`)
    if (deadlift1rm) strengthContext.push(`Deadlift 1RM: ${deadlift1rm}kg`)
    if (ohp1rm) strengthContext.push(`Overhead Press 1RM: ${ohp1rm}kg`)

    // Secondary goal context
    const secondaryGoalMap: Record<string, string> = {
      mobility: 'Include 1-2 mobility/flexibility exercises per session (hip openers, thoracic rotations, shoulder dislocates). Add mobility notes to warm-up.',
      conditioning: 'Include a conditioning finisher (2-3 min) on at least 2 training days — battle ropes, sled work, rowing intervals, or similar.',
      sport_performance: 'Include explosive and power-based movements where appropriate — box jumps, medicine ball throws, plyometric push-ups.',
      injury_rehab: 'Include prehab/rehab exercises targeting the injured areas — band work, isometric holds, controlled ROM exercises. 2-3 per session.',
      posture: 'Prioritise posterior chain and anti-flexion work — face pulls, band pull-aparts, dead bugs, rows. 2:1 pull-to-push ratio.',
      none: '',
    }

    const systemPrompt = `You are an elite strength & conditioning coach with 20+ years of experience coaching everyone from first-time gym-goers to competitive athletes. You're known for programmes that are smart, effective, and actually enjoyable to follow.

YOUR COACHING PHILOSOPHY:
- You believe the best programme is one people actually stick to. No ego lifts, no junk volume.
- You follow evidence-based training principles (NSCA, ACSM) but explain them in plain language.
- Safety is non-negotiable — you NEVER prescribe exercises that aggravate injuries or conflict with medical conditions.
- You design for the person in front of you, not a template. Beginners get foundational patterns with form cues. Advanced lifters get periodised, challenging programmes.
- Progressive overload is the backbone of every programme — you build it in systematically.
- You love well-structured sessions: purposeful warm-ups, smart exercise order, balanced push/pull ratios.

EXPERIENCE LEVEL:
${experienceGuide[trainingExperience] || experienceGuide.beginner}

TRAINING STYLE: ${styleGuide}
${secondaryGoalMap[secondaryTrainingGoal] ? `\nSECONDARY GOAL:\n${secondaryGoalMap[secondaryTrainingGoal]}` : ''}

ATHLETE PROFILE:
- Goal: ${goal} (${goal === 'bulking' ? 'muscle gain — progressive overload, caloric surplus, prioritise compound volume' : goal === 'cutting' ? 'fat loss while preserving muscle — maintain intensity, moderate volume, avoid excessive fatigue' : 'maintenance — balanced volume and intensity'})
- Gender: ${gender}, Age: ${age}, Height: ${height_cm}cm, Weight: ${weight_kg}kg
- Activity level: ${activityLevel}
- Available equipment: ${equipment.join(', ')}
- Preferred workout time: ${workoutTime}
- Days per week: ${daysPerWeek}
- Max session duration: ${maxSessionMinutes} minutes (plan exercises to fit within this window including warm-up and rest)
- Recommended split: ${splitGuide}
${strengthContext.length > 0 ? `\nSTRENGTH BENCHMARKS:\n${strengthContext.join('\n')}\nUse these to set appropriate working weights in notes (e.g. "~70% 1RM" or "Start at ${squat1rm ? Math.round(Number(squat1rm) * 0.7) : 60}kg").` : '\nNo 1RM data provided — use conservative weight suggestions based on experience level and bodyweight.'}
${injurySection}
${recoveryNotes.length > 0 ? '\nRECOVERY CONSIDERATIONS:\n' + recoveryNotes.map(n => '- ' + n).join('\n') : ''}

Return ONLY valid JSON. No markdown, no explanation, no commentary.

Format:
{
  "name": "Plan name (e.g. 4-Day Upper/Lower Hypertrophy Split)",
  "description": "Brief but motivating programme description — what it does and why it works for this person",
  "days": [
    {
      "day_number": 1,
      "name": "Day name (e.g. Upper Body A — Horizontal Push/Pull)",
      "exercises": [
        {
          "name": "Specific exercise name (e.g. Barbell Bench Press)",
          "body_part": "chest|back|shoulders|biceps|triceps|legs|core|full_body",
          "equipment": "barbell|dumbbell|machine|cable|bodyweight|band",
          "sets": 3,
          "reps": "8-12",
          "rest_seconds": 90,
          "notes": "Tempo/coaching cue/weight suggestion (e.g. '2-0-2 tempo, ~70% 1RM, squeeze at top')"
        }
      ]
    }
  ]
}

PROGRAMMING RULES:
- Return exactly ${daysPerWeek} training days
- 5-8 exercises per day (must fit within ${maxSessionMinutes} minutes including rest)
- Use ONLY equipment from: ${equipment.join(', ')}
- body_part must be one of: chest, back, shoulders, biceps, triceps, legs, core, full_body
- equipment must be one of: ${equipment.join(', ')}
- Compound movements first, isolation after — always
- First exercise of each day gets a warm-up note (e.g. "2 warm-up sets of 10 at 50%, then working sets")
- Balance push/pull across the week (aim for 1:1 ratio)
- Each major muscle group trained minimum 2×/week (minimum 10 sets/week for key muscle groups)
- NEVER include exercises that conflict with listed injuries — there are NO exceptions
- The ${daysPerWeek} days MUST include any conditioning work — do NOT exceed ${daysPerWeek} total training days
- Use specific exercise names (e.g. "Incline Dumbbell Press" not "Incline Press")
- Include tempo or coaching cues in notes for key exercises
- Vary rep ranges within sessions when appropriate (heavy compounds → moderate accessories → lighter isolation)
- Rest periods should match the training goal (strength: 3-5 min, hypertrophy: 60-90s, endurance: 30-60s)`

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
          { role: 'user', content: `Design a ${daysPerWeek}-day ${trainingStyles.join('/')} training programme for ${goal}. ${maxSessionMinutes <= 45 ? 'Sessions must be efficient — keep them under ' + maxSessionMinutes + ' minutes.' : ''} Return JSON only.` },
        ],
        max_tokens: 4000,
        temperature: 0.5,
      }),
    })

    if (!openaiResponse.ok) {
      return NextResponse.json({ message: 'AI service error' }, { status: 502 })
    }

    const aiData = await openaiResponse.json()
    const content = aiData.choices?.[0]?.message?.content?.trim() ?? '{}'

    let parsed
    try {
      const jsonStr = content.replace(/^```json?\n?/, '').replace(/\n?```$/, '')
      parsed = JSON.parse(jsonStr)
    } catch {
      return NextResponse.json({ message: 'Failed to parse AI response' }, { status: 502 })
    }

    // Resolve exercise IDs server-side (bypass RLS with service role)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(parsed) // fallback: return without IDs
    }

    const adminSupabase = createAdminClient()

    // Load existing exercises
    const { data: dbExercises } = await adminSupabase.from('exercises').select('id, name')
    const exerciseMap = new Map((dbExercises ?? []).map((e: { id: string; name: string }) => [e.name.toLowerCase(), e.id]))

    const validBodyParts = new Set(['chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'core', 'full_body'])
    const validEquipment = new Set(['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'band'])

    for (const day of (parsed.days ?? [])) {
      for (const ex of (day.exercises ?? [])) {
        const key = ex.name.toLowerCase()
        if (exerciseMap.has(key)) {
          ex.exercise_id = exerciseMap.get(key)
        } else {
          // Create the exercise
          const bodyPart = validBodyParts.has(ex.body_part) ? ex.body_part : 'full_body'
          const equip = validEquipment.has(ex.equipment) ? ex.equipment : 'bodyweight'
          const { data: newEx } = await adminSupabase
            .from('exercises')
            .insert({
              name: ex.name,
              body_part: bodyPart,
              equipment: equip,
              is_compound: ['chest', 'back', 'legs', 'full_body'].includes(bodyPart) && (day.exercises.indexOf(ex) < 3),
            })
            .select('id')
            .single()

          if (newEx) {
            ex.exercise_id = newEx.id
            exerciseMap.set(key, newEx.id)
          }
        }
      }
    }

    return NextResponse.json(parsed)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ message }, { status: 500 })
  }
}
