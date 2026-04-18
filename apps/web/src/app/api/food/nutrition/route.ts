import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const amount = Number(searchParams.get('amount') ?? '100')
  const unit = searchParams.get('unit') ?? 'g'
  const source = searchParams.get('source') ?? 'spoonacular'

  if (!id) {
    return NextResponse.json({ message: 'Food ID required' }, { status: 400 })
  }

  if (source === 'local') {
    return getLocalNutrition(id, amount, unit)
  }

  if (source === 'openfoodfacts') {
    return getOffNutrition(id, amount, unit)
  }

  return getSpoonacularNutrition(id, amount, unit)
}

async function getLocalNutrition(id: string, amount: number, unit: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ message: 'Database not configured' }, { status: 503 })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)
  const { data, error } = await supabase
    .from('foods')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json({ message: 'Food not found' }, { status: 404 })
  }

  const scale = amount / 100
  return NextResponse.json({
    id: data.id,
    name: data.name,
    amount,
    unit,
    source: 'local',
    food_id: data.id,
    calories: Math.round(Number(data.calories_per_100g) * scale),
    protein: Math.round(Number(data.protein_per_100g) * scale * 10) / 10,
    carbs: Math.round(Number(data.carbs_per_100g) * scale * 10) / 10,
    fat: Math.round(Number(data.fat_per_100g) * scale * 10) / 10,
  })
}

async function getOffNutrition(id: string, amount: number, unit: string) {
  const barcode = id.replace('off_', '')

  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json?fields=product_name,nutriments`,
      { signal: AbortSignal.timeout(3000) },
    )
    if (!response.ok) {
      return NextResponse.json({ message: 'Failed to fetch nutrition data' }, { status: 502 })
    }

    const data = await response.json()
    const n = data.product?.nutriments
    if (!n) {
      return NextResponse.json({ message: 'No nutrition data available' }, { status: 404 })
    }

    const scale = amount / 100
    const result = {
      id,
      name: data.product.product_name,
      amount,
      unit,
      source: 'openfoodfacts',
      calories: Math.round((n['energy-kcal_100g'] ?? 0) * scale),
      protein: Math.round((n.proteins_100g ?? 0) * scale * 10) / 10,
      carbs: Math.round((n.carbohydrates_100g ?? 0) * scale * 10) / 10,
      fat: Math.round((n.fat_100g ?? 0) * scale * 10) / 10,
    }

    cacheFood(data.product.product_name, barcode, 'openfoodfacts', n)

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

async function getSpoonacularNutrition(id: string, amount: number, unit: string) {
  const spoonId = id.replace('spoon_', '')
  const apiKey = process.env.SPOONACULAR_API_KEY
  if (!apiKey) {
    return NextResponse.json({ message: 'Food service not configured' }, { status: 503 })
  }

  try {
    const response = await fetch(
      `https://api.spoonacular.com/food/ingredients/${spoonId}/information?amount=${amount}&unit=${encodeURIComponent(unit)}&apiKey=${apiKey}`,
    )

    if (!response.ok) {
      return NextResponse.json({ message: 'Failed to fetch nutrition data' }, { status: 502 })
    }

    const data = await response.json()

    const nutrients = data.nutrition?.nutrients ?? []
    const findNutrient = (name: string) =>
      nutrients.find((n: { name: string; amount: number }) => n.name === name)?.amount ?? 0

    const calories = Math.round(findNutrient('Calories'))
    const protein = Math.round(findNutrient('Protein') * 10) / 10
    const carbs = Math.round(findNutrient('Carbohydrates') * 10) / 10
    const fat = Math.round(findNutrient('Fat') * 10) / 10

    cacheFood(data.name, spoonId, 'spoonacular', null, {
      calories: amount > 0 ? Math.round((calories / amount) * 100) : 0,
      protein: amount > 0 ? Math.round(((protein / amount) * 100) * 10) / 10 : 0,
      carbs: amount > 0 ? Math.round(((carbs / amount) * 100) * 10) / 10 : 0,
      fat: amount > 0 ? Math.round(((fat / amount) * 100) * 10) / 10 : 0,
    })

    return NextResponse.json({
      id: spoonId,
      name: data.name,
      amount,
      unit,
      source: 'spoonacular',
      spoonacular_id: Number(spoonId),
      calories,
      protein,
      carbs,
      fat,
    })
  } catch {
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

function cacheFood(
  name: string,
  externalId: string,
  source: string,
  offNutriments?: Record<string, number> | null,
  per100g?: { calories: number; protein: number; carbs: number; fat: number },
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) return

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const macros = per100g ?? {
    calories: Math.round(offNutriments?.['energy-kcal_100g'] ?? 0),
    protein: Math.round((offNutriments?.proteins_100g ?? 0) * 10) / 10,
    carbs: Math.round((offNutriments?.carbohydrates_100g ?? 0) * 10) / 10,
    fat: Math.round((offNutriments?.fat_100g ?? 0) * 10) / 10,
  }

  supabase
    .from('foods')
    .insert({
      name,
      source,
      external_id: externalId,
      calories_per_100g: macros.calories,
      protein_per_100g: macros.protein,
      carbs_per_100g: macros.carbs,
      fat_per_100g: macros.fat,
      is_verified: false,
    })
    .then(() => {})
}
