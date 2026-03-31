'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  TrendingUp, TrendingDown, Minus, Sparkles, Loader2,
  ChevronDown, ChevronUp, RefreshCw, ArrowRight, BarChart3,
  Calendar, Dumbbell, Target,
} from 'lucide-react'
import type { ExerciseProgress } from '@nutrigoal/shared'

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
      const res = await fetch('/api/ai/training-check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })

      if (!res.ok) throw new Error('Check-in failed')
      setResult(await res.json())
      setEligible(false)
    } catch (err) {
      console.error('Check-in error:', err)
    } finally {
      setLoading(false)
    }
  }

  const trendIcon = (trend: string) => {
    if (trend === 'improving') return <TrendingUp className="h-4 w-4 text-green-500" />
    if (trend === 'declining') return <TrendingDown className="h-4 w-4 text-red-500" />
    return <Minus className="h-4 w-4 text-amber-500" />
  }

  const trendColor = (trend: string) => {
    if (trend === 'improving') return 'text-green-700 bg-green-50 border-green-200'
    if (trend === 'declining') return 'text-red-700 bg-red-50 border-red-200'
    return 'text-amber-700 bg-amber-50 border-amber-200'
  }

  if (checking || (!eligible && !result)) return null

  if (eligible && !result && !loading) {
    return (
      <div className="mb-6">
        <button
          onClick={runCheckIn}
          className="w-full flex items-center gap-4 px-5 py-4 rounded-xl border-2 border-dashed border-purple-300 bg-purple-50/50 hover:bg-purple-50 hover:border-purple-400 transition-all group"
        >
          <div className="p-2.5 rounded-xl bg-purple-100 group-hover:bg-purple-200 transition-colors">
            <BarChart3 className="h-5 w-5 text-purple-600" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-purple-800">Progress Check-In Available</p>
            <p className="text-xs text-purple-600">
              {lastCheckInDate
                ? `Last check-in: ${new Date(lastCheckInDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} — time to review your progress`
                : 'Analyse your workout data and get AI-powered insights'}
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-purple-400 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="mb-6 bg-purple-50 rounded-xl p-6 border border-purple-200">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 text-purple-600 animate-spin" />
          <div>
            <p className="text-sm font-semibold text-purple-800">Analysing your training data...</p>
            <p className="text-xs text-purple-600">Crunching your sets, reps, and weights from the last 2 weeks</p>
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
    <div className="mb-6 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="p-2 rounded-xl bg-gradient-to-br from-purple-100 to-indigo-100">
          <Sparkles className="h-5 w-5 text-purple-600" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-gray-900">Progress Check-In</p>
          <p className="text-xs text-gray-500">
            {new Date(result.periodStart).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} — {new Date(result.periodEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs">
            {improving > 0 && <span className="text-green-600 font-medium">{improving} up</span>}
            {stalled > 0 && <span className="text-amber-600 font-medium">{stalled} flat</span>}
            {declining > 0 && <span className="text-red-600 font-medium">{declining} down</span>}
          </div>
          {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100">
          <div className="grid grid-cols-3 gap-3 px-5 py-4">
            <div className="bg-purple-50 rounded-lg p-3 text-center">
              <Calendar className="h-4 w-4 text-purple-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-purple-700">{result.workoutsLogged}/{result.workoutsPlanned}</p>
              <p className="text-xs text-purple-600">Workouts</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <Target className="h-4 w-4 text-green-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-green-700">{consistency}%</p>
              <p className="text-xs text-green-600">Consistency</p>
            </div>
            <div className="bg-indigo-50 rounded-lg p-3 text-center">
              <Dumbbell className="h-4 w-4 text-indigo-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-indigo-700">{result.exerciseProgress.length}</p>
              <p className="text-xs text-indigo-600">Exercises</p>
            </div>
          </div>

          {result.exerciseProgress.length > 0 && (
            <div className="px-5 pb-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Exercise Progress</h4>
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
                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-100">
                  <h4 className="text-xs font-semibold text-purple-700 uppercase tracking-wider mb-2">Coach&apos;s Assessment</h4>
                  <div className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                    {result.aiAnalysis.overall_summary}
                  </div>
                </div>
              )}

              {result.aiAnalysis.recommendations?.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Recommendations</h4>
                  <ul className="space-y-1.5">
                    {result.aiAnalysis.recommendations.map((rec, i) => (
                      <li key={i} className="flex gap-2 text-sm text-gray-700">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold mt-0.5">{i + 1}</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.aiAnalysis.plan_adjustments?.length > 0 && (
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                  <h4 className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">Suggested Plan Changes</h4>
                  <ul className="space-y-1.5">
                    {result.aiAnalysis.plan_adjustments.map((adj, i) => (
                      <li key={i} className="text-sm text-amber-800 flex gap-2">
                        <span className="text-amber-500">•</span>
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
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-5 py-3 rounded-xl text-sm font-semibold hover:shadow-lg transition-all"
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
