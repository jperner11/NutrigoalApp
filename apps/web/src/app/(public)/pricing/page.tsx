'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Check, Compass, Crown, Loader2, Sparkles, Users, Zap } from 'lucide-react'
import { PRICING } from '@/lib/constants'
import { pricingCopy } from '@/lib/copy/pricing'
import { toast } from 'react-hot-toast'
import BrandLogo from '@/components/brand/BrandLogo'

const individualTiers = [
  {
    key: 'free' as const,
    strap: pricingCopy.individualTiers.free.strap,
    accent: 'border-[var(--line)] bg-white/75',
    buttonClass: 'btn-secondary',
    buttonLabel: pricingCopy.individualTiers.free.ctaLabel,
  },
  {
    key: 'pro' as const,
    strap: pricingCopy.individualTiers.pro.strap,
    badge: pricingCopy.individualTiers.pro.badge,
    accent: 'border-[rgba(29,168,240,0.32)] bg-[linear-gradient(180deg,rgba(237,248,255,0.95),rgba(255,255,255,0.95))]',
    buttonClass: 'btn-primary',
    buttonLabel: pricingCopy.individualTiers.pro.ctaLabel,
  },
  {
    key: 'unlimited' as const,
    strap: pricingCopy.individualTiers.unlimited.strap,
    accent: 'border-[rgba(13,27,42,0.2)] bg-[linear-gradient(180deg,rgba(13,27,42,0.96),rgba(24,44,66,0.96))] text-white',
    buttonClass: 'btn-accent',
    buttonLabel: pricingCopy.individualTiers.unlimited.ctaLabel,
  },
]

