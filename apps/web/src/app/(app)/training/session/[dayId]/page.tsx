'use client'

import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { calculateSuggestion, parseRepRange } from '@/lib/training'
import {
  ArrowLeft,
  Check,
  Plus,
  Timer,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Trophy,
} from 'lucide-react'
import type { WorkoutSetLog, WorkoutExerciseLog } from '@/lib/supabase/types'

// ─── Types ──────────────────────────────────────────────

interface SessionSet {
  set_number: number
  weight_kg: number
  reps: number
  completed: boolean
  suggestedWeight: number | null
  suggestedReason: string | null
}

interface SessionExercise {
  exercise_id: string
  exercise_name: string
  body_part: string
  equipment: string
  targetSets: number
  targetReps: string
  restSeconds: number
  isCompound: boolean
  sets: SessionSet[]
}

// ─── Helpers ────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatBodyPart(bp: string): string {
  return bp.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function formatEquipment(eq: string): string {
  return eq.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// ─── Component ──────────────────────────────────────────

export default function WorkoutSessionPage() {
  const { profile } = useUser()
  const router = useRouter()
  const params = useParams()
  const dayId = params.dayId as string

  const [loading, setLoading] = useState(true)
  const [dayName, setDayName] = useState('')
  const [exercises, setExercises] = useState<SessionExercise[]>([])
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [sessionStartTime] = useState<Date>(new Date())
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [restTimerActive, setRestTimerActive] = useState(false)
  const [restTimerSeconds, setRestTimerSeconds] = useState(0)
  const [saving, setSaving] = useState(false)
  const [showOverloadBanner, setShowOverloadBanner] = useState(false)

  // ─── Elapsed Time Timer ─────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - sessionStartTime.getTime()) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [sessionStartTime])

  // ─── Rest Timer ─────────────────────────────────────
  useEffect(() => {
    if (!restTimerActive || restTimerSeconds <= 0) return
    const interval = setInterval(() => {
      setRestTimerSeconds(prev => {
        if (prev <= 1) {
          setRestTimerActive(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [restTimerActive, restTimerSeconds])

  // ─── Load Data ──────────────────────────────────────
  useEffect(() => {
    if (!profile) return

    async function loadSession() {
      const supabase = createClient()

      // Fetch day info
      const { data: dayData } = await supabase
        .from('training_plan_days')
        .select('*')
        .eq('id', dayId)
        .single()

      if (dayData) {
        setDayName(dayData.name)
      }

      // Fetch exercises for this day
      const { data: planExercises } = await supabase
        .from('training_plan_exercises')
        .select('*, exercises(*)')
        .eq('plan_day_id', dayId)
        .order('order_index')

      if (!planExercises || planExercises.length === 0) {
        setLoading(false)
        return
      }

      // Fetch last workout log for this plan day
      const { data: lastLogs } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('plan_day_id', dayId)
        .eq('user_id', profile!.id)
        .order('date', { ascending: false })
        .limit(1)

      const lastLog = lastLogs && lastLogs.length > 0 ? lastLogs[0] : null
      const lastExercises: WorkoutExerciseLog[] = lastLog?.exercises ?? []

      let hasOverloadSuggestion = false

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sessionExercises: SessionExercise[] = planExercises.map((pe: any) => {
        const exercise = pe.exercises
        const targetReps = pe.reps || '8-12'
        const restSeconds = pe.rest_seconds ?? 90
        const isCompound = exercise?.is_compound ?? false
        const targetSets = pe.sets || 3

        // Find last session data for this exercise
        const lastExData = lastExercises.find(
          (le: WorkoutExerciseLog) => le.exercise_id === pe.exercise_id
        )
        const lastSets: WorkoutSetLog[] = lastExData?.sets ?? []

        // Calculate progressive overload suggestion
        const suggestion = calculateSuggestion(lastSets, targetReps, isCompound)
        if (suggestion && suggestion.suggestedWeight !== (lastSets[0]?.weight_kg ?? 0)) {
          hasOverloadSuggestion = true
        }

        const { min: repMin } = parseRepRange(targetReps)

        const sets: SessionSet[] = Array.from({ length: targetSets }, (_, i) => {
          const lastSet = lastSets[i]
          const prefillWeight = suggestion
            ? suggestion.suggestedWeight
            : lastSet?.weight_kg ?? 0
          const prefillReps = lastSet?.reps ?? repMin

          return {
            set_number: i + 1,
            weight_kg: prefillWeight,
            reps: prefillReps,
            completed: false,
            suggestedWeight: suggestion?.suggestedWeight ?? null,
            suggestedReason: suggestion?.reason ?? null,
          }
        })

        return {
          exercise_id: pe.exercise_id,
          exercise_name: exercise?.name ?? 'Unknown Exercise',
          body_part: exercise?.body_part ?? 'full_body',
          equipment: exercise?.equipment ?? 'bodyweight',
          targetSets,
          targetReps,
          restSeconds,
          isCompound,
          sets,
        }
      })

      setExercises(sessionExercises)
      setShowOverloadBanner(hasOverloadSuggestion)
      setLoading(false)
    }

    loadSession()
  }, [profile, dayId])

  // ─── Handlers ───────────────────────────────────────

  const currentExercise = exercises[currentExerciseIndex]

  const updateSet = useCallback(
    (setIndex: number, field: 'weight_kg' | 'reps', value: number) => {
      setExercises(prev => {
        const updated = [...prev]
        const ex = { ...updated[currentExerciseIndex] }
        const sets = [...ex.sets]
        sets[setIndex] = { ...sets[setIndex], [field]: value }
        ex.sets = sets
        updated[currentExerciseIndex] = ex
        return updated
      })
    },
    [currentExerciseIndex]
  )

  const toggleSetComplete = useCallback(
    (setIndex: number) => {
      setExercises(prev => {
        const updated = [...prev]
        const ex = { ...updated[currentExerciseIndex] }
        const sets = [...ex.sets]
        const wasCompleted = sets[setIndex].completed
        sets[setIndex] = { ...sets[setIndex], completed: !wasCompleted }
        ex.sets = sets
        updated[currentExerciseIndex] = ex

        // Start rest timer if marking complete (not unchecking)
        if (!wasCompleted) {
          setRestTimerActive(true)
          setRestTimerSeconds(ex.restSeconds)
        }

        return updated
      })
    },
    [currentExerciseIndex]
  )

  const addSet = useCallback(() => {
    setExercises(prev => {
      const updated = [...prev]
      const ex = { ...updated[currentExerciseIndex] }
      const lastSet = ex.sets[ex.sets.length - 1]
      const { min: repMin } = parseRepRange(ex.targetReps)
      ex.sets = [
        ...ex.sets,
        {
          set_number: ex.sets.length + 1,
          weight_kg: lastSet?.weight_kg ?? 0,
          reps: lastSet?.reps ?? repMin,
          completed: false,
          suggestedWeight: null,
          suggestedReason: null,
        },
      ]
      updated[currentExerciseIndex] = ex
      return updated
    })
  }, [currentExerciseIndex])

  const goToExercise = (index: number) => {
    if (index >= 0 && index < exercises.length) {
      setCurrentExerciseIndex(index)
      setRestTimerActive(false)
      setRestTimerSeconds(0)
    }
  }

  const finishWorkout = async () => {
    if (!profile) return
    setSaving(true)

    try {
      const supabase = createClient()

      const exerciseLogs: WorkoutExerciseLog[] = exercises.map(ex => ({
        exercise_id: ex.exercise_id,
        exercise_name: ex.exercise_name,
        sets: ex.sets
          .filter(s => s.completed)
          .map(s => ({
            set_number: s.set_number,
            reps: s.reps,
            weight_kg: s.weight_kg,
            completed: true,
          })),
      }))

      const durationMinutes = Math.round(elapsedSeconds / 60)
      const today = new Date().toISOString().split('T')[0]

      const { error } = await supabase.from('workout_logs').insert({
        user_id: profile.id,
        plan_day_id: dayId,
        date: today,
        exercises: exerciseLogs,
        duration_minutes: durationMinutes,
      })

      if (error) throw error

      const totalSets = exerciseLogs.reduce((sum, ex) => sum + ex.sets.length, 0)
      const totalVolume = exerciseLogs.reduce(
        (sum, ex) =>
          sum + ex.sets.reduce((s, set) => s + set.weight_kg * set.reps, 0),
        0
      )

      toast.success(
        `Workout saved! ${totalSets} sets, ${Math.round(totalVolume).toLocaleString()}kg total volume`,
        { duration: 4000 }
      )

      router.push('/training')
    } catch {
      toast.error('Failed to save workout. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // ─── Loading State ──────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Dumbbell className="h-10 w-10 text-purple-500 animate-pulse mx-auto mb-3" />
          <p className="text-gray-500">Loading workout...</p>
        </div>
      </div>
    )
  }

  if (exercises.length === 0) {
    return (
      <div className="text-center py-20">
        <Dumbbell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-gray-900 mb-2">No exercises found</h2>
        <p className="text-gray-500 mb-6">This training day has no exercises configured.</p>
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-purple-600 font-medium hover:text-purple-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Go Back
        </button>
      </div>
    )
  }

  // ─── Derived Values ─────────────────────────────────

  const exercise = currentExercise
  const allSetsCompleted = exercise.sets.every(s => s.completed)
  const completedSetsCount = exercise.sets.filter(s => s.completed).length
  const isLastExercise = currentExerciseIndex === exercises.length - 1
  const progressPercent = ((currentExerciseIndex + 1) / exercises.length) * 100
  const restProgressPercent =
    exercise.restSeconds > 0
      ? ((exercise.restSeconds - restTimerSeconds) / exercise.restSeconds) * 100
      : 100

  // ─── Render ─────────────────────────────────────────

  return (
    <div className="max-w-lg mx-auto pb-32">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 mb-4 text-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        Exit Workout
      </button>

      {/* Progressive Overload Banner */}
      {showOverloadBanner && (
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-3 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500 flex-shrink-0" />
            <p className="text-sm text-amber-800">
              Progressive overload applied — weights adjusted based on your last session
            </p>
          </div>
          <button
            onClick={() => setShowOverloadBanner(false)}
            className="text-amber-400 hover:text-amber-600 text-lg leading-none ml-2 flex-shrink-0"
          >
            &times;
          </button>
        </div>
      )}

      {/* Top Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-4">
        {/* Exercise Progress + Timer */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-500">
            Exercise {currentExerciseIndex + 1} of {exercises.length}
          </span>
          <div className="flex items-center gap-1.5 text-sm font-mono text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
            <Timer className="h-3.5 w-3.5" />
            {formatTime(elapsedSeconds)}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-1.5 bg-gray-100 rounded-full mb-4 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Exercise Name */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{exercise.exercise_name}</h1>

        {/* Badges */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full">
            {formatBodyPart(exercise.body_part)}
          </span>
          <span className="text-xs font-medium bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full">
            {formatEquipment(exercise.equipment)}
          </span>
          {exercise.isCompound && (
            <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
              Compound
            </span>
          )}
        </div>
      </div>

      {/* Rest Timer Overlay */}
      {restTimerActive && restTimerSeconds > 0 && (
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-5 mb-4 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Timer className="h-5 w-5" />
              <span className="font-medium">Rest Timer</span>
            </div>
            <button
              onClick={() => {
                setRestTimerActive(false)
                setRestTimerSeconds(0)
              }}
              className="text-sm font-medium bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition-colors"
            >
              Skip Rest
            </button>
          </div>

          {/* Countdown */}
          <div className="text-center mb-3">
            <span className="text-5xl font-bold font-mono tracking-tight">
              {formatTime(restTimerSeconds)}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-1000"
              style={{ width: `${restProgressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Set Tracking Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-4">
        {/* Header */}
        <div className="grid grid-cols-[48px_1fr_1fr_56px] gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
          <span className="text-xs font-semibold text-gray-500 uppercase text-center">Set</span>
          <span className="text-xs font-semibold text-gray-500 uppercase text-center">Kg</span>
          <span className="text-xs font-semibold text-gray-500 uppercase text-center">Reps</span>
          <span className="text-xs font-semibold text-gray-500 uppercase text-center">
            <Check className="h-3.5 w-3.5 mx-auto" />
          </span>
        </div>

        {/* Set Rows */}
        {exercise.sets.map((set, i) => (
          <div
            key={set.set_number}
            className={`grid grid-cols-[48px_1fr_1fr_56px] gap-2 px-4 py-3 items-center border-b border-gray-50 transition-colors ${
              set.completed ? 'bg-green-50/60' : ''
            } ${
              !restTimerActive &&
              restTimerSeconds === 0 &&
              completedSetsCount === i &&
              !set.completed
                ? 'bg-purple-50/40'
                : ''
            }`}
          >
            {/* Set Number */}
            <div className="text-center">
              <span className="text-sm font-bold text-gray-700">{set.set_number}</span>
            </div>

            {/* Weight Input */}
            <div className="relative">
              <input
                type="number"
                inputMode="decimal"
                value={set.weight_kg || ''}
                onChange={e => updateSet(i, 'weight_kg', parseFloat(e.target.value) || 0)}
                className={`w-full text-center text-sm font-medium border rounded-lg py-2.5 px-2 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-colors ${
                  set.completed
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : 'bg-white border-gray-200 text-gray-900'
                }`}
                disabled={set.completed}
              />
              {set.suggestedWeight !== null && set.weight_kg === set.suggestedWeight && (
                <Sparkles className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-amber-500" />
              )}
            </div>

            {/* Reps Input */}
            <div>
              <input
                type="number"
                inputMode="numeric"
                value={set.reps || ''}
                onChange={e => updateSet(i, 'reps', parseInt(e.target.value) || 0)}
                className={`w-full text-center text-sm font-medium border rounded-lg py-2.5 px-2 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-colors ${
                  set.completed
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : 'bg-white border-gray-200 text-gray-900'
                }`}
                disabled={set.completed}
              />
              {!set.completed && (
                <p className="text-[10px] text-gray-400 text-center mt-0.5">
                  Target: {exercise.targetReps}
                </p>
              )}
            </div>

            {/* Complete Button */}
            <div className="flex justify-center">
              <button
                onClick={() => toggleSetComplete(i)}
                className={`h-11 w-11 rounded-xl flex items-center justify-center transition-all active:scale-95 ${
                  set.completed
                    ? 'bg-green-500 text-white shadow-sm shadow-green-200'
                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                }`}
              >
                <Check className="h-5 w-5" strokeWidth={set.completed ? 3 : 2} />
              </button>
            </div>
          </div>
        ))}

        {/* Add Set Row */}
        <button
          onClick={addSet}
          className="w-full flex items-center justify-center gap-1.5 py-3 text-sm font-medium text-purple-600 hover:bg-purple-50 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Set
        </button>
      </div>

      {/* Suggestion Reason (if any) */}
      {exercise.sets[0]?.suggestedReason && (
        <div className="flex items-start gap-2 px-1 mb-4">
          <Sparkles className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-gray-500">{exercise.sets[0].suggestedReason}</p>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-gray-200 px-4 py-4 z-50">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          {/* Previous Button */}
          <button
            onClick={() => goToExercise(currentExerciseIndex - 1)}
            disabled={currentExerciseIndex === 0}
            className={`flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              currentExerciseIndex === 0
                ? 'text-gray-300 bg-gray-50 cursor-not-allowed'
                : 'text-gray-700 bg-gray-100 hover:bg-gray-200 active:scale-[0.98]'
            }`}
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </button>

          {/* Next / Finish Button */}
          {isLastExercise ? (
            <button
              onClick={finishWorkout}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:shadow-lg hover:shadow-purple-200 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Trophy className="h-4 w-4" />
                  Finish Workout
                </>
              )}
            </button>
          ) : (
            <button
              onClick={() => goToExercise(currentExerciseIndex + 1)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] ${
                allSetsCompleted
                  ? 'text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:shadow-lg hover:shadow-purple-200'
                  : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
              }`}
            >
              Next Exercise
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Day Name Subtitle */}
      {dayName && (
        <p className="text-center text-xs text-gray-400 mt-2">{dayName}</p>
      )}
    </div>
  )
}
