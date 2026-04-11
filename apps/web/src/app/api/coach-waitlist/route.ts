import { NextResponse } from 'next/server'
import { normalizeCoachWizardAnswers, type CoachWizardAnswers } from '@/lib/findCoach'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const email = String(body?.email ?? '').trim().toLowerCase()
  const answers = normalizeCoachWizardAnswers((body?.answers ?? null) as Partial<CoachWizardAnswers> | null)

  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('coach_waitlist')
    .insert({
      email,
      preferences: answers,
    })

  if (error) {
    return NextResponse.json({ error: 'Failed to join the waitlist.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
