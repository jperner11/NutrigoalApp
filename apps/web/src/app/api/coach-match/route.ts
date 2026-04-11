import { NextResponse } from 'next/server'
import { scoreCoach } from '@/lib/coachScoring'
import {
  normalizeCoachWizardAnswers,
  type CoachMatchOffer,
  type CoachMatchProfile,
  type CoachWizardAnswers,
} from '@/lib/findCoach'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

function decodeAnswers(query: string): CoachWizardAnswers | null {
  try {
    const json = Buffer.from(query, 'base64').toString('utf-8')
    return normalizeCoachWizardAnswers(JSON.parse(json) as Partial<CoachWizardAnswers>)
  } catch {
    return null
  }
}

interface CoachOfferRow extends CoachMatchOffer {
  coach_id: string
  created_at?: string
  updated_at?: string
}

type RawCoachProfile = Omit<CoachMatchProfile, 'coach' | 'offers'> & {
  coach: CoachMatchProfile['coach'] | CoachMatchProfile['coach'][] | null
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const encoded = searchParams.get('q')

  if (!encoded) {
    return NextResponse.json({ error: 'Wizard answers are required.' }, { status: 400 })
  }

  const answers = decodeAnswers(encoded)
  if (!answers) {
    return NextResponse.json({ error: 'Invalid wizard answers.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('coach_public_profiles')
    .select(`
      coach_id,
      slug,
      is_public,
      headline,
      bio,
      location_label,
      consultation_url,
      price_from,
      price_to,
      currency,
      accepting_new_clients,
      coach:coach_id (
        id,
        full_name,
        email,
        avatar_url,
        role,
        coach_specialties,
        coach_formats,
        coach_services,
        coach_style,
        coach_check_in_frequency,
        coach_ideal_client
      )
    `)
    .eq('is_public', true)
    .eq('accepting_new_clients', true)
    .order('updated_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Failed to load coaches.' }, { status: 500 })
  }

  const coachIds = (data ?? []).map((profile) => profile.coach_id)
  const { data: offers } = coachIds.length === 0
    ? { data: [] as CoachOfferRow[] }
    : await admin
      .from('coach_offers')
      .select('id, coach_id, title, description, price, billing_period, cta_label, is_active, sort_order')
      .in('coach_id', coachIds)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

  const offersByCoachId = new Map<string, CoachMatchOffer[]>()
  for (const offer of (offers as CoachOfferRow[] | null) ?? []) {
    const current = offersByCoachId.get(offer.coach_id) ?? []
    const { coach_id: _coachId, created_at: _createdAt, updated_at: _updatedAt, ...nextOffer } = offer
    current.push(nextOffer)
    offersByCoachId.set(offer.coach_id, current)
  }

  const profiles: CoachMatchProfile[] = []
  for (const profile of (data ?? []) as RawCoachProfile[]) {
    const coach = Array.isArray(profile.coach) ? profile.coach[0] : profile.coach
    if (!coach) continue

    profiles.push({
      ...profile,
      coach,
      offers: offersByCoachId.get(profile.coach_id) ?? [],
    })
  }

  const matches = profiles
    .map((profile) => ({
      ...profile,
      ...scoreCoach(answers, profile),
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 20)

  return NextResponse.json({ matches })
}
