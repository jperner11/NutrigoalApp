import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createAdminClient } from '@/lib/supabase/admin'

interface CoachOfferRow {
  id: string
  coach_id: string
  title: string
  description: string | null
  price: number
  billing_period: string
  cta_label: string
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export async function GET() {
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
      rating_avg,
      rating_count,
      created_at,
      updated_at,
      coach:coach_id (
        id,
        full_name,
        avatar_url,
        role,
        coach_verification_status,
        coach_specialties,
        coach_formats,
        coach_services,
        coach_style,
        coach_check_in_frequency,
        coach_ideal_client
      )
    `)
    .eq('is_public', true)
    .order('updated_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Failed to load coach profiles.' }, { status: 500 })
  }

  const coachIds = (data ?? []).map((profile) => profile.coach_id)
  const { data: offers, error: offersError } = coachIds.length === 0
    ? { data: [] as unknown[], error: null }
    : await admin
      .from('coach_offers')
      .select('id, coach_id, title, description, price, billing_period, cta_label, is_active, sort_order, created_at, updated_at')
      .in('coach_id', coachIds)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

  if (offersError) {
    Sentry.captureException(offersError, { tags: { kind: 'api-route', route: 'coach-profiles' } })
  }

  const offersByCoachId = new Map<string, CoachOfferRow[]>()
  for (const offer of (offers as CoachOfferRow[] | null) ?? []) {
    const current = offersByCoachId.get(offer.coach_id) ?? []
    current.push(offer)
    offersByCoachId.set(offer.coach_id, current)
  }

  return NextResponse.json({
    profiles: (data ?? []).map((profile) => ({
      ...profile,
      offers: offersByCoachId.get(profile.coach_id) ?? [],
    })),
  })
}
