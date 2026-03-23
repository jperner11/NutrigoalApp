import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const targetCalories = parseInt(searchParams.get('targetCalories') ?? '2000')
  const targetProtein = parseInt(searchParams.get('targetProtein') ?? '150')
  const targetCarbs = parseInt(searchParams.get('targetCarbs') ?? '250')
  const targetFat = parseInt(searchParams.get('targetFat') ?? '65')
  const mealCount = parseInt(searchParams.get('mealCount') ?? '3')

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ message: 'AI service not configured' }, { status: 503 })
  }

  const mealSlots = mealCount === 4
    ? ['breakfast', 'lunch', 'dinner', 'snack']
    : ['breakfast', 'lunch', 'dinner']

  const preferences = mealSlots.map(key => {
    const ingredients = searchParams.get(`ingredients_${key}`)?.trim() || ''
    return { key, ingredients }
  })

  const preferencesText = preferences
    .map(p => p.ingredients
      ? `- ${p.key}: use these ingredients: ${p.ingredients}`
      : `- ${p.key}: choose common, tasty ingredients`)
    .join('\n')

  const openai = new OpenAI({ apiKey })

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.7,
      max_tokens: 2000,
      messages: [
        {
          role: 'system',
          content: `You are a professional nutritionist. Generate a daily meal plan with ingredient-level breakdown.
Return ONLY valid JSON, no markdown, no explanation.

Format:
[
  {
    "title": "Meal name (e.g. Banana Oatmeal Bowl)",
    "ingredients": [
      { "name": "oats", "amount": 80, "unit": "g", "calories": 300, "protein": 10, "carbs": 54, "fat": 5 },
      { "name": "banana", "amount": 1, "unit": "medium", "calories": 105, "protein": 1.3, "carbs": 27, "fat": 0.4 }
    ]
  }
]

Rules:
- Return exactly ${mealCount} meals in order: ${mealSlots.join(', ')}
- Each meal MUST have 2-6 individual ingredients with realistic portions
- Use specific amounts: grams for solids, ml for liquids, units for countable items (e.g. "2 eggs")
- Each ingredient must have accurate macros for that specific amount
- The SUM of ALL ingredients across ALL meals must match daily targets within 5%
- Use common, everyday foods with realistic cooking portions
- Protein accuracy is critical: chicken breast 100g = 31g protein, eggs 1 large = 6g protein, rice 100g cooked = 2.7g protein
- Calorie accuracy: 1g protein = 4cal, 1g carbs = 4cal, 1g fat = 9cal`
        },
        {
          role: 'user',
          content: `Generate a ${mealCount}-meal plan with ingredient breakdowns hitting these DAILY targets:
- Calories: ${targetCalories} kcal
- Protein: ${targetProtein}g
- Carbs: ${targetCarbs}g
- Fat: ${targetFat}g

User preferences per meal:
${preferencesText}

Return the JSON array only.`
        }
      ],
    })

    const content = response.choices[0]?.message?.content?.trim() ?? '[]'

    let parsed
    try {
      const jsonStr = content.replace(/^```json?\n?/, '').replace(/\n?```$/, '')
      parsed = JSON.parse(jsonStr)
    } catch {
      return NextResponse.json({ message: 'Failed to parse AI response' }, { status: 502 })
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return NextResponse.json({ message: 'AI returned invalid meal plan' }, { status: 502 })
    }

    interface AIIngredient {
      name?: string
      amount?: number
      unit?: string
      calories?: number
      protein?: number
      carbs?: number
      fat?: number
    }

    interface AIMeal {
      title?: string
      ingredients?: AIIngredient[]
    }

    const meals = parsed.map((meal: AIMeal) => {
      const ingredients = (meal.ingredients ?? []).map((ing: AIIngredient) => ({
        name: ing.name || 'ingredient',
        amount: ing.amount || 0,
        unit: ing.unit || 'g',
        calories: Math.round(ing.calories || 0),
        protein: Math.round((ing.protein || 0) * 10) / 10,
        carbs: Math.round((ing.carbs || 0) * 10) / 10,
        fat: Math.round((ing.fat || 0) * 10) / 10,
      }))

      const totalCalories = ingredients.reduce((s: number, i: { calories: number }) => s + i.calories, 0)
      const totalProtein = ingredients.reduce((s: number, i: { protein: number }) => s + i.protein, 0)
      const totalCarbs = ingredients.reduce((s: number, i: { carbs: number }) => s + i.carbs, 0)
      const totalFat = ingredients.reduce((s: number, i: { fat: number }) => s + i.fat, 0)

      return {
        title: meal.title || 'Meal',
        ingredients,
        calories: Math.round(totalCalories),
        protein: Math.round(totalProtein),
        carbs: Math.round(totalCarbs),
        fat: Math.round(totalFat),
      }
    })

    return NextResponse.json({ meals })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ message }, { status: 500 })
  }
}

