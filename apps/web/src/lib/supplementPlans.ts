import * as Sentry from '@sentry/nextjs'
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isTrainerRole } from '@treno/shared'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface AuthedTrainer {
  userId: string
}

export async function requireAuthedTrainer(): Promise<AuthedTrainer> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new ApiError('Unauthorized', 401)
  }
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('user_profiles')
    .select('id, role')
    .eq('id', user.id)
    .single()
  if (!profile || !isTrainerRole(profile.role)) {
    throw new ApiError('Coach access only.', 403)
  }
  return { userId: user.id }
}

export async function requireAuthedUser(): Promise<{ userId: string }> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new ApiError('Unauthorized', 401)
  return { userId: user.id }
}

export async function ensureCoachClientAccess(
  admin: SupabaseClient,
  coachId: string,
  clientId: string,
): Promise<void> {
  const [{ data: ncRow }, { data: profile }] = await Promise.all([
    admin
      .from('nutritionist_clients')
      .select('id')
      .eq('nutritionist_id', coachId)
      .eq('client_id', clientId)
      .eq('status', 'active')
      .maybeSingle(),
    admin
      .from('user_profiles')
      .select('personal_trainer_id, nutritionist_id')
      .eq('id', clientId)
      .maybeSingle(),
  ])
  if (ncRow) return
  const linkedCoachId = profile?.personal_trainer_id ?? profile?.nutritionist_id
  if (linkedCoachId === coachId) return
  throw new ApiError('Client is not assigned to this coach.', 403)
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

export function errorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  Sentry.captureException(error, { tags: { feature: 'supplement-plans' } })
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}

export interface SupplementPlanItemRow {
  plan_id: string
  supplement_name: string
  dosage: string | null
  unit: string | null
  frequency: string | null
  time_of_day: string | null
  with_food: boolean
  notes: string | null
  sort_order: number
}

export function normalizeItemInput(raw: unknown, planId: string, index: number): SupplementPlanItemRow | null {
  if (!raw || typeof raw !== 'object') return null
  const item = raw as Record<string, unknown>
  const supplementName = typeof item.supplement_name === 'string' ? item.supplement_name.trim() : ''
  if (!supplementName) return null

  const optionalText = (value: unknown) =>
    typeof value === 'string' && value.trim() ? value.trim() : null

  return {
    plan_id: planId,
    supplement_name: supplementName,
    dosage: optionalText(item.dosage),
    unit: optionalText(item.unit),
    frequency: optionalText(item.frequency),
    time_of_day: optionalText(item.time_of_day),
    with_food: typeof item.with_food === 'boolean' ? item.with_food : false,
    notes: optionalText(item.notes),
    sort_order: typeof item.sort_order === 'number' ? item.sort_order : index,
  }
}
