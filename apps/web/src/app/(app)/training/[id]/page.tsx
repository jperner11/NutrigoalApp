'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import Link from 'next/link'
import {
  ArrowLeft,
  Dumbbell,
  Play,
  Trash2,
  ChevronDown,
  ChevronUp,
  Calendar,
  Clock,
  Shield,
  Lock,
} from 'lucide-react'
import type {
  TrainingPlan,
  TrainingPlanDay,
  TrainingPlanExercise,
  Exercise,
} from '@/lib/supabase/types'
import { isFeatureLocked } from '@/lib/tierUtils'
import UpgradeModal from '@/components/ui/UpgradeModal'

interface DayWithExercises extends TrainingPlanDay {
  exercises: (TrainingPlanExercise & { exercises: Exercise })[]
  lastWorkout: string | null
}

export default function TrainingPlanDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const { profile } = useUser()

  const [plan, setPlan] = useState<TrainingPlan | null>(null)
  const [days, setDays] = useState<DayWithExercises[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const [activating, setActivating] = useState(false)
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null)
  const [showDayPicker, setShowDayPicker] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  const isRoleLocked = isFeatureLocked(profile?.role ?? 'free', 'full_training')
  const isFreeUser = isRoleLocked && (plan?.is_ai_generated !== false)

  const loadPlan = useCallback(async () => {
    if (!profile || !params.id) return
    const supabase = createClient()

    try {
      const { data: planData, error: planError } = await supabase
        .from('training_plans')
        .select('*')
        .eq('id', params.id)
        .single()

      if (planError || !planData) {
        toast.error('Training plan not found')
        router.push('/training')
        return
      }

      setPlan(planData)

      const { data: daysData, error: daysError } = await supabase
        .from('training_plan_days')
        .select('*')
        .eq('training_plan_id', params.id)
        .order('day_number')

      if (daysError) throw daysError

      if (!daysData || daysData.length === 0) {
        setDays([])
        return
      }

      const dayIds = daysData.map((day) => day.id)

      const [{ data: exerciseData, error: exerciseError }, { data: logData, error: logError }] = await Promise.all([
        supabase
          .from('training_plan_exercises')
          .select('*, exercises(*)')
          .in('plan_day_id', dayIds)
          .order('order_index'),
        supabase
          .from('workout_logs')
          .select('date, plan_day_id')
          .in('plan_day_id', dayIds)
          .eq('user_id', profile.id)
          .order('date', { ascending: false }),
      ])

      if (exerciseError) throw exerciseError
      if (logError) throw logError

      const exercisesByDay = new Map<string, (TrainingPlanExercise & { exercises: Exercise })[]>()
      for (const exercise of (exerciseData ?? []) as (TrainingPlanExercise & { exercises: Exercise; plan_day_id: string })[]) {
        const list = exercisesByDay.get(exercise.plan_day_id) ?? []
        list.push(exercise)
        exercisesByDay.set(exercise.plan_day_id, list)
      }

      const lastWorkoutByDay = new Map<string, string>()
      for (const log of (logData ?? []) as { date: string; plan_day_id: string | null }[]) {
        if (log.plan_day_id && !lastWorkoutByDay.has(log.plan_day_id)) {
          lastWorkoutByDay.set(log.plan_day_id, log.date)
        }
      }

      const enrichedDays = daysData.map((day) => ({
        ...day,
        exercises: exercisesByDay.get(day.id) ?? [],
        lastWorkout: lastWorkoutByDay.get(day.id) ?? null,
      }))

      setDays(enrichedDays)
    } catch {
      toast.error('Failed to load training plan')
    } finally {
      setLoading(false)
    }
  }, [profile, params.id, router])

  useEffect(() => {
    loadPlan()
  }, [loadPlan])

  // Load free user's selected training day
  useEffect(() => {
    if (!isFreeUser || !profile) return

    async function loadSelection() {
      const supabase = createClient()
      const { data } = await supabase
        .from('user_tier_selections')
        .select('selected_id')
        .eq('user_id', profile!.id)
        .eq('selection_type', 'training_day')
        .single()

      if (data) {
        setSelectedDayId(data.selected_id)
      } else if (days.length > 0) {
        setShowDayPicker(true)
      }
    }

    if (days.length > 0) loadSelection()
  }, [isFreeUser, profile, days])

  async function handleSelectFreeDay(dayId: string) {
    if (!profile) return
    const supabase = createClient()

    await supabase
      .from('user_tier_selections')
      .upsert({
        user_id: profile.id,
        selection_type: 'training_day' as const,
        selected_id: dayId,
      }, { onConflict: 'user_id,selection_type' })

    setSelectedDayId(dayId)
    setShowDayPicker(false)
    toast.success('Training day unlocked!')
  }

  function toggleDay(dayId: string) {
    setExpandedDays((prev) => {
      const next = new Set(prev)
      if (next.has(dayId)) {
        next.delete(dayId)
      } else {
        next.add(dayId)
      }
      return next
    })
  }

  async function handleDelete() {
    if (!plan) return

    const confirmed = window.confirm(
      `Are you sure you want to delete "${plan.name}"? This will also remove all associated days, exercises, and workout logs. This action cannot be undone.`
    )
    if (!confirmed) return

    setDeleting(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('training_plans')
      .delete()
      .eq('id', plan.id)

    if (error) {
      toast.error('Failed to delete training plan')
      setDeleting(false)
      return
    }

    toast.success('Training plan deleted')
    router.push('/training')
  }

  async function handleSetActive() {
    if (!plan || !profile) return

    setActivating(true)
    const supabase = createClient()

    // Deactivate all other plans for this user
    const { error: deactivateError } = await supabase
      .from('training_plans')
      .update({ is_active: false })
      .eq('user_id', profile.id)

    if (deactivateError) {
      toast.error('Failed to update training plans')
      setActivating(false)
      return
    }

    // Activate this plan
    const { error: activateError } = await supabase
      .from('training_plans')
      .update({ is_active: true })
      .eq('id', plan.id)

    if (activateError) {
      toast.error('Failed to activate training plan')
      setActivating(false)
      return
    }

    setPlan({ ...plan, is_active: true })
    toast.success(`"${plan.name}" is now your active plan`)
    setActivating(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--acc)]" />
      </div>
    )
  }

  if (!plan) return null

  return (
    <div className="min-h-screen">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--acc-soft)] via-transparent to-transparent pointer-events-none -z-10" />

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Link
            href="/training"
            className="p-2 rounded-lg hover:bg-[var(--ink-2)] transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-[var(--muted)]" />
          </Link>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-3xl font-bold text-[var(--foreground)]">{plan.name}</h1>
              {plan.is_active && (
                <span className="app-status-pill text-xs" style={{ color: 'var(--ok)' }}>
                  <Shield className="h-3 w-3" />
                  <span>Active</span>
                </span>
              )}
            </div>
            {plan.description && (
              <p className="text-[var(--muted)] mt-1">{plan.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {!plan.is_active && (
            <button
              onClick={handleSetActive}
              disabled={activating}
              className="btn btn-accent disabled:opacity-50"
            >
              <Shield className="h-4 w-4" />
              <span>{activating ? 'Activating...' : 'Set as Active'}</span>
            </button>
          )}
          <Link
            href={`/training/${plan.id}/edit`}
            className="btn btn-secondary"
          >
            <Dumbbell className="h-4 w-4" />
            <span>Edit</span>
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="btn border-[var(--danger)] text-[var(--danger-text)] hover:bg-[var(--danger-bg)] disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            <span>{deleting ? 'Deleting...' : 'Delete'}</span>
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="flex items-center gap-4 text-sm text-[var(--muted)] mb-6">
        <span className="flex items-center gap-1.5 bg-[var(--panel)] backdrop-blur-sm px-3 py-1.5 rounded-full border border-[var(--line)]">
          <Calendar className="h-4 w-4 text-[var(--brand-400)]" />
          {plan.days_per_week} days/week
        </span>
        <span className="flex items-center gap-1.5 bg-[var(--panel)] backdrop-blur-sm px-3 py-1.5 rounded-full border border-[var(--line)]">
          <Dumbbell className="h-4 w-4 text-[var(--brand-400)]" />
          {days.length} training {days.length === 1 ? 'day' : 'days'}
        </span>
      </div>

      {/* Training Days */}
      {days.length === 0 ? (
        <div className="bg-[var(--panel-strong)] backdrop-blur-sm rounded-xl p-12 shadow-sm border border-[var(--line)] text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[var(--brand-100)] mb-5">
            <Dumbbell className="h-10 w-10 text-[var(--brand-400)]" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
            Time to add some exercises!
          </h3>
          <p className="text-[var(--muted-soft)]">
            Edit this plan to add training days and start building your routine.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {days.map((day) => {
            const isExpanded = expandedDays.has(day.id)
            const isLocked = isFreeUser && selectedDayId !== null && day.id !== selectedDayId

            return (
              <div
                key={day.id}
                className={`bg-[var(--panel-strong)] backdrop-blur-sm rounded-xl shadow-sm border border-[var(--line)] overflow-hidden transition-all duration-200 ${
                  isLocked ? 'opacity-60' : 'hover:shadow-md'
                }`}
              >
                {/* Day Header */}
                <button
                  onClick={() => isLocked ? setShowUpgradeModal(true) : toggleDay(day.id)}
                  className="w-full flex items-center justify-between p-5 hover:bg-[var(--ink-2)] transition-colors text-left"
                >
                  <div className="flex items-center space-x-4">
                    <div className="relative flex-shrink-0">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center shadow-sm"
                        style={{ background: isLocked ? 'var(--line-strong)' : 'var(--acc)' }}
                      >
                        {isLocked ? (
                          <Lock className="h-5 w-5" style={{ color: 'var(--muted-soft)' }} />
                        ) : (
                          <span className="font-bold text-lg" style={{ color: 'var(--acc-text)' }}>{day.day_number}</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className={`font-semibold ${isLocked ? 'text-[var(--muted-soft)]' : 'text-[var(--foreground)]'}`}>
                          {day.name}
                        </h3>
                        {isLocked && <Lock className="h-3.5 w-3.5 text-[var(--muted-soft)]" />}
                      </div>
                      {!isLocked && (
                        <div className="flex items-center gap-3 text-sm text-[var(--muted-soft)] mt-0.5">
                          <span>
                            {day.exercises.length}{' '}
                            {day.exercises.length === 1 ? 'exercise' : 'exercises'}
                          </span>
                          {day.lastWorkout && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              Last: {new Date(day.lastWorkout + 'T00:00:00').toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {!isLocked && (
                    <div className={`p-1 rounded-full transition-colors ${isExpanded ? 'bg-[var(--brand-100)]' : ''}`}>
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-[var(--brand-400)]" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-[var(--muted-soft)]" />
                      )}
                    </div>
                  )}
                </button>

                {/* Expanded Content — only for unlocked days */}
                {isExpanded && !isLocked && (
                  <div className="border-t border-[var(--line)]">
                    {day.exercises.length === 0 ? (
                      <div className="p-5 text-center text-[var(--muted-soft)] text-sm">
                        No exercises added to this day yet.
                      </div>
                    ) : (
                      <div className="divide-y divide-[var(--line)]">
                        {day.exercises.map((exercise, idx) => (
                          <div
                            key={exercise.id}
                            className="flex items-center justify-between px-5 py-3 hover:bg-[var(--ink-2)] transition-colors"
                          >
                            <div className="flex items-center space-x-3">
                              <span className="text-xs font-bold text-[var(--muted-soft)] bg-[var(--line)] w-6 h-6 rounded-full flex items-center justify-center">
                                {idx + 1}
                              </span>
                              <div>
                                <p className="font-medium text-[var(--foreground)]">
                                  {exercise.exercises.name}
                                </p>
                                <div className="flex items-center gap-1.5 mt-1">
                                  <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full capitalize bg-[var(--line)] text-[var(--fg-2)]">
                                    {exercise.exercises.body_part.replace('_', ' ')}
                                  </span>
                                  <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full capitalize bg-transparent text-[var(--muted-soft)] border border-[var(--line-strong)]">
                                    {exercise.exercises.equipment}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="font-medium text-[var(--muted)] bg-[var(--line)] px-2.5 py-1 rounded-lg">
                                {exercise.sets} x {exercise.reps}
                              </span>
                              {exercise.rest_seconds && (
                                <span className="flex items-center gap-1 text-[var(--muted-soft)]">
                                  <Clock className="h-3.5 w-3.5" />
                                  {exercise.rest_seconds}s
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Start Workout Button */}
                    <div className="px-5 py-4 bg-[var(--ink-2)] border-t border-[var(--line)]">
                      <Link
                        href={`/training/session/${day.id}`}
                        className="btn btn-accent"
                      >
                        <Play className="h-4 w-4" />
                        <span>Start Workout</span>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Free User Day Picker Modal */}
      {showDayPicker && isFreeUser && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-[var(--panel-strong)] rounded-2xl w-full max-w-md shadow-2xl">
            <div className="px-6 py-5 border-b border-[var(--line)]">
              <h3 className="text-lg font-bold text-[var(--foreground)]">Choose a training day to unlock</h3>
              <p className="text-sm text-[var(--muted-soft)] mt-1">
                Free plan includes 1 training day. Pick the one you&apos;d like to see.
              </p>
            </div>
            <div className="px-6 py-4 space-y-2">
              {days.map(day => (
                <button
                  key={day.id}
                  onClick={() => handleSelectFreeDay(day.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-[var(--line)] hover:border-[var(--brand-400)] hover:bg-[var(--acc-soft)] transition-all text-left"
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--acc)' }}>
                    <span className="font-bold" style={{ color: 'var(--acc-text)' }}>{day.day_number}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[var(--foreground)]">{day.name}</p>
                    <p className="text-xs text-[var(--muted-soft)]">
                      {day.exercises.length} exercises
                    </p>
                  </div>
                </button>
              ))}
            </div>
            <div className="px-6 pb-5">
              <p className="text-xs text-[var(--muted-soft)] text-center">
                Upgrade to Pro to see all training days
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature="Full training plan access"
      />
    </div>
  )
}
