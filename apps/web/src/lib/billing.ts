import type { User } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

type BillingProfile = {
  id: string
  email: string
  role: string
  trial_ends_at: string | null
}

const ALLOWED_BOOTSTRAP_ROLES = new Set(['free', 'personal_trainer'])

export async function ensureBillingProfile(
  adminSupabase: SupabaseClient,
  user: User
): Promise<BillingProfile | null> {
  const { data: existing, error: existingError } = await adminSupabase
    .from('user_profiles')
    .select('id, email, role, trial_ends_at')
    .eq('id', user.id)
    .maybeSingle()

  if (existingError) {
    throw existingError
  }

  if (existing) {
    return existing as BillingProfile
  }

  const rawRole = typeof user.user_metadata?.role === 'string' ? user.user_metadata.role : 'free'
  const bootstrapRole = ALLOWED_BOOTSTRAP_ROLES.has(rawRole) ? rawRole : 'free'
  const fullName = typeof user.user_metadata?.full_name === 'string'
    ? user.user_metadata.full_name.trim()
    : null

  const { data: created, error: createError } = await adminSupabase
    .from('user_profiles')
    .upsert({
      id: user.id,
      email: user.email ?? '',
      role: bootstrapRole,
      full_name: fullName,
      onboarding_completed: false,
    }, { onConflict: 'id' })
    .select('id, email, role, trial_ends_at')
    .single()

  if (createError) {
    throw createError
  }

  if (bootstrapRole === 'personal_trainer') {
    await adminSupabase
      .from('nutritionist_packages')
      .upsert({
        nutritionist_id: user.id,
        max_clients: 15,
      }, { onConflict: 'nutritionist_id' })
  }

  return created as BillingProfile
}
