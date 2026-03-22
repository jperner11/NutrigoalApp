import { NextResponse } from 'next/server'

interface RecipeResult {
  id: number
  title: string
  nutrition: {
    nutrients: Array<{ name: string; amount: number }>
  }
}

function getNutrient(recipe: RecipeResult, name: string): number {
  return recipe.nutrition?.nutrients?.find(n => n.name === name)?.amount ?? 0
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const targetCalories = parseInt(searchParams.get('targetCalories') ?? '2000')
  const targetProtein = parseInt(searchParams.get('targetProtein') ?? '150')
  const targetCarbs = parseInt(searchParams.get('targetCarbs') ?? '250')
  const targetFat = parseInt(searchParams.get('targetFat') ?? '65')
  const mealCount = parseInt(searchParams.get('mealCount') ?? '3')
  const diet = searchParams.get('diet') ?? ''

  const apiKey = process.env.SPOONACULAR_API_KEY
  if (!apiKey) {
    return NextResponse.json({ message: 'Food service not configured' }, { status: 503 })
  }

  // Define meal splits based on count
  const mealSplits = mealCount === 4
    ? [
        { key: 'breakfast', type: 'breakfast', share: 0.25 },
        { key: 'lunch', type: 'main course', share: 0.35 },
        { key: 'dinner', type: 'main course', share: 0.30 },
        { key: 'snack', type: 'snack', share: 0.10 },
      ]
    : [
        { key: 'breakfast', type: 'breakfast', share: 0.25 },
        { key: 'lunch', type: 'main course', share: 0.40 },
        { key: 'dinner', type: 'main course', share: 0.35 },
      ]

  try {
    const meals = await Promise.all(
      mealSplits.map(async (split) => {
        const calTarget = Math.round(targetCalories * split.share)
        const proTarget = Math.round(targetProtein * split.share)
        const carbTarget = Math.round(targetCarbs * split.share)
        const fatTarget = Math.round(targetFat * split.share)

        // Get user's preferred ingredients for this meal
        const userIngredients = searchParams.get(`ingredients_${split.key}`) ?? ''

        const params = new URLSearchParams({
          apiKey,
          type: split.type,
          number: '5',
          sort: 'random',
          addRecipeNutrition: 'true',
          minCalories: String(Math.round(calTarget * 0.7)),
          maxCalories: String(Math.round(calTarget * 1.3)),
          minProtein: String(Math.round(proTarget * 0.5)),
          maxProtein: String(Math.round(proTarget * 1.6)),
          minCarbs: String(Math.round(carbTarget * 0.4)),
          maxCarbs: String(Math.round(carbTarget * 1.6)),
          minFat: String(Math.round(fatTarget * 0.4)),
          maxFat: String(Math.round(fatTarget * 1.6)),
        })

        // Add user's preferred ingredients
        if (userIngredients.trim()) {
          // Clean up: split by comma, trim whitespace
          const cleaned = userIngredients
            .split(',')
            .map(s => s.trim())
            .filter(Boolean)
            .join(',')
          if (cleaned) {
            params.set('includeIngredients', cleaned)
          }
        }

        if (diet) {
          params.set('diet', diet)
        }

        const res = await fetch(
          `https://api.spoonacular.com/recipes/complexSearch?${params.toString()}`
        )

        if (!res.ok) {
          if (res.status === 402) {
            throw new Error('RATE_LIMIT')
          }
          // If strict search fails, try without macro constraints
          return await fallbackSearch(apiKey, split, calTarget, proTarget, carbTarget, fatTarget, userIngredients, diet)
        }

        const data = await res.json()
        const results: RecipeResult[] = data.results ?? []

        if (results.length === 0) {
          // Retry with relaxed constraints
          return await fallbackSearch(apiKey, split, calTarget, proTarget, carbTarget, fatTarget, userIngredients, diet)
        }

        // Pick the recipe whose macros are closest to targets
        let best = results[0]
        let bestScore = Infinity
        for (const r of results) {
          const calDiff = Math.abs(getNutrient(r, 'Calories') - calTarget) / calTarget
          const proDiff = Math.abs(getNutrient(r, 'Protein') - proTarget) / Math.max(proTarget, 1)
          const carbDiff = Math.abs(getNutrient(r, 'Carbohydrates') - carbTarget) / Math.max(carbTarget, 1)
          const fatDiff = Math.abs(getNutrient(r, 'Fat') - fatTarget) / Math.max(fatTarget, 1)
          const score = calDiff + proDiff * 1.5 + carbDiff + fatDiff
          if (score < bestScore) {
            bestScore = score
            best = r
          }
        }

        return {
          id: best.id,
          title: best.title,
          servings: 1,
          calories: Math.round(getNutrient(best, 'Calories')),
          protein: Math.round(getNutrient(best, 'Protein')),
          carbs: Math.round(getNutrient(best, 'Carbohydrates')),
          fat: Math.round(getNutrient(best, 'Fat')),
        }
      })
    )

    return NextResponse.json({ meals })
  } catch (err) {
    if (err instanceof Error && err.message === 'RATE_LIMIT') {
      return NextResponse.json(
        { message: 'Spoonacular API rate limit reached. Try again later or upgrade your plan.' },
        { status: 429 }
      )
    }
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

async function fallbackSearch(
  apiKey: string,
  split: { key: string; type: string; share: number },
  calTarget: number,
  proTarget: number,
  carbTarget: number,
  fatTarget: number,
  userIngredients: string,
  diet: string,
) {
  // Try with just calorie + ingredient constraints (no macro limits)
  const params = new URLSearchParams({
    apiKey,
    type: split.type,
    number: '3',
    sort: 'random',
    addRecipeNutrition: 'true',
    minCalories: String(Math.round(calTarget * 0.5)),
    maxCalories: String(Math.round(calTarget * 1.5)),
  })

  if (userIngredients.trim()) {
    const cleaned = userIngredients.split(',').map(s => s.trim()).filter(Boolean).join(',')
    if (cleaned) params.set('includeIngredients', cleaned)
  }

  if (diet) params.set('diet', diet)

  const res = await fetch(
    `https://api.spoonacular.com/recipes/complexSearch?${params.toString()}`
  )

  if (res.ok) {
    const data = await res.json()
    const results: RecipeResult[] = data.results ?? []
    if (results.length > 0) {
      // Pick closest to macro targets
      let best = results[0]
      let bestScore = Infinity
      for (const r of results) {
        const proDiff = Math.abs(getNutrient(r, 'Protein') - proTarget)
        const carbDiff = Math.abs(getNutrient(r, 'Carbohydrates') - carbTarget)
        const fatDiff = Math.abs(getNutrient(r, 'Fat') - fatTarget)
        const score = proDiff * 1.5 + carbDiff + fatDiff
        if (score < bestScore) {
          bestScore = score
          best = r
        }
      }
      return {
        id: best.id,
        title: best.title,
        servings: 1,
        calories: Math.round(getNutrient(best, 'Calories')),
        protein: Math.round(getNutrient(best, 'Protein')),
        carbs: Math.round(getNutrient(best, 'Carbohydrates')),
        fat: Math.round(getNutrient(best, 'Fat')),
      }
    }
  }

  // Last resort: return placeholder
  return {
    id: 0,
    title: `${split.key} meal`,
    servings: 1,
    calories: calTarget,
    protein: proTarget,
    carbs: carbTarget,
    fat: fatTarget,
  }
}
