'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import MarketingNav from '@/components/marketing/MarketingNav'
import PublicFooter from '@/components/marketing/PublicFooter'
import { PRICING } from '@/lib/constants'

const formatPrice = (price: number) =>
  price === 0 ? '$0' : `$${price.toFixed(price % 1 === 0 ? 0 : 2)}`

const tiers = [
  {
    key: 'free' as const,
    plan: PRICING.free,
    period: 'forever',
    teaser: PRICING.free.features.slice(0, 4),
    featured: false,
    ctaLabel: 'Start free',
  },
  {
    key: 'pro' as const,
    plan: PRICING.pro,
    period: 'per month',
    teaser: PRICING.pro.features.slice(0, 4),
    featured: true,
    ctaLabel: 'Start 7-day trial',
  },
  {
    key: 'unlimited' as const,
    plan: PRICING.unlimited,
    period: 'per month',
    teaser: PRICING.unlimited.features.slice(0, 4),
    featured: false,
    ctaLabel: 'Choose unlimited',
  },
]

const coachPlan = PRICING.nutritionist

function getSignupHref(plan: string) {
  return plan === 'personal_trainer'
    ? '/signup?role=personal_trainer'
    : '/signup?role=free'
}

export default function PricingPage() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)

  function handleCheckoutFallback(
    data: { message?: string; fallbackPath?: string } | null | undefined,
  ) {
    toast.error(data?.message || 'Checkout is not available right now')
    if (data?.fallbackPath) {
      window.location.href = data.fallbackPath
    }
  }

  async function handleCheckout(plan: string) {
    setLoadingPlan(plan)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (res.status === 401) {
        window.location.href = getSignupHref(plan)
        return
      }
      if (res.status === 503) {
        handleCheckoutFallback(data)
        return
      }
      if (data.url) {
        window.location.href = data.url
      } else {
        toast.error(data.message || 'Failed to start checkout')
      }
    } catch {
      toast.error('Something went wrong')
    }
    setLoadingPlan(null)
  }

  async function handleStartTrial() {
    setLoadingPlan('pro')
    try {
      const res = await fetch('/api/trial/start', { method: 'POST' })
      const data = await res.json().catch(() => ({}))

      if (res.status === 401) {
        window.location.href = getSignupHref('free')
        return
      }
      if (res.ok) {
        toast.success('Your 7-day Pro trial is live.')
        window.location.href = '/dashboard'
        return
      }
      if (res.status === 400 && data.message === 'Trial not applicable') {
        setLoadingPlan(null)
        await handleCheckout('pro')
        return
      }
      toast.error(data.message || 'Failed to start trial')
    } catch {
      toast.error('Something went wrong')
    }
    setLoadingPlan(null)
  }

  function tierAction(key: 'free' | 'pro' | 'unlimited') {
    if (key === 'free') return null
    if (key === 'pro') return handleStartTrial()
    return handleCheckout(key)
  }

  return (
    <div className="min-h-screen overflow-x-hidden">
      <MarketingNav />

      <section className="mx-auto max-w-[1320px] px-8 py-24">
        <div className="mb-14 text-center">
          <div className="eyebrow eyebrow-dot mb-4 inline-flex">Pricing</div>
          <h1 className="h2">Simple on purpose.</h1>
          <p
            className="mx-auto mt-4 max-w-[540px]"
            style={{ fontSize: 16, color: 'var(--fg-2)' }}
          >
            Free forever for solo. Pay when you want unlimited regeneration or a
            coach.
          </p>
        </div>

        <div className="mb-10 grid gap-5 lg:grid-cols-3">
          {tiers.map((t) => {
            const loading = loadingPlan === t.key
            return (
              <div
                key={t.key}
                className="relative rounded-[20px] p-7"
                style={{
                  border: t.featured
                    ? '1px solid var(--acc)'
                    : '1px solid var(--line-2)',
                  background: t.featured
                    ? 'linear-gradient(180deg, rgba(29,168,240,0.08), transparent)'
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

                {t.key === 'free' ? (
                  <Link
                    href={getSignupHref('free')}
                    className="btn mt-6 w-full justify-center"
                    style={{
                      background: t.featured ? 'var(--acc)' : 'transparent',
                      color: t.featured ? '#fff' : 'var(--fg)',
                      border: t.featured ? 'none' : '1px solid var(--line-2)',
                    }}
                  >
                    {t.ctaLabel}
                  </Link>
                ) : (
                  <button
                    onClick={() => tierAction(t.key)}
                    disabled={loadingPlan !== null}
                    className="btn mt-6 w-full justify-center disabled:opacity-50"
                    style={{
                      background: t.featured ? 'var(--acc)' : 'transparent',
                      color: t.featured ? '#fff' : 'var(--fg)',
                      border: t.featured ? 'none' : '1px solid var(--line-2)',
                      fontWeight: t.featured ? 600 : 500,
                    }}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : null}
                    <span>{loading ? 'Redirecting…' : t.ctaLabel}</span>
                  </button>
                )}
              </div>
            )
          })}
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
          <button
            onClick={() => handleCheckout('personal_trainer')}
            disabled={loadingPlan !== null}
            className="btn btn-accent mt-6 w-full justify-center disabled:opacity-50"
          >
            {loadingPlan === 'personal_trainer' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            <span>
              {loadingPlan === 'personal_trainer' ? 'Redirecting…' : 'Start Coach Pro'}
            </span>
          </button>
        </div>
      </section>

      <PublicFooter />
    </div>
  )
}
