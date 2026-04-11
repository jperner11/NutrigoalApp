import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizeCoachWizardAnswers } from '@/lib/findCoach'
import { isTrainerRole } from '@nutrigoal/shared'

export async function GET() {
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

  if (!profile || !isTrainerRole(profile.role)) {
    return NextResponse.json({ error: 'Only coaches can view leads.' }, { status: 403 })
  }

  const { data, error } = await admin
    .from('coach_leads')
    .select(`
      id,
      coach_id,
      user_id,
      status,
      stage,
      goal_summary,
      message,
      budget_label,
      preferred_format,
      experience_level,
      selected_offer_id,
      selected_offer_title,
      responded_at,
      created_at,
      updated_at,
      user:user_id (
        id,
        full_name,
        email,
        goal,
        activity_level,
        training_experience,
        role,
        personal_trainer_id,
        nutritionist_id
      )
    `)
    .eq('coach_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Failed to load leads.' }, { status: 500 })
  }

  return NextResponse.json({ leads: data ?? [] })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const coachId = String(body?.coach_id ?? '').trim()
  const goalSummary = String(body?.goal_summary ?? '').trim()
  const message = String(body?.message ?? '').trim()
  const budgetLabel = String(body?.budget_label ?? '').trim()
  const preferredFormat = String(body?.preferred_format ?? '').trim()
  const selectedOfferId = body?.selected_offer_id ? String(body.selected_offer_id).trim() : null
  const wizardPreferences = body?.wizard_preferences
    ? normalizeCoachWizardAnswers(body.wizard_preferences)
    : null

  if (!coachId || !goalSummary) {
    return NextResponse.json({ error: 'Coach and goal summary are required.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('user_profiles')
    .select('id, role, personal_trainer_id, nutritionist_id, training_experience')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found.' }, { status: 404 })
  }

  if (isTrainerRole(profile.role)) {
    return NextResponse.json({ error: 'Coaches cannot submit marketplace requests.' }, { status: 400 })
  }

  const activeTrainerId = profile.personal_trainer_id ?? profile.nutritionist_id
  if (activeTrainerId) {
    return NextResponse.json({ error: 'You already have an active coach relationship.' }, { status: 409 })
  }

  const { data: coachProfile } = await admin
    .from('coach_public_profiles')
    .select('coach_id, is_public, accepting_new_clients')
    .eq('coach_id', coachId)
    .single()

  if (!coachProfile || !coachProfile.is_public) {
    return NextResponse.json({ error: 'This coach profile is not available.' }, { status: 404 })
  }

  if (!coachProfile.accepting_new_clients) {
    return NextResponse.json({ error: 'This coach is not accepting new clients right now.' }, { status: 409 })
  }

  let selectedOfferTitle: string | null = null
  if (selectedOfferId) {
    const { data: offer } = await admin
      .from('coach_offers')
      .select('id, title, coach_id, is_active')
      .eq('id', selectedOfferId)
      .single()

    if (!offer || offer.coach_id !== coachId || !offer.is_active) {
      return NextResponse.json({ error: 'The selected offer is not available.' }, { status: 400 })
    }

    selectedOfferTitle = offer.title
  }

  const { data: existingPending } = await admin
    .from('coach_leads')
    .select('id')
    .eq('coach_id', coachId)
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .maybeSingle()

  if (existingPending) {
    return NextResponse.json({ error: 'You already have a pending request with this coach.' }, { status: 409 })
  }

  const { data, error } = await admin
    .from('coach_leads')
    .insert({
      coach_id: coachId,
      user_id: user.id,
      stage: 'new',
      goal_summary: goalSummary,
      message: message || null,
      budget_label: budgetLabel || null,
      preferred_format: preferredFormat || null,
      experience_level: profile.training_experience ?? null,
      selected_offer_id: selectedOfferId,
      selected_offer_title: selectedOfferTitle,
      wizard_preferences: wizardPreferences,
    })
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to send request.' }, { status: 500 })
  }

  return NextResponse.json({ lead: data })
}
