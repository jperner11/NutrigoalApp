'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { sanitizeNextPath } from '@/lib/authRedirect'
import BrandLogo from '@/components/brand/BrandLogo'

export default function ResetPasswordPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [sessionChecked, setSessionChecked] = useState(false)
  const [nextPath, setNextPath] = useState('/dashboard')
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  })
  const [requestEmail, setRequestEmail] = useState('')
  const [requestSent, setRequestSent] = useState(false)
  const [isRequesting, setIsRequesting] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const next = sanitizeNextPath(params.get('next'), '/dashboard')
    setNextPath(next)

    const hash = window.location.hash
    const supabase = createClient()
    let finished = false

    const cameFromLink = hash.includes('access_token') || hash.includes('error_description')

    const finishSessionInit = async () => {
      if (finished) return
      finished = true

      const { data: { session } } = await supabase.auth.getSession()
      if (!session && cameFromLink) {
        toast.error('This password reset link is invalid or has expired. Request a new one below.')
      }

      window.localStorage.removeItem('pending-password-setup-next')
      window.localStorage.removeItem('pending-password-setup-email')
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
      setSessionReady(Boolean(session))
      setSessionChecked(true)
    }

    if (!hash) {
      void finishSessionInit()
      return
    }

    const hashParams = new URLSearchParams(hash.slice(1))
    const errorDescription = hashParams.get('error_description')
    if (errorDescription) {
      toast.error(errorDescription)
    }

    if (!hash.includes('access_token')) {
      void finishSessionInit()
      return
    }

    // Establish the session from the hash tokens explicitly — deterministic,
    // and immune to flowType/auto-detection races (the client is configured for
    // PKCE, but verify links arrive as implicit-flow hash tokens).
    const accessToken = hashParams.get('access_token')
    const refreshToken = hashParams.get('refresh_token')
    if (accessToken && refreshToken) {
      void supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(() => finishSessionInit())
        .catch(() => finishSessionInit())
      return
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        subscription.unsubscribe()
        void finishSessionInit()
      }
    })

    void supabase.auth.getSession().then(({ data: sessionData }) => {
      if (sessionData.session) {
        subscription.unsubscribe()
        void finishSessionInit()
      }
    }).catch(() => {})

    const timeoutId = window.setTimeout(() => {
      subscription.unsubscribe()
      void finishSessionInit()
    }, 4000)

    return () => {
      window.clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [])

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault()

    const email = requestEmail.trim()
    if (!email) {
      toast.error('Please enter your email address')
      return
    }

    setIsRequesting(true)
    const supabase = createClient()
    // Supabase's verify endpoint returns tokens in the URL #hash (implicit flow),
    // which server routes never see — so the link must land directly on this page,
    // whose hash handling establishes the session for the set-password form.
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setIsRequesting(false)

    if (error) {
      toast.error(error.message)
      return
    }

    setRequestSent(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!sessionReady) {
      toast.error('Open the password setup link from your email first.')
      return
    }

    if (!formData.password) {
      toast.error('Please enter a password')
      return
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setIsLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: formData.password })

    if (error) {
      toast.error(error.message)
      setIsLoading(false)
      return
    }

    toast.success('Password saved. Taking you to your dashboard.')
    window.location.href = nextPath
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px 16px',
    fontSize: 15,
    background: 'var(--ink-2)',
    border: '1px solid var(--line-2)',
    borderRadius: 12,
    color: 'var(--fg)',
    outline: 'none',
  }

  const loginHref = `/login${nextPath !== '/dashboard' ? `?next=${encodeURIComponent(nextPath)}` : ''}`

  return (
    <div className="auth-bg min-h-screen overflow-x-hidden">
      <div className="row mx-auto max-w-[1320px] justify-between px-8 py-5">
        <BrandLogo href="/" />
        <Link href={loginHref} className="btn btn-ghost">
          Sign in
        </Link>
      </div>

      <section className="mx-auto max-w-[440px] px-8 pb-20 pt-10">
        <div className="mb-8 flex justify-center">
          <BrandLogo compact />
        </div>

        <div className="mb-4 flex justify-center">
          <div className="eyebrow eyebrow-dot">{sessionReady ? 'Password setup' : 'Password reset'}</div>
        </div>

        <h1 className="h2 mb-4 text-center">
          {sessionReady ? 'Set your' : 'Reset your'}
          <br />
          <span className="italic-serif" style={{ color: 'var(--fg-3)' }}>
            password.
          </span>
        </h1>

        <p
          className="mb-8 text-center"
          style={{ fontSize: 14, color: 'var(--fg-3)' }}
        >
          {sessionReady
            ? "Finish setting up your account, then we'll send you straight back to the invite."
            : "Enter the email you signed up with and we'll send you a link to set a new password."}
        </p>

        {!sessionChecked ? (
          <div className="text-center" style={{ fontSize: 14, color: 'var(--fg-3)' }}>
            Checking your reset link...
          </div>
        ) : !sessionReady ? (
          requestSent ? (
            <div className="text-center" style={{ fontSize: 14, color: 'var(--fg-3)' }}>
              <p style={{ color: 'var(--fg)', fontWeight: 600 }}>Check your inbox</p>
              <p className="mt-2">
                If an account exists for <span style={{ color: 'var(--fg)', fontWeight: 600 }}>{requestEmail.trim()}</span>, we&apos;ve
                sent a password reset link. It may take a minute to arrive — check spam too.
              </p>
              <button
                type="button"
                onClick={() => setRequestSent(false)}
                className="mt-4 underline underline-offset-4"
                style={{ color: 'var(--fg)', fontWeight: 600 }}
              >
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleRequestReset} className="col gap-4">
              <div>
                <label
                  htmlFor="reset-email"
                  className="mono mb-2 block"
                  style={{ fontSize: 11, color: 'var(--fg-3)', letterSpacing: '0.12em' }}
                >
                  EMAIL
                </label>
                <input
                  id="reset-email"
                  type="email"
                  value={requestEmail}
                  onChange={(e) => setRequestEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  style={inputStyle}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isRequesting}
                className="btn btn-accent mt-2 w-full justify-center disabled:opacity-50"
                style={{ padding: '14px 18px', fontSize: 15 }}
              >
                {isRequesting ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <span>Send reset link →</span>
                )}
              </button>
            </form>
          )
        ) : (
          <form onSubmit={handleSubmit} className="col gap-4">
            <div>
              <label
                htmlFor="password"
                className="mono mb-2 block"
                style={{ fontSize: 11, color: 'var(--fg-3)', letterSpacing: '0.12em' }}
              >
                NEW PASSWORD
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="Minimum 6 characters"
                  style={{ ...inputStyle, paddingRight: 48 }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 flex items-center pr-4"
                  style={{ color: 'var(--fg-3)' }}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Eye className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mono mb-2 block"
                style={{ fontSize: 11, color: 'var(--fg-3)', letterSpacing: '0.12em' }}
              >
                CONFIRM PASSWORD
              </label>
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="Repeat your password"
                style={inputStyle}
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-accent mt-2 w-full justify-center disabled:opacity-50"
              style={{ padding: '14px 18px', fontSize: 15 }}
            >
              {isLoading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <span>Save password →</span>
              )}
            </button>
          </form>
        )}

        <div
          className="mt-6 text-center"
          style={{ fontSize: 13, color: 'var(--fg-3)' }}
        >
          <Link href={loginHref} style={{ color: 'var(--fg)', fontWeight: 600 }}>
            Back to sign in
          </Link>
        </div>
      </section>
    </div>
  )
}
