import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { rateLimit, getClientIp } from '@/lib/rateLimit'

interface FoodResult {
  id: string
  name: string
  source: 'local' | 'spoonacular' | 'openfoodfacts'
  external_id?: string
  calories_per_100g?: number
  protein_per_100g?: number
  carbs_per_100g?: number
  fat_per_100g?: number
  default_amount?: number
  default_unit?: string
  brand?: string | null
}

export async function GET(request: Request) {
  const ip = getClientIp(request)
  const { success } = rateLimit(`food-search:${ip}`, { limit: 30, windowMs: 60_000 })
  if (!success) {
    return NextResponse.json({ message: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query')
  const limit = Math.min(Number(searchParams.get('number') ?? '10'), 20)

  if (!query || query.trim().length < 2) {
    return NextResponse.json({ message: 'Query must be at least 2 characters' }, { status: 400 })
  }

  const results: FoodResult[] = []
  const seenNames = new Set<string>()

  const localResults = await searchLocal(query, limit)
  for (const r of localResults) {
    const key = r.name.toLowerCase()
    if (!seenNames.has(key)) {
      seenNames.add(key)
      results.push(r)
    }
  }

  if (results.length < limit) {
    const spoonResults = await searchSpoonacular(query, limit - results.length)
    for (const r of spoonResults) {
      const key = r.name.toLowerCase()
      if (!seenNames.has(key)) {
        seenNames.add(key)
        results.push(r)
      }
    }
  }

  if (results.length < limit) {
    const offResults = await searchOpenFoodFacts(query, limit - results.length)
    for (const r of offResults) {
      const key = r.name.toLowerCase()
      if (!seenNames.has(key)) {
        seenNames.add(key)
        results.push(r)
      }
    }
  }

  return NextResponse.json({ results })
}

async function searchLocal(query: string, limit: number): Promise<FoodResult[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) return []

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const { data, error } = await supabase
    .from('foods')
    .select('id, name, brand, source, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, default_amount, default_unit')
    .or(`name.ilike.%${query}%`)
    .order('is_verified', { ascending: false })
    .limit(limit)

  if (error || !data) return []

  return data.map((row) => ({
    id: row.id,
    name: row.brand ? `${row.name} (${row.brand})` : row.name,
    source: 'local' as const,
    calories_per_100g: Number(row.calories_per_100g),
    protein_per_100g: Number(row.protein_per_100g),
    carbs_per_100g: Number(row.carbs_per_100g),
    fat_per_100g: Number(row.fat_per_100g),
    default_amount: Number(row.default_amount),
    default_unit: row.default_unit,
    brand: row.brand,
  }))
}

async function searchSpoonacular(query: string, limit: number): Promise<FoodResult[]> {
  const apiKey = process.env.SPOONACULAR_API_KEY
  if (!apiKey) return []

  try {
    const response = await fetch(
      `https://api.spoonacular.com/food/ingredients/search?query=${encodeURIComponent(query)}&number=${limit}&apiKey=${apiKey}`,
    )
    if (!response.ok) return []

    const data = await response.json()
    return (data.results ?? []).map((item: { id: number; name: string }) => ({
      id: `spoon_${item.id}`,
      name: item.name,
      source: 'spoonacular' as const,
      external_id: String(item.id),
    }))
  } catch {
    return []
  }
}

async function searchOpenFoodFacts(query: string, limit: number): Promise<FoodResult[]> {
  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=${limit}&fields=code,product_name,brands,nutriments`,
      { signal: AbortSignal.timeout(3000) },
    )
    if (!response.ok) return []

    const data = await response.json()
    return (data.products ?? [])
      .filter((p: Record<string, unknown>) => p.product_name && p.nutriments)
      .map((p: { code: string; product_name: string; brands?: string; nutriments: Record<string, number> }) => ({
        id: `off_${p.code}`,
        name: p.brands ? `${p.product_name} (${p.brands})` : p.product_name,
        source: 'openfoodfacts' as const,
        external_id: p.code,
        calories_per_100g: Math.round(p.nutriments['energy-kcal_100g'] ?? 0),
        protein_per_100g: Math.round((p.nutriments.proteins_100g ?? 0) * 10) / 10,
        carbs_per_100g: Math.round((p.nutriments.carbohydrates_100g ?? 0) * 10) / 10,
        fat_per_100g: Math.round((p.nutriments.fat_100g ?? 0) * 10) / 10,
        default_amount: 100,
        default_unit: 'g',
        brand: p.brands ?? null,
      }))
  } catch {
    return []
  }
}
