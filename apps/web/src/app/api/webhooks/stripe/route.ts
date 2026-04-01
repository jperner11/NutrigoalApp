import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import type Stripe from 'stripe'
import type { UserRole } from '@nutrigoal/shared'

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ message: 'Missing stripe signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch {
    return NextResponse.json({ message: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createAdminClient()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.userId
      const plan = session.metadata?.plan as UserRole | undefined

      if (!userId || !plan) break

      // Retrieve full subscription for period dates
      const subscription = await getStripe().subscriptions.retrieve(
        session.subscription as string
      )

      await supabase.from('subscriptions').upsert(
        {
          user_id: userId,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
          plan_type: plan,
          status: 'active',
          current_period_start: new Date(subscription.items.data[0].current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.items.data[0].current_period_end * 1000).toISOString(),
        },
        { onConflict: 'user_id' }
      )

      await supabase
        .from('user_profiles')
        .update({ role: plan })
        .eq('id', userId)

      break
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const userId = subscription.metadata?.userId
      const plan = subscription.metadata?.plan as UserRole | undefined

      if (!userId) break

      const statusMap: Record<string, string> = {
        active: 'active',
        past_due: 'past_due',
        canceled: 'canceled',
        trialing: 'trialing',
        unpaid: 'past_due',
      }

      const mappedStatus = statusMap[subscription.status] || 'active'

      await supabase
        .from('subscriptions')
        .update({
          status: mappedStatus,
          current_period_start: new Date(subscription.items.data[0].current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.items.data[0].current_period_end * 1000).toISOString(),
        })
        .eq('user_id', userId)

      // Keep user role in sync with subscription status
      if (mappedStatus === 'active' || mappedStatus === 'trialing') {
        // Active/trialing: grant the purchased plan role
        if (plan) {
          await supabase
            .from('user_profiles')
            .update({ role: plan })
            .eq('id', userId)
        }
      } else {
        // past_due / canceled / unpaid: downgrade to free
        await supabase
          .from('user_profiles')
          .update({ role: 'free' as UserRole })
          .eq('id', userId)
      }

      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const userId = subscription.metadata?.userId

      if (!userId) break

      await supabase
        .from('subscriptions')
        .update({ status: 'canceled' })
        .eq('user_id', userId)

      await supabase
        .from('user_profiles')
        .update({ role: 'free' as UserRole })
        .eq('id', userId)

      break
    }
  }

  return NextResponse.json({ received: true })
}
