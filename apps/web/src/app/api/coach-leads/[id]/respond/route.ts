import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isTrainerRole } from '@nutrigoal/shared'

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

  const body = await request.json().catch(() => null)
  const action = body?.action === 'decline' ? 'decline' : 'accept'
  const admin = createAdminClient()

  const { data: trainerProfile } = await admin
    .from('user_profiles')
    .select('id, role')
    .eq('id', user.id)
    .single()

  if (!trainerProfile || !isTrainerRole(trainerProfile.role)) {
    return NextResponse.json({ error: 'Only coaches can respond to leads.' }, { status: 403 })
  }

  const { data: lead } = await admin
    .from('coach_leads')
    .select('id, coach_id, user_id, status')
    .eq('id', id)
    .single()

  if (!lead) {
    return NextResponse.json({ error: 'Lead not found.' }, { status: 404 })
  }

  if (lead.coach_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (lead.status !== 'pending') {
    return NextResponse.json({ error: 'This lead has already been handled.' }, { status: 400 })
  }

  if (action === 'decline') {
    await admin
      .from('coach_leads')
      .update({
        status: 'declined',
        stage: 'lost',
        responded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    return NextResponse.json({ success: true, status: 'declined' })
  }

  const { data: targetProfile } = await admin
    .from('user_profiles')
    .select('id, email, personal_trainer_id, nutritionist_id')
    .eq('id', lead.user_id)
    .single()

  if (!targetProfile) {
    return NextResponse.json({ error: 'Lead profile not found.' }, { status: 404 })
  }

  const activeTrainerId = targetProfile.personal_trainer_id ?? targetProfile.nutritionist_id
  if (activeTrainerId && activeTrainerId !== user.id) {
    return NextResponse.json({
      error: 'This user already has an active personal trainer.',
    }, { status: 409 })
  }

  const { error: relationshipError } = await admin
    .from('nutritionist_clients')
    .upsert({
      nutritionist_id: user.id,
      client_id: lead.user_id,
      invited_email: targetProfile.email,
      status: 'active',
    }, { onConflict: 'nutritionist_id,client_id' })

  if (relationshipError) {
    return NextResponse.json({ error: relationshipError.message }, { status: 400 })
  }

  const { error: profileError } = await admin
    .from('user_profiles')
    .update({
      role: 'personal_trainer_client',
      personal_trainer_id: user.id,
      nutritionist_id: user.id,
      onboarding_completed: false,
    })
    .eq('id', lead.user_id)

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 })
  }

  await admin
    .from('coach_leads')
    .update({
      status: 'accepted',
      stage: 'won',
      responded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  return NextResponse.json({ success: true, status: 'accepted' })
}
