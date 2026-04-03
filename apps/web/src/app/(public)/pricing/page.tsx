'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Crown, Loader2, Sparkles, Users, Zap } from 'lucide-react'
import { PRICING } from '@/lib/constants'
import { toast } from 'react-hot-toast'
import BrandLogo from '@/components/brand/BrandLogo'

const tiers = [
  {
    key: 'free' as const,
    strap: 'Entry',
    accent: 'border-[var(--line)] bg-white/75',
    badge: null,
    buttonClass: 'btn-secondary',
    buttonLabel: 'Start free',
  },
  {
    key: 'pro' as const,
    strap: 'Most chosen',
    accent: 'border-[rgba(29,168,240,0.32)] bg-[linear-gradient(180deg,rgba(237,248,255,0.95),rgba(255,255,255,0.95))]',
    badge: 'Most Popular',
    buttonClass: 'btn-primary',
    buttonLabel: 'Start Pro',
  },
  {
    key: 'unlimited' as const,
    strap: 'Full access',
    accent: 'border-[rgba(13,27,42,0.2)] bg-[linear-gradient(180deg,rgba(13,27,42,0.96),rgba(24,44,66,0.96))] text-white',
    badge: 'Best for power users',
    buttonClass: 'btn-accent',
    buttonLabel: 'Go Unlimited',
  },
  {
    key: 'nutritionist' as const,
    strap: 'Professional',
    accent: 'border-[rgba(29,168,240,0.32)] bg-[linear-gradient(180deg,rgba(13,27,42,0.05),rgba(237,248,255,0.95))]',
    badge: 'For practitioners',
    buttonClass: 'btn-primary',
    buttonLabel: 'Start Nutritionist',
  },
]

export default function PricingPage() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)

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
        window.location.href = '/signup'
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
            Straightforward access
            <span className="block text-[var(--brand-500)]">for serious progression.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-[var(--muted)]">
            Start free, upgrade when the system becomes part of your routine. Every tier is designed to feel clear,
            useful, and worth paying for.
          </p>
        </section>

        <section className="mt-10 grid gap-6 xl:grid-cols-4">
          {tiers.map((tier) => {
            const plan = PRICING[tier.key]
            const isDark = tier.key === 'unlimited'
            return (
              <div key={tier.key} className={`relative overflow-hidden rounded-[30px] border p-8 shadow-[0_20px_48px_rgba(13,27,42,0.08)] ${tier.accent}`}>
                {tier.badge && (
                  <div className={`mb-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] ${isDark ? 'bg-white/12 text-sky-100' : 'bg-[var(--brand-100)] text-[#0f4262]'}`}>
                    {tier.key === 'pro' && <Zap className="h-3.5 w-3.5" />}
                    {tier.key === 'unlimited' && <Sparkles className="h-3.5 w-3.5" />}
                    {tier.key === 'nutritionist' && <Users className="h-3.5 w-3.5" />}
                    {tier.badge}
                  </div>
                )}

                <div className={`text-xs font-bold uppercase tracking-[0.18em] ${isDark ? 'text-sky-100/70' : 'text-[var(--muted-soft)]'}`}>{tier.strap}</div>
                <h2 className={`mt-4 font-display text-3xl font-bold ${isDark ? 'text-white' : 'text-[var(--foreground)]'}`}>{plan.name}</h2>
                <div className="mt-5 flex items-end gap-2">
                  <span className={`font-display text-6xl font-bold ${isDark ? 'text-white' : 'text-[var(--foreground)]'}`}>${plan.price}</span>
                  {plan.price > 0 && <span className={`${isDark ? 'text-sky-100/70' : 'text-[var(--muted)]'} mb-2 text-sm font-semibold`}>/month</span>}
                </div>

                <ul className="mt-8 space-y-4">
                  {plan.features.map((feature: string) => (
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
                    <Link href="/signup" className={`flex w-full items-center justify-center rounded-2xl px-5 py-4 text-base font-semibold ${tier.buttonClass}`}>
                      {tier.buttonLabel}
                    </Link>
                  ) : (
                    <button
                      onClick={() => handleCheckout(tier.key)}
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
        </section>

        <section className="mt-12 panel-strong p-8 sm:p-10">
          <div className="grid gap-6 lg:grid-cols-2">
            {[
              {
                q: 'Can I switch plans later?',
                a: 'Yes. You can upgrade or downgrade whenever you need to. Billing changes apply on the next cycle unless Stripe updates immediately for that product.',
              },
              {
                q: 'What does free actually include?',
                a: 'Free is designed to let users experience the system without unlocking the full adaptive loop. It gives real value, but not the full engine.',
              },
              {
                q: 'How does regeneration work?',
                a: 'Pro users get controlled regeneration. Unlimited users can regenerate more freely. This keeps the premium tiers meaningfully different.',
              },
              {
                q: 'How do nutritionist plans work?',
                a: 'The practitioner tier includes client capacity and management workflows. It is meant for professionals who need delivery, oversight, and communication in one place.',
              },
            ].map((item) => (
              <div key={item.q} className="surface-card p-6">
                <h3 className="font-display text-2xl font-bold text-[var(--foreground)]">{item.q}</h3>
                <p className="mt-4 text-base leading-7 text-[var(--muted)]">{item.a}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
