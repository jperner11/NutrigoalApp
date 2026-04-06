import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getInviteState } from '@/lib/personalTrainerInvites'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const action = body?.action === 'decline' ? 'decline' : 'accept'

  const admin = createAdminClient()
  const { data: invite } = await admin
    .from('personal_trainer_invites')
    .select('*')
    .eq('invite_token', token)
    .single()

  if (!invite) {
    return NextResponse.json({ error: 'Invite not found.' }, { status: 404 })
  }

  const currentStatus = getInviteState(invite)
  if (currentStatus !== 'pending') {
    return NextResponse.json({ error: `This invite is ${currentStatus}.` }, { status: 400 })
  }

  const { data: profile } = await admin
    .from('user_profiles')
    .select('id, email, role, personal_trainer_id, nutritionist_id')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found.' }, { status: 404 })
  }

  if (profile.email.toLowerCase() !== invite.invited_email.toLowerCase()) {
    return NextResponse.json({ error: 'This invite belongs to a different email address.' }, { status: 403 })
  }

  if (action === 'decline') {
    await admin
      .from('personal_trainer_invites')
      .update({
        status: 'declined',
        invited_user_id: user.id,
        declined_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', invite.id)

    return NextResponse.json({ success: true, status: 'declined' })
  }

  const activeTrainerId = profile.personal_trainer_id ?? profile.nutritionist_id
  if (activeTrainerId && activeTrainerId !== invite.personal_trainer_id) {
    return NextResponse.json({
      error: 'You already have an active personal trainer. Disconnect first before accepting a new invite.',
    }, { status: 409 })
  }

  const { error: relationshipError } = await admin
    .from('nutritionist_clients')
    .upsert({
      nutritionist_id: invite.personal_trainer_id,
      client_id: user.id,
      invited_email: invite.invited_email,
      status: 'active',
    }, { onConflict: 'nutritionist_id,client_id' })

  if (relationshipError) {
    return NextResponse.json({ error: relationshipError.message }, { status: 400 })
  }

  const { error: profileError } = await admin
    .from('user_profiles')
    .update({
      role: 'personal_trainer_client',
      personal_trainer_id: invite.personal_trainer_id,
      nutritionist_id: invite.personal_trainer_id,
      onboarding_completed: false,
    })
    .eq('id', user.id)

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 })
  }

  await admin
    .from('personal_trainer_invites')
    .update({
      status: 'accepted',
      invited_user_id: user.id,
      accepted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', invite.id)

  return NextResponse.json({ success: true, status: 'accepted' })
}
