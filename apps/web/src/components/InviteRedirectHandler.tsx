'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function InviteRedirectHandler() {
  useEffect(() => {
    const hash = window.location.hash
    if (!hash || !hash.includes('type=invite')) return

    const supabase = createClient()
    let handled = false

    const redirectToPasswordSetup = () => {
      const storedNext = window.localStorage.getItem('pending-password-setup-next')
      if (!storedNext) return false

      const next = storedNext.startsWith('/') ? storedNext : '/dashboard'
      window.location.href = `/reset-password?next=${encodeURIComponent(next)}${window.location.hash}`
      return true
    }

    const redirectForInviteSession = async (email: string) => {
      if (handled) return
      handled = true

      if (redirectToPasswordSetup()) {
        subscription.unsubscribe()
        return
      }

      subscription.unsubscribe()
      window.history.replaceState(null, '', window.location.pathname)

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
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event !== 'SIGNED_IN' && event !== 'INITIAL_SESSION') return
      if (!session?.user?.email) return

      await redirectForInviteSession(session.user.email)
    })

    void supabase.auth.getSession().then(async ({ data: sessionData }) => {
      if (!sessionData.session?.user?.email) return
      await redirectForInviteSession(sessionData.session.user.email)
    })

    return () => subscription.unsubscribe()
  }, [])

  return null
}
