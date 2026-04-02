import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe, PRICE_IDS } from '@/lib/stripe'

const TRIAL_DAYS = 7

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('user_profiles')
    .select('role, trial_ends_at, email')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ message: 'Profile not found' }, { status: 404 })
  }

  // Only start trial for free users who haven't had one yet
  if (profile.role !== 'free' || profile.trial_ends_at) {
    return NextResponse.json({ message: 'Trial not applicable' }, { status: 400 })
  }

  const trialEndsAt = new Date()
  trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS)

  // Grant pro role + set trial expiry
  await admin
    .from('user_profiles')
    .update({ role: 'pro', trial_ends_at: trialEndsAt.toISOString() })
    .eq('id', user.id)

  // Best-effort: create Stripe trial subscription
  try {
    const priceId = PRICE_IDS.pro
    if (priceId && process.env.STRIPE_SECRET_KEY) {
      const stripe = getStripe()
      const customer = await stripe.customers.create({
        email: user.email ?? profile.email,
        metadata: { userId: user.id },
      })
      await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: priceId }],
        trial_period_days: TRIAL_DAYS,
        payment_settings: { save_default_payment_method: 'on_subscription' },
        metadata: { userId: user.id, plan: 'pro' },
      })
      await admin.from('subscriptions').upsert(
        {
          user_id: user.id,
          stripe_customer_id: customer.id,
          plan_type: 'pro',
          status: 'trialing',
          current_period_start: new Date().toISOString(),
          current_period_end: trialEndsAt.toISOString(),
        },
        { onConflict: 'user_id' }
      )
    }
  } catch {
    // Stripe failure is non-fatal — DB trial is already set
  }

  return NextResponse.json({ trialEndsAt: trialEndsAt.toISOString() })
}
