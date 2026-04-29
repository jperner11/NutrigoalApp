'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  TrendingUp, TrendingDown, Minus, Sparkles, Loader2,
  ChevronDown, ChevronUp, RefreshCw, ArrowRight, BarChart3,
  Calendar, Dumbbell, Target,
} from 'lucide-react'
import type { ExerciseProgress } from '@nutrigoal/shared'
import { apiFetch } from '@/lib/apiClient'

interface CheckInResult {
  exerciseProgress: ExerciseProgress[]
  aiAnalysis: {
    overall_summary: string
    exercise_insights: { exercise: string; insight: string; action: string }[]
    recommendations: string[]
    plan_adjustments: string[]
  } | null
  workoutsLogged: number
  workoutsPlanned: number
  periodStart: string
  periodEnd: string
}

interface ProgressCheckInProps {
  userId: string
  onPlanRegenerate: () => void
}

export default function ProgressCheckIn({ userId, onPlanRegenerate }: ProgressCheckInProps) {
  const [eligible, setEligible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CheckInResult | null>(null)
  const [expanded, setExpanded] = useState(true)
  const [checking, setChecking] = useState(true)
  const [lastCheckInDate, setLastCheckInDate] = useState<string | null>(null)

  const checkEligibility = useCallback(async () => {
    const supabase = createClient()

    const { data: lastCheckIn } = await supabase
      .from('training_check_ins')
      .select('check_in_date')
      .eq('user_id', userId)
      .order('check_in_date', { ascending: false })
      .limit(1)
      .single()

    if (lastCheckIn) {
      setLastCheckInDate(lastCheckIn.check_in_date)
      const lastDate = new Date(lastCheckIn.check_in_date)
      const daysSince = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
      if (daysSince < 14) {
        setChecking(false)
        return
      }
    }

    // Check if user has any workout logs
    const { count } = await supabase
      .from('workout_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)

    setEligible((count ?? 0) > 0)
    setChecking(false)
  }, [userId])

  useEffect(() => {
    checkEligibility()
  }, [checkEligibility])

  async function runCheckIn() {
    setLoading(true)
    try {
      const data = await apiFetch<CheckInResult>('/api/ai/training-check-in', {
        method: 'POST',
        body: { userId },
        context: { feature: 'training', action: 'check-in', extra: { userId } },
      })
      setResult(data)
      setEligible(false)
    } catch (err) {
      console.error('Check-in error:', err)
    } finally {
      setLoading(false)
    }
  }

  const trendIcon = (trend: string) => {
    if (trend === 'improving') return <TrendingUp className="h-4 w-4 text-emerald-300" />
    if (trend === 'declining') return <TrendingDown className="h-4 w-4 text-[var(--brand-400)]" />
    return <Minus className="h-4 w-4 text-amber-300" />
  }

  const trendColor = (trend: string) => {
    if (trend === 'improving') return 'text-emerald-200 bg-[rgba(26,163,122,0.12)] border-[rgba(26,163,122,0.34)]'
    if (trend === 'declining') return 'text-[var(--foreground)] bg-[var(--danger-bg)] border-[rgba(230,57,70,0.34)]'
    return 'text-amber-200 bg-[rgba(196,121,28,0.12)] border-[rgba(196,121,28,0.34)]'
  }

  if (checking || (!eligible && !result)) return null

  if (eligible && !result && !loading) {
    return (
      <div className="mb-6">
        <button
          onClick={runCheckIn}
          className="group flex w-full items-center gap-4 rounded-xl border-2 border-dashed border-[rgba(230,57,70,0.34)] bg-[var(--brand-100)] px-5 py-4 transition-all hover:border-[rgba(230,57,70,0.52)] hover:bg-[rgba(230,57,70,0.16)]"
        >
          <div className="rounded-xl bg-[var(--brand-100)] p-2.5 transition-colors group-hover:bg-[rgba(230,57,70,0.18)]">
            <BarChart3 className="h-5 w-5 text-[var(--brand-400)]" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-[var(--foreground)]">Progress Check-In Available</p>
            <p className="text-xs text-[var(--muted)]">
              {lastCheckInDate
                ? `Last check-in: ${new Date(lastCheckInDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} — time to review your progress`
                : 'Analyse your workout data and get AI-powered insights'}
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-[var(--brand-400)] transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="mb-6 rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--brand-400)]" />
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)]">Analysing your training data...</p>
            <p className="text-xs text-[var(--muted)]">Crunching your sets, reps, and weights from the last 2 weeks</p>
          </div>
        </div>
      </div>
    )
  }

  if (!result) return null

  const consistency = result.workoutsPlanned > 0
    ? Math.round((result.workoutsLogged / result.workoutsPlanned) * 100)
    : 0
  const improving = result.exerciseProgress.filter(e => e.trend === 'improving').length
  const stalled = result.exerciseProgress.filter(e => e.trend === 'stalled').length
  const declining = result.exerciseProgress.filter(e => e.trend === 'declining').length

  return (
    <div className="mb-6 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] shadow-[0_16px_36px_rgba(0,0,0,0.28)] backdrop-blur-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-4 px-5 py-4 transition-colors hover:bg-[rgba(245,241,234,0.05)]"
      >
        <div className="rounded-xl bg-[var(--brand-100)] p-2">
          <Sparkles className="h-5 w-5 text-[var(--brand-400)]" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-[var(--foreground)]">Progress Check-In</p>
          <p className="text-xs text-[var(--muted-soft)]">
            {new Date(result.periodStart).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} — {new Date(result.periodEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs">
            {improving > 0 && <span className="font-medium text-emerald-300">{improving} up</span>}
            {stalled > 0 && <span className="font-medium text-amber-300">{stalled} flat</span>}
            {declining > 0 && <span className="font-medium text-[var(--brand-400)]">{declining} down</span>}
          </div>
          {expanded ? <ChevronUp className="h-4 w-4 text-[var(--muted-soft)]" /> : <ChevronDown className="h-4 w-4 text-[var(--muted-soft)]" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[var(--line)]">
          <div className="grid grid-cols-3 gap-3 px-5 py-4">
            <div className="rounded-lg bg-[var(--brand-100)] p-3 text-center">
              <Calendar className="mx-auto mb-1 h-4 w-4 text-[var(--brand-400)]" />
              <p className="text-lg font-bold text-[var(--foreground)]">{result.workoutsLogged}/{result.workoutsPlanned}</p>
              <p className="text-xs text-[var(--muted)]">Workouts</p>
            </div>
            <div className="rounded-lg bg-[rgba(26,163,122,0.12)] p-3 text-center">
              <Target className="mx-auto mb-1 h-4 w-4 text-emerald-300" />
              <p className="text-lg font-bold text-[var(--foreground)]">{consistency}%</p>
              <p className="text-xs text-[var(--muted)]">Consistency</p>
            </div>
            <div className="rounded-lg bg-[rgba(245,241,234,0.06)] p-3 text-center">
              <Dumbbell className="mx-auto mb-1 h-4 w-4 text-[var(--muted)]" />
              <p className="text-lg font-bold text-[var(--foreground)]">{result.exerciseProgress.length}</p>
              <p className="text-xs text-[var(--muted)]">Exercises</p>
            </div>
          </div>

          {result.exerciseProgress.length > 0 && (
            <div className="px-5 pb-4">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted-soft)]">Exercise Progress</h4>
              <div className="space-y-2">
                {result.exerciseProgress.map((ex, i) => (
                  <div key={i} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${trendColor(ex.trend)}`}>
                    {trendIcon(ex.trend)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{ex.exercise_name}</p>
                      <p className="text-xs opacity-75">
                        {ex.first_weight}kg → {ex.last_weight}kg ({ex.weight_change >= 0 ? '+' : ''}{ex.weight_change}kg) · {ex.sessions_logged} sessions · avg {ex.avg_reps} reps
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.aiAnalysis && (
            <div className="px-5 pb-4 space-y-4">
              {result.aiAnalysis.overall_summary && (
                <div className="rounded-xl border border-[var(--line)] bg-[var(--ink-2)] p-4">
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--brand-400)]">Coach&apos;s Assessment</h4>
                  <div className="whitespace-pre-line text-sm leading-relaxed text-[var(--muted)]">
                    {result.aiAnalysis.overall_summary}
                  </div>
                </div>
              )}

              {result.aiAnalysis.recommendations?.length > 0 && (
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted-soft)]">Recommendations</h4>
                  <ul className="space-y-1.5">
                    {result.aiAnalysis.recommendations.map((rec, i) => (
                      <li key={i} className="flex gap-2 text-sm text-[var(--muted)]">
                        <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[var(--brand-100)] text-xs font-bold text-[var(--brand-400)]">{i + 1}</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.aiAnalysis.plan_adjustments?.length > 0 && (
                <div className="rounded-xl border border-[rgba(196,121,28,0.34)] bg-[rgba(196,121,28,0.12)] p-4">
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-300">Suggested Plan Changes</h4>
                  <ul className="space-y-1.5">
                    {result.aiAnalysis.plan_adjustments.map((adj, i) => (
                      <li key={i} className="flex gap-2 text-sm text-amber-100">
                        <span className="text-amber-300">•</span>
                        <span>{adj}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="px-5 pb-5">
            <button
              onClick={onPlanRegenerate}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--brand-500)] to-[var(--brand-400)] px-5 py-3 text-sm font-semibold text-white transition-all hover:shadow-lg"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Generate Updated Training Plan</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
