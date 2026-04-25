'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { sanitizeNextPath } from '@/lib/authRedirect'
import BrandLogo from '@/components/brand/BrandLogo'

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [nextPath, setNextPath] = useState('/dashboard')
  const [formData, setFormData] = useState({ email: '', password: '' })

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setNextPath(sanitizeNextPath(params.get('next'), '/dashboard'))
    setFormData((prev) => ({
      ...prev,
      email: params.get('email') || prev.email,
    }))
  }, [])

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
          : error.message,
      )
      setIsLoading(false)
      return
    }

    toast.success('Welcome back.')
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

  const signupHref = `/signup${nextPath !== '/dashboard' ? `?next=${encodeURIComponent(nextPath)}` : ''}`

  return (
    <div className="min-h-screen overflow-x-hidden">
      <div className="row mx-auto max-w-[1320px] justify-between px-8 py-5">
        <BrandLogo href="/" />
        <Link href={signupHref} className="btn btn-ghost">
          Create account
        </Link>
      </div>

      <section className="mx-auto max-w-[440px] px-8 pb-20 pt-10">
        <div className="mb-8 flex justify-center">
          <BrandLogo compact />
        </div>

        <div className="mb-4 flex justify-center">
          <div className="eyebrow eyebrow-dot">Sign in</div>
        </div>

        <h1 className="h2 mb-8 text-center">
          Welcome
          <br />
          <span className="italic-serif" style={{ color: 'var(--fg-3)' }}>
            back.
          </span>
        </h1>

        <form onSubmit={handleSubmit} className="col gap-4">
          <div>
            <label
              className="mono mb-2 block"
              style={{ fontSize: 11, color: 'var(--fg-3)', letterSpacing: '0.12em' }}
            >
              EMAIL
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, email: e.target.value }))
              }
              placeholder="your.email@example.com"
              style={inputStyle}
              required
            />
          </div>

          <div>
            <label
              className="mono mb-2 block"
              style={{ fontSize: 11, color: 'var(--fg-3)', letterSpacing: '0.12em' }}
            >
              PASSWORD
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, password: e.target.value }))
                }
                placeholder="Enter your password"
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

          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-accent mt-2 w-full justify-center disabled:opacity-50"
            style={{ padding: '14px 18px', fontSize: 15 }}
          >
            {isLoading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <span>Enter dashboard →</span>
            )}
          </button>
        </form>

        <div
          className="mt-6 text-center"
          style={{ fontSize: 13, color: 'var(--fg-3)' }}
        >
          Don&apos;t have an account?{' '}
          <Link href={signupHref} style={{ color: 'var(--fg)', fontWeight: 600 }}>
            Create one
          </Link>
        </div>

        <div
          className="mt-2 text-center"
          style={{ fontSize: 12, color: 'var(--fg-4)' }}
        >
          <Link href="/reset-password" className="hover:text-[var(--fg-2)]">
            Forgot your password?
          </Link>
        </div>
      </section>
    </div>
  )
}
