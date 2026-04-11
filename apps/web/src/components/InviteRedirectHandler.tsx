'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function InviteRedirectHandler() {
  useEffect(() => {
    const hash = window.location.hash
    if (!hash || !hash.includes('type=invite')) return

    const supabase = createClient()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event !== 'SIGNED_IN') return
      if (!session?.user?.email) return

      // Unsubscribe immediately to prevent multiple redirects
      subscription.unsubscribe()

      // Clear the hash so this doesn't re-trigger
      window.history.replaceState(null, '', window.location.pathname)

      const email = session.user.email

      // Query pending invite directly using the client-side session
      const { data: invite } = await supabase
        .from('personal_trainer_invites')
        .select('invite_token')
        .ilike('invited_email', email)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (invite?.invite_token) {
        window.location.href = `/invite/accept?token=${encodeURIComponent(invite.invite_token)}`
      } else {
        // New user with no pending invite record — go to onboarding
        window.location.href = '/onboarding'
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return null
}
