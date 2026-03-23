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
} from 'lucide-react'
import type {
  TrainingPlan,
  TrainingPlanDay,
  TrainingPlanExercise,
  Exercise,
} from '@/lib/supabase/types'

interface DayWithExercises extends TrainingPlanDay {
  exercises: (TrainingPlanExercise & { exercises: Exercise })[]
  lastWorkout: string | null
}

function getBodyPartBadgeClass(bodyPart: string): string {
  const normalized = bodyPart.toLowerCase().replace('_', ' ')
  if (['chest', 'back', 'shoulders'].some((bp) => normalized.includes(bp))) {
    return 'bg-purple-100 text-purple-700 border border-purple-200'
  }
  if (['biceps', 'triceps'].some((bp) => normalized.includes(bp))) {
    return 'bg-indigo-100 text-indigo-700 border border-indigo-200'
  }
  if (normalized.includes('leg') || normalized.includes('quad') || normalized.includes('hamstring') || normalized.includes('glute') || normalized.includes('calf')) {
    return 'bg-blue-100 text-blue-700 border border-blue-200'
  }
  if (normalized.includes('core') || normalized.includes('abs') || normalized.includes('abdominal')) {
    return 'bg-amber-100 text-amber-700 border border-amber-200'
  }
  return 'bg-gray-100 text-gray-600 border border-gray-200'
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

  const loadPlan = useCallback(async () => {
    if (!profile || !params.id) return
    const supabase = createClient()

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

    const { data: daysData } = await supabase
      .from('training_plan_days')
      .select('*')
      .eq('training_plan_id', params.id)
      .order('day_number')

    if (!daysData || daysData.length === 0) {
      setDays([])
      setLoading(false)
      return
    }

    const enrichedDays = await Promise.all(
      daysData.map(async (day) => {
        const { data: exerciseData } = await supabase
          .from('training_plan_exercises')
          .select('*, exercises(*)')
          .eq('plan_day_id', day.id)
          .order('order_index')

        const { data: lastLog } = await supabase
          .from('workout_logs')
          .select('date')
          .eq('plan_day_id', day.id)
          .eq('user_id', profile.id)
          .order('date', { ascending: false })
          .limit(1)

        return {
          ...day,
          exercises: (exerciseData ?? []) as (TrainingPlanExercise & { exercises: Exercise })[],
          lastWorkout: lastLog && lastLog.length > 0 ? lastLog[0].date : null,
        }
      })
    )

    setDays(enrichedDays)
    setLoading(false)
  }, [profile, params.id, router])

  useEffect(() => {
    loadPlan()
  }, [loadPlan])

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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
      </div>
    )
  }

  if (!plan) return null

  return (
    <div className="min-h-screen">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50/40 via-transparent to-indigo-50/30 pointer-events-none -z-10" />

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Link
            href="/training"
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-3xl font-bold text-gray-900">{plan.name}</h1>
              {plan.is_active && (
                <span className="inline-flex items-center space-x-1 text-xs bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 px-2.5 py-1 rounded-full font-medium">
                  <Shield className="h-3 w-3" />
                  <span>Active</span>
                </span>
              )}
            </div>
            {plan.description && (
              <p className="text-gray-800 mt-1">{plan.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {!plan.is_active && (
            <button
              onClick={handleSetActive}
              disabled={activating}
              className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-200 disabled:opacity-50"
            >
              <Shield className="h-4 w-4" />
              <span>{activating ? 'Activating...' : 'Set as Active'}</span>
            </button>
          )}
          <Link
            href={`/training/${plan.id}/edit`}
            className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 hover:shadow-sm transition-all duration-200"
          >
            <Dumbbell className="h-4 w-4" />
            <span>Edit</span>
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-50 hover:shadow-sm transition-all duration-200 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            <span>{deleting ? 'Deleting...' : 'Delete'}</span>
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="flex items-center gap-4 text-sm text-gray-600 mb-6">
        <span className="flex items-center gap-1.5 bg-white/60 backdrop-blur-sm px-3 py-1.5 rounded-full border border-gray-200/60">
          <Calendar className="h-4 w-4 text-purple-500" />
          {plan.days_per_week} days/week
        </span>
        <span className="flex items-center gap-1.5 bg-white/60 backdrop-blur-sm px-3 py-1.5 rounded-full border border-gray-200/60">
          <Dumbbell className="h-4 w-4 text-purple-500" />
          {days.length} training {days.length === 1 ? 'day' : 'days'}
        </span>
      </div>

      {/* Training Days */}
      {days.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-12 shadow-sm border border-gray-200 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 mb-5">
            <Dumbbell className="h-10 w-10 text-purple-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Time to add some exercises!
          </h3>
          <p className="text-gray-500">
            Edit this plan to add training days and start building your routine.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {days.map((day) => {
            const isExpanded = expandedDays.has(day.id)

            return (
              <div
                key={day.id}
                className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-200"
              >
                {/* Day Header */}
                <button
                  onClick={() => toggleDay(day.id)}
                  className="w-full flex items-center justify-between p-5 hover:bg-gray-50/50 transition-colors text-left"
                >
                  <div className="flex items-center space-x-4">
                    {/* Day Number Circle */}
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-sm">
                        <span className="text-white font-bold text-lg">{day.day_number}</span>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {day.name}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-gray-500 mt-0.5">
                        <span>
                          {day.exercises.length}{' '}
                          {day.exercises.length === 1 ? 'exercise' : 'exercises'}
                        </span>
                        {day.lastWorkout && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            Last: {new Date(day.lastWorkout).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className={`p-1 rounded-full transition-colors ${isExpanded ? 'bg-purple-100' : ''}`}>
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-purple-500" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-gray-100">
                    {day.exercises.length === 0 ? (
                      <div className="p-5 text-center text-gray-500 text-sm">
                        No exercises added to this day yet.
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {day.exercises.map((exercise, idx) => (
                          <div
                            key={exercise.id}
                            className="flex items-center justify-between px-5 py-3 hover:bg-gray-50/50 transition-colors"
                          >
                            <div className="flex items-center space-x-3">
                              <span className="text-xs font-bold text-gray-400 bg-gray-100 w-6 h-6 rounded-full flex items-center justify-center">
                                {idx + 1}
                              </span>
                              <div>
                                <p className="font-medium text-gray-900">
                                  {exercise.exercises.name}
                                </p>
                                <div className="flex items-center gap-1.5 mt-1">
                                  <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full capitalize ${getBodyPartBadgeClass(exercise.exercises.body_part)}`}>
                                    {exercise.exercises.body_part.replace('_', ' ')}
                                  </span>
                                  <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full capitalize bg-transparent text-gray-500 border border-gray-300">
                                    {exercise.exercises.equipment}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="font-medium text-gray-700 bg-gray-100 px-2.5 py-1 rounded-lg">
                                {exercise.sets} x {exercise.reps}
                              </span>
                              {exercise.rest_seconds && (
                                <span className="flex items-center gap-1 text-gray-400">
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
                    <div className="px-5 py-4 bg-gradient-to-r from-gray-50 to-gray-50/50 border-t border-gray-100">
                      <Link
                        href={`/training/session/${day.id}`}
                        className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-200"
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
    </div>
  )
}
