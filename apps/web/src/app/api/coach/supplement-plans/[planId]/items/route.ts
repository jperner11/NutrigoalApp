import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  ApiError,
  errorResponse,
  normalizeItemInput,
  requireAuthedTrainer,
} from '@/lib/supplementPlans'

export async function POST(req: Request, ctx: { params: Promise<{ planId: string }> }) {
  try {
    const { userId } = await requireAuthedTrainer()
    const { planId } = await ctx.params
    const body = await req.json().catch(() => null)
    if (!body) throw new ApiError('Invalid body.', 400)
    const admin = createAdminClient()
    const { data: plan, error: planError } = await admin
      .from('supplement_plans')
      .select('id, coach_id')
      .eq('id', planId)
      .eq('coach_id', userId)
      .maybeSingle()
    if (planError) throw new ApiError(planError.message, 400)
    if (!plan) throw new ApiError('Plan not found.', 404)

    const insertRow = normalizeItemInput(body, planId, body.sort_order ?? 0)
    if (!insertRow) throw new ApiError('supplement_name is required.', 400)
    const { data: item, error } = await admin
      .from('supplement_plan_items')
      .insert(insertRow)
      .select('*')
      .single()
    if (error) throw new ApiError(error.message, 400)
    return NextResponse.json({ item })
  } catch (error) {
    return errorResponse(error)
  }
}
