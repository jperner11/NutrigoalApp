'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function InviteRedirectHandler() {
  useEffect(() => {
    const hash = window.location.hash
    if (!hash || !hash.includes('type=invite')) return

    const supabase = createClient()

    async function handleInviteRedirect() {
      // Wait for Supabase to pick up the session from the hash
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) return

      // Look up pending invite for this user
      const res = await fetch(`/api/personal-trainer/invites/pending-for-user`)
      const payload = await res.json().catch(() => null)

      if (payload?.token) {
        window.location.href = `/invite/accept?token=${encodeURIComponent(payload.token)}`
      } else {
        // No pending invite found — send to onboarding
        window.location.href = '/onboarding'
      }
    }

    handleInviteRedirect()
  }, [])

  return null
}
