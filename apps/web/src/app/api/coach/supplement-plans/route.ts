import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  ApiError,
  ensureCoachClientAccess,
  errorResponse,
  normalizeItemInput,
  requireAuthedTrainer,
  type SupplementPlanItemRow,
} from '@/lib/supplementPlans'

export async function GET(request: Request) {
  try {
    const { userId } = await requireAuthedTrainer()
    const url = new URL(request.url)
    const clientId = url.searchParams.get('clientId')
    const admin = createAdminClient()

    let query = admin
      .from('supplement_plans')
      .select('*, items:supplement_plan_items(*)')
      .eq('coach_id', userId)
      .order('created_at', { ascending: false })

    if (clientId) {
      await ensureCoachClientAccess(admin, userId, clientId)
      query = query.eq('client_id', clientId)
    }

    const { data, error } = await query
    if (error) throw new ApiError(error.message, 400)
    return NextResponse.json({ plans: data ?? [] })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await requireAuthedTrainer()
    const body = await request.json().catch(() => null)
    if (!body) throw new ApiError('Invalid body.', 400)
    const clientId = typeof body.client_id === 'string' ? body.client_id : null
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!clientId) throw new ApiError('client_id is required.', 400)
    if (!name) throw new ApiError('name is required.', 400)

    const admin = createAdminClient()
    await ensureCoachClientAccess(admin, userId, clientId)

    const insert = {
      coach_id: userId,
      client_id: clientId,
      name,
      notes: typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null,
      start_date: typeof body.start_date === 'string' && body.start_date ? body.start_date : new Date().toISOString().slice(0, 10),
      end_date: typeof body.end_date === 'string' && body.end_date ? body.end_date : null,
      is_active: typeof body.is_active === 'boolean' ? body.is_active : true,
    }

    const { data: plan, error } = await admin
      .from('supplement_plans')
      .insert(insert)
      .select('*')
      .single()

    if (error) throw new ApiError(error.message, 400)

    // Optional initial items
    let items: unknown[] = []
    if (Array.isArray(body.items) && body.items.length > 0) {
      const rows = (body.items as unknown[])
        .map((raw, index) => normalizeItemInput(raw, plan.id, index))
        .filter((row): row is SupplementPlanItemRow => row !== null)
      if (rows.length > 0) {
        const { data: insertedItems, error: itemsError } = await admin
          .from('supplement_plan_items')
          .insert(rows)
          .select('*')
        if (itemsError) throw new ApiError(itemsError.message, 400)
        items = insertedItems ?? []
      }
    }

    return NextResponse.json({ plan: { ...plan, items } })
  } catch (error) {
    return errorResponse(error)
  }
}
