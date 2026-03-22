import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const amount = searchParams.get('amount') ?? '100'
  const unit = searchParams.get('unit') ?? 'g'

  if (!id) {
    return NextResponse.json({ message: 'Ingredient ID required' }, { status: 400 })
  }

  const apiKey = process.env.SPOONACULAR_API_KEY
  if (!apiKey) {
    return NextResponse.json({ message: 'Food service not configured' }, { status: 503 })
  }

  try {
    const response = await fetch(
      `https://api.spoonacular.com/food/ingredients/${id}/information?amount=${amount}&unit=${encodeURIComponent(unit)}&apiKey=${apiKey}`,
    )

    if (!response.ok) {
      return NextResponse.json({ message: 'Failed to fetch nutrition data' }, { status: 502 })
    }

    const data = await response.json()

    const nutrients = data.nutrition?.nutrients ?? []
    const findNutrient = (name: string) =>
      nutrients.find((n: { name: string; amount: number }) => n.name === name)?.amount ?? 0

    return NextResponse.json({
      id: data.id,
      name: data.name,
      amount: Number(amount),
      unit,
      calories: Math.round(findNutrient('Calories')),
      protein: Math.round(findNutrient('Protein') * 10) / 10,
      carbs: Math.round(findNutrient('Carbohydrates') * 10) / 10,
      fat: Math.round(findNutrient('Fat') * 10) / 10,
    })
  } catch {
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
