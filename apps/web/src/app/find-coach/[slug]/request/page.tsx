'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'react-hot-toast'

const STEPS = ['Goal', 'Logistics', 'Message', 'Review'] as const
type Step = (typeof STEPS)[number]

const GOALS = [
  'Fat loss',
  'Muscle gain',
  'Strength / powerlifting',
  'General fitness',
  'Sport-specific',
  'Other',
]

const FORMATS = ['Online', 'In person', 'Hybrid']

interface CoachLite {
  coach_id: string
  full_name: string | null
}

export default function RequestCoachingPage() {
  const params = useParams<{ slug: string }>()
  const slug = params?.slug
  const router = useRouter()
  const [stepIndex, setStepIndex] = useState(0)
  const [coach, setCoach] = useState<CoachLite | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [goal, setGoal] = useState<string | null>(null)
  const [start, setStart] = useState('In two weeks')
  const [budget, setBudget] = useState('£140 / month')
  const [format, setFormat] = useState('Online')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!slug) return
    fetch('/api/coach-profiles')
      .then((r) => r.json())
      .then((data) => {
        type Row = { slug: string; coach_id: string; coach: { full_name: string | null } | { full_name: string | null }[] | null }
        const list: Row[] = data?.profiles ?? data ?? []
        const found = list.find((p) => p.slug === slug)
        if (found) {
          const c = Array.isArray(found.coach) ? found.coach[0] : found.coach
          setCoach({
            coach_id: found.coach_id,
            full_name: c?.full_name ?? null,
          })
        }
      })
      .catch(() => {
        toast.error('Could not load coach details.')
      })
  }, [slug])

  const step: Step = STEPS[stepIndex]

  const canContinue = () => {
    if (step === 'Goal') return !!goal
    if (step === 'Logistics') return !!start && !!budget && !!format
    if (step === 'Message') return message.trim().length > 0
    return true
  }

  const handleSend = async () => {
    if (!coach) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/coach-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coach_id: coach.coach_id,
          goal_summary: goal,
          message,
          budget_label: budget,
          preferred_format: format,
        }),
      })
      if (res.status === 401) {
        router.push(
          `/signup?next=${encodeURIComponent(`/find-coach/${slug}/request`)}`,
        )
        return
      }
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error || 'Could not send request.')
        setSubmitting(false)
        return
      }
      toast.success('Request sent.')
      router.push('/dashboard')
    } catch {
      toast.error('Something went wrong.')
      setSubmitting(false)
    }
  }

  const coachFirstName = coach?.full_name?.split(' ')[0] || 'the coach'

  return (
    <section className="mx-auto max-w-[720px] px-8 py-12">
      <Link
        href={`/find-coach/${slug}`}
        className="btn btn-ghost mb-6 inline-flex"
        style={{ padding: '6px 12px', fontSize: 12 }}
      >
        ← Back to {coachFirstName}
      </Link>

      <div className="row mb-8 gap-1.5">
        {STEPS.map((s, i) => (
          <div
            key={s}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 999,
              background: i <= stepIndex ? 'var(--acc)' : 'var(--line)',
            }}
          />
        ))}
      </div>

      <div
        className="eyebrow mb-4"
        style={{ color: 'var(--acc)' }}
      >
        STEP {String(stepIndex + 1).padStart(2, '0')} · {step.toUpperCase()}
      </div>

      <h2 className="h2 mb-8">
        {step === 'Goal' && (
          <>
            What&apos;s your{' '}
            <span className="italic-serif">main goal?</span>
          </>
        )}
        {step === 'Logistics' && (
          <>
            When and how,{' '}
            <span className="italic-serif">roughly?</span>
          </>
        )}
        {step === 'Message' && (
          <>
            One short note{' '}
            <span className="italic-serif">to {coachFirstName}.</span>
          </>
        )}
        {step === 'Review' && (
          <>
            Looks <span className="italic-serif">good?</span>
          </>
        )}
      </h2>

      {step === 'Goal' && (
        <div className="col gap-2.5">
          {GOALS.map((g) => {
            const active = goal === g
            return (
              <button
                key={g}
                type="button"
                onClick={() => setGoal(g)}
                className="text-left transition"
                style={{
                  padding: 18,
                  borderRadius: 14,
                  background: active ? 'var(--ink-3)' : 'var(--ink-2)',
                  border: active ? '1px solid var(--acc)' : '1px solid var(--line-2)',
                  fontSize: 16,
                  cursor: 'pointer',
                }}
              >
                {g}
              </button>
            )
          })}
        </div>
      )}

      {step === 'Logistics' && (
        <div className="col gap-4">
          {[
            { label: 'Start', value: start, setter: setStart, options: ['Right away', 'In two weeks', 'In a month', 'Flexible'] },
            { label: 'Budget', value: budget, setter: setBudget, options: ['£60–80 / month', '£90–120 / month', '£120–160 / month', '£160+ / month'] },
            { label: 'Format', value: format, setter: setFormat, options: FORMATS },
          ].map(({ label, value, setter, options }) => (
            <div key={label} className="card-2 p-4">
              <div
                className="mono mb-2"
                style={{ fontSize: 10, color: 'var(--fg-4)', letterSpacing: '0.12em' }}
              >
                {label.toUpperCase()}
              </div>
              <select
                value={value}
                onChange={(e) => setter(e.target.value)}
                className="w-full"
                style={{
                  padding: '10px 12px',
                  background: 'var(--ink-2)',
                  border: '1px solid var(--line-2)',
                  borderRadius: 10,
                  fontSize: 14,
                  color: 'var(--fg)',
                  outline: 'none',
                }}
              >
                {options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}

      {step === 'Message' && (
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={`Hey ${coachFirstName} — short context about your training, goals, and what you want from coaching.`}
          style={{
            width: '100%',
            minHeight: 200,
            padding: 16,
            background: 'var(--ink-2)',
            border: '1px solid var(--line-2)',
            borderRadius: 14,
            color: 'var(--fg)',
            fontSize: 15,
            lineHeight: 1.5,
            resize: 'vertical',
            outline: 'none',
          }}
        />
      )}

      {step === 'Review' && (
        <div className="card p-6">
          <div
            className="mono"
            style={{
              fontSize: 11,
              color: 'var(--acc)',
              letterSpacing: '0.14em',
            }}
          >
            YOUR REQUEST · TO {coach?.full_name?.toUpperCase() || 'COACH'}
          </div>
          <div className="serif mt-3" style={{ fontSize: 24 }}>
            {goal}
          </div>
          <div
            className="mt-2"
            style={{ fontSize: 14, color: 'var(--fg-2)' }}
          >
            {start} · {budget} · {format}
          </div>
          {message && (
            <p
              className="mt-4"
              style={{ fontSize: 14, color: 'var(--fg-2)', lineHeight: 1.5 }}
            >
              {message}
            </p>
          )}
        </div>
      )}

      <div className="row mt-8 gap-2">
        {stepIndex > 0 && (
          <button
            type="button"
            onClick={() => setStepIndex(stepIndex - 1)}
            className="btn btn-ghost"
          >
            ← Back
          </button>
        )}
        {stepIndex < STEPS.length - 1 && (
          <button
            type="button"
            onClick={() => setStepIndex(stepIndex + 1)}
            disabled={!canContinue()}
            className="btn btn-accent disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Continue →
          </button>
        )}
        {stepIndex === STEPS.length - 1 && (
          <button
            type="button"
            onClick={handleSend}
            disabled={submitting}
            className="btn btn-accent disabled:opacity-40"
          >
            {submitting ? 'Sending…' : 'Send request →'}
          </button>
        )}
      </div>
    </section>
  )
}
