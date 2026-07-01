import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createAdminClient } from '@/lib/supabase/admin'

// Downgrades expired Pro trials. The trial/start route grants role 'pro'
// immediately; if the Stripe trial subscription was never created (or never
// converted), nothing else ever revokes the role — this cron does.
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const nowIso = new Date().toISOString()

  const { data: expired, error } = await admin
    .from('user_profiles')
    .select('id')
    .eq('role', 'pro')
    .not('trial_ends_at', 'is', null)
    .lt('trial_ends_at', nowIso)

  if (error) {
    Sentry.captureException(error, { tags: { kind: 'cron', route: 'expire-trials' } })
    return NextResponse.json({ message: 'Failed to load expired trials' }, { status: 500 })
  }

  let downgraded = 0

  for (const profile of expired ?? []) {
    // A converted trial means a live subscription — keep their role.
    const { data: activeSub } = await admin
      .from('subscriptions')
      .select('id')
      .eq('user_id', profile.id)
      .in('status', ['active', 'trialing'])
      .gt('current_period_end', nowIso)
      .maybeSingle()

    if (activeSub) continue

    const { error: updateError } = await admin
      .from('user_profiles')
      .update({ role: 'free' })
      .eq('id', profile.id)

    if (!updateError) downgraded++
  }

  return NextResponse.json({ checked: expired?.length ?? 0, downgraded })
}
