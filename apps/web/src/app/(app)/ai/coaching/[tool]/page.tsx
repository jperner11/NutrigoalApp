'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import {
  ArrowLeft,
  Loader2,
  TrendingUp,
  Target,
  Moon,
  Shield,
  ClipboardList,
  Activity,
  Sparkles,
} from 'lucide-react'
import Link from 'next/link'
import type { CoachingTool } from '@/lib/coachingPrompts'

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
  color: string
  bg: string
  fields: FieldDef[]
}> = {
  plateau: {
    title: 'Plateau Breaker',
    description: 'Tell us which lifts have stalled and we\'ll diagnose the cause and build an 8-week breakthrough plan.',
    icon: TrendingUp,
    color: 'text-red-500',
    bg: 'bg-red-50',
    fields: [
      {
        key: 'stalledLifts',
        label: 'Which lifts are stalled? Include the weight you\'re stuck at.',
        type: 'textarea',
        placeholder: 'e.g. Bench press stuck at 80kg for 4 weeks, squat plateau at 120kg for 3 weeks',
        required: true,
      },
      {
        key: 'weeksStalled',
        label: 'How many weeks have you been stuck?',
        type: 'number',
        placeholder: 'e.g. 4',
      },
    ],
  },
  'weak-point': {
    title: 'Weak Point Analyzer',
    description: 'Identify your lagging muscles and performance gaps. Get a corrective action plan.',
    icon: Target,
    color: 'text-amber-500',
    bg: 'bg-amber-50',
    fields: [
      {
        key: 'aestheticWeakPoints',
        label: 'Aesthetic weak points — muscle groups that are visibly underdeveloped',
        type: 'textarea',
        placeholder: 'e.g. rear delts, upper chest, hamstrings, calves',
      },
      {
        key: 'performanceWeakPoints',
        label: 'Performance weak points — where you fail or lose form in your lifts',
        type: 'textarea',
        placeholder: 'e.g. squat collapses at the bottom, bench stalls off the chest, deadlift hitches at the knee',
      },
    ],
  },
  recovery: {
    title: 'Recovery Protocol',
    description: 'A complete recovery system built from your profile — sleep, mobility, deload, nutrition, and supplements.',
    icon: Moon,
    color: 'text-indigo-500',
    bg: 'bg-indigo-50',
    fields: [],
  },
  'injury-prevention': {
    title: 'Injury Prevention',
    description: 'Prehab routines, warm-up protocols, and training modifications built around your injury profile.',
    icon: Shield,
    color: 'text-green-500',
    bg: 'bg-green-50',
    fields: [],
  },
  tracking: {
    title: 'Tracking System',
    description: 'A data-driven accountability framework to run alongside your training programme.',
    icon: ClipboardList,
    color: 'text-purple-500',
    bg: 'bg-purple-50',
    fields: [
      {
        key: 'programmeDurationWeeks',
        label: 'Programme duration (weeks)',
        type: 'number',
        placeholder: '12',
      },
    ],
  },
  recomp: {
    title: 'Body Recomposition',
    description: 'A complete 16-week blueprint built from your stats — training, nutrition, cardio, and tracking.',
    icon: Activity,
    color: 'text-cyan-500',
    bg: 'bg-cyan-50',
    fields: [],
  },
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
      <div className="max-w-2xl mx-auto text-center py-12">
        <p className="text-gray-600">Tool not found.</p>
        <Link href="/ai/coaching" className="text-purple-600 hover:underline mt-2 inline-block">
          Back to coaching tools
        </Link>
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
      const res = await fetch('/api/ai/coaching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolType: toolSlug as CoachingTool,
          userId: profile.id,
          additionalInputs: inputs,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || 'Failed to get coaching response')
      }

      const data = await res.json()
      setResponse(data.response)
    } catch (err) {
      setResponse(`Error: ${err instanceof Error ? err.message : 'Something went wrong. Please try again.'}`)
    } finally {
      setLoading(false)
    }
  }

  // Auto-fill summary from profile
  const profileSummary = profile ? [
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
  ].filter(Boolean).join(' · ') : ''

  return (
    <div className="max-w-3xl mx-auto">
      <button
        onClick={() => router.push('/ai/coaching')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="text-sm font-medium">Back to coaching tools</span>
      </button>

      <div className="card p-6 md:p-8">
        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <div className={`p-3 rounded-xl ${config.bg}`}>
            <Icon className={`h-8 w-8 ${config.color}`} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{config.title}</h1>
            <p className="text-gray-600 mt-1">{config.description}</p>
          </div>
        </div>

        {/* Profile context */}
        {profileSummary && (
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <p className="text-xs font-medium text-gray-500 mb-1">Auto-filled from your profile</p>
            <p className="text-sm text-gray-700">{profileSummary}</p>
          </div>
        )}

        {/* Additional inputs */}
        {config.fields.length > 0 && (
          <div className="space-y-4 mb-6">
            {config.fields.map((field) => (
              <div key={field.key}>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {field.type === 'textarea' ? (
                  <textarea
                    value={inputs[field.key] ?? ''}
                    onChange={(e) => setInputs({ ...inputs, [field.key]: e.target.value })}
                    placeholder={field.placeholder}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                  />
                ) : (
                  <input
                    type={field.type}
                    value={inputs[field.key] ?? ''}
                    onChange={(e) => setInputs({ ...inputs, [field.key]: e.target.value })}
                    placeholder={field.placeholder}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Submit */}
        {!response && (
          <button
            onClick={handleSubmit}
            disabled={loading || !profile}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-4 rounded-xl text-base font-semibold hover:shadow-lg transition-all disabled:opacity-50"
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

        {/* Response */}
        {response && (
          <div className="mt-6">
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-6 border border-purple-100">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-purple-600" />
                <h3 className="font-semibold text-purple-800">Your Coaching Report</h3>
              </div>
              <div className="prose prose-sm max-w-none text-gray-800 whitespace-pre-wrap leading-relaxed">
                {response}
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => { setResponse(null); setInputs({}) }}
                className="flex-1 py-3 px-4 rounded-xl border-2 border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-all"
              >
                Run Again
              </button>
              <button
                onClick={() => router.push('/ai/coaching')}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium hover:shadow-lg transition-all"
              >
                Try Another Tool
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
