import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isTrainerRole } from '@nutrigoal/shared'
import { COACH_LEAD_STAGES } from '@/lib/coachMarketplace'

export async function PATCH(
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
  const stage = String(body?.stage ?? '').trim()
  if (!COACH_LEAD_STAGES.includes(stage as (typeof COACH_LEAD_STAGES)[number])) {
    return NextResponse.json({ error: 'Invalid lead stage.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: trainerProfile } = await admin
    .from('user_profiles')
    .select('id, role')
    .eq('id', user.id)
    .single()

  if (!trainerProfile || !isTrainerRole(trainerProfile.role)) {
    return NextResponse.json({ error: 'Only coaches can update lead stages.' }, { status: 403 })
  }

  const { data: lead } = await admin
    .from('coach_leads')
    .select('id, coach_id, status')
    .eq('id', id)
    .single()

  if (!lead) {
    return NextResponse.json({ error: 'Lead not found.' }, { status: 404 })
  }

  if (lead.coach_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (lead.status !== 'pending') {
    return NextResponse.json({ error: 'Only pending leads can move through the pipeline.' }, { status: 400 })
  }

  const { data, error } = await admin
    .from('coach_leads')
    .update({
      stage,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id, stage')
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to update lead stage.' }, { status: 500 })
  }

  return NextResponse.json({ lead: data })
}
