'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Plus, Trash2, Dumbbell, Search, Loader2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import Link from 'next/link'
import type { Exercise, BodyPart, Equipment } from '@/lib/supabase/types'
import { BODY_PARTS, EQUIPMENT_TYPES, DEFAULT_REST_SECONDS, DEFAULT_SETS, DEFAULT_REPS } from '@/lib/constants'
import { isManagedClientRole } from '@nutrigoal/shared'

interface DayExercise {
  tempId: string
  exercise_id: string
  exerciseName: string
  sets: number
  reps: string
  rest_seconds: number
  notes: string
}

interface TrainingDay {
  tempId: string
  name: string
  exercises: DayExercise[]
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

export default function NewTrainingPlanPage() {
  const router = useRouter()
  const { profile } = useUser()
  const [planName, setPlanName] = useState('')
  const [description, setDescription] = useState('')
  const [days, setDays] = useState<TrainingDay[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loadingExercises, setLoadingExercises] = useState(true)
  const [saving, setSaving] = useState(false)

  // Exercise picker state
  const [addingExerciseToDayIndex, setAddingExerciseToDayIndex] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterBodyPart, setFilterBodyPart] = useState('')
  const [filterEquipment, setFilterEquipment] = useState('')

  // Custom exercise state
  const [showCustomExercise, setShowCustomExercise] = useState(false)
  const [customExercise, setCustomExercise] = useState({ name: '', body_part: '', equipment: '' })
  const [savingCustom, setSavingCustom] = useState(false)

  // Load all exercises on mount
  useEffect(() => {
    async function loadExercises() {
      const supabase = createClient()
      const { data, error } = await supabase.from('exercises').select('*')
      if (error) {
        toast.error('Failed to load exercises')
      } else {
        setExercises(data ?? [])
      }
      setLoadingExercises(false)
    }
    loadExercises()
  }, [])

  // Filtered exercises for the picker (client-side)
  const filteredExercises = useMemo(() => {
    return exercises.filter((ex) => {
      const matchesSearch =
        !searchQuery || ex.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesBodyPart = !filterBodyPart || ex.body_part === filterBodyPart
      const matchesEquipment = !filterEquipment || ex.equipment === filterEquipment
      return matchesSearch && matchesBodyPart && matchesEquipment
    })
  }, [exercises, searchQuery, filterBodyPart, filterEquipment])

  useEffect(() => {
    if (profile && isManagedClientRole(profile.role)) {
      router.replace('/training')
    }
  }, [profile, router])

  if (!profile || isManagedClientRole(profile.role)) return null

  function addDay() {
    setDays((prev) => [
      ...prev,
      {
        tempId: crypto.randomUUID(),
        name: `Day ${prev.length + 1}`,
        exercises: [],
      },
    ])
  }

  function removeDay(dayIndex: number) {
    setDays((prev) => prev.filter((_, i) => i !== dayIndex))
    if (addingExerciseToDayIndex === dayIndex) {
      setAddingExerciseToDayIndex(null)
    }
  }

  function updateDayName(dayIndex: number, name: string) {
    setDays((prev) => {
      const updated = [...prev]
      updated[dayIndex] = { ...updated[dayIndex], name }
      return updated
    })
  }

  function addExerciseToDay(dayIndex: number, exercise: Exercise) {
    setDays((prev) => {
      const updated = [...prev]
      updated[dayIndex] = {
        ...updated[dayIndex],
        exercises: [
          ...updated[dayIndex].exercises,
          {
            tempId: crypto.randomUUID(),
            exercise_id: exercise.id,
            exerciseName: exercise.name,
            sets: DEFAULT_SETS,
            reps: DEFAULT_REPS,
            rest_seconds: DEFAULT_REST_SECONDS,
            notes: '',
          },
        ],
      }
      return updated
    })
    setAddingExerciseToDayIndex(null)
    setSearchQuery('')
    setFilterBodyPart('')
    setFilterEquipment('')
    setShowCustomExercise(false)
  }

