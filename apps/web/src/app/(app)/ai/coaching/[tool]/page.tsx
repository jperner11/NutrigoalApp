'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import {
  ArrowLeft,
  Loader2,
  Moon,
  Shield,
  Activity,
  Sparkles,
} from 'lucide-react'
import Link from 'next/link'
import type { CoachingTool } from '@/lib/coachingPrompts'
import AppPageHeader from '@/components/ui/AppPageHeader'
import { apiFetch, ApiError } from '@/lib/apiClient'

interface FieldDef {
  key: string
  label: string
  type: 'text' | 'textarea' | 'number'
  placeholder: string
  required?: boolean
}

const TOOL_CONFIG: Record<string, {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  kicker: string
  fields: FieldDef[]
}> = {
  recovery: {
    title: 'Recovery Protocol',
    description: 'A complete recovery system built from your profile — sleep, mobility, deload, nutrition, and supplements.',
    icon: Moon,
    kicker: 'SLEEP · MOBILITY · DELOADS',
    fields: [],
  },
  'injury-prevention': {
    title: 'Injury Prevention',
    description: 'Prehab routines, warm-up protocols, and training modifications built around your injury profile.',
    icon: Shield,
    kicker: 'PREHAB · WARM-UPS · MODIFICATIONS',
    fields: [],
  },
  recomp: {
    title: 'Body Recomposition',
    description: 'A complete 16-week blueprint built from your stats — training, nutrition, cardio, and tracking.',
    icon: Activity,
    kicker: 'TRAINING · NUTRITION · TRACKING',
    fields: [],
  },
}

const labelClass = 'mono mb-2 block'
const fieldClass = 'w-full rounded-xl border border-[var(--line-2)] bg-[var(--ink-2)] px-4 py-3 text-sm text-[var(--fg)] outline-none transition focus:border-[var(--acc)]'
const fieldStyle = {
  borderColor: 'var(--line-2)',
}
const labelStyle = {
  fontSize: 11,
  color: 'var(--fg-4)',
  letterSpacing: '0.12em',
}