export default function PricingPage() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const coachPlan = PRICING.personal_trainer

  function getSignupHref(plan: string) {
    return plan === 'personal_trainer' ? '/signup?role=personal_trainer' : '/signup?role=free'
  }

  function handleCheckoutFallback(data: { message?: string; fallbackPath?: string } | null | undefined) {
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

  return (
    <div className="auth-bg min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl items-center justify-between pb-8">
        <BrandLogo href="/" />
        <div className="flex items-center gap-3">
          <Link href="/login" className="rounded-full px-4 py-2 text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--foreground)]">
            {pricingCopy.nav.signIn}
          </Link>
          <Link href="/signup" className="btn-primary rounded-full px-5 py-3 text-sm font-semibold">
            {pricingCopy.nav.createAccount}
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl">
        <section className="panel-strong p-8 text-center sm:p-12">
          <div className="eyebrow mb-5">{pricingCopy.hero.eyebrow}</div>
          <h1 className="text-5xl font-bold leading-[0.96] text-[var(--foreground)] sm:text-6xl">
            {pricingCopy.hero.titleLine1}
            <span className="block text-[var(--brand-500)]">{pricingCopy.hero.titleLine2}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-[var(--muted)]">
            {pricingCopy.hero.subtitle}
          </p>
          <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-[var(--brand-100)] px-5 py-3 text-sm font-semibold text-[var(--brand-900)]">
            <Compass className="h-4 w-4" />
            {pricingCopy.hero.discoverBadge}
          </div>
        </section>

        <section className="mt-12">
          <div className="mb-8 max-w-3xl">
            <div className="eyebrow mb-4">{pricingCopy.individuals.eyebrow}</div>
            <h2 className="text-4xl font-bold text-[var(--foreground)]">{pricingCopy.individuals.title}</h2>
            <p className="mt-4 text-base leading-7 text-[var(--muted)]">
              {pricingCopy.individuals.subtitle}
            </p>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            {individualTiers.map((tier) => {
              const plan = PRICING[tier.key]
              const isDark = tier.key === 'unlimited'
              const showBadge = tier.key === 'pro'

              return (
                <div key={tier.key} className={`relative overflow-hidden rounded-[30px] border p-8 shadow-[0_20px_48px_rgba(13,27,42,0.08)] ${tier.accent}`}>
                  {showBadge && (
                    <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[var(--brand-100)] px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[#0f4262]">
                      <Zap className="h-3.5 w-3.5" />
                      {pricingCopy.individualTiers.pro.badge}
                    </div>
                  )}

                  <div className={`text-xs font-bold uppercase tracking-[0.18em] ${isDark ? 'text-sky-100/70' : 'text-[var(--muted-soft)]'}`}>{tier.strap}</div>
                  <h3 className={`mt-4 font-display text-3xl font-bold ${isDark ? 'text-white' : 'text-[var(--foreground)]'}`}>{plan.name}</h3>
                  <div className="mt-5 flex items-end gap-2">
                    <span className={`font-display text-6xl font-bold ${isDark ? 'text-white' : 'text-[var(--foreground)]'}`}>${plan.price}</span>
                    {plan.price > 0 && <span className={`${isDark ? 'text-sky-100/70' : 'text-[var(--muted)]'} mb-2 text-sm font-semibold`}>/month</span>}
                  </div>
                  {tier.key === 'pro' && (
                    <p className="mt-3 text-sm font-semibold text-[var(--brand-900)]">
                      {pricingCopy.individualTiers.pro.trialNote}
                    </p>
                  )}

                  <ul className="mt-8 space-y-4">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <div className={`mt-0.5 rounded-full p-1 ${isDark ? 'bg-white/10 text-white' : 'bg-[var(--brand-100)] text-[var(--brand-900)]'}`}>
                          <Check className="h-3.5 w-3.5" />
                        </div>
                        <span className={`text-sm leading-6 ${isDark ? 'text-sky-50/88' : 'text-[var(--muted)]'}`}>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-10">
                    {tier.key === 'free' ? (
                      <Link href={getSignupHref('free')} className={`flex w-full items-center justify-center rounded-2xl px-5 py-4 text-base font-semibold ${tier.buttonClass}`}>
                        {tier.buttonLabel}
                      </Link>
                    ) : (
                      <button
                        onClick={() => tier.key === 'pro' ? handleStartTrial() : handleCheckout(tier.key)}
                        disabled={loadingPlan !== null}
                        className={`flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-base font-semibold disabled:opacity-50 ${tier.buttonClass}`}
                      >
                        {loadingPlan === tier.key ? <Loader2 className="h-5 w-5 animate-spin" /> : tier.key === 'unlimited' ? <Sparkles className="h-4 w-4" /> : <Crown className="h-4 w-4" />}
                        <span>{loadingPlan === tier.key ? 'Redirecting…' : tier.buttonLabel}</span>
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="mt-14">
          <div className="mb-8 max-w-3xl">
            <div className="eyebrow mb-4">{pricingCopy.coach.eyebrow}</div>
            <h2 className="text-4xl font-bold text-[var(--foreground)]">{pricingCopy.coach.title}</h2>
            <p className="mt-4 text-base leading-7 text-[var(--muted)]">
              {pricingCopy.coach.subtitle}
            </p>
          </div>

          <div className="relative overflow-hidden rounded-[30px] border border-[rgba(29,168,240,0.32)] bg-[linear-gradient(180deg,rgba(13,27,42,0.05),rgba(237,248,255,0.95))] p-8 shadow-[0_20px_48px_rgba(13,27,42,0.08)]">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[var(--brand-100)] px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[#0f4262]">
              <Users className="h-3.5 w-3.5" />
              {pricingCopy.coach.planBadge}
            </div>
            <h3 className="mt-2 font-display text-3xl font-bold text-[var(--foreground)]">{coachPlan.name}</h3>
            <div className="mt-5 flex items-end gap-2">
              <span className="font-display text-6xl font-bold text-[var(--foreground)]">${coachPlan.price}</span>
              <span className="mb-2 text-sm font-semibold text-[var(--muted)]">{pricingCopy.coach.pricePerMonth}</span>
            </div>
            <p className="mt-4 text-base font-semibold text-[var(--foreground)]">
              {pricingCopy.coach.tagline}
            </p>
            <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
              {pricingCopy.coach.separateOffersNote}
            </p>

            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {coachPlan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-[var(--brand-100)] p-1 text-[var(--brand-900)]">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-sm leading-6 text-[var(--muted)]">{feature}</span>
                </li>
              ))}
            </ul>

            <div className="mt-10 max-w-md">
              <button
                onClick={() => handleCheckout('personal_trainer')}
                disabled={loadingPlan !== null}
                className="btn-primary flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-base font-semibold disabled:opacity-50"
              >
                {loadingPlan === 'personal_trainer' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Crown className="h-4 w-4" />}
                <span>{loadingPlan === 'personal_trainer' ? pricingCopy.coach.ctaLoading : pricingCopy.coach.ctaLabel}</span>
              </button>
            </div>
          </div>

          <p className="mt-4 text-center text-xs leading-6 text-[var(--muted-soft)]">
            {pricingCopy.coach.moreComing}
          </p>
        </section>

        <section className="mt-12 panel-strong p-8 sm:p-10">
          <div className="grid gap-6 lg:grid-cols-2">
            {pricingCopy.faq.items.map((item) => (
              <div key={item.q} className="surface-card p-6">
                <h3 className="font-display text-2xl font-bold text-[var(--foreground)]">{item.q}</h3>
                <p className="mt-4 text-base leading-7 text-[var(--muted)]">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12 panel-strong flex flex-col gap-6 p-8 sm:flex-row sm:items-center sm:justify-between sm:p-10">
          <div className="max-w-2xl">
            <div className="eyebrow mb-4">{pricingCopy.finalCta.eyebrow}</div>
            <h2 className="font-display text-3xl font-bold text-[var(--foreground)]">{pricingCopy.finalCta.title}</h2>
            <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
              {pricingCopy.finalCta.subtitle}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:min-w-[240px]">
            <Link href="/signup" className="btn-primary flex items-center justify-center gap-2 rounded-2xl px-5 py-4 text-base font-semibold">
              {pricingCopy.finalCta.primaryCta}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/faq" className="btn-secondary flex items-center justify-center rounded-2xl px-5 py-4 text-base font-semibold">
              {pricingCopy.finalCta.secondaryCta}
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
