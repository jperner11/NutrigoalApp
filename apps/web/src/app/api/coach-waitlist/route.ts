import { NextResponse } from 'next/server'
import { normalizeCoachWizardAnswers, type CoachWizardAnswers } from '@/lib/findCoach'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit, getClientIp } from '@/lib/rateLimit'

export const runtime = 'nodejs'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const email = String(body?.email ?? '').trim().toLowerCase()
  const answers = normalizeCoachWizardAnswers((body?.answers ?? null) as Partial<CoachWizardAnswers> | null)

  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 })
  }

  const ip = getClientIp(request)
  const { success } = rateLimit(`coach-waitlist:${ip}`, { limit: 5, windowMs: 60_000 })
  if (!success) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  const admin = createAdminClient()
  // Re-joining with the same email is a no-op success
  const { error } = await admin
    .from('coach_waitlist')
    .upsert({
      email,
      preferences: answers,
    }, { onConflict: 'email', ignoreDuplicates: true })

  if (error) {
    return NextResponse.json({ error: 'Failed to join the waitlist.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
