import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import * as Sentry from '@sentry/nextjs'
import { reviewerDisplayName } from '@/lib/coachReviews'

export const runtime = 'nodejs'

// GET /api/coach-reviews?coachId=<uuid>
// Public list of published reviews for a coach, plus — when signed in — whether
// the viewer is eligible to review and their own existing review.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const coachId = (searchParams.get('coachId') ?? '').trim()
  if (!coachId) {
    return NextResponse.json({ error: 'coachId is required.' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: reviews, error } = await admin
    .from('coach_reviews')
    .select('id, rating, title, body, created_at, client:client_id ( full_name )')
    .eq('coach_id', coachId)
    .eq('status', 'published')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Failed to load reviews.' }, { status: 500 })
  }

  const publicReviews = (reviews ?? []).map((r) => {
    const client = Array.isArray(r.client) ? r.client[0] : r.client
    return {
      id: r.id,
      rating: r.rating,
      title: r.title,
      body: r.body,
      created_at: r.created_at,
      reviewer_name: reviewerDisplayName(client?.full_name ?? null),
    }
  })

  // Eligibility + the viewer's own review (only relevant when authenticated).
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let canReview = false
  let myReview: { rating: number; title: string | null; body: string | null } | null = null

  if (user && user.id !== coachId) {
    const [{ data: lead }, { data: profile }, { data: existing }] = await Promise.all([
      admin
        .from('coach_leads')
        .select('id')
        .eq('coach_id', coachId)
        .eq('user_id', user.id)
        .eq('status', 'accepted')
        .maybeSingle(),
      admin
        .from('user_profiles')
        .select('personal_trainer_id, nutritionist_id')
        .eq('id', user.id)
        .maybeSingle(),
      admin
        .from('coach_reviews')
        .select('rating, title, body')
        .eq('coach_id', coachId)
        .eq('client_id', user.id)
        .maybeSingle(),
    ])

    canReview = Boolean(
      lead ||
      profile?.personal_trainer_id === coachId ||
      profile?.nutritionist_id === coachId,
    )
    myReview = existing ?? null
  }

  return NextResponse.json({ reviews: publicReviews, canReview, myReview })
}

// POST /api/coach-reviews — create or update the signed-in client's review.
// Uses the session-scoped client so RLS enforces the coaching-relationship gate.
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 })
  }

  const coachId = String((body as Record<string, unknown>).coach_id ?? '').trim()
  const ratingRaw = (body as Record<string, unknown>).rating
  const rating = typeof ratingRaw === 'number' ? Math.round(ratingRaw) : NaN
  const title = typeof (body as Record<string, unknown>).title === 'string'
    ? ((body as Record<string, unknown>).title as string).trim().slice(0, 120) || null
    : null
  const reviewBody = typeof (body as Record<string, unknown>).body === 'string'
    ? ((body as Record<string, unknown>).body as string).trim().slice(0, 2000) || null
    : null

  if (!coachId) {
    return NextResponse.json({ error: 'Coach is required.' }, { status: 400 })
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Rating must be between 1 and 5.' }, { status: 400 })
  }
  if (coachId === user.id) {
    return NextResponse.json({ error: 'You cannot review yourself.' }, { status: 400 })
  }

  // Upsert on (coach_id, client_id): RLS INSERT policy requires a real
  // relationship, UPDATE policy requires ownership. A 42501 means the viewer
  // is not an eligible client of this coach.
  const { data, error } = await supabase
    .from('coach_reviews')
    .upsert(
      { coach_id: coachId, client_id: user.id, rating, title, body: reviewBody },
      { onConflict: 'coach_id,client_id' },
    )
    .select('id, rating, title, body, created_at')
    .single()

  if (error) {
    if (error.code === '42501') {
      return NextResponse.json(
        { error: 'Only clients who have worked with this coach can leave a review.' },
        { status: 403 },
      )
    }
    Sentry.captureException(error)
    return NextResponse.json({ error: 'Failed to save review.' }, { status: 500 })
  }

  return NextResponse.json({ review: data })
}