// POST: Regenerate a single meal
export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ message: 'AI service not configured' }, { status: 503 })
  }

  const body = await request.json()
  const { mealType, targetCalories, targetProtein, targetCarbs, targetFat, ingredients } = body

  const openai = new OpenAI({ apiKey })

  try {
    const ingredientHint = ingredients?.trim()
      ? `Use these ingredients if possible: ${ingredients}`
      : 'Choose common, tasty ingredients'

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.9,
      max_tokens: 600,
      messages: [
        {
          role: 'system',
          content: `You are a professional nutritionist. Generate ONE meal with ingredient breakdown.
Return ONLY valid JSON, no markdown.

Format:
{
  "title": "Meal name",
  "ingredients": [
    { "name": "ingredient", "amount": 100, "unit": "g", "calories": 150, "protein": 10, "carbs": 15, "fat": 5 }
  ]
}

Rules:
- 2-6 ingredients with specific amounts and accurate macros
- Total must match the calorie/macro targets within 10%
- Make it a DIFFERENT meal than typical suggestions — be creative
- Protein accuracy: chicken 100g = 31g, eggs 1 = 6g, rice 100g cooked = 2.7g`
        },
        {
          role: 'user',
          content: `Generate a creative ${mealType} meal hitting:
- Calories: ${targetCalories} kcal
- Protein: ${targetProtein}g
- Carbs: ${targetCarbs}g
- Fat: ${targetFat}g

${ingredientHint}

Return JSON only.`
        }
      ],
    })

    const content = response.choices[0]?.message?.content?.trim() ?? '{}'

    let parsed
    try {
      const jsonStr = content.replace(/^```json?\n?/, '').replace(/\n?```$/, '')
      parsed = JSON.parse(jsonStr)
    } catch {
      return NextResponse.json({ message: 'Failed to parse AI response' }, { status: 502 })
    }

    interface AIIngredient {
      name?: string
      amount?: number
      unit?: string
      calories?: number
      protein?: number
      carbs?: number
      fat?: number
    }

    const ingredients_parsed = (parsed.ingredients ?? []).map((ing: AIIngredient) => ({
      name: ing.name || 'ingredient',
      amount: ing.amount || 0,
      unit: ing.unit || 'g',
      calories: Math.round(ing.calories || 0),
      protein: Math.round((ing.protein || 0) * 10) / 10,
      carbs: Math.round((ing.carbs || 0) * 10) / 10,
      fat: Math.round((ing.fat || 0) * 10) / 10,
    }))

    const totalCalories = ingredients_parsed.reduce((s: number, i: { calories: number }) => s + i.calories, 0)
    const totalProtein = ingredients_parsed.reduce((s: number, i: { protein: number }) => s + i.protein, 0)
    const totalCarbs = ingredients_parsed.reduce((s: number, i: { carbs: number }) => s + i.carbs, 0)
    const totalFat = ingredients_parsed.reduce((s: number, i: { fat: number }) => s + i.fat, 0)

    return NextResponse.json({
      title: parsed.title || 'Meal',
      ingredients: ingredients_parsed,
      calories: Math.round(totalCalories),
      protein: Math.round(totalProtein),
      carbs: Math.round(totalCarbs),
      fat: Math.round(totalFat),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ message }, { status: 500 })
  }
}