  function removeExerciseFromDay(dayIndex: number, exerciseIndex: number) {
    setDays((prev) => {
      const updated = [...prev]
      updated[dayIndex] = {
        ...updated[dayIndex],
        exercises: updated[dayIndex].exercises.filter((_, i) => i !== exerciseIndex),
      }
      return updated
    })
  }

  function updateExercise(
    dayIndex: number,
    exerciseIndex: number,
    field: keyof DayExercise,
    value: string | number
  ) {
    setDays((prev) => {
      const updated = [...prev]
      const exercises = [...updated[dayIndex].exercises]
      exercises[exerciseIndex] = { ...exercises[exerciseIndex], [field]: value }
      updated[dayIndex] = { ...updated[dayIndex], exercises }
      return updated
    })
  }

  function openPicker(dayIndex: number) {
    setAddingExerciseToDayIndex(dayIndex)
    setSearchQuery('')
    setFilterBodyPart('')
    setFilterEquipment('')
    setShowCustomExercise(false)
  }

  function closePicker() {
    setAddingExerciseToDayIndex(null)
    setSearchQuery('')
    setFilterBodyPart('')
    setFilterEquipment('')
    setShowCustomExercise(false)
  }

  async function saveCustomExercise() {
    if (!customExercise.name.trim()) {
      toast.error('Exercise name is required')
      return
    }
    if (!customExercise.body_part) {
      toast.error('Select a body part')
      return
    }
    if (!customExercise.equipment) {
      toast.error('Select equipment type')
      return
    }

    setSavingCustom(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('exercises')
      .insert({
        name: customExercise.name.trim(),
        body_part: customExercise.body_part as BodyPart,
        equipment: customExercise.equipment as Equipment,
        is_compound: false,
      })
      .select()
      .single()

    if (error || !data) {
      toast.error('Failed to create exercise')
      setSavingCustom(false)
      return
    }

    // Add to local exercise list and add to the current day
    setExercises((prev) => [...prev, data])
    if (addingExerciseToDayIndex !== null) {
      addExerciseToDay(addingExerciseToDayIndex, data)
    }

    setCustomExercise({ name: '', body_part: '', equipment: '' })
    setShowCustomExercise(false)
    setSavingCustom(false)
    toast.success(`Created "${data.name}"`)
  }

  async function savePlan() {
    if (!profile) return

    if (!planName.trim()) {
      toast.error('Please enter a plan name')
      return
    }
    if (days.length === 0) {
      toast.error('Add at least one training day')
      return
    }

    const emptyDay = days.find((d) => d.exercises.length === 0)
    if (emptyDay) {
      toast.error(`"${emptyDay.name}" has no exercises`)
      return
    }

    setSaving(true)
    const supabase = createClient()

    try {
      // Deactivate existing active plans
      await supabase
        .from('training_plans')
        .update({ is_active: false })
        .eq('user_id', profile.id)
        .eq('is_active', true)

      // Create the plan
      const { data: plan, error: planError } = await supabase
        .from('training_plans')
        .insert({
          user_id: profile.id,
          created_by: profile.id,
          name: planName.trim(),
          description: description.trim() || null,
          days_per_week: days.length,
          is_active: true,
        })
        .select()
        .single()

      if (planError || !plan) {
        toast.error('Failed to create training plan')
        setSaving(false)
        return
      }

      // Insert days and their exercises
      for (let i = 0; i < days.length; i++) {
        const day = days[i]

        const { data: planDay, error: dayError } = await supabase
          .from('training_plan_days')
          .insert({
            training_plan_id: plan.id,
            day_number: i + 1,
            name: day.name,
          })
          .select()
          .single()

        if (dayError || !planDay) {
          toast.error(`Failed to create day "${day.name}"`)
          setSaving(false)
          return
        }

        // Batch insert exercises for this day
        const exerciseInserts = day.exercises.map((ex, idx) => ({
          plan_day_id: planDay.id,
          exercise_id: ex.exercise_id,
          order_index: idx,
          sets: ex.sets,
          reps: ex.reps,
          rest_seconds: ex.rest_seconds,
          notes: ex.notes.trim() || null,
        }))

        const { error: exError } = await supabase
          .from('training_plan_exercises')
          .insert(exerciseInserts)

        if (exError) {
          toast.error(`Failed to save exercises for "${day.name}"`)
          setSaving(false)
          return
        }
      }

      toast.success('Training plan created!')
      router.push('/training')
    } catch {
      toast.error('An unexpected error occurred')
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto min-h-screen">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50/40 via-transparent to-indigo-50/30 pointer-events-none -z-10" />

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/training" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="h-5 w-5 text-gray-900" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">New Training Plan</h1>
          <p className="text-gray-800 mt-1">Design your perfect workout routine.</p>
        </div>
      </div>

      {/* Plan Details */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Plan Name</label>
            <input
              type="text"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-shadow"
              placeholder="e.g. Push Pull Legs"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-shadow"
              rows={2}
              placeholder="Describe your training plan..."
            />
          </div>
        </div>
      </div>

      {/* Days */}
      <div className="space-y-4 mb-6">
        {days.map((day, dayIndex) => (
          <div
            key={day.tempId}
            className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200"
          >
            {/* Day Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {/* Day Number Circle */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-sm flex-shrink-0">
                  <span className="text-white font-bold text-sm">{dayIndex + 1}</span>
                </div>
                <input
                  type="text"
                  value={day.name}
                  onChange={(e) => updateDayName(dayIndex, e.target.value)}
                  className="font-semibold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-0 p-0 text-lg"
                  placeholder="Day name..."
                />
              </div>
              <button
                onClick={() => removeDay(dayIndex)}
                className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                title="Remove day"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {/* Exercise List */}
            {day.exercises.length > 0 && (
              <div className="space-y-3 mb-4">
                {day.exercises.map((ex, exIndex) => (
                  <div
                    key={ex.tempId}
                    className="flex items-center gap-2 py-2 px-3 bg-gray-50/80 rounded-lg hover:bg-gray-100/80 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {ex.exerciseName}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="flex flex-col items-center">
                        <label className="text-[10px] text-gray-500">Sets</label>
                        <input
                          type="number"
                          value={ex.sets}
                          onChange={(e) =>
                            updateExercise(dayIndex, exIndex, 'sets', parseInt(e.target.value) || 1)
                          }
                          min={1}
                          className="w-14 px-1.5 py-1 border border-gray-300 rounded text-sm text-center focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>
                      <div className="flex flex-col items-center">
                        <label className="text-[10px] text-gray-500">Reps</label>
                        <input
                          type="text"
                          value={ex.reps}
                          onChange={(e) =>
                            updateExercise(dayIndex, exIndex, 'reps', e.target.value)
                          }
                          className="w-16 px-1.5 py-1 border border-gray-300 rounded text-sm text-center focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="8-12"
                        />
                      </div>
                      <div className="flex flex-col items-center">
                        <label className="text-[10px] text-gray-500">Rest (s)</label>
                        <input
                          type="number"
                          value={ex.rest_seconds}
                          onChange={(e) =>
                            updateExercise(
                              dayIndex,
                              exIndex,
                              'rest_seconds',
                              parseInt(e.target.value) || 0
                            )
                          }
                          min={0}
                          step={15}
                          className="w-16 px-1.5 py-1 border border-gray-300 rounded text-sm text-center focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>
                      <button
                        onClick={() => removeExerciseFromDay(dayIndex, exIndex)}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors mt-3"
                        title="Remove exercise"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Exercise Picker */}
            {addingExerciseToDayIndex === dayIndex ? (
              <div className="border-t border-gray-100 pt-4">
                {/* Search and Filters */}
                <div className="space-y-2 mb-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Search exercises..."
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={filterBodyPart}
                      onChange={(e) => setFilterBodyPart(e.target.value)}
                      className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">All body parts</option>
                      {BODY_PARTS.map((bp) => (
                        <option key={bp.value} value={bp.value}>
                          {bp.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={filterEquipment}
                      onChange={(e) => setFilterEquipment(e.target.value)}
                      className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">All equipment</option>
                      {EQUIPMENT_TYPES.map((eq) => (
                        <option key={eq.value} value={eq.value}>
                          {eq.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Exercise Results */}
                {loadingExercises ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-1 mb-3">
                    {filteredExercises.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No exercises found. Try a different search or add a custom exercise.
                      </p>
                    ) : (
                      filteredExercises.map((exercise) => (
                        <button
                          key={exercise.id}
                          onClick={() => addExerciseToDay(dayIndex, exercise)}
                          className="w-full text-left px-3 py-2 text-sm text-gray-900 hover:bg-purple-50 rounded-lg transition-colors flex items-center gap-2"
                        >
                          <Plus className="h-3 w-3 text-purple-600 flex-shrink-0" />
                          <span className="flex-1 truncate">{exercise.name}</span>
                          <span className="flex items-center gap-1 flex-shrink-0">
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full capitalize ${getBodyPartBadgeClass(exercise.body_part)}`}>
                              {BODY_PARTS.find((bp) => bp.value === exercise.body_part)?.label}
                            </span>
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full capitalize bg-transparent text-gray-500 border border-gray-300">
                              {EQUIPMENT_TYPES.find((eq) => eq.value === exercise.equipment)?.label}
                            </span>
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}

                {/* Custom Exercise */}
                {showCustomExercise ? (
                  <div className="bg-gray-50/80 rounded-lg p-3 space-y-2 mb-3 border border-gray-200/60">
                    <p className="text-sm font-medium text-gray-900">Add Custom Exercise</p>
                    <input
                      type="text"
                      value={customExercise.name}
                      onChange={(e) =>
                        setCustomExercise((prev) => ({ ...prev, name: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Exercise name"
                    />
                    <div className="flex gap-2">
                      <select
                        value={customExercise.body_part}
                        onChange={(e) =>
                          setCustomExercise((prev) => ({ ...prev, body_part: e.target.value }))
                        }
                        className="flex-1 px-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="">Body part...</option>
                        {BODY_PARTS.map((bp) => (
                          <option key={bp.value} value={bp.value}>
                            {bp.label}
                          </option>
                        ))}
                      </select>
                      <select
                        value={customExercise.equipment}
                        onChange={(e) =>
                          setCustomExercise((prev) => ({ ...prev, equipment: e.target.value }))
                        }
                        className="flex-1 px-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="">Equipment...</option>
                        {EQUIPMENT_TYPES.map((eq) => (
                          <option key={eq.value} value={eq.value}>
                            {eq.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setShowCustomExercise(false)
                          setCustomExercise({ name: '', body_part: '', equipment: '' })
                        }}
                        className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveCustomExercise}
                        disabled={savingCustom}
                        className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
                      >
                        {savingCustom && <Loader2 className="h-3 w-3 animate-spin" />}
                        Save & Add
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowCustomExercise(true)}
                    className="text-sm text-purple-600 hover:text-purple-800 font-medium mb-3 transition-colors"
                  >
                    + Add Custom Exercise
                  </button>
                )}

                <div className="border-t border-gray-100 pt-2">
                  <button
                    onClick={closePicker}
                    className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => openPicker(dayIndex)}
                className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800 font-medium transition-colors"
              >
                <Plus className="h-3 w-3" />
                Add Exercise
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add Day Button */}
      <button
        onClick={addDay}
        className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-800 hover:border-purple-400 hover:text-purple-600 hover:bg-purple-50/30 transition-all duration-200 flex items-center justify-center gap-2 mb-8"
      >
        <Plus className="h-4 w-4" />
        Add Day
      </button>

      {/* Save */}
      <div className="flex gap-3 mb-8">
        <Link
          href="/training"
          className="px-6 py-3 border border-gray-300 rounded-lg text-gray-800 font-medium hover:bg-gray-50 transition-all duration-200"
        >
          Cancel
        </Link>
        <button
          onClick={savePlan}
          disabled={saving || days.length === 0}
          className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-200 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Dumbbell className="h-5 w-5" />
          )}
          <span>{saving ? 'Saving...' : 'Save Training Plan'}</span>
        </button>
      </div>
    </div>
  )
}
