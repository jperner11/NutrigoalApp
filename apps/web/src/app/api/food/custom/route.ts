import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, getClientIp } from '@/lib/rateLimit'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('foods')
    .select('*')
    .eq('created_by', user.id)
    .eq('source', 'custom')
    .order('name')

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  return NextResponse.json({ foods: data })
}

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const { success } = rateLimit(`food-custom:${ip}`, { limit: 20, windowMs: 60_000 })
  if (!success) {
    return NextResponse.json({ message: 'Too many requests' }, { status: 429 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { name, brand, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, default_amount, default_unit } = body

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return NextResponse.json({ message: 'Name must be at least 2 characters' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('foods')
    .insert({
      name: name.trim(),
      brand: brand?.trim() || null,
      source: 'custom',
      created_by: user.id,
      calories_per_100g: Number(calories_per_100g) || 0,
      protein_per_100g: Number(protein_per_100g) || 0,
      carbs_per_100g: Number(carbs_per_100g) || 0,
      fat_per_100g: Number(fat_per_100g) || 0,
      default_amount: Number(default_amount) || 100,
      default_unit: default_unit || 'g',
      is_verified: false,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  return NextResponse.json({ food: data }, { status: 201 })
}

export async function PUT(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { id, name, brand, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, default_amount, default_unit } = body

  if (!id) {
    return NextResponse.json({ message: 'Food ID required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('foods')
    .update({
      name: name?.trim(),
      brand: brand?.trim() || null,
      calories_per_100g: Number(calories_per_100g) || 0,
      protein_per_100g: Number(protein_per_100g) || 0,
      carbs_per_100g: Number(carbs_per_100g) || 0,
      fat_per_100g: Number(fat_per_100g) || 0,
      default_amount: Number(default_amount) || 100,
      default_unit: default_unit || 'g',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('created_by', user.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  return NextResponse.json({ food: data })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) {
    return NextResponse.json({ message: 'Food ID required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('foods')
    .delete()
    .eq('id', id)
    .eq('created_by', user.id)

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
