'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Check, Compass, Crown, Loader2, Sparkles, Users, Zap } from 'lucide-react'
import { PRICING } from '@/lib/constants'
import { toast } from 'react-hot-toast'
import BrandLogo from '@/components/brand/BrandLogo'

const individualTiers = [
  {
    key: 'free' as const,
    strap: 'Start here',
    badge: 'Discover included',
    accent: 'border-[var(--line)] bg-white/75',
    buttonClass: 'btn-secondary',
    buttonLabel: 'Start free',
  },
  {
    key: 'pro' as const,
    strap: 'Main plan',
    badge: '7-day trial available',
    accent: 'border-[rgba(29,168,240,0.32)] bg-[linear-gradient(180deg,rgba(237,248,255,0.95),rgba(255,255,255,0.95))]',
    buttonClass: 'btn-primary',
    buttonLabel: 'Start 7-day Pro trial',
  },
  {
    key: 'unlimited' as const,
    strap: 'Power users',
    badge: 'Heavy AI usage',
    accent: 'border-[rgba(13,27,42,0.2)] bg-[linear-gradient(180deg,rgba(13,27,42,0.96),rgba(24,44,66,0.96))] text-white',
    buttonClass: 'btn-accent',
    buttonLabel: 'Go Unlimited',
  },
]

const coachRoadmap = [
  {
    title: 'Included now',
    body: 'Coach Pro already covers client delivery, messaging, intake, progress tracking, AI planning, and marketplace visibility for up to 15 clients.',
  },
  {
    title: 'Coming next',
    body: 'The next SLC upgrades are master templates, automated program delivery, coach video uploads, and better compliance reporting.',
  },
  {
    title: 'Expand later',
    body: 'Payments, Zapier, health integrations, and bigger studio-style tiers should only come after real coach feedback and usage data.',
  },
]

const coachIncludedNow = [
  'Up to 15 active clients',
  'Workout and nutrition plan delivery',
  '1:1 coach-client messaging',
  'Progress photos, measurements, and workout tracking',
  'AI plan generation and suggestions',
  'Custom intake, leads inbox, and public offers',
]

const coachComingNext = [
  'Master workouts and reusable templates',
  'Automated program delivery',
  'Coach video uploads inside client plans',
  'Coach compliance dashboard',
]

const coachFutureAddOns = [
  'Stripe-integrated coach payments',
  'Zapier and workflow automations',
  'Apple Health / Health Connect',
  'Fitbit, Garmin, Withings, MyFitnessPal',
]

