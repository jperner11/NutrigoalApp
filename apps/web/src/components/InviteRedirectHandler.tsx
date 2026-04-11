'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function InviteRedirectHandler() {
  useEffect(() => {
    const hash = window.location.hash
    if (!hash || !hash.includes('type=invite')) return

    const supabase = createClient()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event !== 'SIGNED_IN' && event !== 'INITIAL_SESSION') return

      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) return

      // Unsubscribe immediately to prevent multiple redirects
      subscription.unsubscribe()

      // Clear the hash so this doesn't re-trigger
      window.history.replaceState(null, '', window.location.pathname)

      // Look up pending invite for this user
      const res = await fetch('/api/personal-trainer/invites/pending-for-user')
      const payload = await res.json().catch(() => null)

      if (payload?.token) {
        window.location.href = `/invite/accept?token=${encodeURIComponent(payload.token)}`
      } else {
        window.location.href = '/onboarding'
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return null
}
