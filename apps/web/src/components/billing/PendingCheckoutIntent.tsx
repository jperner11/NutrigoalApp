'use client'

import { useEffect, useRef } from 'react'
import { toast } from 'react-hot-toast'
import { ApiError, apiFetch } from '@/lib/apiClient'
import {
  CHECKOUT_INTENT_QUERY_PARAM,
  CHECKOUT_INTENT_STORAGE_KEY,
  parseCheckoutIntent,
} from '@/lib/checkoutIntent'

type PendingCheckoutIntentProps = {
  enabled: boolean
}

export default function PendingCheckoutIntent({ enabled }: PendingCheckoutIntentProps) {
  const started = useRef(false)

  useEffect(() => {
    if (!enabled || started.current) return

    const params = new URLSearchParams(window.location.search)
    const plan =
      parseCheckoutIntent(params.get(CHECKOUT_INTENT_QUERY_PARAM)) ??
      parseCheckoutIntent(window.localStorage.getItem(CHECKOUT_INTENT_STORAGE_KEY))
    if (!plan) return

    started.current = true
    window.localStorage.removeItem(CHECKOUT_INTENT_STORAGE_KEY)
    if (params.has(CHECKOUT_INTENT_QUERY_PARAM)) {
      params.delete(CHECKOUT_INTENT_QUERY_PARAM)
      const query = params.toString()
      const nextUrl = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`
      window.history.replaceState(null, '', nextUrl)
    }

    async function startCheckout() {
      toast.loading('Opening checkout...', { id: 'pending-checkout' })
      try {
        const data = await apiFetch<{ url?: string; message?: string }>('/api/stripe/checkout', {
          method: 'POST',
          body: { plan },
          context: {
            feature: 'checkout-intent',
            action: 'resume-checkout',
            extra: { plan },
          },
        })

        if (data?.url) {
          window.location.href = data.url
          return
        }

        toast.error(data?.message || 'Failed to start checkout', { id: 'pending-checkout' })
      } catch (err) {
        if (err instanceof ApiError && err.status === 503) {
          const payload = err.payload as { message?: string; fallbackPath?: string } | null
          toast.error(payload?.message || 'Checkout is not available right now', {
            id: 'pending-checkout',
          })
          if (payload?.fallbackPath) {
            window.location.href = payload.fallbackPath
          }
          return
        }

        toast.error(err instanceof ApiError ? err.message : 'Something went wrong', {
          id: 'pending-checkout',
        })
      }
    }

    void startCheckout()
  }, [enabled])

  return null
}
