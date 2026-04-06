export const COACH_MARKETPLACE_CURRENCIES = ['GBP', 'EUR', 'USD'] as const
export const COACH_OFFER_BILLING_PERIODS = ['one_time', 'weekly', 'monthly'] as const
export const COACH_LEAD_STAGES = ['new', 'contacted', 'consult_booked', 'won', 'lost'] as const

export function slugifyCoachName(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function buildCoachProfileSlug(name: string | null | undefined, coachId: string) {
  const base = slugifyCoachName(name || 'coach') || 'coach'
  return `${base}-${coachId.slice(0, 6)}`
}

export function formatCoachPriceRange(
  priceFrom: number | null | undefined,
  priceTo: number | null | undefined,
  currency: string | null | undefined
) {
  const code = currency || 'GBP'
  const formatter = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: code,
    maximumFractionDigits: 0,
  })

  if (priceFrom && priceTo) return `${formatter.format(priceFrom)}-${formatter.format(priceTo)}`
  if (priceFrom) return `From ${formatter.format(priceFrom)}`
  if (priceTo) return `Up to ${formatter.format(priceTo)}`
  return 'Pricing on request'
}

export function formatOfferPrice(price: number, currency: string, billingPeriod: string) {
  const formatter = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency || 'GBP',
    maximumFractionDigits: 0,
  })

  const label = billingPeriod === 'monthly'
    ? '/month'
    : billingPeriod === 'weekly'
      ? '/week'
      : ' one-off'

  return `${formatter.format(price)}${label}`
}

export function formatLeadStage(stage: string) {
  return stage.replace(/_/g, ' ')
}
