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

  const expiredIds = (expired ?? []).map((profile) => profile.id)

  // A converted trial means a live subscription — keep their role.
  const { data: activeSubs } = expiredIds.length
    ? await admin
        .from('subscriptions')
        .select('user_id')
        .in('user_id', expiredIds)
        .in('status', ['active', 'trialing'])
        .gt('current_period_end', nowIso)
    : { data: [] as { user_id: string }[] }

  const activeUserIds = new Set((activeSubs ?? []).map((sub) => sub.user_id))

  let downgraded = 0

  for (const profile of expired ?? []) {
    if (activeUserIds.has(profile.id)) continue

    const { error: updateError } = await admin
      .from('user_profiles')
      .update({ role: 'free' })
      .eq('id', profile.id)

    if (!updateError) downgraded++
  }

  return NextResponse.json({ checked: expired?.length ?? 0, downgraded })
}
