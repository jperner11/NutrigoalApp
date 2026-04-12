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
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative glass-card rounded-2xl max-w-md w-full p-6 shadow-xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X className="h-5 w-5" />
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-100 mb-3">
            <Sparkles className="h-6 w-6 text-purple-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Upgrade to unlock</h3>
          {feature && (
            <p className="text-gray-500 mt-1 text-sm">
              {feature} is available on Pro and above.
            </p>
          )}
        </div>

        <div className="space-y-3 mb-6">
          {(['pro', 'unlimited'] as const).map(tier => (
            <div
              key={tier}
              className={`border rounded-xl p-4 ${
                tier === 'pro' ? 'border-purple-200 bg-purple-50/50' : 'border-indigo-200 bg-indigo-50/50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-gray-900">{PRICING[tier].name}</span>
                <span className="text-lg font-bold text-gray-900">
                  ${PRICING[tier].price}<span className="text-sm font-normal text-gray-500">/mo</span>
                </span>
              </div>
              <ul className="text-sm text-gray-600 space-y-1 mb-3">
                {PRICING[tier].features.slice(0, 4).map((f, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <span className="text-purple-500">&#10003;</span> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => tier === 'pro' ? handleProAction() : handleUpgrade(tier)}
                disabled={loadingPlan !== null}
                className={`w-full py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
                  tier === 'pro'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-lg'
                    : 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-white hover:shadow-lg'
                }`}
              >
                {loadingPlan === tier && <Loader2 className="h-4 w-4 animate-spin" />}
                {loadingPlan === tier ? 'Redirecting...' : tier === 'pro' && role === 'free' ? 'Start 7-day Pro trial' : `Upgrade to ${PRICING[tier].name}`}
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="block w-full text-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Maybe later
        </button>
      </div>
    </div>
  )
}
