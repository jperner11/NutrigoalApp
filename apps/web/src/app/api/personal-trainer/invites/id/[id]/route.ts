import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getInviteState } from '@/lib/personalTrainerInvites'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const admin = createAdminClient()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: invite } = await admin
    .from('personal_trainer_invites')
    .select(`
      *,
      trainer:personal_trainer_id (
        id,
        full_name,
        email
      )
    `)
    .eq('id', id)
    .single()

  if (!invite) {
    return NextResponse.json({ error: 'Invite not found.' }, { status: 404 })
  }

  const currentStatus = getInviteState(invite)
  if (currentStatus === 'expired' && invite.status === 'pending') {
    await admin
      .from('personal_trainer_invites')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('id', invite.id)
  }

  let currentUserProfile = null
  if (user) {
    const { data } = await admin
      .from('user_profiles')
      .select('id, email, role, personal_trainer_id, nutritionist_id')
      .eq('id', user.id)
      .single()
    currentUserProfile = data
  }

  const assignedTrainerId = currentUserProfile?.personal_trainer_id ?? currentUserProfile?.nutritionist_id ?? null
  const emailMatches = currentUserProfile?.email?.toLowerCase() === invite.invited_email.toLowerCase()
  const alreadyAssignedToOtherTrainer = Boolean(
    assignedTrainerId && assignedTrainerId !== invite.personal_trainer_id
  )

  return NextResponse.json({
    token: invite.invite_token,
    invite: {
      id: invite.id,
      invited_email: invite.invited_email,
      client_first_name: invite.client_first_name,
      status: currentStatus,
      expires_at: invite.expires_at,
      created_at: invite.created_at,
      trainer: Array.isArray(invite.trainer) ? invite.trainer[0] : invite.trainer,
    },
    currentUser: currentUserProfile
      ? {
          id: currentUserProfile.id,
          email: currentUserProfile.email,
          role: currentUserProfile.role,
          emailMatches,
          alreadyAssignedToOtherTrainer,
        }
      : null,
  })
}
