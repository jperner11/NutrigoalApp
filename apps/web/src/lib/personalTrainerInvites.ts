import { createAdminClient } from '@/lib/supabase/admin'
import type { UserRole } from '@/lib/supabase/types'
import { isTrainerRole } from '@nutrigoal/shared'

export interface InviteRecord {
  id: string
  personal_trainer_id: string
  invited_email: string
  client_first_name: string | null
  status: 'pending' | 'accepted' | 'expired' | 'revoked' | 'declined'
  invite_token: string
  delivery_method: 'invite' | 'magiclink'
  invited_user_id: string | null
  accepted_at: string | null
  declined_at: string | null
  revoked_at: string | null
  expires_at: string
  last_sent_at: string
  created_at: string
  updated_at: string
}

export function createInviteToken() {
  return crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
}

export function getAppOrigin(origin?: string | null) {
  return origin || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}

export function getInviteNextPath(token: string) {
  return `/invite/accept?token=${encodeURIComponent(token)}`
}

export function getInviteRedirectUrl(origin: string, token: string) {
  return `${origin}/invite/accept?token=${encodeURIComponent(token)}`
}

export function getShareableInviteUrl(origin: string, token: string) {
  return `${origin}${getInviteNextPath(token)}`
}

export async function ensureTrainerAccess(userId: string, role: UserRole | null | undefined) {
  if (!isTrainerRole(role)) {
    throw new Error('Only personal trainers can manage invites.')
  }

  const admin = createAdminClient()
  const { data: trainerProfile, error } = await admin
    .from('user_profiles')
    .select('id, role')
    .eq('id', userId)
    .single()

  if (error || !trainerProfile || !isTrainerRole(trainerProfile.role as UserRole)) {
    throw new Error('Trainer profile not found.')
  }

  return trainerProfile
}

export async function resolveExistingUser(email: string) {
  const admin = createAdminClient()
  const normalizedEmail = email.trim().toLowerCase()

  const { data } = await admin
    .from('user_profiles')
    .select('id, email, role, personal_trainer_id, nutritionist_id')
    .ilike('email', normalizedEmail)
    .maybeSingle()

  return data
}

export async function sendInviteEmail(email: string, redirectTo: string, existingUserId?: string | null) {
  const normalizedEmail = email.trim().toLowerCase()
  const admin = createAdminClient()

  if (existingUserId) {
    // Existing users don't need a Supabase invite or magic link.
    // They'll log in normally and accept via the invite token URL.
    return 'magiclink' as const
  }

  const { error } = await admin.auth.admin.inviteUserByEmail(normalizedEmail, {
    redirectTo,
  })

  if (error) throw error
  return 'invite' as const
}

export function getInviteState(invite: Pick<InviteRecord, 'status' | 'expires_at'>) {
  if (invite.status !== 'pending') return invite.status
  return new Date(invite.expires_at).getTime() < Date.now() ? 'expired' : 'pending'
}
