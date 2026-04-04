'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import BrandLogo from '@/components/brand/BrandLogo'

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.email || !formData.password) {
      toast.error('Please fill in all fields')
      return
    }

    setIsLoading(true)
    const supabase = createClient()

    const { error } = await supabase.auth.signInWithPassword({
      email: formData.email,
      password: formData.password,
    })

    if (error) {
      toast.error(
        error.message === 'Invalid login credentials'
          ? 'Incorrect email or password. Please try again.'
          : error.message
      )
      setIsLoading(false)
      return
    }

    toast.success('Welcome back!')
    window.location.href = '/dashboard'
  }

  return (
    <div className="auth-bg min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl items-center justify-between pb-8">
        <BrandLogo href="/" />
        <Link href="/signup" className="btn-secondary rounded-full px-5 py-3 text-sm font-semibold">
          Create account
        </Link>
      </div>

      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.95fr_0.85fr] lg:items-center">
        <section className="panel-strong overflow-hidden p-8 sm:p-10">
          <div className="eyebrow mb-5">Feel your momentum</div>
          <h1 className="text-5xl font-bold leading-[0.96] text-[var(--foreground)] sm:text-6xl">
            Return to your
            <span className="block text-[var(--brand-500)]">precision dashboard.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-[var(--muted)]">
            Meal systems, training structure, AI coaching, and practitioner-grade insight in one calm, focused space.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              ['Meal planning', 'Adaptive'],
              ['Training', 'Structured'],
              ['Coaching', 'Context-aware'],
            ].map(([title, label]) => (
              <div key={title} className="surface-card p-5">
                <div className="text-sm font-semibold uppercase tracking-[0.15em] text-[var(--muted-soft)]">{label}</div>
                <div className="mt-2 font-display text-2xl font-bold text-[var(--foreground)]">{title}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="glass-card rounded-[32px] p-8 sm:p-10">
          <div className="mb-8">
            <div className="eyebrow mb-4">Sign in</div>
            <h2 className="text-4xl font-bold text-[var(--foreground)]">Welcome back</h2>
            <p className="mt-3 text-base leading-7 text-[var(--muted)]">
              Sign in to continue your plan, check progress, and keep everything moving.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-semibold text-[var(--foreground)]">Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-5 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-[var(--muted-soft)]" />
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="input-field pl-14"
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
                  className="input-field pl-14 pr-14"
                  placeholder="Enter your password"
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-5 text-[var(--muted-soft)]">
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
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
                  <span>Enter dashboard</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 border-t border-[var(--line)] pt-6 text-sm text-[var(--muted)]">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-semibold text-[var(--foreground)] transition hover:text-[var(--brand-500)]">
              Create one
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
