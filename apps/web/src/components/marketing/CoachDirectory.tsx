'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Portrait from '@/components/ui/Portrait'

interface CoachProfile {
  coach_id: string
  slug: string
  headline: string | null
  bio: string | null
  location_label: string | null
  price_from: number | null
  price_to: number | null
  currency: string | null
  accepting_new_clients: boolean
  coach: {
    id: string
    full_name: string | null
    avatar_url: string | null
    coach_specialties: string[] | null
    coach_formats: string[] | null
  } | null
}

const formatPrice = (
  price: number | null,
  currency: string | null,
): string | null => {
  if (price == null) return null
  const symbol = currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : '$'
  return `${symbol}${Math.round(price)}/mo`
}

const initials = (name: string | null) =>
  (name || '?')
    .split(' ')
    .filter(Boolean)
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

export default function CoachDirectory() {
  const [coaches, setCoaches] = useState<CoachProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [budget, setBudget] = useState(200)
  const [acceptingOnly, setAcceptingOnly] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/coach-profiles')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        if (Array.isArray(data?.profiles)) {
          setCoaches(data.profiles as CoachProfile[])
        } else if (Array.isArray(data)) {
          setCoaches(data as CoachProfile[])
        } else {
          setError('Could not load coaches.')
        }
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setError('Could not load coaches.')
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    return coaches.filter((c) => {
      const name = c.coach?.full_name?.toLowerCase() || ''
      const tag = c.headline?.toLowerCase() || ''
      const specs = (c.coach?.coach_specialties || []).join(' ').toLowerCase()
      const matchesText =
        !query ||
        name.includes(query) ||
        tag.includes(query) ||
        specs.includes(query)
      const price = c.price_from ?? 0
      const matchesBudget = price <= budget
      const matchesAccepting = !acceptingOnly || c.accepting_new_clients
      return matchesText && matchesBudget && matchesAccepting
    })
  }, [coaches, q, budget, acceptingOnly])

  return (
    <section className="mx-auto max-w-[1320px] px-8 py-16">
      <div className="mb-8">
        <div className="eyebrow eyebrow-dot mb-4">Find a coach</div>
        <h1 className="h2 max-w-[720px]">
          The right coach for{' '}
          <span className="italic-serif" style={{ color: 'var(--fg-3)' }}>
            where you actually are.
          </span>
        </h1>
        <p
          className="mt-4 max-w-[540px]"
          style={{ fontSize: 16, color: 'var(--fg-2)' }}
        >
          Filter by what matters — goal, format, budget — or take the 60-second
          match quiz.
        </p>
      </div>

      <div
        className="card mb-8 grid items-end gap-4 p-5 lg:grid-cols-[1.6fr_1fr_auto] lg:gap-6"
      >
        <div>
          <div
            className="mono mb-2"
            style={{ fontSize: 10, color: 'var(--fg-4)', letterSpacing: '0.12em' }}
          >
            SEARCH
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Goal, name, style…"
            style={{
              padding: '10px 12px',
              background: 'var(--ink-2)',
              border: '1px solid var(--line-2)',
              borderRadius: 10,
              fontSize: 14,
              color: 'var(--fg)',
              width: '100%',
              outline: 'none',
            }}
          />
        </div>

        <div>
          <div
            className="mono mb-2"
            style={{ fontSize: 10, color: 'var(--fg-4)', letterSpacing: '0.12em' }}
          >
            BUDGET — UP TO £{budget}/MO
          </div>
          <input
            type="range"
            min={60}
            max={300}
            value={budget}
            onChange={(e) => setBudget(+e.target.value)}
            className="w-full"
            style={{ marginTop: 8 }}
          />
        </div>

        <Link href="/find-coach/match" className="btn btn-ghost whitespace-nowrap">
          Match quiz →
        </Link>
      </div>

      <div className="row mb-5 justify-between">
        <div
          className="mono"
          style={{ fontSize: 12, color: 'var(--fg-3)', letterSpacing: '0.1em' }}
        >
          {loading
            ? 'LOADING…'
            : `${filtered.length} COACH${filtered.length === 1 ? '' : 'ES'} · SORTED BY FIT`}
        </div>
        <div className="row gap-1.5">
          <button
            type="button"
            onClick={() => setAcceptingOnly((v) => !v)}
            className="chip"
            style={{
              cursor: 'pointer',
              background: acceptingOnly ? 'var(--ink-3)' : 'rgba(255,255,255,0.6)',
              borderColor: acceptingOnly ? 'var(--acc)' : 'var(--line-2)',
            }}
          >
            Accepting only
          </button>
          <span className="chip">Verified</span>
        </div>
      </div>

      {error && (
        <div
          className="card-2 p-6 text-center"
          style={{ color: 'var(--fg-2)' }}
        >
          {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div
          className="card-2 p-10 text-center"
          style={{ color: 'var(--fg-2)' }}
        >
          No coaches match your filters yet. Try widening your budget or take the{' '}
          <Link
            href="/find-coach/match"
            style={{ color: 'var(--acc)', fontWeight: 600 }}
          >
            match quiz
          </Link>
          .
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((c, i) => {
          const name = c.coach?.full_name || 'Coach'
          const tag = c.headline || (c.coach?.coach_specialties || []).slice(0, 2).join(' · ')
          const loc = c.location_label || (c.coach?.coach_formats || []).join(' · ')
          const price = formatPrice(c.price_from, c.currency)
          return (
            <Link
              key={c.coach_id}
              href={`/find-coach/${c.slug}`}
              className="card block p-5"
            >
              <Portrait seed={i} label={initials(name)} height={180} />
              <div className="mt-3.5">
                <div className="row justify-between">
                  <div className="serif" style={{ fontSize: 22 }}>
                    {name}
                  </div>
                </div>
                <div
                  className="mt-1"
                  style={{ fontSize: 13, color: 'var(--fg-2)' }}
                >
                  {tag}
                </div>
                {loc && (
                  <div
                    className="mono mt-2.5 uppercase"
                    style={{
                      fontSize: 10,
                      color: 'var(--fg-4)',
                      letterSpacing: '0.08em',
                    }}
                  >
                    {loc}
                  </div>
                )}
                <div className="row mt-3.5 justify-between">
                  {price && (
                    <span className="serif" style={{ fontSize: 20 }}>
                      {price}
                    </span>
                  )}
                  <span
                    className="chip"
                    style={{
                      color: c.accepting_new_clients ? 'var(--ok)' : 'var(--fg-4)',
                    }}
                  >
                    ● {c.accepting_new_clients ? 'Accepting' : 'Waitlist'}
                  </span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
