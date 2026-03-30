import { NextResponse } from 'next/server'
import { rateLimit, getClientIp } from '@/lib/rateLimit'

interface MealForContext {
  id: string
  label: string
  meal_type: string
  meal_name: string
  time: string
  calories: number
  protein: number
  carbs: number
  fat: number
  ingredients: { name: string; amount: number; unit: string; calories: number; protein: number; carbs: number; fat: number }[]
}

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const { success } = rateLimit(`ai-modify:${ip}`, { limit: 10, windowMs: 60_000 })
  if (!success) {
    return NextResponse.json({ message: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ message: 'AI service not configured' }, { status: 503 })
  }

  try {
    const { userMessage, currentMeals, targets, userProfile } = await request.json()

    if (!userMessage || !currentMeals) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 })
    }

    // Build a readable summary of the current plan for the AI
    const planSummary = (currentMeals as MealForContext[]).map((meal, i) => {
      const ingredients = meal.ingredients
        .map(ing => `  - ${ing.amount}${ing.unit} ${ing.name} (${ing.calories}cal, ${ing.protein}P/${ing.carbs}C/${ing.fat}F)`)
        .join('\n')
      return `${i + 1}. [${meal.label || meal.meal_type}] "${meal.meal_name}" at ${meal.time} (${meal.calories}cal, ${meal.protein}P/${meal.carbs}C/${meal.fat}F)\n${ingredients}`
    }).join('\n\n')

    const systemPrompt = `You are a certified clinical sports nutritionist modifying a patient's existing meal plan based on their feedback. You have the full context of their current plan and must make targeted changes while keeping the rest of the plan intact.

PATIENT DAILY TARGETS:
- Calories: ${targets?.calories ?? 'not set'} kcal
- Protein: ${targets?.protein ?? 'not set'}g
- Carbs: ${targets?.carbs ?? 'not set'}g
- Fat: ${targets?.fat ?? 'not set'}g
- Goal: ${userProfile?.goal ?? 'maintenance'}
${userProfile?.allergies?.length > 0 ? `- ALLERGIES (MUST AVOID): ${userProfile.allergies.join(', ')}` : ''}
${userProfile?.foodDislikes?.length > 0 ? `- DISLIKES (NEVER USE): ${userProfile.foodDislikes.join(', ')}` : ''}

CURRENT MEAL PLAN:
${planSummary}

RULES:
1. Return the COMPLETE updated meal plan (all meals, not just changed ones).
2. Only modify what the patient asked for. Keep unchanged meals exactly as they are.
3. MACRO ACCURACY IS THE #1 PRIORITY. After modifications, the total daily macros MUST be within 3% of targets. If changing one meal throws off the totals, adjust ingredient amounts in other meals to compensate.
4. Use accurate nutritional data: chicken breast 100g = 165cal/31P/0C/3.6F, rice (cooked) 100g = 130cal/2.7P/28C/0.3F, oats 100g = 389cal/13P/66C/7F, eggs 50g = 78cal/6P/0.6C/5F, olive oil 15ml = 120cal/0P/0C/14F, salmon 100g = 208cal/20P/0C/13F
5. Before responding, mentally sum all meal macros. If totals don't match targets, adjust amounts.
6. ALWAYS measure in grams (g) or milliliters (ml). Never cups, tablespoons, or "1 medium".
7. NEVER include foods the patient is allergic to or dislikes.
8. Keep the same number of meals unless the patient explicitly asks to add/remove one.

Return ONLY valid JSON. No markdown, no explanation.

Format:
{
  "message": "Brief explanation of what you changed (1-2 sentences)",
  "meals": [
    {
      "id": "original meal id or null for new meals",
      "meal_type": "breakfast",
      "label": "Breakfast",
      "title": "Meal name",
      "time": "07:00",
      "timing_note": "timing context",
      "notes": "practical tips",
      "ingredients": [
        {
          "name": "oats",
          "amount": 80,
          "unit": "g",
          "calories": 300,
          "protein": 10,
          "carbs": 54,
          "fat": 5,
          "alternatives": []
        }
      ]
    }
  ]
}`

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
          { role: 'user', content: userMessage },
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
    const tokensUsed = aiData.usage?.total_tokens ?? 0

    let parsed
    try {
      const jsonStr = content.replace(/^```json?\n?/, '').replace(/\n?```$/, '')
      parsed = JSON.parse(jsonStr)
    } catch {
      return NextResponse.json({ message: 'Failed to parse AI response' }, { status: 502 })
    }

    // Normalize meals
    const meals = (parsed.meals ?? []).map((meal: Record<string, unknown>) => {
      const ingredients = ((meal.ingredients as Record<string, unknown>[]) ?? []).map((ing: Record<string, unknown>) => ({
        name: ing.name || 'ingredient',
        amount: ing.amount || 0,
        unit: ing.unit || 'g',
        calories: Math.round(Number(ing.calories) || 0),
        protein: Math.round((Number(ing.protein) || 0) * 10) / 10,
        carbs: Math.round((Number(ing.carbs) || 0) * 10) / 10,
        fat: Math.round((Number(ing.fat) || 0) * 10) / 10,
        alternatives: Array.isArray(ing.alternatives) ? ing.alternatives : [],
      }))

      return {
        id: meal.id || null,
        meal_type: meal.meal_type || 'snack',
        label: meal.label || '',
        title: meal.title || 'Meal',
        time: meal.time || '12:00',
        timing_note: meal.timing_note || '',
        notes: meal.notes || '',
        ingredients,
        calories: ingredients.reduce((s: number, i: { calories: number }) => s + i.calories, 0),
        protein: Math.round(ingredients.reduce((s: number, i: { protein: number }) => s + i.protein, 0) * 10) / 10,
        carbs: Math.round(ingredients.reduce((s: number, i: { carbs: number }) => s + i.carbs, 0) * 10) / 10,
        fat: Math.round(ingredients.reduce((s: number, i: { fat: number }) => s + i.fat, 0) * 10) / 10,
      }
    })

    return NextResponse.json({
      message: parsed.message || 'Plan updated.',
      meals,
      tokensUsed,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ message }, { status: 500 })
  }
}
