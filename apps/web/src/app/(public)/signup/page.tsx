'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { sanitizeNextPath } from '@/lib/authRedirect'
import BrandLogo from '@/components/brand/BrandLogo'
import { signupCopy } from '@/lib/copy/signup'

type Role = 'free' | 'personal_trainer'

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [nextPath, setNextPath] = useState('/onboarding')
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'free' as Role,
  })

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const next = sanitizeNextPath(params.get('next'), '/onboarding')
    const email = params.get('email') || ''
    const role = params.get('role')
    setNextPath(next)
    setFormData((prev) => ({
      ...prev,
      email,
      ...(role === 'free' || role === 'personal_trainer' ? { role: role as Role } : {}),
    }))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const signupRole = formData.role
    const postSignupNextPath = sanitizeNextPath(nextPath, '/onboarding')
    const isInviteSignup = postSignupNextPath.startsWith('/invite/accept')

    if (!formData.fullName.trim() || !formData.email || !formData.password) {
      toast.error('Please fill in all fields')
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
    const redirectBase = typeof window !== 'undefined' ? window.location.origin : ''

    const { error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          role: signupRole,
          full_name: formData.fullName.trim(),
        },
        emailRedirectTo: `${redirectBase}/auth/callback?next=${encodeURIComponent(postSignupNextPath)}`,
      },
    })

    if (error) {
      const alreadyRegistered = error.message.toLowerCase().includes('already registered')

      if (alreadyRegistered && isInviteSignup) {
        window.localStorage.setItem('pending-password-setup-next', postSignupNextPath)
        window.localStorage.setItem('pending-password-setup-email', formData.email.trim().toLowerCase())

        const { error: resetError } = await supabase.auth.resetPasswordForEmail(formData.email, {
          redirectTo: `${redirectBase}/reset-password?next=${encodeURIComponent(postSignupNextPath)}`,
        })

        if (resetError) {
          window.localStorage.removeItem('pending-password-setup-next')
          window.localStorage.removeItem('pending-password-setup-email')
          toast.error('This invite already created an account, but we could not send a password setup email. Please ask your trainer to resend the invite.')
        } else {
          toast.success('This invite already created your account. Check your email for a password setup link.')
        }
        setIsLoading(false)
        return
      }

      toast.error(error.message)
      setIsLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      let profile = null
      for (let i = 0; i < 10; i++) {
        const { data } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('id', user.id)
          .single()
        if (data) {
          profile = data
          break
        }
        await new Promise((r) => setTimeout(r, 500))
      }

      if (!profile) {
        toast.error('Account created but profile setup timed out. Please log in again.')
        setIsLoading(false)
        return
      }

      await supabase
        .from('user_profiles')
        .update({
          role: signupRole,
          full_name: formData.fullName.trim(),
          onboarding_completed: false,
        })
        .eq('id', user.id)

      if (signupRole === 'personal_trainer') {
        await supabase.from('nutritionist_packages').insert({
          nutritionist_id: user.id,
          max_clients: 15,
        })
      }
    }

    toast.success('Account created! Please check your email to confirm.')
    window.location.href = postSignupNextPath
  }

  const setRole = (role: Role) => setFormData((prev) => ({ ...prev, role }))

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

  return (
    <div className="min-h-screen overflow-x-hidden">
      <div className="row mx-auto max-w-[1320px] justify-between px-8 py-5">
        <BrandLogo href="/" />
        <Link
          href={`/login${nextPath !== '/onboarding' ? `?next=${encodeURIComponent(nextPath)}` : ''}`}
          className="btn btn-ghost"
        >
          {signupCopy.nav.signIn}
        </Link>
      </div>

      <section className="mx-auto max-w-[480px] px-8 pb-20 pt-10">
        <div className="mb-8 flex justify-center">
          <BrandLogo compact />
        </div>

        <div className="mb-4 flex justify-center">
          <div className="eyebrow eyebrow-dot">{signupCopy.intro.eyebrow}</div>
        </div>

        <h1 className="h2 mb-8 text-center">
          {signupCopy.intro.titleMain}
          <br />
          <span className="italic-serif" style={{ color: 'var(--fg-3)' }}>
            {signupCopy.intro.titleAccent}
          </span>
        </h1>

        <div className="col gap-3">
          {(['free', 'personal_trainer'] as const).map((role) => {
            const data =
              role === 'free' ? signupCopy.roles.individual : signupCopy.roles.coach
            const active = formData.role === role
            return (
              <button
                key={role}
                type="button"
                onClick={() => setRole(role)}
                className="text-left transition"
                style={{
                  padding: 22,
                  border: active ? '1px solid var(--acc)' : '1px solid var(--line-2)',
                  borderRadius: 16,
                  background: active ? 'var(--ink-3)' : 'var(--ink-2)',
                  cursor: 'pointer',
                }}
              >
                <div className="serif" style={{ fontSize: 26 }}>
                  {data.title}
                </div>
                <div
                  className="mt-1.5"
                  style={{ fontSize: 14, color: 'var(--fg-2)' }}
                >
                  {data.body}
                </div>
              </button>
            )
          })}
        </div>

        <form onSubmit={handleSubmit} className="col mt-8 gap-4">
          <div>
            <label
              className="mono mb-2 block"
              style={{ fontSize: 11, color: 'var(--fg-3)', letterSpacing: '0.12em' }}
            >
              {signupCopy.form.fullNameLabel.toUpperCase()}
            </label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, fullName: e.target.value }))
              }
              placeholder={signupCopy.form.fullNamePlaceholder}
              style={inputStyle}
              required
            />
          </div>

          <div>
            <label
              className="mono mb-2 block"
              style={{ fontSize: 11, color: 'var(--fg-3)', letterSpacing: '0.12em' }}
            >
              {signupCopy.form.emailLabel.toUpperCase()}
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, email: e.target.value }))
              }
              placeholder={signupCopy.form.emailPlaceholder}
              style={inputStyle}
              required
            />
          </div>

          <div>
            <label
              className="mono mb-2 block"
              style={{ fontSize: 11, color: 'var(--fg-3)', letterSpacing: '0.12em' }}
            >
              {signupCopy.form.passwordLabel.toUpperCase()}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, password: e.target.value }))
                }
                placeholder={signupCopy.form.passwordPlaceholder}
                style={{ ...inputStyle, paddingRight: 48 }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-4"
                style={{ color: 'var(--fg-3)' }}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label
              className="mono mb-2 block"
              style={{ fontSize: 11, color: 'var(--fg-3)', letterSpacing: '0.12em' }}
            >
              {signupCopy.form.confirmPasswordLabel.toUpperCase()}
            </label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))
              }
              placeholder={signupCopy.form.confirmPasswordPlaceholder}
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
              <span>{signupCopy.form.submit} →</span>
            )}
          </button>
        </form>

        <div
          className="mt-6 text-center"
          style={{ fontSize: 13, color: 'var(--fg-3)' }}
        >
          {signupCopy.form.alreadyHave}{' '}
          <Link
            href={`/login${nextPath !== '/onboarding' ? `?next=${encodeURIComponent(nextPath)}` : ''}`}
            style={{ color: 'var(--fg)', fontWeight: 600 }}
          >
            {signupCopy.form.signInLink}
          </Link>
        </div>
      </section>
    </div>
  )
}
