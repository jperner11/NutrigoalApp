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
  // Always prefer the configured app URL for external-facing links (invites, emails)
  return process.env.NEXT_PUBLIC_APP_URL || origin || 'http://localhost:3000'
}

export function getInviteNextPath(token: string) {
  return `/invite/accept?token=${encodeURIComponent(token)}`
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

export async function sendInviteEmail(
  email: string,
  inviteUrl: string,
  trainerName: string,
  clientFirstName?: string | null,
) {
  const resendKey = process.env.RESEND_API_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!resendKey) throw new Error('Email sending is not configured.')

  const greeting = clientFirstName || 'there'
  const coachLabel = trainerName || 'A coach'

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${resendKey}`,
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || 'Meal & Motion <noreply@mealandmotion.com>',
      to: [email.trim().toLowerCase()],
      subject: `${coachLabel} invited you to Meal & Motion`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 0">
          <h2 style="margin:0 0 16px">You've been invited!</h2>
          <p style="color:#444;line-height:1.6">
            Hi ${greeting}, <strong>${coachLabel}</strong> has invited you to join their roster on Meal &amp; Motion.
          </p>
          <p style="color:#444;line-height:1.6">
            Click the button below to create your account and get started.
          </p>
          <a href="${inviteUrl}"
             style="display:inline-block;margin:24px 0;padding:14px 28px;background:#e63946;color:#f5f1ea;text-decoration:none;border-radius:10px;font-weight:600">
            Accept Invitation
          </a>
          <p style="color:#999;font-size:13px;line-height:1.5">
            If you didn't expect this invitation, you can safely ignore this email.
          </p>
          <p style="color:#999;font-size:13px">— The Meal &amp; Motion Team</p>
        </div>
      `,
    }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message || 'Failed to send invite email.')
  }

  return 'invite' as const
}

export function getInviteState(invite: Pick<InviteRecord, 'status' | 'expires_at'>) {
  if (invite.status !== 'pending') return invite.status
  return new Date(invite.expires_at).getTime() < Date.now() ? 'expired' : 'pending'
}
