import { NextResponse } from 'next/server'

export async function POST(request: Request) {
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
    } = body

    if (!calories || !protein) {
      return NextResponse.json({ message: 'Missing nutritional targets' }, { status: 400 })
    }

    const mealTimingGuide = buildMealTimingGuide(wakeTime, workoutTime, mealsPerDay)

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

    const systemPrompt = `You are a sports nutritionist creating a daily meal plan optimized around a workout schedule.

MEAL TIMING RESEARCH:
- Pre-workout meal: 1-2 hours before training. Easily digestible carbs + moderate protein, low fat/fiber.
- Post-workout meal: Within 30-60 minutes after training. High protein (30-40g) + fast carbs for glycogen.
- First meal within 1 hour of waking. Last meal at least 2 hours before sleep.

SCHEDULE:
- Wake time: ${wakeTime}
- Workout time: ${workoutTime}
${mealTimingGuide}

USER PROFILE:
- Goal: ${goal || 'maintenance'}${targetWeight ? ` (target: ${targetWeight}kg)` : ''}
- Gender: ${gender || 'not specified'}, Age: ${age || 'not specified'}, Weight: ${weight_kg || 'not specified'}kg

${constraints.length > 0 ? 'DIETARY CONSTRAINTS (CRITICAL):\n' + constraints.map(c => '- ' + c).join('\n') : ''}

${healthNotes.length > 0 ? 'HEALTH CONSIDERATIONS:\n' + healthNotes.map(n => '- ' + n).join('\n') : ''}

COOKING & PREP:
- ${cookingContext}
- ${prepContext}

Return ONLY valid JSON. No markdown, no explanation.

Format:
{
  "meals": [
    {
      "meal_type": "breakfast",
      "title": "Meal name",
      "time": "07:00",
      "timing_note": "1h before workout - light, carb-focused",
      "ingredients": [
        { "name": "oats", "amount": 80, "unit": "g", "calories": 300, "protein": 10, "carbs": 54, "fat": 5 }
      ]
    }
  ]
}

Rules:
- Return exactly ${mealsPerDay} meals
- Each meal MUST have "time" (HH:MM) and "timing_note"
- meal_type: breakfast, lunch, dinner, or snack
- Keep meals SIMPLE and practical: each main meal should have 1 protein source, 1 carb source, and 1 fat source (e.g. olive oil, avocado). Snacks can be simpler (1-2 items). Aim for 3-4 ingredients per meal, max 5.
- ALWAYS measure solid foods in grams (g) and liquids in milliliters (ml). Examples: "banana" = 120g, "whole milk" = 200ml, "chicken breast" = 150g, "olive oil" = 15ml, "rice" = 80g (dry). Never use cups, tablespoons, or "1 medium".
- SUM across ALL meals must match daily targets within 5%
- Protein accuracy is critical: chicken breast 100g = 31g protein, eggs 1 large (50g) = 6g protein
- Pre-workout = lighter, carb-focused. Post-workout = protein-heavy + fast carbs`

    const userPrompt = `Generate a ${mealsPerDay}-meal plan hitting these DAILY targets:
- Calories: ${calories} kcal
- Protein: ${protein}g
- Carbs: ${carbs}g
- Fat: ${fat}g

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
        max_tokens: 2500,
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

    const meals = (parsed.meals ?? parsed).map((meal: Record<string, unknown>) => {
      const ingredients = ((meal.ingredients as Record<string, unknown>[]) ?? []).map((ing: Record<string, unknown>) => ({
        name: ing.name || 'ingredient',
        amount: ing.amount || 0,
        unit: ing.unit || 'g',
        calories: Math.round(Number(ing.calories) || 0),
        protein: Math.round((Number(ing.protein) || 0) * 10) / 10,
        carbs: Math.round((Number(ing.carbs) || 0) * 10) / 10,
        fat: Math.round((Number(ing.fat) || 0) * 10) / 10,
      }))

      return {
        meal_type: meal.meal_type || 'snack',
        title: meal.title || 'Meal',
        time: meal.time || '12:00',
        timing_note: meal.timing_note || '',
        ingredients,
        calories: ingredients.reduce((s: number, i: { calories: number }) => s + i.calories, 0),
        protein: Math.round(ingredients.reduce((s: number, i: { protein: number }) => s + i.protein, 0) * 10) / 10,
        carbs: Math.round(ingredients.reduce((s: number, i: { carbs: number }) => s + i.carbs, 0) * 10) / 10,
        fat: Math.round(ingredients.reduce((s: number, i: { fat: number }) => s + i.fat, 0) * 10) / 10,
      }
    })

    return NextResponse.json({ meals })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ message }, { status: 500 })
  }
}

function buildMealTimingGuide(wakeTime: string, workoutTime: string, mealsPerDay: number): string {
  const wake = timeToMinutes(wakeTime)
  const workout = timeToMinutes(workoutTime)
  const preWorkout = workout - 60
  const postWorkout = workout + 75

  return [
    `- Suggested pre-workout meal: ~${minutesToTime(preWorkout)} (1h before workout)`,
    `- Suggested post-workout meal: ~${minutesToTime(postWorkout)} (within 30min after ~1h workout)`,
    `- First meal: ~${minutesToTime(wake + 30)} (30min after waking)`,
    `- Total meals: ${mealsPerDay}`,
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
