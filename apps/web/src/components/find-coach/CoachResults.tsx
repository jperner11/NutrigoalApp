'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2, Mail, Sparkles } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { type CoachWizardAnswers, type MatchedCoachResult } from '@/lib/findCoach'
import MatchedCoachCard from './MatchedCoachCard'

interface CoachResultsProps {
  answers: CoachWizardAnswers
  matches: MatchedCoachResult[]
}

export default function CoachResults({ answers, matches }: CoachResultsProps) {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const needsWaitlist = matches.length < 3

  async function handleWaitlistSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!email.trim()) {
      toast.error('Add your email first.')
      return
    }

    setSubmitting(true)
    const response = await fetch('/api/coach-waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        answers,
      }),
    })

    const payload = await response.json().catch(() => null)
    setSubmitting(false)

    if (!response.ok) {
      toast.error(payload?.error ?? 'Failed to join the waitlist.')
      return
    }

    toast.success('You’re on the waitlist. We’ll let you know when stronger coach matches join.')
    setEmail('')
  }

  return (
    <div className="space-y-8">
      <div className="rounded-[28px] border border-[rgba(29,168,240,0.18)] bg-[linear-gradient(135deg,rgba(237,248,255,0.96),rgba(255,255,255,0.98))] p-6 sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-700)]">
              <Sparkles className="h-3.5 w-3.5" />
              Matched coaches
            </div>
            <h2 className="mt-4 font-display text-3xl font-bold text-[var(--foreground)] sm:text-4xl">
              Sign up to send a coaching request
            </h2>
            <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--muted)]">
              These are the strongest fits based on your goal, preferences, availability, and budget. Create an account to carry this brief into onboarding and connect with a coach.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/signup?next=/onboarding&wizard=true" className="btn-primary rounded-2xl px-5 py-3 text-sm font-semibold">
              Create account
            </Link>
            <Link href="/login?next=/onboarding" className="btn-secondary rounded-2xl px-5 py-3 text-sm font-semibold">
              Sign in
            </Link>
          </div>
        </div>
      </div>

      {matches.length > 0 ? (
        <div className="grid gap-6 xl:grid-cols-2">
          {matches.map((match) => (
            <MatchedCoachCard key={match.coach_id} match={match} />
          ))}
        </div>
      ) : (
        <div className="rounded-[28px] border border-dashed border-[var(--line-strong)] bg-white px-6 py-14 text-center">
          <h3 className="text-2xl font-semibold text-[var(--foreground)]">No exact matches yet</h3>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            We’re still growing the network. Leave your email below and we’ll notify you when stronger coach matches join.
          </p>
        </div>
      )}

      {needsWaitlist ? (
        <section className="rounded-[30px] border border-[var(--line)] bg-white p-6 sm:p-8">
          <div className="max-w-3xl">
            <div className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--brand-700)]">Waitlist</div>
            <h3 className="mt-3 font-display text-3xl font-bold text-[var(--foreground)]">
              We’re growing the coach network around briefs like yours
            </h3>
            <p className="mt-3 text-base leading-7 text-[var(--muted)]">
              Leave your email and we’ll notify you when coaches matching your preferences join. We’ll store your wizard answers alongside the waitlist request so we know what kind of fit to look for.
            </p>
          </div>

          <form onSubmit={handleWaitlistSubmit} className="mt-6 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-soft)]" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="input-field input-field-icon-left"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Notify me
            </button>
          </form>
        </section>
      ) : null}
    </div>
  )
}
