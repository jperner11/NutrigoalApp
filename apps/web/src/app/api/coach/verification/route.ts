import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isTrainerRole } from '@treno/shared'
import * as Sentry from '@sentry/nextjs'

export const runtime = 'nodejs'

// POST /api/coach/verification — a coach submits credentials and requests review.
// Moves their status to 'pending'. Only an admin (via /api/admin/verify-coach)
// can later grant 'verified'.
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('user_profiles')
    .select('role, coach_verification_status')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || !isTrainerRole(profile.role)) {
    return NextResponse.json({ error: 'Only coaches can request verification.' }, { status: 403 })
  }
  if (profile.coach_verification_status === 'verified') {
    return NextResponse.json({ error: 'Your account is already verified.' }, { status: 400 })
  }

  const body = await request.json().catch(() => null)
  const credentialUrl = typeof body?.credential_url === 'string'
    ? body.credential_url.trim().slice(0, 500)
    : ''
  const credentialNote = typeof body?.credential_note === 'string'
    ? body.credential_note.trim().slice(0, 1000)
    : ''

  if (!credentialUrl && !credentialNote) {
    return NextResponse.json(
      { error: 'Add a link to your certification or a note for our team to review.' },
      { status: 400 },
    )
  }

  const { error } = await admin
    .from('user_profiles')
    .update({
      coach_verification_status: 'pending',
      coach_credential_url: credentialUrl || null,
      coach_credential_note: credentialNote || null,
    })
    .eq('id', user.id)

  if (error) {
    Sentry.captureException(error)
    return NextResponse.json({ error: 'Failed to submit verification request.' }, { status: 500 })
  }

  return NextResponse.json({ status: 'pending' })
}