export default function CoachingToolPage() {
  const params = useParams<{ tool: string }>()
  const router = useRouter()
  const { profile } = useUser()
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<string | null>(null)
  const [inputs, setInputs] = useState<Record<string, string>>({})

  const toolSlug = params.tool
  const config = TOOL_CONFIG[toolSlug]

  if (!config) {
    return (
      <div className="mx-auto max-w-[620px]">
        <AppPageHeader
          eyebrow="AI coaching"
          title="Tool"
          accent="missing."
          subtitle="That coaching tool is not available."
        />
        <div className="card p-8 text-center">
          <p className="text-sm" style={{ color: 'var(--fg-2)' }}>Tool not found.</p>
          <Link href="/ai/coaching" className="btn btn-accent mt-5">
            Back to coaching tools
          </Link>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-[760px]">
        <AppPageHeader
          eyebrow="AI coaching"
          title={config.title}
          accent="report."
          subtitle={config.description}
          actions={
            <Link href="/ai/coaching" className="btn btn-ghost">
              <ArrowLeft className="h-4 w-4" />
              Tools
            </Link>
          }
        />
        <div className="card p-8">
          <div
            className="mono"
            style={{ fontSize: 11, color: 'var(--fg-4)', letterSpacing: '0.14em' }}
          >
            PROFILE REQUIRED
          </div>
          <div className="serif mt-2" style={{ fontSize: 24, color: 'var(--fg)' }}>
            Loading your profile context.
          </div>
          <p className="mt-2 text-sm leading-6" style={{ color: 'var(--fg-2)' }}>
            The coaching tools use your profile before generating a report.
          </p>
        </div>
      </div>
    )
  }

  const Icon = config.icon

  async function handleSubmit() {
    if (!profile) return

    // Check required fields
    for (const field of config.fields) {
      if (field.required && !inputs[field.key]?.trim()) {
        return
      }
    }

    setLoading(true)
    setResponse(null)

    try {
      const data = await apiFetch<{ response: string }>('/api/ai/coaching', {
        method: 'POST',
        body: {
          toolType: toolSlug as CoachingTool,
          userId: profile.id,
          additionalInputs: inputs,
        },
        context: { feature: 'ai-coaching', action: 'submit', extra: { tool: toolSlug } },
      })
      setResponse(data.response)
    } catch (err) {
      setResponse(`Error: ${err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Something went wrong. Please try again.'}`)
    } finally {
      setLoading(false)
    }
  }

  // Auto-fill summary from profile
  const profileSummary = [
    `${profile.age ?? '?'}yo ${profile.gender ?? ''}`,
    `${profile.weight_kg ?? '?'}kg`,
    profile.training_experience ?? 'beginner',
    profile.years_training ? `${profile.years_training}yrs training` : null,
    profile.squat_1rm ? `SQ ${profile.squat_1rm}` : null,
    profile.bench_1rm ? `BP ${profile.bench_1rm}` : null,
    profile.deadlift_1rm ? `DL ${profile.deadlift_1rm}` : null,
    `${profile.workout_days_per_week ?? 4}x/week`,
    `${profile.sleep_hours ?? 7}h sleep`,
    `Stress: ${profile.stress_level ?? 'moderate'}`,
  ].filter(Boolean).join(' · ')

  return (
    <div className="mx-auto max-w-[900px]">
      <AppPageHeader
        eyebrow="AI coaching"
        title={config.title}
        accent="report."
        subtitle={config.description}
        actions={
          <Link href="/ai/coaching" className="btn btn-ghost">
            <ArrowLeft className="h-4 w-4" />
            Tools
          </Link>
        }
        chip={<span className="chip">{config.kicker}</span>}
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
        <div className="card p-6 md:p-8">
          <div className="row mb-6 items-start gap-4">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
              style={{ background: 'var(--ink-3)', color: 'var(--acc)' }}
            >
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <div
                className="mono"
                style={{ fontSize: 10, color: 'var(--fg-4)', letterSpacing: '0.12em' }}
              >
                {config.kicker}
              </div>
              <h1 className="serif mt-1" style={{ fontSize: 28, lineHeight: 1.1, color: 'var(--fg)' }}>
                Build my{' '}
                <span className="italic-serif" style={{ color: 'var(--fg-3)' }}>
                  report.
                </span>
              </h1>
              <p className="mt-2 text-sm leading-6" style={{ color: 'var(--fg-2)' }}>
                We will use your saved profile and return a practical plan, not a generic prompt.
              </p>
            </div>
          </div>

          {config.fields.length > 0 && (
            <div className="mb-6 space-y-4">
              {config.fields.map((field) => (
                <div key={field.key}>
                  <label className={labelClass} style={labelStyle}>
                    {field.label.toUpperCase()}
                    {field.required && <span style={{ color: 'var(--warn)' }}> *</span>}
                  </label>
                  {field.type === 'textarea' ? (
                    <textarea
                      value={inputs[field.key] ?? ''}
                      onChange={(e) => setInputs({ ...inputs, [field.key]: e.target.value })}
                      placeholder={field.placeholder}
                      rows={3}
                      className={`${fieldClass} resize-none`}
                      style={fieldStyle}
                    />
                  ) : (
                    <input
                      type={field.type}
                      value={inputs[field.key] ?? ''}
                      onChange={(e) => setInputs({ ...inputs, [field.key]: e.target.value })}
                      placeholder={field.placeholder}
                      className={fieldClass}
                      style={fieldStyle}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {!response && (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="btn btn-accent w-full justify-center disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Analysing your profile...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  <span>Get My {config.title}</span>
                </>
              )}
            </button>
          )}

          {response && (
            <div className="mt-6">
              <div className="card-2 p-5">
                <div className="row gap-2">
                  <Sparkles className="h-4 w-4" style={{ color: 'var(--acc)' }} />
                  <div
                    className="mono"
                    style={{ fontSize: 10, color: 'var(--fg-4)', letterSpacing: '0.12em' }}
                  >
                    YOUR COACHING REPORT
                  </div>
                </div>
                <div
                  className="mt-4 rounded-xl p-5 text-sm leading-7 whitespace-pre-wrap"
                  style={{
                    background: 'var(--ink-2)',
                    border: '1px solid var(--line)',
                    color: 'var(--fg)',
                  }}
                >
                  {response}
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button
                  onClick={() => { setResponse(null); setInputs({}) }}
                  className="btn btn-ghost justify-center"
                >
                  Run Again
                </button>
                <button
                  onClick={() => router.push('/ai/coaching')}
                  className="btn btn-accent justify-center"
                >
                  Try Another Tool
                </button>
              </div>
            </div>
          )}
        </div>

        <aside className="card-2 p-5">
          <div
            className="mono"
            style={{ fontSize: 10, color: 'var(--fg-4)', letterSpacing: '0.12em' }}
          >
            PROFILE CONTEXT
          </div>
          <div className="serif mt-2" style={{ fontSize: 20, lineHeight: 1.15, color: 'var(--fg)' }}>
            Auto-filled from{' '}
            <span className="italic-serif" style={{ color: 'var(--fg-3)' }}>
              your data.
            </span>
          </div>
          <p className="mt-3 text-sm leading-6" style={{ color: 'var(--fg-2)' }}>
            {profileSummary}
          </p>
        </aside>
      </div>
    </div>
  )
}
