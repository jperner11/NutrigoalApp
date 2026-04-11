import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  ensureTrainerAccess,
  getAppOrigin,
  getShareableInviteUrl,
  sendInviteEmail,
} from '@/lib/personalTrainerInvites'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('user_profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  await ensureTrainerAccess(user.id, profile?.role)

  const { data: invite } = await admin
    .from('personal_trainer_invites')
    .select('*')
    .eq('id', id)
    .eq('personal_trainer_id', user.id)
    .single()

  if (!invite) {
    return NextResponse.json({ error: 'Invite not found.' }, { status: 404 })
  }

  if (invite.status !== 'pending') {
    return NextResponse.json({ error: 'Only pending invites can be resent.' }, { status: 400 })
  }

  const appOrigin = getAppOrigin(request.headers.get('origin'))
  const inviteUrl = getShareableInviteUrl(appOrigin, invite.invite_token)

  try {
    await sendInviteEmail(
      invite.invited_email,
      inviteUrl,
      profile?.full_name ?? '',
      invite.client_first_name,
    )

    await admin
      .from('personal_trainer_invites')
      .update({
        delivery_method: 'invite',
        last_sent_at: new Date().toISOString(),
      })
      .eq('id', invite.id)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to resend invite.'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  return NextResponse.json({
    success: true,
    share_url: inviteUrl,
  })
}
