import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { rateLimit, getClientIp } from '@/lib/rateLimit'
import { calculateBMR, calculateTDEE, adjustCaloriesForGoal } from '@nutrigoal/shared'

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extremely_active: 1.9,
}

function formatActivityLabel(activityLevel: string) {
  const labels: Record<string, string> = {
    sedentary: 'Sedentary',
    lightly_active: 'Lightly active',
    moderately_active: 'Moderately active',
    very_active: 'Very active',
    extremely_active: 'Extremely active',
  }
  return labels[activityLevel] ?? activityLevel
}

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
      goalTimeline = 'steady',
      favouriteFoods = [],
      foodDislikes = [],
      dietaryRestrictions = [],
      cookingSkill = 'intermediate',
      mealPrepPreference = 'daily',
      motivation = [],
      desiredOutcome = '',
      pastDietingChallenges = '',
      weeklyDerailers = '',
      planPreference = 'balanced',
      harderDays = 'weekends',
      eatingOutFrequency = 'sometimes',
    } = body

    // Build snack list for swaps
    const snackList = Array.isArray(currentSnacks) && currentSnacks.length > 0
      ? currentSnacks.join(', ')
      : 'crisps, chocolate, biscuits'
    const favouriteFoodList = Array.isArray(favouriteFoods) && favouriteFoods.length > 0
      ? favouriteFoods.join(', ')
      : 'not specified'
    const foodDislikeList = Array.isArray(foodDislikes) && foodDislikes.length > 0
      ? foodDislikes.join(', ')
      : 'not specified'
    const restrictionList = Array.isArray(dietaryRestrictions) && dietaryRestrictions.length > 0
      ? dietaryRestrictions.join(', ')
      : 'none'

    const safeAge = Number(age) || 30
    const safeHeight = Number(height_cm) || 175
    const safeWeight = Number(weight_kg) || 70
    const safeGender = gender === 'female' ? 'female' : 'male'
    const safeActivity = typeof activityLevel === 'string' ? activityLevel : 'moderately_active'
    const bmr = calculateBMR(safeAge, safeHeight, safeWeight, safeGender)
    const tdee = calculateTDEE(bmr, safeActivity as 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extremely_active')
    const recommendedCalories = adjustCaloriesForGoal(tdee, goal)
    const activityMultiplier = ACTIVITY_MULTIPLIERS[safeActivity] ?? 1.55
    const calorieWarning = `Generic online calorie calculators are often inaccurate, especially for people with active jobs or higher daily movement. They regularly underestimate maintenance for anyone whose life is not built around sitting still.`
    const calorieCalculation = [
      `We started with the Mifflin-St Jeor formula to estimate your BMR.`,
      `${safeGender === 'male' ? 'Male' : 'Female'} equation: (10 x ${safeWeight}) + (6.25 x ${safeHeight}) - (5 x ${safeAge}) ${safeGender === 'male' ? '+ 5' : '- 161'} = ${Math.round(bmr)} kcal/day.`,
      `We then applied an activity multiplier of ${activityMultiplier} based on your combined job and training load (${formatActivityLabel(safeActivity)}).`,
      `${Math.round(bmr)} x ${activityMultiplier} = estimated maintenance of ${Math.round(tdee)} kcal/day.`,
      goal === 'cutting'
        ? `For sustainable fat loss, we set calories at roughly 500 kcal below maintenance: ${Math.round(tdee)} - 500 = ${recommendedCalories} kcal/day.`
        : goal === 'bulking'
        ? `For muscle gain, we set calories slightly above maintenance: ${Math.round(tdee)} + 300 = ${recommendedCalories} kcal/day.`
        : `For maintenance, we kept calories close to your estimated TDEE: ${recommendedCalories} kcal/day.`,
      `The most accurate way to confirm your true maintenance is still real-world tracking: keep intake steady for 2 weeks, monitor bodyweight, and adjust based on what your body actually does.`,
    ].join('\n\n')

    const systemPrompt = `You are an expert nutritionist with 30 years of experience. Your tone is encouraging, knowledgeable, and straight-talking — like a brilliant friend who happens to have a nutrition degree and a genuine passion for helping people feel their best.

CLIENT PROFILE:
- Age: ${age}, Gender: ${gender}, Height: ${height_cm}cm, Weight: ${weight_kg}kg
- Goal: ${goal}${targetWeight ? ` (target: ${targetWeight}kg)` : ''}
- Activity: ${activityLevel}, Job: ${workType}, Exercise: ${workoutDaysPerWeek}x/week
- Sleep: ${sleepHours}h/night (${sleepQuality}), Stress: ${stressLevel}
- Alcohol: ${alcoholFrequency}${alcoholDetails ? ` (${alcoholDetails})` : ''}
- Daily targets: ${calories} kcal, ${protein}g protein, ${carbs}g carbs, ${fat}g fat
- Daily water target: ${dailyWaterMl}ml (${(dailyWaterMl / 1000).toFixed(1)}L)
- Goal timeline: ${goalTimeline}
- Favourite foods: ${favouriteFoodList}
- Foods they hate: ${foodDislikeList}
- Dietary restrictions: ${restrictionList}
- Cooking skill: ${cookingSkill}
- Meal prep style: ${mealPrepPreference}
- Motivation: ${Array.isArray(motivation) && motivation.length > 0 ? motivation.join(', ') : 'not specified'}
- Desired outcome: ${desiredOutcome || 'not specified'}
- Past dieting challenges: ${pastDietingChallenges || 'not specified'}
- Weekly derailers: ${weeklyDerailers || 'not specified'}
- Plan style preference: ${planPreference}
- Harder days: ${harderDays}
- Eating out frequency: ${eatingOutFrequency}
- Current snacks: ${snackList}
- Snack motivation: ${snackMotivation}, Preference: ${snackPreference}
- Late night snacking: ${lateNightSnacking ? 'yes' : 'no'}

Return ONLY valid JSON matching this exact format:
{
  "nutritionist_summary": "2-3 paragraphs that make this feel like a premium nutritionist consultation. Explain the overall strategy in a warm, motivating, expert way.",
  "macro_explanation": "Explain why protein, carbs and fats are set at these exact levels for this person in plain English. Make it personalised and premium, not generic.",
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
  "supplement_recommendations": [
    {
      "name": "Creatine monohydrate",
      "dose": "3-5g daily",
      "timing": "Any consistent time each day",
      "why": "Why it matters specifically to this person",
      "budget_option": "Look for a plain, unflavoured creatine monohydrate powder with no proprietary blend"
    }
  ],
  "supplement_note": "A brief paragraph reminding them that supplements are the 1% — food, training, sleep and consistency are the 99%. Never let them think supplements will do the work for them."
}`

    const userPrompt = `Based on my profile, generate:

0. NUTRITIONIST SUMMARY — Make this feel like a premium nutritionist has actually reviewed my case. Explain the big picture strategy in a warm, motivating way.

0.5. MACRO EXPLANATION — Explain why my protein, carbs and fats are set where they are, in plain English, specifically for my goal, lifestyle and recovery.

1. PERSONAL FAT LOSS RULES — 5 rules specific to ME based on everything you know about my lifestyle. Not generic advice. If I said past plans were too rigid, reflect that. If weekends derail me, address that directly. If I snack out of boredom, address that directly.

2. REALISTIC TIMELINE — Tell me honestly and encouragingly what I can expect following a ${calories} kcal plan. Give rough projections. Be real — no false promises, but keep me motivated.

3. HYDRATION TIPS — 4 practical tips to hit my ${(dailyWaterMl / 1000).toFixed(1)}L daily target, specific to my ${workType} job and lifestyle.

4. HYDRATION EXPLANATION — Why staying properly hydrated affects fat loss, hunger, metabolism, gym performance and energy.

5. SNACK SWAPS — For each of my current snacks (${snackList}), suggest a healthier alternative that scratches the same itch — sweet for sweet, crunchy for crunchy. Include calorie counts. Make them exciting, not boring. At least 5 swaps. If I eat out often or have harder weekends, make some options portable or realistic for that.

6. SUPPLEMENT RECOMMENDATIONS — Recommend only supplements that are genuinely evidence-backed and relevant for THIS person. Prioritise whey protein only if useful, creatine monohydrate, caffeine if strategically relevant, vitamin D when appropriate, omega-3, and magnesium if sleep/recovery suggests it. For each supplement include dose, best timing, why it matters to this person, and a budget-friendly product type suggestion. Do not overprescribe.

7. SUPPLEMENT DISCLAIMER — Brief reminder that supplements are the 1%, consistency is the 99%.

Return JSON only.`

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
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 3000,
        temperature: 0.6,
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

    return NextResponse.json({
      ...parsed,
      calorie_warning: calorieWarning,
      calorie_calculation: calorieCalculation,
      hydration_target_litres: (dailyWaterMl / 1000).toFixed(1),
    })
  } catch (err) {
    Sentry.captureException(err, { tags: { kind: 'api-route', route: 'ai/meal-plan-companion' } })
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ message }, { status: 500 })
  }
}
