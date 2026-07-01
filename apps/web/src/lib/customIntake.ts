import { createAdminClient } from '@/lib/supabase/admin'
import type { UserRole } from '@/lib/supabase/types'
import { isTrainerRole } from '@treno/shared'

export type CustomIntakeQuestionType =
  | 'short_text'
  | 'long_text'
  | 'single_select'
  | 'multi_select'
  | 'yes_no'

export const CUSTOM_INTAKE_QUESTION_TYPES: CustomIntakeQuestionType[] = [
  'short_text',
  'long_text',
  'single_select',
  'multi_select',
  'yes_no',
]

export async function ensureTrainer(role: UserRole | null | undefined) {
  if (!role || !isTrainerRole(role)) {
    throw new Error('Only coaches can manage custom intake questions.')
  }
}

/**
 * Verify that `clientId` is an active client of `trainerId` (via either
 * `nutritionist_clients` row with status='active' or legacy
 * `user_profiles.personal_trainer_id` / `nutritionist_id`).
 */
export async function ensureCoachOwnsClient(trainerId: string, clientId: string): Promise<boolean> {
  const admin = createAdminClient()
  const { data: rel } = await admin
    .from('nutritionist_clients')
    .select('id')
    .eq('nutritionist_id', trainerId)
    .eq('client_id', clientId)
    .eq('status', 'active')
    .maybeSingle()
  if (rel) return true

  const { data: profile } = await admin
    .from('user_profiles')
    .select('personal_trainer_id, nutritionist_id')
    .eq('id', clientId)
    .maybeSingle()

  const linked = profile?.personal_trainer_id ?? profile?.nutritionist_id ?? null
  return linked === trainerId
}

/**
 * Return the trainer id that the given client is currently assigned to,
 * preferring an active `nutritionist_clients` relationship over the legacy
 * single-coach FK on the user profile.
 */
export async function getAssignedTrainerForClient(clientId: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data: rel } = await admin
    .from('nutritionist_clients')
    .select('nutritionist_id')
    .eq('client_id', clientId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (rel?.nutritionist_id) return rel.nutritionist_id

  const { data: profile } = await admin
    .from('user_profiles')
    .select('personal_trainer_id, nutritionist_id')
    .eq('id', clientId)
    .maybeSingle()

  return profile?.personal_trainer_id ?? profile?.nutritionist_id ?? null
}

export function isValidQuestionType(t: unknown): t is CustomIntakeQuestionType {
  return typeof t === 'string' && (CUSTOM_INTAKE_QUESTION_TYPES as string[]).includes(t)
}
