export const CHECKOUT_INTENT_STORAGE_KEY = 'treno-pending-checkout-intent'
export const CHECKOUT_INTENT_QUERY_PARAM = 'checkout_intent'

export type CheckoutIntentPlan = 'pro' | 'unlimited' | 'personal_trainer'

const checkoutIntentPlans = new Set<CheckoutIntentPlan>([
  'pro',
  'unlimited',
  'personal_trainer',
])

export function parseCheckoutIntent(value: string | null | undefined): CheckoutIntentPlan | null {
  if (!value) return null
  return checkoutIntentPlans.has(value as CheckoutIntentPlan)
    ? (value as CheckoutIntentPlan)
    : null
}

export function getCheckoutIntentRole(plan: CheckoutIntentPlan) {
  return plan === 'personal_trainer' ? 'personal_trainer' : 'free'
}

export function getCheckoutSignupHref(plan: string) {
  const intent = parseCheckoutIntent(plan)
  if (!intent) return '/signup?role=free'

  const params = new URLSearchParams({
    intent,
    role: getCheckoutIntentRole(intent),
  })
  return `/signup?${params.toString()}`
}
