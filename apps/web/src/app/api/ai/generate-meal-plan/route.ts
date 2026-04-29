import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { rateLimit, getClientIp } from '@/lib/rateLimit'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const { success } = rateLimit(`ai-meal:${ip}`, { limit: 5, windowMs: 60_000 })
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
      .eq('type', 'meal_suggestion')
    if ((count ?? 0) > 0) {
      return NextResponse.json({ message: 'Upgrade to Pro to regenerate AI meal plans.' }, { status: 403 })
    }
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
      mealsPerDay = 3,
      wakeTime = '07:00',
      workoutTime = '08:00',
      workStartTime = '09:00',
      workEndTime = '17:00',
      sleepTime = '23:00',
      // Anamnesis data
      allergies = [],
      dietaryRestrictions = [],
      foodDislikes = [],
      favouriteFoods = [],
      cookingSkill = 'intermediate',
      mealPrepPreference = 'daily',
      medicalConditions = [],
      medications = [],
      stressLevel = 'moderate',
      sleepQuality = 'average',
      sleepHours = null,
      targetWeight = null,
      dayName = null,
      dayIndex = 0,
      // New fields from prompt
      workType = 'desk',
      alcoholFrequency = 'none',
      alcoholDetails = '',
      foodAdventurousness = 5,
      currentSnacks = [],
      snackMotivation = 'hunger',
      snackPreference = 'both',
      lateNightSnacking = false,
      harderDays = 'weekends',
      eatingOutFrequency = 'sometimes',
      planPreference = 'balanced',
      weeklyDerailers = '',
      desiredOutcome = '',
      pastDietingChallenges = '',
      workoutDaysPerWeek = 4,
      activityLevel = 'moderately_active',
      breakfastTime = '08:00',
      lunchTime = '12:30',
      dinnerTime = '19:00',
    } = body

    if (!calories || !protein) {
      return NextResponse.json({ message: 'Missing nutritional targets' }, { status: 400 })
    }

    const mealTimingGuide = buildMealTimingGuide(wakeTime, workoutTime, workStartTime, workEndTime, sleepTime, mealsPerDay)

    // Build dietary constraints section
    const constraints: string[] = []
    if (dietaryRestrictions.length > 0) constraints.push(`STRICT dietary restrictions: ${dietaryRestrictions.join(', ')}. NEVER include foods that violate these.`)
    if (allergies.length > 0) constraints.push(`ALLERGIES (DANGEROUS — MUST AVOID): ${allergies.join(', ')}. Never include these under any circumstances.`)
    if (foodDislikes.length > 0) constraints.push(`Foods this person HATES and would never eat: ${foodDislikes.join(', ')}. Do not include these.`)
    if (favouriteFoods.length > 0) constraints.push(`FAVOURITE meals/dishes/foods: ${favouriteFoods.join(', ')}. Use these as inspiration — build meals that feel like these or include these ingredients.`)
    if (desiredOutcome) constraints.push(`DESIRED OUTCOME: ${desiredOutcome}. Build the meals so they support this in a realistic, motivating way.`)
    if (pastDietingChallenges) constraints.push(`PAST PLAN CHALLENGES: ${pastDietingChallenges}. Avoid repeating these mistakes.`)
    if (weeklyDerailers) constraints.push(`COMMON DERAILERS: ${weeklyDerailers}. Build meals and notes that reduce these friction points.`)

    // Build health context
    const healthNotes: string[] = []
    if (medicalConditions.length > 0) healthNotes.push(`Medical conditions: ${medicalConditions.join(', ')}. Adjust meal choices accordingly (e.g., low glycemic for diabetes, low sodium for hypertension).`)
    if (medications.length > 0) healthNotes.push(`Current medications: ${medications.join(', ')}. Be mindful of food-drug interactions.`)
    if (stressLevel === 'high') healthNotes.push('HIGH stress — include magnesium-rich and anti-inflammatory foods where possible.')
    if (sleepQuality === 'poor' || (sleepHours && sleepHours < 6)) healthNotes.push('POOR sleep — include tryptophan-rich foods in evening meal, avoid caffeine after lunch.')

    // Build cooking context
    const cookingContext = {
      none: 'This person CANNOT cook. Use only no-cook meals (sandwiches, salads, smoothies, wraps, ready-to-eat items). Nothing that requires a stove or oven.',
      basic: 'BASIC cooking skills. Keep recipes dead simple: max 3-4 steps, common supermarket ingredients only.',
      intermediate: 'Comfortable in the kitchen. Standard recipes are fine.',
      advanced: 'Advanced cook who enjoys cooking. Feel free to suggest more complex, exciting recipes.',
    }[cookingSkill as string] ?? 'Comfortable in the kitchen. Standard recipes are fine.'

    const prepContext = {
      daily: 'Cooks fresh daily.',
      batch_prep: 'Prefers BATCH PREP (meal prep on weekends). Flag meals that are great for batch cooking. Suggest meals that store well and can be portioned.',
      quick_only: 'Needs QUICK meals only (max 15 min prep). Speed is king.',
      eat_out: 'Eats out often. Suggest meals that are easy to order at restaurants or replicate quickly.',
    }[mealPrepPreference as string] ?? 'Cooks fresh daily.'

    // Build alcohol context
    let alcoholContext = ''
    if (alcoholFrequency !== 'none') {
      const alcoholLabel = { light: '1-3 drinks/week', moderate: '4-7 drinks/week', heavy: '8+ drinks/week' }[alcoholFrequency as string] ?? ''
      alcoholContext = `ALCOHOL: This person drinks alcohol (${alcoholLabel}${alcoholDetails ? ` — specifically: ${alcoholDetails}` : ''}). Factor alcohol calories into the relevant days rather than ignoring them. If this is a day they'd typically drink, account for ~150-300 kcal from alcohol and reduce food calories accordingly so the total still hits target.`
    }

    // Build snack context
    let snackContext = ''
    if (currentSnacks.length > 0 || snackMotivation || snackPreference) {
      const snackLines = []
      if (currentSnacks.length > 0) snackLines.push(`Currently snacks on: ${currentSnacks.join(', ')}`)
      snackLines.push(`Snacks mainly out of: ${snackMotivation}`)
      snackLines.push(`Prefers: ${snackPreference === 'both' ? 'sweet AND savoury' : snackPreference} snacks`)
      if (lateNightSnacking) snackLines.push('Tends to snack late at night — plan for a satisfying evening snack to prevent this')
      snackLines.push(`Harder days to stay on track: ${harderDays}`)
      snackLines.push(`Eats out/order in: ${eatingOutFrequency}`)
      snackLines.push(`Plan style preference: ${planPreference}`)
      snackContext = `SNACK PROFILE:\n${snackLines.map(l => '- ' + l).join('\n')}\nFor any snack meals, suggest healthier swaps that scratch the same itch — sweet for sweet, crunchy for crunchy. Make them exciting, not boring.`
    }

    // Adventure level context
    const adventureContext = foodAdventurousness <= 3
      ? 'LOW food adventurousness — stick to familiar, classic meals. No exotic ingredients or unusual cuisines.'
      : foodAdventurousness >= 8
        ? 'HIGH food adventurousness — feel free to suggest exciting, diverse cuisines and unusual ingredients. This person loves trying new things!'
        : 'MODERATE food adventurousness — mostly familiar foods but open to some variety.'

    // Build supplement recommendation section (only on first day)
    const supplementSection = dayIndex === 0 ? `

SUPPLEMENT RECOMMENDATIONS:
Based on this client's profile, recommend evidence-based supplements. Include in the JSON response a "supplements" array with each supplement having: name, dose, timing, and reason.
Consider recommending from:
- Creatine monohydrate (5g/day) — for all trainees
- Vitamin D3 (2000-4000 IU/day) — especially if desk job / limited sun
- Omega-3 fish oil (2-3g EPA+DHA/day) — for recovery and inflammation
- Magnesium glycinate (200-400mg before bed) — especially if high stress or poor sleep
- Zinc (15-30mg/day) — if training hard
- Protein powder — if struggling to hit protein targets through food
- Caffeine guidance — timing relative to their workout
- Any specific supplements for their medical conditions
Only recommend what is relevant to THIS specific client based on their profile.` : ''

    const systemPrompt = `You are an expert nutritionist with 30 years of experience helping clients lose body fat sustainably without miserable dieting. You've worked with everyone from busy parents who can barely find time to cook, to athletes looking to get shredded for competition — and you know that the secret to lasting fat loss isn't bland food and brutal restriction, it's finding an approach that fits the person in front of you.

YOUR PHILOSOPHY:
- No boring chicken and broccoli unless the person specifically asked for it
- Every meal should be something the person actually WANTS to eat
- Use their favourite foods and cuisines as inspiration
- Include at least 2 meals per week that feel like a treat but are secretly hitting their macros
- Food should be fun, exciting, and sustainable — not a punishment
- Protein must be spread across the full day to hit the daily target — never leave large shortfalls
- The plan must feel realistic for their harder days, eating-out pattern, and preferred level of structure

CLIENT PROFILE:
- Goal: ${goal || 'maintenance'}${targetWeight ? ` (target: ${targetWeight}kg)` : ''}
- Gender: ${gender || 'not specified'}, Age: ${age || 'not specified'}
- Height: ${height_cm || 'not specified'}cm, Weight: ${weight_kg || 'not specified'}kg
- Job: ${workType} | Activity level: ${activityLevel}
- Exercise: ${workoutDaysPerWeek}x per week
- Sleep: ${sleepHours ? `${sleepHours}h/night` : 'not specified'} (quality: ${sleepQuality})
- Stress: ${stressLevel}
- Food adventurousness: ${foodAdventurousness}/10
- Harder days: ${harderDays}
- Eating out frequency: ${eatingOutFrequency}
- Plan preference: ${planPreference}
- Desired outcome: ${desiredOutcome || 'not specified'}
- Past dieting challenges: ${pastDietingChallenges || 'not specified'}
- Weekly derailers: ${weeklyDerailers || 'not specified'}
${dayName ? `\nGenerating plan for **${dayName}** (day ${dayIndex + 1} of 7). Ensure VARIETY — use different protein sources, vegetables, grains, and cooking methods than other days. Rotate between chicken, beef, fish, eggs, legumes, pork, etc. across the week. Give this day a fun theme or title in the day_theme field (e.g. "Mediterranean Monday", "Tex-Mex Tuesday", "Asian Fusion Wednesday").` : ''}

CLIENT SCHEDULE:
- Wake: ${wakeTime} | Work: ${workStartTime}–${workEndTime} | Workout: ${workoutTime} | Sleep: ${sleepTime}
${mealTimingGuide}

${constraints.length > 0 ? 'DIETARY CONSTRAINTS (NON-NEGOTIABLE — ZERO TOLERANCE):\n' + constraints.map(c => '- ' + c).join('\n') : ''}

${healthNotes.length > 0 ? 'HEALTH CONSIDERATIONS:\n' + healthNotes.map(n => '- ' + n).join('\n') : ''}

COOKING & LIFESTYLE:
- ${cookingContext}
- ${prepContext}
- ${adventureContext}

${alcoholContext}

${snackContext}
${supplementSection}

MEAL TIMING:
- Pre-workout (1-2h before): light carbs + moderate protein, low fat/fiber
- Post-workout (30-60min after): high protein (30-40g) + fast carbs for recovery
- First meal within 1h of waking. Last meal at least 2h before sleep.

Return ONLY valid JSON. No markdown, no explanation.

Format:
{
  ${dayName ? '"day_theme": "Fun Day Title (e.g. Mediterranean Monday)",' : ''}
  ${dayIndex === 0 ? '"supplements": [{ "name": "Supplement Name", "dose": "5g daily", "timing": "Morning with breakfast", "reason": "Why this client needs it" }],' : ''}
  "meals": [
    {
      "meal_type": "breakfast",
      "label": "Breakfast",
      "title": "Descriptive meal name",
      "time": "07:00",
      "timing_note": "Brief timing explanation",
      "notes": "Practical tips, batch-cook flag, treat flag, swap suggestions",
      "ingredients": [
        {
          "name": "ingredient",
          "amount": 80,
          "unit": "g",
          "calories": 300,
          "protein": 10,
          "carbs": 54,
          "fat": 5,
          "alternatives": [
            { "name": "substitute", "amount": 70, "unit": "g" }
          ]
        }
      ]
    }
  ]
}

Rules:
- Return exactly ${mealsPerDay} meals
- Each meal MUST have "time" (HH:MM), "timing_note", "label", and "notes"
- "label" = meal role: "Breakfast", "Pre-Workout Snack", "Post-Workout Meal", "Lunch", "Afternoon Snack", "Dinner", "Evening Snack", etc.
- "title" = descriptive, appetizing name (e.g. "Spicy Chicken Burrito Bowl" not "Chicken with Rice")
- "notes" should include: batch-cook suitability, treat-meal flags, protein swap options, cooking tips. Flag meals that are great for meal prep with "BATCH COOK:"
- meal_type: breakfast, lunch, dinner, or snack
- MEAL TIMING IS STRICT — follow these EXACT rules:
  * Breakfast MUST be at ${breakfastTime}
  * Lunch MUST be at ${lunchTime}
  * Dinner MUST be at ${dinnerTime}
  * These 3 meals are LOCKED. Do NOT move them.
  * Snacks and pre/post-workout meals go BETWEEN these anchors with a MINIMUM 1.5h gap from any other meal.
  * NEVER place two meals within 1 hour of each other. If workout time (${workoutTime}) is too close to a main meal, skip the pre/post-workout snack and adjust the main meal instead.
  * Work hours meals (${workStartTime}–${workEndTime}) should be practical/portable.
  * Last meal no later than 2h before sleep (${sleepTime}).
- Keep meals SIMPLE: 1 protein + 1 carb + 1 fat source per main meal (3-4 ingredients, max 5). Snacks: 1-2 items.
- For the PRIMARY carb source in main meals, include "alternatives": 3-5 substitutes with equivalent portions
- ALWAYS use grams (g) for solids and milliliters (ml) for liquids. Never cups, tablespoons, or "1 medium".
- MACRO ACCURACY IS NON-NEGOTIABLE. The SUM of all meals MUST hit the daily calorie target within ±50 kcal.
- VERIFICATION: After writing all meals, sum every ingredient's calories. If off by >50 kcal from ${calories}, adjust portions. Check protein (${protein}g ±5g), carbs (${carbs}g ±10g), fat (${fat}g ±5g).
- If target is high (>2500), use LARGER portions and calorie-dense ingredients (nuts, olive oil, avocado, whole milk).
- Reference data: chicken breast 100g=165cal/31P/0C/3.6F, rice(cooked) 100g=130cal/2.7P/28C/0.3F, oats 100g=389cal/13P/66C/7F, eggs 50g=78cal/6P/0.6C/5F, olive oil 15ml=120cal/0P/0C/14F, banana 120g=107cal/1.3P/27C/0.4F, salmon 100g=208cal/20P/0C/13F, sweet potato 100g=86cal/1.6P/20C/0.1F, peanut butter 30g=188cal/7P/6C/16F, whole milk 250ml=150cal/8P/12C/8F, almonds 30g=173cal/6P/6C/15F
- Pre-workout = lighter, carb-focused. Post-workout = protein-heavy + fast carbs`

    // Calculate per-meal budgets to guide the AI
    const mainMeals = Math.min(mealsPerDay, 3)
    const snackMeals = mealsPerDay - mainMeals
    const mainPct = snackMeals > 0 ? 0.27 : (1 / mainMeals)
    const snackPct = snackMeals > 0 ? ((1 - mainPct * mainMeals) / snackMeals) : 0

    const budgetGuide = [
      `Per-meal budget guide (approximate):`,
      `- Each main meal (~${mainMeals} meals): ~${Math.round(calories * mainPct)} cal, ~${Math.round(protein * mainPct)}P, ~${Math.round(carbs * mainPct)}C, ~${Math.round(fat * mainPct)}F`,
      snackMeals > 0 ? `- Each snack (~${snackMeals} snacks): ~${Math.round(calories * snackPct)} cal, ~${Math.round(protein * snackPct)}P, ~${Math.round(carbs * snackPct)}C, ~${Math.round(fat * snackPct)}F` : '',
    ].filter(Boolean).join('\n')

    const userPrompt = `Generate a ${mealsPerDay}-meal plan hitting these EXACT daily targets:
- Calories: ${calories} kcal (HARD LIMIT: must be between ${calories - 50} and ${calories + 50})
- Protein: ${protein}g (tolerance: ±5g)
- Carbs: ${carbs}g (tolerance: ±10g)
- Fat: ${fat}g (tolerance: ±5g)

${budgetGuide}

Make it exciting! Use the client's favourite foods as inspiration. Include at least 1 meal that feels like a treat but secretly hits the macros. Protein must be distributed across the day — no meal should have less than 20g protein for main meals.

VERIFICATION PROTOCOL (MANDATORY):
1. After writing all meals, add up every ingredient's calories across ALL ${mealsPerDay} meals.
2. If total is below ${calories - 50}: increase carb portions or add calorie-dense items.
3. If total is above ${calories + 50}: reduce portion sizes.
4. Re-verify until the sum is between ${calories - 50} and ${calories + 50} kcal.
5. Do the same check for protein (${protein}g ±5g), carbs (${carbs}g ±10g), fat (${fat}g ±5g).

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

    const dayTheme = parsed.day_theme ?? null
    const supplements = Array.isArray(parsed.supplements) ? parsed.supplements : null

    const meals = (parsed.meals ?? parsed).map((meal: Record<string, unknown>) => {
      const ingredients = ((meal.ingredients as Record<string, unknown>[]) ?? []).map((ing: Record<string, unknown>) => ({
        name: ing.name || 'ingredient',
        amount: Number(ing.amount) || 0,
        unit: ing.unit || 'g',
        calories: Number(ing.calories) || 0,
        protein: Number(ing.protein) || 0,
        carbs: Number(ing.carbs) || 0,
        fat: Number(ing.fat) || 0,
        alternatives: Array.isArray(ing.alternatives) ? ing.alternatives : [],
      }))

      return {
        meal_type: meal.meal_type || 'snack',
        label: meal.label || '',
        title: meal.title || 'Meal',
        time: meal.time || '12:00',
        timing_note: meal.timing_note || '',
        notes: meal.notes || '',
        ingredients,
      }
    })

    // --- Post-processing: scale ingredients to hit calorie target exactly ---
    const totalCal = meals.reduce((s: number, m: { ingredients: { calories: number }[] }) =>
      s + m.ingredients.reduce((ms: number, i: { calories: number }) => ms + i.calories, 0), 0)

    const calDiff = Math.abs(totalCal - calories)

    if (calDiff > 50 && totalCal > 0) {
      const scale = calories / totalCal
      for (const meal of meals) {
        for (const ing of meal.ingredients) {
          ing.amount = Math.round(ing.amount * scale)
          ing.calories = Math.round(ing.calories * scale)
          ing.protein = Math.round(ing.protein * scale * 10) / 10
          ing.carbs = Math.round(ing.carbs * scale * 10) / 10
          ing.fat = Math.round(ing.fat * scale * 10) / 10
        }
      }
    }

    // Compute per-meal totals from (possibly scaled) ingredients
    const finalMeals = meals.map((meal: { meal_type: string; label: string; title: string; time: string; timing_note: string; notes: string; ingredients: { name: string; amount: number; unit: string; calories: number; protein: number; carbs: number; fat: number; alternatives: unknown[] }[] }) => ({
      ...meal,
      ingredients: meal.ingredients.map(ing => ({
        ...ing,
        calories: Math.round(ing.calories),
        protein: Math.round(ing.protein * 10) / 10,
        carbs: Math.round(ing.carbs * 10) / 10,
        fat: Math.round(ing.fat * 10) / 10,
      })),
      calories: meal.ingredients.reduce((s, i) => s + Math.round(i.calories), 0),
      protein: Math.round(meal.ingredients.reduce((s, i) => s + i.protein, 0) * 10) / 10,
      carbs: Math.round(meal.ingredients.reduce((s, i) => s + i.carbs, 0) * 10) / 10,
      fat: Math.round(meal.ingredients.reduce((s, i) => s + i.fat, 0) * 10) / 10,
    }))

    return NextResponse.json({ meals: finalMeals, day_theme: dayTheme, supplements })
  } catch (err) {
    Sentry.captureException(err, { tags: { kind: 'api-route', route: 'ai/generate-meal-plan' } })
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ message }, { status: 500 })
  }
}

function buildMealTimingGuide(
  wakeTime: string, workoutTime: string,
  workStartTime: string, workEndTime: string, sleepTime: string,
  mealsPerDay: number
): string {
  const wake = timeToMinutes(wakeTime)
  const workout = timeToMinutes(workoutTime)
  const sleep = timeToMinutes(sleepTime)
  const preWorkout = workout - 60
  const postWorkout = workout + 75
  const wakingHours = ((sleep - wake + 1440) % 1440) / 60
  const idealGap = Math.round((wakingHours * 60) / mealsPerDay)

  return [
    `- First meal: ~${minutesToTime(wake + 30)} (30min after waking)`,
    `- Suggested pre-workout meal: ~${minutesToTime(preWorkout)} (1h before workout)`,
    `- Suggested post-workout meal: ~${minutesToTime(postWorkout)} (within 30min after ~1h workout)`,
    `- Work hours: ${workStartTime}–${workEndTime} (meals during work should be easy to prep/eat)`,
    `- Last meal: no later than ${minutesToTime(sleep - 120)} (2h before sleep)`,
    `- Total meals: ${mealsPerDay}`,
    `- Waking hours: ~${wakingHours.toFixed(1)}h → aim for ~${idealGap}min between meals`,
    `- IMPORTANT: Space meals evenly. Never more than 4h between consecutive meals.`,
  ].join('\n')
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function minutesToTime(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440
  const h = Math.floor(m / 60)
  const min = m % 60
  return `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`
}
