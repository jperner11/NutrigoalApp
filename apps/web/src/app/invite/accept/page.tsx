'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertCircle, Mail, UserCheck, XCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'
import BrandLogo from '@/components/brand/BrandLogo'
import { createClient } from '@/lib/supabase/client'

interface InvitePayload {
  token?: string
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

interface InviteErrorPayload {
  error?: string
}

interface InviteAuthError {
  code: string
  description: string
}

function buildInvitePath(token?: string | null, inviteId?: string | null) {
  const params = new URLSearchParams()

  if (token) {
    params.set('token', token)
  } else if (inviteId) {
    params.set('inviteId', inviteId)
  }

  const query = params.toString()
  return query ? `/invite/accept?${query}` : '/invite/accept'
}

export default function AcceptInvitePage() {
  const router = useRouter()
  const [token, setToken] = useState('')
  const [inviteId, setInviteId] = useState('')
  const [data, setData] = useState<InvitePayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionReady, setSessionReady] = useState(false)
  const [submitting, setSubmitting] = useState<'accept' | 'decline' | null>(null)
  const [authError, setAuthError] = useState<InviteAuthError | null>(null)

  const nextParam = useMemo(
    () => buildInvitePath(token, inviteId),
    [inviteId, token]
  )

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setToken(params.get('token') ?? '')
    setInviteId(params.get('inviteId') ?? '')

    const hash = window.location.hash
    if (!hash) {
      setSessionReady(true)
      return
    }

    const hashParams = new URLSearchParams(hash.slice(1))
    const errorCode = hashParams.get('error_code') ?? hashParams.get('error')
    const errorDescription = hashParams.get('error_description')

    if (errorCode || errorDescription) {
      setAuthError({
        code: errorCode ?? 'invite_error',
        description: errorDescription ?? 'This email sign-in link is no longer valid.',
      })
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }

    if (!hash.includes('access_token')) {
      setSessionReady(true)
      return
    }

    const supabase = createClient()
    let finished = false

    const finishSessionInit = () => {
      if (finished) return
      finished = true
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
      setSessionReady(true)
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        subscription.unsubscribe()
        finishSessionInit()
      }
    })

    void supabase.auth.getSession().then(({ data: sessionData }) => {
      if (sessionData.session) {
        subscription.unsubscribe()
        finishSessionInit()
      }
    })

    const timeoutId = window.setTimeout(() => {
      subscription.unsubscribe()
      finishSessionInit()
    }, 1500)

    return () => {
      window.clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!sessionReady) return

    let mounted = true

    async function loadInvite() {
      let resolvedToken = token
      let resolvedInviteId = inviteId
      const supabase = createClient()
      let response: Response | null = null
      let payload: InvitePayload | InviteErrorPayload | null = null

      if (resolvedToken) {
        response = await fetch(`/api/personal-trainer/invites/token/${encodeURIComponent(resolvedToken)}`)
        payload = await response.json().catch(() => null)
      } else if (resolvedInviteId) {
        response = await fetch(`/api/personal-trainer/invites/id/${encodeURIComponent(resolvedInviteId)}`)
        payload = await response.json().catch(() => null)
      } else {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user?.email) {
          if (mounted) setLoading(false)
          return
        }

        const { data: invite } = await supabase
          .from('personal_trainer_invites')
          .select('id, invite_token')
          .ilike('invited_email', user.email)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (!invite?.invite_token) {
          if (mounted) setLoading(false)
          return
        }

        resolvedToken = invite.invite_token
        resolvedInviteId = invite.id
        setToken(invite.invite_token)
        setInviteId(invite.id)

        response = await fetch(`/api/personal-trainer/invites/token/${encodeURIComponent(invite.invite_token)}`)
        payload = await response.json().catch(() => null)
      }

      if (!mounted || !response) return

      if (response.ok && payload && 'invite' in payload) {
        if (payload.token && payload.token !== resolvedToken) {
          setToken(payload.token)
        }

        if (payload.invite?.id && payload.invite.id !== resolvedInviteId) {
          setInviteId(payload.invite.id)
        }

        if (!payload.currentUser) {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const { data: profile } = await supabase
              .from('user_profiles')
              .select('id, email, role, personal_trainer_id, nutritionist_id')
              .eq('id', user.id)
              .single()

            if (profile && payload.invite) {
              const emailMatches = profile.email?.toLowerCase() === payload.invite.invited_email.toLowerCase()
              const assignedTrainerId = profile.personal_trainer_id ?? profile.nutritionist_id ?? null
              const inviteTrainerId = payload.invite.trainer?.id ?? null

              payload.currentUser = {
                id: profile.id,
                email: profile.email,
                role: profile.role,
                emailMatches,
                alreadyAssignedToOtherTrainer: Boolean(
                  assignedTrainerId && inviteTrainerId && assignedTrainerId !== inviteTrainerId
                ),
              }
            }
          }
        }

        setData(payload)
        setLoading(false)
        return
      }

      const errorMessage = payload && 'error' in payload ? payload.error : null
      toast.error(errorMessage ?? 'Could not load invite.')
      setLoading(false)
    }

    void loadInvite()

    return () => {
      mounted = false
    }
  }, [inviteId, sessionReady, token])

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
  const inviteRecoveryMessage = authError?.code === 'otp_expired'
    ? 'This email link has already expired or was opened before you clicked it. You can still continue below with the invited email address.'
    : authError?.description || null

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
              {inviteRecoveryMessage
                ? `${inviteRecoveryMessage} If this keeps happening, ask your trainer to resend the invite.`
                : 'We couldn\'t find this invite. Ask your trainer to resend it.'}
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

              {inviteRecoveryMessage && invite.status === 'pending' && !currentUser && (
                <div className="mt-8 rounded-[24px] border border-amber-200 bg-amber-50/90 p-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 h-5 w-5 text-amber-700" />
                    <div>
                      <div className="text-sm font-semibold uppercase tracking-[0.14em] text-amber-700">Continue manually</div>
                      <p className="mt-2 text-sm leading-6 text-amber-800">
                        {inviteRecoveryMessage}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {!currentUser && invite.status === 'pending' && (
                <div className="mt-8 rounded-[24px] border border-[var(--line)] bg-[var(--brand-100)] p-6">
                  <div className="text-lg font-semibold text-[var(--foreground)]">Sign in or create an account to continue</div>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    Use the invited email address so we can match the join request correctly.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link href={`/login?next=${encodeURIComponent(nextParam)}&email=${encodeURIComponent(invite.invited_email)}`} className="btn-primary rounded-2xl px-5 py-3 text-sm font-semibold">
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
