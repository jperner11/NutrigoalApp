import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, getClientIp } from '@/lib/rateLimit'

export const runtime = 'nodejs'

// POST /api/feedback — signed-in users leave product feedback (beta testers).
// Rows land in the `feedback` table (migration 062) for triage.
export async function POST(request: Request) {
  const ip = getClientIp(request)
  const { success } = rateLimit(`feedback:${ip}`, { limit: 5, windowMs: 60_000 })
  if (!success) {
    return NextResponse.json({ message: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
  }

  let body: { message?: unknown; page?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid request body' }, { status: 400 })
  }

  const message = typeof body.message === 'string' ? body.message.trim() : ''
  const page = typeof body.page === 'string' ? body.page.slice(0, 200) : null
  if (message.length < 3 || message.length > 4000) {
    return NextResponse.json({ message: 'Feedback must be between 3 and 4000 characters.' }, { status: 400 })
  }

  const { error } = await supabase.from('feedback').insert({ user_id: user.id, message, page })
  if (error) {
    Sentry.captureException(error, { tags: { kind: 'api-route', route: 'feedback' } })
    return NextResponse.json({ message: 'Failed to save feedback. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
