import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/admin/verify-coach
// Body: { email: string, decision: 'verified' | 'rejected' | 'unverified' }
// Admin-only (ADMIN_SECRET bearer). Only this route can grant the verified badge.
export async function POST(request: Request) {
  const authHeader = request.headers.get('Authorization')
  const adminSecret = process.env.ADMIN_SECRET
  if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let email: string
  let decision: string
  try {
    const body = await request.json()
    email = body.email
    decision = body.decision ?? 'verified'
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'email is required' }, { status: 400 })
  }
  if (!['verified', 'rejected', 'unverified'].includes(decision)) {
    return NextResponse.json({ error: 'decision must be verified, rejected, or unverified' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: profile, error: lookupError } = await supabase
    .from('user_profiles')
    .select('id, email, role')
    .ilike('email', email.trim().toLowerCase())
    .maybeSingle()

  if (lookupError) {
    return NextResponse.json({ error: 'Failed to look up user' }, { status: 500 })
  }
  if (!profile) {
    return NextResponse.json({ error: `No user found with email: ${email}` }, { status: 404 })
  }

  const { error: updateError } = await supabase
    .from('user_profiles')
    .update({
      coach_verification_status: decision,
      coach_verified_at: decision === 'verified' ? new Date().toISOString() : null,
    })
    .eq('id', profile.id)

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update verification status' }, { status: 500 })
  }

  return NextResponse.json({ success: true, userId: profile.id, email: profile.email, decision })
}
