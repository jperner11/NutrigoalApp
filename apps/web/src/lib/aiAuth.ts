import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { isManagedClientRole, normalizeRole } from '@treno/shared'
import type { UserRole } from '@/lib/supabase/types'

const AI_ROLES = new Set(['pro', 'unlimited', 'personal_trainer'])

export type AiAuthResult =
  | { userId: string; role: UserRole; response?: undefined }
  | { userId?: undefined; role?: undefined; response: NextResponse }

/**
 * Resolves the authenticated user and their role for AI endpoints.
 * Never trust a userId from the request body — tier checks must run
 * against the session user.
 */
export async function requireAiUser(
  options: { requireAiRole?: boolean } = {},
): Promise<AiAuthResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { response: NextResponse.json({ message: 'Not authenticated' }, { status: 401 }) }
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return { response: NextResponse.json({ message: 'Profile not found' }, { status: 404 }) }
  }

  const role = profile.role as UserRole

  if (options.requireAiRole && !AI_ROLES.has(normalizeRole(role))) {
    return {
      response: NextResponse.json(
        { message: 'This AI feature requires a Pro plan or higher. Upgrade to unlock.' },
        { status: 403 },
      ),
    }
  }

  return { userId: user.id, role }
}

// Plan generation makes one API call per day of the week, so usage rows
// created within this window belong to the generation that is currently in
// progress and must not count against the free/pro limits.
const GENERATION_SESSION_MS = 30 * 60 * 1000
const PRO_COOLDOWN_DAYS = 7

export type PlanGenerationType = 'meal_suggestion' | 'workout_suggestion'

/**
 * Server-side regeneration gate. Returns a NextResponse to send back when the
 * user is not allowed to generate, or null when generation may proceed.
 * Free: one plan ever. Pro: one per week. Managed clients: never (plans come
 * from their coach). Unlimited and trainers: no limit.
 */
export async function checkPlanGenerationAllowed(
  supabase: SupabaseClient,
  userId: string,
  role: UserRole | null | undefined,
  type: PlanGenerationType,
): Promise<NextResponse | null> {
  const normalized = normalizeRole(role)

  if (isManagedClientRole(normalized)) {
    return NextResponse.json(
      { message: 'Your plans are managed by your coach.' },
      { status: 403 },
    )
  }

  if (normalized !== 'free' && normalized !== 'pro') return null

  const sessionStart = new Date(Date.now() - GENERATION_SESSION_MS).toISOString()

  let query = supabase
    .from('ai_usage')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('type', type)
    .lt('created_at', sessionStart)

  if (normalized === 'pro') {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - PRO_COOLDOWN_DAYS)
    query = query.gte('created_at', cutoff.toISOString())
  }

  const { count } = await query
  if ((count ?? 0) > 0) {
    return NextResponse.json(
      {
        message: normalized === 'free'
          ? 'Upgrade to Pro to regenerate AI plans.'
          : 'Pro plans can regenerate once per week. Try again later.',
      },
      { status: 403 },
    )
  }

  return null
}

/** Records a plan-generation call against the user's quota. */
export async function logPlanGeneration(
  supabase: SupabaseClient,
  userId: string,
  type: PlanGenerationType,
  prompt: string,
  response: string,
  tokensUsed: number,
): Promise<void> {
  await supabase.from('ai_usage').insert({
    user_id: userId,
    type,
    prompt: prompt.substring(0, 500),
    response: response.substring(0, 500),
    tokens_used: tokensUsed,
  })
}
