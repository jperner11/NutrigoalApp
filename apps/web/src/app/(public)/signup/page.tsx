'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Eye, EyeOff, Lock, Mail, User, UserCircle, Users } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import BrandLogo from '@/components/brand/BrandLogo'

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [nextPath, setNextPath] = useState('/onboarding')
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'free' as 'free' | 'personal_trainer',
  })

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const next = params.get('next') || '/onboarding'
    const email = params.get('email') || ''
    setNextPath(next)
    setFormData(prev => ({ ...prev, email }))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const signupRole = formData.role
    const postSignupNextPath = nextPath === '/dashboard' ? '/dashboard' : '/onboarding'

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
        if (data) { profile = data; break }
        await new Promise(r => setTimeout(r, 500))
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
          max_clients: 10,
        })
      }

    }

    toast.success('Account created! Please check your email to confirm.')
    window.location.href = postSignupNextPath
  }

  return (
    <div className="auth-bg min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl items-center justify-between pb-8">
        <BrandLogo href="/" />
        <Link href={`/login${nextPath !== '/onboarding' ? `?next=${encodeURIComponent(nextPath)}` : ''}`} className="btn-secondary rounded-full px-5 py-3 text-sm font-semibold">
          Sign in
        </Link>
      </div>

      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.95fr_0.95fr] lg:items-start">
        <section className="panel-strong p-8 sm:p-10">
          <div className="eyebrow mb-5">Feel your momentum</div>
          <h1 className="text-5xl font-bold leading-[0.96] text-[var(--foreground)] sm:text-6xl">
            Start with a
            <span className="block text-[var(--brand-500)]">serious setup.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-[var(--muted)]">
            Meal & Motion is designed for people who want a system that feels considered, precise, and genuinely easy to stay with, whether they plan to go self-serve or coach-led.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {[
              ['Individuals', 'Self-serve AI plus Discover Coaches on every individual plan, including Free'],
              ['Coaches', 'Client workflows, public profiles, offers, and lead capture in one paid workspace'],
            ].map(([title, body]) => (
              <div key={title} className="surface-card p-5">
                <div className="font-display text-2xl font-bold text-[var(--foreground)]">{title}</div>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="glass-card rounded-[32px] p-8 sm:p-10">
          <div className="mb-8">
            <div className="eyebrow mb-4">Create account</div>
            <h2 className="text-4xl font-bold text-[var(--foreground)]">Choose your setup</h2>
            <p className="mt-3 text-base leading-7 text-[var(--muted)]">
              Start as an individual or coach. Discovery runs on the same account system, so there is no separate marketplace signup.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-3 block text-sm font-semibold text-[var(--foreground)]">I am joining as</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, role: 'free' }))}
                  className={`rounded-[22px] border p-5 text-left transition ${formData.role === 'free'
                    ? 'border-[rgba(29,168,240,0.34)] bg-[var(--brand-100)] shadow-[0_14px_32px_rgba(29,168,240,0.12)]'
                    : 'border-[var(--line)] bg-white/65 hover:border-[rgba(29,168,240,0.24)]'
                  }`}
                >
                  <User className={`mb-3 h-7 w-7 ${formData.role === 'free' ? 'text-[var(--brand-900)]' : 'text-[var(--muted-soft)]'}`} />
                  <div className="font-display text-xl font-bold text-[var(--foreground)]">Individual</div>
                  <div className="mt-1 text-sm text-[var(--muted)]">For self-serve plans, tracking, and Discover Coaches across every individual plan.</div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, role: 'personal_trainer' }))}
                  className={`rounded-[22px] border p-5 text-left transition ${formData.role === 'personal_trainer'
                    ? 'border-[rgba(29,168,240,0.34)] bg-[var(--brand-100)] shadow-[0_14px_32px_rgba(29,168,240,0.12)]'
                    : 'border-[var(--line)] bg-white/65 hover:border-[rgba(29,168,240,0.24)]'
                  }`}
                >
                  <Users className={`mb-3 h-7 w-7 ${formData.role === 'personal_trainer' ? 'text-[var(--brand-900)]' : 'text-[var(--muted-soft)]'}`} />
                  <div className="font-display text-xl font-bold text-[var(--foreground)]">Coach / Personal Trainer</div>
                  <div className="mt-1 text-sm text-[var(--muted)]">For client management, coaching, public marketplace visibility, and inbound lead flow.</div>
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="fullName" className="mb-2 block text-sm font-semibold text-[var(--foreground)]">Full name</label>
              <div className="relative">
                <UserCircle className="pointer-events-none absolute left-5 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-[var(--muted-soft)]" />
                <input
                  id="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                  className="input-field input-field-icon-left"
                  placeholder="Your full name"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-semibold text-[var(--foreground)]">Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-5 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-[var(--muted-soft)]" />
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="input-field input-field-icon-left"
                  placeholder="your.email@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-semibold text-[var(--foreground)]">Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-5 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-[var(--muted-soft)]" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
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
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="input-field input-field-icon-left"
                  placeholder="Re-enter your password"
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
                  <span>Create account</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 border-t border-[var(--line)] pt-6 text-sm text-[var(--muted)]">
            Already have an account?{' '}
            <Link href={`/login${nextPath !== '/onboarding' ? `?next=${encodeURIComponent(nextPath)}` : ''}`} className="font-semibold text-[var(--foreground)] transition hover:text-[var(--brand-500)]">
              Sign in
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
