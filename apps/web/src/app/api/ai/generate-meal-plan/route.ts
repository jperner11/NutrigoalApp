import { NextResponse } from 'next/server'
import { rateLimit, getClientIp } from '@/lib/rateLimit'

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const { success } = rateLimit(`ai-meal:${ip}`, { limit: 5, windowMs: 60_000 })
  if (!success) {
    return NextResponse.json({ message: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ message: 'AI service not configured' }, { status: 503 })
  }

  try {
    const body = await request.json()
    const {
      calories, protein, carbs, fat,
      goal, gender, weight_kg, age,
      mealsPerDay = 3,
      wakeTime = '07:00',
      workoutTime = '08:00',
      workStartTime = '09:00',
      workEndTime = '17:00',
      sleepTime = '23:00',
      // Anamnesis data
      dietaryPreferences = [],
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
      targetWeight = null,
      dayName = null,
      dayIndex = 0,
    } = body

    if (!calories || !protein) {
      return NextResponse.json({ message: 'Missing nutritional targets' }, { status: 400 })
    }

    const mealTimingGuide = buildMealTimingGuide(wakeTime, workoutTime, workStartTime, workEndTime, sleepTime, mealsPerDay)

    // Build dietary constraints section
    const constraints: string[] = []
    if (dietaryRestrictions.length > 0) constraints.push(`STRICT dietary restrictions: ${dietaryRestrictions.join(', ')}. NEVER include foods that violate these.`)
    if (allergies.length > 0) constraints.push(`ALLERGIES (MUST AVOID): ${allergies.join(', ')}. These are dangerous — never include.`)
    if (foodDislikes.length > 0) constraints.push(`User DISLIKES these foods (NEVER use): ${foodDislikes.join(', ')}`)
    if (dietaryPreferences.length > 0) constraints.push(`Dietary preferences: ${dietaryPreferences.join(', ')}`)
    if (favouriteFoods.length > 0) constraints.push(`User's FAVOURITE foods (prioritize these): ${favouriteFoods.join(', ')}. Build meals around these where possible.`)

    // Build health context
    const healthNotes: string[] = []
    if (medicalConditions.length > 0) healthNotes.push(`Medical conditions: ${medicalConditions.join(', ')}. Adjust meal choices accordingly (e.g., low glycemic for diabetes, low sodium for hypertension).`)
    if (medications.length > 0) healthNotes.push(`Current medications: ${medications.join(', ')}. Be mindful of food-drug interactions.`)
    if (stressLevel === 'high') healthNotes.push('User has HIGH stress — include magnesium-rich and anti-inflammatory foods where possible.')
    if (sleepQuality === 'poor') healthNotes.push('User has POOR sleep — include tryptophan-rich foods in evening meal, avoid caffeine after lunch.')

    // Build cooking context
    const cookingContext = {
      none: 'User CANNOT cook. Use only no-cook meals (sandwiches, salads, smoothies, ready-to-eat items).',
      basic: 'User has BASIC cooking skills. Keep recipes simple: max 3-4 steps, common pantry ingredients.',
      intermediate: 'User is comfortable cooking. Standard recipes are fine.',
      advanced: 'User is an advanced cook. Can suggest complex recipes.',
    }[cookingSkill as string] ?? 'User is comfortable cooking. Standard recipes are fine.'

    const prepContext = {
      daily: 'User cooks fresh daily.',
      batch_prep: 'User prefers BATCH PREP (meal prep on weekends). Suggest meals that store well and can be portioned.',
      quick_only: 'User needs QUICK meals only (max 15 min prep). Prioritize speed.',
      eat_out: 'User eats out often. Suggest meals that are easy to order or replicate at restaurants.',
    }[mealPrepPreference as string] ?? 'User cooks fresh daily.'

    const systemPrompt = `You are a certified clinical sports nutritionist with 15+ years of experience creating personalised nutrition protocols for athletes and fitness clients. You treat every user as a real patient — their health data, restrictions, allergies, and medical conditions are non-negotiable constraints, not suggestions.

YOUR APPROACH:
- You follow evidence-based sports nutrition principles (ISSN, ACSM guidelines).
- You NEVER include foods the patient is allergic to, dislikes, or that conflict with their medical conditions/medications — there are no exceptions.
- You design meals that are realistic for the patient's cooking ability, schedule, and lifestyle.
- You optimise nutrient timing around training for performance and recovery.
- You ensure macro and calorie targets are hit precisely — this is a clinical prescription, not a rough guide.

MEAL TIMING RESEARCH:
- Pre-workout meal: 1-2 hours before training. Easily digestible carbs + moderate protein, low fat/fiber.
- Post-workout meal: Within 30-60 minutes after training. High protein (30-40g) + fast carbs for glycogen replenishment.
- First meal within 1 hour of waking. Last meal at least 2 hours before sleep.

PATIENT SCHEDULE:
- Wake time: ${wakeTime}
- Work: ${workStartTime} – ${workEndTime}
- Workout time: ${workoutTime}
- Sleep time: ${sleepTime}
${mealTimingGuide}

PATIENT PROFILE:
- Goal: ${goal || 'maintenance'}${targetWeight ? ` (target: ${targetWeight}kg)` : ''}
- Gender: ${gender || 'not specified'}, Age: ${age || 'not specified'}, Weight: ${weight_kg || 'not specified'}kg
${dayName ? `\nYou are generating the meal plan for **${dayName}** (day ${dayIndex + 1} of 7 in a weekly plan). Ensure variety — use different protein sources, vegetables, grains, and cooking methods than other days. Think about weekly variety: rotate between chicken, beef, fish, eggs, legumes, pork, etc. across the week.` : ''}

${constraints.length > 0 ? 'PATIENT DIETARY CONSTRAINTS (MANDATORY — ZERO TOLERANCE):\n' + constraints.map(c => '- ' + c).join('\n') : ''}

${healthNotes.length > 0 ? 'PATIENT HEALTH CONSIDERATIONS (CLINICAL):\n' + healthNotes.map(n => '- ' + n).join('\n') : ''}

PATIENT COOKING & PREP CONTEXT:
- ${cookingContext}
- ${prepContext}

Return ONLY valid JSON. No markdown, no explanation.

Format:
{
  "meals": [
    {
      "meal_type": "breakfast",
      "label": "Breakfast",
      "title": "Oatmeal with Banana and Peanut Butter",
      "time": "07:00",
      "timing_note": "1h before workout - light, carb-focused",
      "notes": "Optional tips: e.g. protein options, salad ideas, cooking tips",
      "ingredients": [
        {
          "name": "oats",
          "amount": 80,
          "unit": "g",
          "calories": 300,
          "protein": 10,
          "carbs": 54,
          "fat": 5,
          "alternatives": [
            { "name": "quinoa", "amount": 70, "unit": "g" },
            { "name": "sweet potato", "amount": 150, "unit": "g" }
          ]
        }
      ]
    }
  ]
}

Rules:
- Return exactly ${mealsPerDay} meals
- Each meal MUST have "time" (HH:MM), "timing_note", "label", and optionally "notes"
- "label" is the meal's role in the day: "Breakfast", "Pre-Workout Snack", "Post-Workout Meal", "Lunch", "Afternoon Snack", "Dinner", "Evening Snack", etc. This is displayed to the user as the meal category.
- "title" is the descriptive name of the food (e.g. "Salmon with Rice and Broccoli")
- "notes" should contain practical tips: protein swap options (e.g. "Protein: chicken OR fish OR lean beef (150g)"), salad/vegetable suggestions (e.g. "Greens: spinach, kale, lettuce, rocket — eat freely"), or cooking tips
- meal_type: breakfast, lunch, dinner, or snack (for DB categorization)
- MEAL TIMING IS CRITICAL: Spread meals EVENLY across the waking day (${wakeTime} to ${sleepTime}). Aim for 2-3 hour gaps between meals. NEVER have a gap longer than 4 hours between any two consecutive meals. Account for the work schedule (${workStartTime}–${workEndTime}) — meals during work hours should be practical/portable.
- Keep meals SIMPLE and practical: each main meal should have 1 protein source, 1 carb source, and 1 fat source (e.g. olive oil, avocado). Snacks can be simpler (1-2 items). Aim for 3-4 ingredients per meal, max 5.
- For the PRIMARY carb source in each main meal, include "alternatives": an array of 3-5 substitute options with equivalent portions. Example: if rice 200g, alternatives could be pasta 180g, sweet potato 250g, quinoa 160g, potato 280g.
- Other ingredients do NOT need alternatives (set to [] or omit)
- ALWAYS measure solid foods in grams (g) and liquids in milliliters (ml). Examples: "banana" = 120g, "whole milk" = 200ml, "chicken breast" = 150g, "olive oil" = 15ml, "rice" = 80g (dry). Never use cups, tablespoons, or "1 medium".
- MACRO ACCURACY IS THE #1 PRIORITY — THIS IS NON-NEGOTIABLE. The SUM of all meals MUST hit the daily calorie target EXACTLY (within ±50 kcal). You will be penalized for being off by more than 50 kcal.
- STEP 1: Plan meals conceptually. STEP 2: Assign ingredient amounts. STEP 3: Add up ALL ingredient macros. STEP 4: Compare totals to targets. STEP 5: If off by more than 50 kcal, adjust ingredient amounts (increase/decrease portions) until the sum matches. DO NOT SKIP STEP 3-5.
- Common mistake: generating ~2500-2800 cal when target is 3000+. If the target is high, use LARGER portions (e.g. 250g rice instead of 150g, 200g chicken instead of 120g) and calorie-dense ingredients (nuts, olive oil, avocado, whole milk).
- Use accurate nutritional data: chicken breast 100g = 165cal/31P/0C/3.6F, rice (cooked) 100g = 130cal/2.7P/28C/0.3F, oats 100g = 389cal/13P/66C/7F, eggs 50g = 78cal/6P/0.6C/5F, olive oil 15ml = 120cal/0P/0C/14F, banana 120g = 107cal/1.3P/27C/0.4F, salmon 100g = 208cal/20P/0C/13F, sweet potato 100g = 86cal/1.6P/20C/0.1F, peanut butter 30g = 188cal/7P/6C/16F, whole milk 250ml = 150cal/8P/12C/8F, almonds 30g = 173cal/6P/6C/15F
- Pre-workout = lighter, carb-focused. Post-workout = protein-heavy + fast carbs`

    // Calculate per-meal budgets to guide the AI
    const mainMeals = Math.min(mealsPerDay, 3)
    const snackMeals = mealsPerDay - mainMeals
    // Main meals get ~25-30% each, snacks get the remainder split
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

VERIFICATION PROTOCOL (MANDATORY):
1. After writing all meals, add up every ingredient's calories across ALL ${mealsPerDay} meals.
2. If the total is below ${calories - 50}: increase carb portions (more rice, oats, bread) or add calorie-dense items (olive oil, nuts, peanut butter).
3. If the total is above ${calories + 50}: reduce portion sizes of the largest calorie contributors.
4. Re-verify until the sum is between ${calories - 50} and ${calories + 50} kcal.
5. Do the same check for protein (${protein}g ±5g), carbs (${carbs}g ±10g), and fat (${fat}g ±5g).

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
        temperature: 0.4,
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
      // Scale all ingredients proportionally to hit the target
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

    return NextResponse.json({ meals: finalMeals })
  } catch (err) {
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
