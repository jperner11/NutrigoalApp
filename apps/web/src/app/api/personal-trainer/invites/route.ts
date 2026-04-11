import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  createInviteToken,
  ensureTrainerAccess,
  getAppOrigin,
  getInviteRedirectUrl,
  getShareableInviteUrl,
  resolveExistingUser,
  sendInviteEmail,
} from '@/lib/personalTrainerInvites'

export async function GET() {
  try {
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
      .select('id, role')
      .eq('id', user.id)
      .single()

    await ensureTrainerAccess(user.id, profile?.role)

    const { data: invites, error } = await admin
      .from('personal_trainer_invites')
      .select('*')
      .eq('personal_trainer_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ invites: invites ?? [] })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load invites.'
    return NextResponse.json({ error: message }, { status: 403 })
  }
}

export async function POST(request: Request) {
  try {
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
      .select('id, role, full_name')
      .eq('id', user.id)
      .single()

    await ensureTrainerAccess(user.id, profile?.role)

    const body = await request.json().catch(() => null)
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    const clientFirstName = typeof body?.clientFirstName === 'string' ? body.clientFirstName.trim() : ''

    if (!email) {
      return NextResponse.json({ error: 'Client email is required.' }, { status: 400 })
    }

    const { count: activeClientCount } = await admin
      .from('nutritionist_clients')
      .select('id', { count: 'exact', head: true })
      .eq('nutritionist_id', user.id)
      .eq('status', 'active')

    const { data: packageRow } = await admin
      .from('nutritionist_packages')
      .select('max_clients')
      .eq('nutritionist_id', user.id)
      .maybeSingle()

    const { count: pendingInviteCount } = await admin
      .from('personal_trainer_invites')
      .select('id', { count: 'exact', head: true })
      .eq('personal_trainer_id', user.id)
      .eq('status', 'pending')

    const maxClients = packageRow?.max_clients ?? 10
    const totalCount = (activeClientCount ?? 0) + (pendingInviteCount ?? 0)

    if (totalCount >= maxClients) {
      return NextResponse.json({ error: `Client limit reached (${maxClients}).` }, { status: 400 })
    }

    const { data: existingPending } = await admin
      .from('personal_trainer_invites')
      .select('id')
      .eq('personal_trainer_id', user.id)
      .eq('invited_email', email)
      .eq('status', 'pending')
      .maybeSingle()

    if (existingPending) {
      return NextResponse.json({ error: 'This client already has a pending invite.' }, { status: 409 })
    }

    const token = createInviteToken()
    const existingUser = await resolveExistingUser(email)

    const { data: invite, error: insertError } = await admin
      .from('personal_trainer_invites')
      .insert({
        personal_trainer_id: user.id,
        invited_email: email,
        client_first_name: clientFirstName || null,
        invite_token: token,
        invited_user_id: existingUser?.id ?? null,
      })
      .select('*')
      .single()

    if (insertError || !invite) {
      return NextResponse.json({ error: insertError?.message ?? 'Failed to create invite.' }, { status: 400 })
    }

    const appOrigin = getAppOrigin(request.headers.get('origin'))
    const redirectTo = getInviteRedirectUrl(appOrigin, invite.id)

    try {
      const deliveryMethod = await sendInviteEmail(email, redirectTo, existingUser?.id)

      await admin
        .from('personal_trainer_invites')
        .update({
          delivery_method: deliveryMethod,
          last_sent_at: new Date().toISOString(),
        })
        .eq('id', invite.id)
    } catch (error) {
      await admin.from('personal_trainer_invites').delete().eq('id', invite.id)
      const message = error instanceof Error ? error.message : 'Failed to send invite email.'
      return NextResponse.json({ error: message }, { status: 400 })
    }

    const deliveryMethodFinal = existingUser?.id ? 'magiclink' : 'invite'

    return NextResponse.json({
      invite: {
        ...invite,
        delivery_method: deliveryMethodFinal,
        share_url: getShareableInviteUrl(appOrigin, token),
        personal_trainer_name: profile?.full_name ?? null,
      },
      message: existingUser?.id
        ? 'Join request sent. The client must accept before they become active.'
        : 'Invite sent. The client must accept before they appear as active.',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create invite.'
    return NextResponse.json({ error: message }, { status: 403 })
  }
}
