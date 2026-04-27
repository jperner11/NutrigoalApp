import Link from 'next/link'
import { PRICING } from '@/lib/constants'

const formatPrice = (price: number) =>
  price === 0 ? '$0' : `$${price.toFixed(price % 1 === 0 ? 0 : 2)}`

const tiers = [
  {
    key: 'free' as const,
    plan: PRICING.free,
    period: 'forever',
    teaser: [
      'AI meal & training plan (1 active)',
      'Basic tracking',
      'Browse coaches',
    ],
    featured: false,
    ctaLabel: 'Start free',
  },
  {
    key: 'pro' as const,
    plan: PRICING.pro,
    period: 'per month',
    teaser: [
      'Unlimited plan regeneration',
      'Grocery lists + meal swaps',
      'Weekly progress reports',
      'Work with a coach',
    ],
    featured: true,
    ctaLabel: 'Start 7-day trial',
  },
  {
    key: 'unlimited' as const,
    plan: PRICING.unlimited,
    period: 'per month',
    teaser: [
      'Everything in Pro',
      'AI coach conversations',
      'Hybrid plans (running, cycling)',
      'Priority support',
    ],
    featured: false,
    ctaLabel: 'Choose unlimited',
  },
]

const coachPlan = PRICING.nutritionist

export default function MarketingPricing() {
  return (
    <section className="mx-auto max-w-[1320px] px-8 py-24">
      <div className="mb-14 text-center">
        <div className="eyebrow eyebrow-dot mb-4 inline-flex">Pricing</div>
        <h2 className="h2">Simple on purpose.</h2>
        <p
          className="mx-auto mt-4 max-w-[540px]"
          style={{ fontSize: 16, color: 'var(--fg-2)' }}
        >
          Free forever for solo. Pay when you want unlimited regeneration or a
          coach. Coaches keep what they earn.
        </p>
      </div>

      <div className="mb-10 grid gap-5 lg:grid-cols-3">
        {tiers.map((t) => (
          <div
            key={t.key}
            className="relative rounded-[20px] p-7"
            style={{
              border: t.featured
                ? '1px solid var(--acc)'
                : '1px solid var(--line-2)',
              background: t.featured
                ? 'linear-gradient(180deg, rgba(230,57,70,0.12), transparent)'
                : 'var(--ink-2)',
            }}
          >
            {t.featured && (
              <div
                className="mono absolute"
                style={{
                  top: -10,
                  left: 24,
                  background: 'var(--acc)',
                  color: '#fff',
                  fontSize: 10,
                  padding: '4px 10px',
                  borderRadius: 999,
                  letterSpacing: '0.1em',
                  fontWeight: 600,
                }}
              >
                MOST POPULAR
              </div>
            )}
            <div className="serif" style={{ fontSize: 26 }}>
              {t.plan.name}
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="serif" style={{ fontSize: 48, lineHeight: 1 }}>
                {formatPrice(t.plan.price)}
              </span>
              <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>
                {t.period}
              </span>
            </div>
            <div className="divider my-5" />
            <div className="col gap-2.5">
              {t.teaser.map((f) => (
                <div
                  key={f}
                  className="row gap-2.5"
                  style={{ fontSize: 13 }}
                >
                  <span style={{ color: 'var(--acc)' }}>✓</span> {f}
                </div>
              ))}
            </div>
            <Link
              href="/signup"
              className="btn mt-6 w-full justify-center"
              style={{
                background: t.featured ? 'var(--acc)' : 'transparent',
                color: t.featured ? '#fff' : 'var(--fg)',
                border: t.featured ? 'none' : '1px solid var(--line-2)',
                fontWeight: t.featured ? 600 : 500,
              }}
            >
              {t.ctaLabel}
            </Link>
          </div>
        ))}
      </div>

      <div className="card mx-auto max-w-[780px] p-7">
        <div
          className="mono"
          style={{
            fontSize: 11,
            color: 'var(--acc)',
            letterSpacing: '0.14em',
          }}
        >
          FOR COACHES
        </div>
        <div className="row mt-2 flex-wrap items-baseline justify-between">
          <div className="serif" style={{ fontSize: 28 }}>
            {coachPlan.name}
          </div>
          <div>
            <span className="serif" style={{ fontSize: 48 }}>
              {formatPrice(coachPlan.price)}
            </span>
            <span
              className="ml-2"
              style={{ fontSize: 12, color: 'var(--fg-3)' }}
            >
              per month · up to {coachPlan.baseClients} clients
            </span>
          </div>
        </div>
        <div className="divider my-5" />
        <div className="grid gap-2.5 sm:grid-cols-2">
          {coachPlan.features.slice(0, 6).map((f) => (
            <div key={f} className="row gap-2.5" style={{ fontSize: 13 }}>
              <span style={{ color: 'var(--acc)' }}>✓</span> {f}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
