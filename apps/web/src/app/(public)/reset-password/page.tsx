'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Eye, EyeOff, Lock } from 'lucide-react'
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const next = sanitizeNextPath(params.get('next'), '/dashboard')
    setNextPath(next)

    const hash = window.location.hash
    const supabase = createClient()
    let finished = false

    const finishSessionInit = async () => {
      if (finished) return
      finished = true

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('This password setup link is invalid or has expired.')
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
    })

    const timeoutId = window.setTimeout(() => {
      subscription.unsubscribe()
      void finishSessionInit()
    }, 1500)

    return () => {
      window.clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [])

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

    toast.success('Password set. Continue with your invite.')
    window.location.href = nextPath
  }

  return (
    <div className="auth-bg min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl items-center justify-between pb-8">
        <BrandLogo href="/" />
        <Link href={`/login${nextPath !== '/dashboard' ? `?next=${encodeURIComponent(nextPath)}` : ''}`} className="btn-secondary rounded-full px-5 py-3 text-sm font-semibold">
          Sign in
        </Link>
      </div>

      <div className="mx-auto max-w-3xl">
        <section className="glass-card rounded-[32px] p-8 sm:p-10">
          <div className="mb-8">
            <div className="eyebrow mb-4">Password setup</div>
            <h1 className="text-4xl font-bold text-[var(--foreground)]">Set your password</h1>
            <p className="mt-3 text-base leading-7 text-[var(--muted)]">
              Finish setting up your account, then we&apos;ll send you straight back to the invite.
            </p>
          </div>

          {!sessionChecked ? (
            <div className="rounded-[24px] border border-[var(--line)] bg-white/80 p-6 text-[var(--muted)]">
              Checking your setup link...
            </div>
          ) : !sessionReady ? (
            <div className="rounded-[24px] border border-amber-200 bg-amber-50/90 p-6 text-sm leading-6 text-amber-800">
              This password setup link is no longer valid. Request a fresh invite or try signing in if you already set a password.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-semibold text-[var(--foreground)]">New password</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-5 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-[var(--muted-soft)]" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                    className="input-field input-field-icon-both"
                    placeholder="Minimum 6 characters"
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-5 text-[var(--muted-soft)]">
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="mb-2 block text-sm font-semibold text-[var(--foreground)]">Confirm password</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-5 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-[var(--muted-soft)]" />
                  <input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                    className="input-field input-field-icon-left"
                    placeholder="Repeat your password"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-base font-semibold disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <span>Save password</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  )
}
