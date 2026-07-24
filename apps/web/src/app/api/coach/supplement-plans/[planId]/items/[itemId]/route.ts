import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  ApiError,
  errorResponse,
  requireAuthedTrainer,
} from '@/lib/supplementPlans'

type ItemOwnershipRow = {
  id: string
  plan_id: string
  supplement_plans: { coach_id: string } | { coach_id: string }[] | null
}

async function ensureItemOwnership(admin: ReturnType<typeof createAdminClient>, coachId: string, planId: string, itemId: string) {
  const { data, error } = await admin
    .from('supplement_plan_items')
    .select('id, plan_id, supplement_plans!inner(coach_id)')
    .eq('id', itemId)
    .eq('plan_id', planId)
    .maybeSingle()
  if (error) throw new ApiError(error.message, 400)
  const row = data as unknown as ItemOwnershipRow | null
  const supplementPlan = Array.isArray(row?.supplement_plans) ? row.supplement_plans[0] : row?.supplement_plans
  if (!row || supplementPlan?.coach_id !== coachId) throw new ApiError('Item not found.', 404)
}

export async function PATCH(req: Request, ctx: { params: Promise<{ planId: string; itemId: string }> }) {
  try {
    const { userId } = await requireAuthedTrainer()
    const { planId, itemId } = await ctx.params
    const body = await req.json().catch(() => null)
    if (!body) throw new ApiError('Invalid body.', 400)
    const admin = createAdminClient()
    await ensureItemOwnership(admin, userId, planId, itemId)

    const updates: Record<string, unknown> = {}
    if (typeof body.supplement_name === 'string' && body.supplement_name.trim()) {
      updates.supplement_name = body.supplement_name.trim()
    }
    if ('dosage' in body) updates.dosage = body.dosage?.toString().trim() || null
    if ('unit' in body) updates.unit = body.unit?.toString().trim() || null
    if ('frequency' in body) updates.frequency = body.frequency?.toString().trim() || null
    if ('time_of_day' in body) updates.time_of_day = body.time_of_day?.toString().trim() || null
    if (typeof body.with_food === 'boolean') updates.with_food = body.with_food
    if ('notes' in body) updates.notes = body.notes?.toString().trim() || null
    if (typeof body.sort_order === 'number') updates.sort_order = body.sort_order

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: true })
    }

    const { data: item, error } = await admin
      .from('supplement_plan_items')
      .update(updates)
      .eq('id', itemId)
      .select('*')
      .single()
    if (error) throw new ApiError(error.message, 400)
    return NextResponse.json({ item })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ planId: string; itemId: string }> }) {
  try {
    const { userId } = await requireAuthedTrainer()
    const { planId, itemId } = await ctx.params
    const admin = createAdminClient()
    await ensureItemOwnership(admin, userId, planId, itemId)
    const { error } = await admin
      .from('supplement_plan_items')
      .delete()
      .eq('id', itemId)
    if (error) throw new ApiError(error.message, 400)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return errorResponse(error)
  }
}
