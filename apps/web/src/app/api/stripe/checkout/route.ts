import { NextResponse } from 'next/server'
import { getStripe, PRICE_IDS } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ensureBillingProfile } from '@/lib/billing'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
  }

  const { plan } = await request.json()

  if (!plan) {
    return NextResponse.json({ message: 'Invalid plan' }, { status: 400 })
  }

  const adminSupabase = createAdminClient()
  await ensureBillingProfile(adminSupabase, user)

  if (!PRICE_IDS[plan]) {
    return NextResponse.json({
      message: 'Checkout for this plan is not configured yet.',
      code: 'checkout_not_configured',
      fallbackPath: '/support',
    }, { status: 503 })
  }

  const priceId = PRICE_IDS[plan]!
  const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  // Look up existing Stripe customer ID
  const { data: existingSub } = await adminSupabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .not('stripe_customer_id', 'is', null)
    .single()

  let customerId = existingSub?.stripe_customer_id

  // Create Stripe customer if none exists
  if (!customerId) {
    const customer = await getStripe().customers.create({
      email: user.email,
      metadata: { userId: user.id },
    })
    customerId = customer.id
  }

  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/settings?checkout=success`,
    cancel_url: `${origin}/pricing`,
    metadata: { userId: user.id, plan },
    subscription_data: {
      metadata: { userId: user.id, plan },
    },
  })

  return NextResponse.json({ url: session.url })
}