const pricingPrinciples = [
  {
    title: 'Discover belongs to everyone',
    body: 'Every individual plan, including Free, can browse coaches, compare offers, and send structured coaching requests.',
    icon: Compass,
  },
  {
    title: 'AI depth is what scales upward',
    body: 'The main difference between Free, Pro, and Unlimited is how much self-serve AI depth, plan access, and regeneration freedom the user gets.',
    icon: Zap,
  },
  {
    title: 'Coaches pay for the workspace',
    body: 'The paid coach subscription covers client delivery, intake, lead flow, and public marketplace visibility in one complete system.',
    icon: Users,
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
            Sign in
          </Link>
          <Link href="/signup" className="btn-primary rounded-full px-5 py-3 text-sm font-semibold">
            Create account
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl">
        <section className="panel-strong p-8 text-center sm:p-12">
          <div className="eyebrow mb-5">Pricing</div>
          <h1 className="text-5xl font-bold leading-[0.96] text-[var(--foreground)] sm:text-6xl">
            Simple pricing for
            <span className="block text-[var(--brand-500)]">individuals and coaches.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-[var(--muted)]">
            Meal & Motion now has two clear tracks. Individuals choose how much self-serve AI support they want, and coaches pay for the workspace that powers delivery, discovery, and lead management.
          </p>
          <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-[var(--brand-100)] px-5 py-3 text-sm font-semibold text-[var(--brand-900)]">
            <Compass className="h-4 w-4" />
            Discover Coaches is included on every individual plan, including Free.
          </div>
        </section>

        <section className="mt-10 grid gap-4 lg:grid-cols-3">
          {pricingPrinciples.map((item) => {
            const Icon = item.icon
            return (
              <div key={item.title} className="panel-strong p-6">
                <div className="inline-flex rounded-2xl bg-[var(--brand-100)] p-3 text-[var(--brand-900)]">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="mt-5 font-display text-2xl font-bold text-[var(--foreground)]">{item.title}</h2>
                <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{item.body}</p>
              </div>
            )
          })}
        </section>

        <section className="mt-12">
          <div className="mb-8 max-w-3xl">
            <div className="eyebrow mb-4">Individuals</div>
            <h2 className="text-4xl font-bold text-[var(--foreground)]">Choose how deep you want the self-serve system to go.</h2>
            <p className="mt-4 text-base leading-7 text-[var(--muted)]">
              Every individual plan can discover coaches, compare offers, and send requests. The upgrade path is about more AI depth and more control over your own planning loop, not about hiding discovery behind a paywall.
            </p>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            {individualTiers.map((tier) => {
              const plan = PRICING[tier.key]
              const isDark = tier.key === 'unlimited'

              return (
                <div key={tier.key} className={`relative overflow-hidden rounded-[30px] border p-8 shadow-[0_20px_48px_rgba(13,27,42,0.08)] ${tier.accent}`}>
                  <div className={`mb-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] ${isDark ? 'bg-white/12 text-sky-100' : 'bg-[var(--brand-100)] text-[#0f4262]'}`}>
                    {tier.key === 'pro' && <Zap className="h-3.5 w-3.5" />}
                    {tier.key === 'unlimited' && <Sparkles className="h-3.5 w-3.5" />}
                    {tier.key === 'free' && <Compass className="h-3.5 w-3.5" />}
                    {tier.badge}
                  </div>

                  <div className={`text-xs font-bold uppercase tracking-[0.18em] ${isDark ? 'text-sky-100/70' : 'text-[var(--muted-soft)]'}`}>{tier.strap}</div>
                  <h3 className={`mt-4 font-display text-3xl font-bold ${isDark ? 'text-white' : 'text-[var(--foreground)]'}`}>{plan.name}</h3>
                  <div className="mt-5 flex items-end gap-2">
                    <span className={`font-display text-6xl font-bold ${isDark ? 'text-white' : 'text-[var(--foreground)]'}`}>${plan.price}</span>
                    {plan.price > 0 && <span className={`${isDark ? 'text-sky-100/70' : 'text-[var(--muted)]'} mb-2 text-sm font-semibold`}>/month</span>}
                  </div>
                  {tier.key === 'pro' && (
                    <p className="mt-3 text-sm font-semibold text-[var(--brand-900)]">
                      Start with the 7-day trial, then continue on Pro if it fits.
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
                        {loadingPlan === tier.key ? <Loader2 className="h-5 w-5 animate-spin" /> : <Crown className="h-4 w-4" />}
                        <span>{loadingPlan === tier.key ? 'Redirecting...' : tier.buttonLabel}</span>
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
            <div className="eyebrow mb-4">Coaches</div>
            <h2 className="text-4xl font-bold text-[var(--foreground)]">Coach Pro is the first SLC offer to test with real PTs.</h2>
            <p className="mt-4 text-base leading-7 text-[var(--muted)]">
              This version is intentionally simple, lovable, and complete enough to put in front of coaches now. It combines the most useful lower-tier Trainerize-style value into one early coach offer without pretending we already ship every advanced add-on.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="relative overflow-hidden rounded-[30px] border border-[rgba(29,168,240,0.32)] bg-[linear-gradient(180deg,rgba(13,27,42,0.05),rgba(237,248,255,0.95))] p-8 shadow-[0_20px_48px_rgba(13,27,42,0.08)]">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[var(--brand-100)] px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[#0f4262]">
                <Users className="h-3.5 w-3.5" />
                Early coach offer
              </div>
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted-soft)]">Live in v1</div>
              <h3 className="mt-4 font-display text-3xl font-bold text-[var(--foreground)]">{coachPlan.name}</h3>
              <div className="mt-5 flex items-end gap-2">
                <span className="font-display text-6xl font-bold text-[var(--foreground)]">${coachPlan.price}</span>
                <span className="mb-2 text-sm font-semibold text-[var(--muted)]">/month</span>
              </div>
              <div className="mt-3 inline-flex rounded-full bg-[var(--brand-100)] px-4 py-2 text-sm font-semibold text-[var(--brand-900)]">
                Grow with us pricing for the first wave of PTs
              </div>
              <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
                Built for Personal Trainers and coaches who want to manage clients they already have, get discovered by new ones, and run both flows inside the same product.
              </p>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                Public coaching package prices are handled separately through marketplace offers, so the platform subscription stays clean and predictable.
              </p>

              <ul className="mt-8 space-y-4">
                {coachPlan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-full bg-[var(--brand-100)] p-1 text-[var(--brand-900)]">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-sm leading-6 text-[var(--muted)]">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-10">
                <button
                  onClick={() => handleCheckout('personal_trainer')}
                  disabled={loadingPlan !== null}
                  className="btn-primary flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-base font-semibold disabled:opacity-50"
                >
                  {loadingPlan === 'personal_trainer' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Crown className="h-4 w-4" />}
                  <span>{loadingPlan === 'personal_trainer' ? 'Redirecting...' : 'Start Coach Pro'}</span>
                </button>
              </div>
            </div>

            <div className="space-y-6">
              <div className="panel-strong p-6">
                <div className="eyebrow mb-4">Pricing logic</div>
                <h3 className="font-display text-2xl font-bold text-[var(--foreground)]">Why this is the right first coach package</h3>
                <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                  Discovery stays open to every individual, so coaches can actually receive demand. Coach Pro then monetizes the software layer: intake, delivery, pipeline, and visibility, while coaches keep pricing their own service separately.
                </p>
              </div>

              <div className="grid gap-4">
                {coachRoadmap.map((item) => (
                  <div key={item.title} className="surface-card p-5">
                    <div className="font-display text-2xl font-bold text-[var(--foreground)]">{item.title}</div>
                    <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{item.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <div className="surface-card p-5">
              <div className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-soft)]">Included now</div>
              <ul className="mt-4 space-y-3">
                {coachIncludedNow.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm leading-6 text-[var(--muted)]">
                    <div className="mt-0.5 rounded-full bg-[var(--brand-100)] p-1 text-[var(--brand-900)]">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="surface-card p-5">
              <div className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-soft)]">Coming next</div>
              <ul className="mt-4 space-y-3">
                {coachComingNext.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm leading-6 text-[var(--muted)]">
                    <div className="mt-0.5 rounded-full bg-[rgba(29,168,240,0.12)] p-1 text-[var(--brand-900)]">
                      <Sparkles className="h-3.5 w-3.5" />
                    </div>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="surface-card p-5">
              <div className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-soft)]">Future add-ons</div>
              <ul className="mt-4 space-y-3">
                {coachFutureAddOns.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm leading-6 text-[var(--muted)]">
                    <div className="mt-0.5 rounded-full bg-slate-100 p-1 text-slate-700">
                      <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="mt-12 panel-strong p-8 sm:p-10">
          <div className="grid gap-6 lg:grid-cols-2">
            {[
              {
                q: 'Is Discover Coaches available on Free?',
                a: 'Yes. Discover Coaches is available across all individual plans, including Free. Users can browse profiles, compare offers, and send structured coaching requests without upgrading first.',
              },
              {
                q: 'What changes when an individual upgrades?',
                a: 'The upgrade is about self-serve depth: more plan access, stronger regeneration, richer AI support, and a more complete tracking loop. Discovery itself stays open.',
              },
              {
                q: 'Why is there only one coach plan in v1?',
                a: 'Because the clearest launch move is to keep the coach business model simple while we validate lead flow, activation, and coach conversion. The next step is better evidence, not immediate pricing complexity.',
              },
              {
                q: 'How does coach pricing relate to coach offers?',
                a: 'They are separate. Coach Pro pays for the workspace and tools inside Meal & Motion, while each coach can publish their own public offer prices for prospects in the marketplace.',
              },
            ].map((item) => (
              <div key={item.q} className="surface-card p-6">
                <h3 className="font-display text-2xl font-bold text-[var(--foreground)]">{item.q}</h3>
                <p className="mt-4 text-base leading-7 text-[var(--muted)]">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12 panel-strong flex flex-col gap-6 p-8 sm:flex-row sm:items-center sm:justify-between sm:p-10">
          <div className="max-w-2xl">
            <div className="eyebrow mb-4">Next step</div>
            <h2 className="font-display text-3xl font-bold text-[var(--foreground)]">Pick your side of the platform and get moving.</h2>
            <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
              Join as an individual if you want self-serve AI and coach discovery, or as a coach if you want the client workspace plus inbound lead flow in one product.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:min-w-[240px]">
            <Link href="/signup" className="btn-primary flex items-center justify-center gap-2 rounded-2xl px-5 py-4 text-base font-semibold">
              Create account
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/faq" className="btn-secondary flex items-center justify-center rounded-2xl px-5 py-4 text-base font-semibold">
              Read the FAQ
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
