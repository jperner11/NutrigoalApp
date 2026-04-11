'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Mail, UserCheck, XCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'
import BrandLogo from '@/components/brand/BrandLogo'
import { createClient } from '@/lib/supabase/client'

interface InvitePayload {
  invite: {
    id: string
    invited_email: string
    client_first_name: string | null
    status: 'pending' | 'accepted' | 'expired' | 'revoked' | 'declined'
    expires_at: string
    created_at: string
    trainer: {
      id: string
      full_name: string | null
      email: string
    } | null
  }
  currentUser: {
    id: string
    email: string
    role: string
    emailMatches: boolean
    alreadyAssignedToOtherTrainer: boolean
  } | null
}

export default function AcceptInvitePage() {
  const router = useRouter()
  const [token, setToken] = useState('')
  const nextParam = useMemo(
    () => token ? `/invite/accept?token=${encodeURIComponent(token)}` : '/invite/accept',
    [token]
  )

  const [data, setData] = useState<InvitePayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionReady, setSessionReady] = useState(false)
  const [submitting, setSubmitting] = useState<'accept' | 'decline' | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setToken(params.get('token') ?? '')

    // If there's a hash fragment with access_token, let Supabase process it
    const hash = window.location.hash
    if (hash && hash.includes('access_token')) {
      const supabase = createClient()
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
          subscription.unsubscribe()
          // Clear the hash
          window.history.replaceState(null, '', window.location.pathname + window.location.search)
          setSessionReady(true)
        }
      })
      return () => subscription.unsubscribe()
    } else {
      setSessionReady(true)
    }
  }, [])

  useEffect(() => {
    if (!sessionReady) return

    let mounted = true

    async function loadInvite() {
      let resolvedToken = token

      // If no token in URL, look up pending invite by authenticated user's email
      if (!resolvedToken) {
        const res = await fetch('/api/personal-trainer/invites/pending-for-user')
        const result = await res.json().catch(() => null)
        if (result?.token) {
          resolvedToken = result.token
          setToken(resolvedToken)
        } else {
          if (mounted) setLoading(false)
          return
        }
      }

      const response = await fetch(`/api/personal-trainer/invites/token/${encodeURIComponent(resolvedToken)}`)
      const payload = await response.json().catch(() => null)

      if (!mounted) return

      if (!response.ok) {
        toast.error(payload?.error ?? 'Could not load invite.')
        setLoading(false)
        return
      }

      setData(payload)
      setLoading(false)
    }

    loadInvite()

    return () => {
      mounted = false
    }
  }, [token, sessionReady])

  async function respond(action: 'accept' | 'decline') {
    if (!token) return
    setSubmitting(action)

    const response = await fetch(`/api/personal-trainer/invites/token/${encodeURIComponent(token)}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })

    const payload = await response.json().catch(() => null)
    setSubmitting(null)

    if (!response.ok) {
      toast.error(payload?.error ?? `Failed to ${action} invite.`)
      return
    }

    toast.success(action === 'accept' ? 'Trainer connected. Let’s finish your intake.' : 'Invite declined.')
    router.push(action === 'accept' ? '/onboarding' : '/login')
    router.refresh()
  }

  const invite = data?.invite
  const currentUser = data?.currentUser
  const trainerName = invite?.trainer?.full_name || 'your personal trainer'

  return (
    <div className="auth-bg min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <BrandLogo href="/" />

        <div className="glass-card mt-10 rounded-[32px] p-8 sm:p-10">
          <div className="eyebrow mb-4">Client invite</div>
          <h1 className="text-4xl font-bold text-[var(--foreground)]">
            Join {trainerName}
          </h1>
          <p className="mt-4 text-base leading-7 text-[var(--muted)]">
            Accepting connects your account to this trainer so they can deliver plans, monitor progress,
            message you, and review your check-ins in mealandmotion.
          </p>

          {loading ? (
            <div className="mt-8 text-[var(--muted)]">Loading invite details...</div>
          ) : !invite ? (
            <div className="mt-8 rounded-[24px] border border-[var(--line)] bg-white/80 p-6 text-[var(--muted)]">
              We couldn&apos;t find this invite. Ask your trainer to resend it.
            </div>
          ) : (
            <>
              <div className="mt-8 rounded-[28px] border border-[var(--line)] bg-white/80 p-6">
                <div className="flex items-start gap-4">
                  <div className="rounded-2xl bg-[var(--brand-100)] p-3">
                    <Mail className="h-5 w-5 text-[var(--brand-900)]" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--muted-soft)]">Invited email</div>
                    <div className="mt-1 text-lg font-semibold text-[var(--foreground)]">{invite.invited_email}</div>
                    <div className="mt-3 text-sm text-[var(--muted)]">
                      Status: <span className="font-semibold text-[var(--foreground)]">{invite.status}</span>
                    </div>
                    <div className="mt-1 text-sm text-[var(--muted)]">
                      Expires {new Date(invite.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                </div>
              </div>

              {!currentUser && invite.status === 'pending' && (
                <div className="mt-8 rounded-[24px] border border-[var(--line)] bg-[var(--brand-100)] p-6">
                  <div className="text-lg font-semibold text-[var(--foreground)]">Sign in or create an account to continue</div>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    Use the invited email address so we can match the join request correctly.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link href={`/login?next=${encodeURIComponent(nextParam)}`} className="btn-primary rounded-2xl px-5 py-3 text-sm font-semibold">
                      Sign in
                    </Link>
                    <Link href={`/signup?next=${encodeURIComponent(nextParam)}&email=${encodeURIComponent(invite.invited_email)}`} className="btn-secondary rounded-2xl px-5 py-3 text-sm font-semibold">
                      Create account
                    </Link>
                  </div>
                </div>
              )}

              {currentUser && !currentUser.emailMatches && invite.status === 'pending' && (
                <div className="mt-8 rounded-[24px] border border-red-200 bg-red-50/90 p-6 text-sm leading-6 text-red-700">
                  You&apos;re signed in as <strong>{currentUser.email}</strong>, but this invite is for <strong>{invite.invited_email}</strong>.
                  Sign out and use the invited email to accept.
                </div>
              )}

              {currentUser?.alreadyAssignedToOtherTrainer && invite.status === 'pending' && (
                <div className="mt-8 rounded-[24px] border border-amber-200 bg-amber-50/90 p-6 text-sm leading-6 text-amber-700">
                  This account already has an active trainer. Disconnect from your current trainer before accepting a new invite.
                </div>
              )}

              {invite.status === 'pending' && currentUser?.emailMatches && !currentUser.alreadyAssignedToOtherTrainer && (
                <div className="mt-8 flex flex-wrap gap-3">
                  <button
                    onClick={() => respond('accept')}
                    disabled={Boolean(submitting)}
                    className="btn-primary flex items-center gap-2 rounded-2xl px-6 py-4 text-sm font-semibold disabled:opacity-50"
                  >
                    <UserCheck className="h-4 w-4" />
                    {submitting === 'accept' ? 'Connecting...' : 'Accept invite'}
                  </button>
                  <button
                    onClick={() => respond('decline')}
                    disabled={Boolean(submitting)}
                    className="btn-secondary flex items-center gap-2 rounded-2xl px-6 py-4 text-sm font-semibold disabled:opacity-50"
                  >
                    <XCircle className="h-4 w-4" />
                    {submitting === 'decline' ? 'Declining...' : 'Decline'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
