'use client'

import { useState } from 'react'
import { X, Sparkles, Loader2 } from 'lucide-react'
import { PRICING } from '@/lib/constants'
import { toast } from 'react-hot-toast'
import { useUser } from '@/hooks/useUser'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  feature?: string
}

export default function UpgradeModal({ isOpen, onClose, feature }: UpgradeModalProps) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const { profile } = useUser()
  const role = profile?.role ?? 'free'

  if (!isOpen) return null

  function handleCheckoutFallback(data: { message?: string; fallbackPath?: string } | null | undefined) {
    toast.error(data?.message || 'Checkout is not available right now')
    if (data?.fallbackPath) {
      window.location.href = data.fallbackPath
    }
  }

  async function handleUpgrade(plan: string) {
    setLoadingPlan(plan)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (res.status === 401) {
        window.location.href = plan === 'personal_trainer' ? '/signup?role=personal_trainer' : '/signup?role=free'
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

  async function handleProAction() {
    if (role !== 'free') {
      await handleUpgrade('pro')
      return
    }

    setLoadingPlan('pro')
    try {
      const res = await fetch('/api/trial/start', { method: 'POST' })
      const data = await res.json().catch(() => ({}))

      if (res.ok) {
        toast.success('Your 7-day Pro trial is live.')
        window.location.href = '/dashboard'
        return
      }

      if (res.status === 400 && data.message === 'Trial not applicable') {
        setLoadingPlan(null)
        await handleUpgrade('pro')
        return
      }

      toast.error(data.message || 'Failed to start trial')
    } catch {
      toast.error('Something went wrong')
    }

    setLoadingPlan(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0"
        style={{ background: 'rgba(13, 27, 42, 0.55)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />
      <div className="card relative w-full max-w-md p-6">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 transition"
          style={{ color: 'var(--fg-3)' }}
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6 text-center">
          <div
            className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl"
            style={{ background: 'var(--ink-3)', color: 'var(--acc)' }}
          >
            <Sparkles className="h-5 w-5" />
          </div>
          <div
            className="mono mb-2"
            style={{ fontSize: 10, color: 'var(--acc)', letterSpacing: '0.16em' }}
          >
            ✦ UPGRADE TO UNLOCK
          </div>
          {feature && (
            <p style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.5 }}>
              {feature} is available on Pro and above.
            </p>
          )}
        </div>

        <div className="col gap-3">
          {(['pro', 'unlimited'] as const).map((tier) => {
            const featured = tier === 'pro'
            return (
              <div
                key={tier}
                className="card-2 p-5"
                style={{
                  borderColor: featured ? 'var(--acc)' : 'var(--line-2)',
                  background: featured ? 'var(--acc-soft)' : 'var(--ink-2)',
                }}
              >
                <div className="row mb-3 justify-between">
                  <span
                    className="serif"
                    style={{ fontSize: 18, color: 'var(--fg)' }}
                  >
                    {PRICING[tier].name}
                  </span>
                  <div className="row items-baseline gap-1">
                    <span
                      className="serif"
                      style={{ fontSize: 22, color: 'var(--fg)' }}
                    >
                      ${PRICING[tier].price}
                    </span>
                    <span
                      className="mono"
                      style={{
                        fontSize: 10,
                        color: 'var(--fg-3)',
                        letterSpacing: '0.08em',
                      }}
                    >
                      /MO
                    </span>
                  </div>
                </div>
                <ul className="col mb-4 gap-1.5">
                  {PRICING[tier].features.slice(0, 4).map((f, i) => (
                    <li
                      key={i}
                      className="row gap-2"
                      style={{ fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.5 }}
                    >
                      <span style={{ color: 'var(--acc)', flexShrink: 0 }}>✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => (tier === 'pro' ? handleProAction() : handleUpgrade(tier))}
                  disabled={loadingPlan !== null}
                  className="btn btn-accent w-full justify-center disabled:opacity-50"
                  style={{ padding: '10px 14px', fontSize: 13 }}
                >
                  {loadingPlan === tier ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  {loadingPlan === tier
                    ? 'Redirecting…'
                    : tier === 'pro' && role === 'free'
                      ? 'Start 7-day Pro trial'
                      : `Upgrade to ${PRICING[tier].name}`}
                </button>
              </div>
            )
          })}
        </div>

        <button
          onClick={onClose}
          className="mt-5 block w-full text-center transition"
          style={{ fontSize: 12, color: 'var(--fg-3)' }}
        >
          Maybe later
        </button>
      </div>
    </div>
  )
}
