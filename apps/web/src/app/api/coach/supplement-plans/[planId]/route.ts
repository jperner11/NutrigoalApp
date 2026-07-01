import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  ApiError,
  ensureCoachClientAccess,
  errorResponse,
  requireAuthedTrainer,
} from '@/lib/supplementPlans'

async function loadOwnedPlan(adminClient: ReturnType<typeof createAdminClient>, coachId: string, planId: string) {
  const { data: plan, error } = await adminClient
    .from('supplement_plans')
    .select('*')
    .eq('id', planId)
    .eq('coach_id', coachId)
    .maybeSingle()
  if (error) throw new ApiError(error.message, 400)
  if (!plan) throw new ApiError('Plan not found.', 404)
  return plan
}

export async function GET(_req: Request, ctx: { params: Promise<{ planId: string }> }) {
  try {
    const { userId } = await requireAuthedTrainer()
    const { planId } = await ctx.params
    const admin = createAdminClient()
    const plan = await loadOwnedPlan(admin, userId, planId)
    const { data: items } = await admin
      .from('supplement_plan_items')
      .select('*')
      .eq('plan_id', planId)
      .order('sort_order', { ascending: true })
    return NextResponse.json({ plan: { ...plan, items: items ?? [] } })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ planId: string }> }) {
  try {
    const { userId } = await requireAuthedTrainer()
    const { planId } = await ctx.params
    const body = await req.json().catch(() => null)
    if (!body) throw new ApiError('Invalid body.', 400)
    const admin = createAdminClient()
    const plan = await loadOwnedPlan(admin, userId, planId)
    await ensureCoachClientAccess(admin, userId, plan.client_id)

    const updates: Record<string, unknown> = {}
    if (typeof body.name === 'string' && body.name.trim()) updates.name = body.name.trim()
    if ('notes' in body) updates.notes = typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null
    if ('start_date' in body) updates.start_date = body.start_date || null
    if ('end_date' in body) updates.end_date = body.end_date || null
    if (typeof body.is_active === 'boolean') updates.is_active = body.is_active

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ plan })
    }

    const { data: updated, error } = await admin
      .from('supplement_plans')
      .update(updates)
      .eq('id', planId)
      .select('*')
      .single()
    if (error) throw new ApiError(error.message, 400)
    return NextResponse.json({ plan: updated })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ planId: string }> }) {
  try {
    const { userId } = await requireAuthedTrainer()
    const { planId } = await ctx.params
    const admin = createAdminClient()
    await loadOwnedPlan(admin, userId, planId)
    const { error } = await admin
      .from('supplement_plans')
      .delete()
      .eq('id', planId)
      .eq('coach_id', userId)
    if (error) throw new ApiError(error.message, 400)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return errorResponse(error)
  }
}
