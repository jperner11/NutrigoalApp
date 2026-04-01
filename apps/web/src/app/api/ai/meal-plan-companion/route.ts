import { NextResponse } from 'next/server'
import { rateLimit, getClientIp } from '@/lib/rateLimit'

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const { success } = rateLimit(`ai-companion:${ip}`, { limit: 3, windowMs: 60_000 })
  if (!success) {
    return NextResponse.json({ message: 'Too many requests.' }, { status: 429 })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ message: 'AI service not configured' }, { status: 503 })
  }

  try {
    const body = await request.json()
    const {
      calories, protein, carbs, fat,
      goal, gender, weight_kg, age, height_cm,
      activityLevel = 'moderately_active',
      workType = 'desk',
      workoutDaysPerWeek = 4,
      sleepHours = 7,
      sleepQuality = 'average',
      stressLevel = 'moderate',
      alcoholFrequency = 'none',
      alcoholDetails = '',
      currentSnacks = [],
      snackMotivation = 'hunger',
      snackPreference = 'both',
      lateNightSnacking = false,
      targetWeight = null,
      dailyWaterMl = 2500,
    } = body

    // Build snack list for swaps
    const snackList = Array.isArray(currentSnacks) && currentSnacks.length > 0
      ? currentSnacks.join(', ')
      : 'crisps, chocolate, biscuits'

    const systemPrompt = `You are an expert nutritionist with 30 years of experience. Your tone is encouraging, knowledgeable, and straight-talking — like a brilliant friend who happens to have a nutrition degree and a genuine passion for helping people feel their best.

CLIENT PROFILE:
- Age: ${age}, Gender: ${gender}, Height: ${height_cm}cm, Weight: ${weight_kg}kg
- Goal: ${goal}${targetWeight ? ` (target: ${targetWeight}kg)` : ''}
- Activity: ${activityLevel}, Job: ${workType}, Exercise: ${workoutDaysPerWeek}x/week
- Sleep: ${sleepHours}h/night (${sleepQuality}), Stress: ${stressLevel}
- Alcohol: ${alcoholFrequency}${alcoholDetails ? ` (${alcoholDetails})` : ''}
- Daily targets: ${calories} kcal, ${protein}g protein, ${carbs}g carbs, ${fat}g fat
- Daily water target: ${dailyWaterMl}ml (${(dailyWaterMl / 1000).toFixed(1)}L)
- Current snacks: ${snackList}
- Snack motivation: ${snackMotivation}, Preference: ${snackPreference}
- Late night snacking: ${lateNightSnacking ? 'yes' : 'no'}

Return ONLY valid JSON matching this exact format:
{
  "personal_rules": [
    "Rule 1 — specific to this person, not generic advice",
    "Rule 2",
    "Rule 3",
    "Rule 4",
    "Rule 5"
  ],
  "timeline": "A realistic, encouraging week-by-week or month-by-month projection of what they can expect. Be honest but motivating. 2-3 paragraphs.",
  "hydration_tips": [
    "Tip 1 — specific to their lifestyle/job",
    "Tip 2",
    "Tip 3",
    "Tip 4"
  ],
  "hydration_explanation": "Brief explanation of why hydration matters for fat loss — hunger, metabolism, gym performance, energy. 1-2 paragraphs. Make it feel important.",
  "snack_swaps": [
    { "current": "current snack name", "swap": "healthier alternative", "calories": 150, "why": "scratches the same itch because..." },
    { "current": "another snack", "swap": "better option", "calories": 120, "why": "..." }
  ],
  "supplement_note": "A brief paragraph reminding them that supplements are the 1% — food, training, sleep and consistency are the 99%. Never let them think supplements will do the work for them."
}`

    const userPrompt = `Based on my profile, generate:

1. PERSONAL FAT LOSS RULES — 5 rules specific to ME based on everything you know about my lifestyle. Not generic advice. For example, if I drink alcohol, one rule should specifically address managing that. If I snack out of boredom, address that directly.

2. REALISTIC TIMELINE — Tell me honestly and encouragingly what I can expect following a ${calories} kcal plan. Give rough projections. Be real — no false promises, but keep me motivated.

3. HYDRATION TIPS — 4 practical tips to hit my ${(dailyWaterMl / 1000).toFixed(1)}L daily target, specific to my ${workType} job and lifestyle.

4. HYDRATION EXPLANATION — Why staying properly hydrated affects fat loss, hunger, metabolism, gym performance and energy.

5. SNACK SWAPS — For each of my current snacks (${snackList}), suggest a healthier alternative that scratches the same itch — sweet for sweet, crunchy for crunchy. Include calorie counts. Make them exciting, not boring. At least 5 swaps.

6. SUPPLEMENT DISCLAIMER — Brief reminder that supplements are the 1%, consistency is the 99%.

Return JSON only.`

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 2000,
        temperature: 0.7,
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

    return NextResponse.json(parsed)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ message }, { status: 500 })
  }
}
