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
import { AppHeroPanel, ListCard } from '@/components/ui/AppDesign'

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
    return 'border-[var(--brand-400)] bg-[var(--brand-100)] text-[var(--brand-400)]'
  }
  if (['biceps', 'triceps'].some((bp) => normalized.includes(bp))) {
    return 'border-[var(--line-strong)] bg-[var(--ink-2)] text-[var(--fg-2)]'
  }
  if (normalized.includes('leg') || normalized.includes('quad') || normalized.includes('hamstring') || normalized.includes('glute') || normalized.includes('calf')) {
    return 'border-[var(--ok)] bg-[var(--success-bg)] text-[var(--ok)]'
  }
  if (normalized.includes('core') || normalized.includes('abs') || normalized.includes('abdominal')) {
    return 'border-[var(--warn)] bg-[var(--warning-bg)] text-[var(--warn)]'
  }
  return 'border-[var(--line)] bg-[var(--ink-2)] text-[var(--fg-3)]'
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
    <div className="mx-auto max-w-[980px]">
      <div className="mb-4">
        <Link href="/training" className="btn btn-ghost inline-flex">
          <ArrowLeft className="h-4 w-4" />
          Back to training
        </Link>
      </div>

      <AppHeroPanel
        eyebrow="N° 03 · New program"
        title="Training,"
        accent="built."
        subtitle="Design days, add exercises, and keep the working details dense without leaving the Ember workspace."
      />

      {/* Plan Details */}
      <ListCard className="mb-6" eyebrow="PROGRAM DETAILS">
        <div className="space-y-4">
          <div>
            <label className="app-mono-label mb-2 block">Plan name</label>
            <input
              type="text"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              className="input-field"
              placeholder="e.g. Push Pull Legs"
            />
          </div>
          <div>
            <label className="app-mono-label mb-2 block">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field min-h-[92px]"
              rows={2}
              placeholder="Describe your training plan..."
            />
          </div>
        </div>
      </ListCard>

      {/* Days */}
      <div className="space-y-4 mb-6">
        {days.map((day, dayIndex) => (
          <div
            key={day.tempId}
            className="card p-6 transition-all duration-200 hover:border-[var(--line-strong)]"
          >
            {/* Day Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {/* Day Number Circle */}
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[var(--brand-100)] ring-1 ring-[var(--accentLine)]">
                  <span className="text-sm font-bold text-[var(--brand-400)]">{dayIndex + 1}</span>
                </div>
                <input
                  type="text"
                  value={day.name}
                  onChange={(e) => updateDayName(dayIndex, e.target.value)}
                  className="bg-transparent p-0 text-lg font-semibold text-[var(--fg)] outline-none"
                  placeholder="Day name..."
                />
              </div>
              <button
                onClick={() => removeDay(dayIndex)}
                className="p-1.5 text-[var(--fg-4)] transition-colors hover:text-[var(--brand-400)]"
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
                    className="flex items-center gap-2 rounded-lg bg-[var(--ink-2)] px-3 py-2 transition-colors hover:bg-[var(--ink-3)]"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--fg)]">
                        {ex.exerciseName}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="flex flex-col items-center">
                        <label className="text-[10px] text-[var(--fg-4)]">Sets</label>
                        <input
                          type="number"
                          value={ex.sets}
                          onChange={(e) =>
                            updateExercise(dayIndex, exIndex, 'sets', parseInt(e.target.value) || 1)
                          }
                          min={1}
                          className="w-14 rounded border border-[var(--line-2)] bg-[var(--ink-2)] px-1.5 py-1 text-center text-sm text-[var(--fg)]"
                        />
                      </div>
                      <div className="flex flex-col items-center">
                        <label className="text-[10px] text-[var(--fg-4)]">Reps</label>
                        <input
                          type="text"
                          value={ex.reps}
                          onChange={(e) =>
                            updateExercise(dayIndex, exIndex, 'reps', e.target.value)
                          }
                          className="w-16 rounded border border-[var(--line-2)] bg-[var(--ink-2)] px-1.5 py-1 text-center text-sm text-[var(--fg)]"
                          placeholder="8-12"
                        />
                      </div>
                      <div className="flex flex-col items-center">
                        <label className="text-[10px] text-[var(--fg-4)]">Rest (s)</label>
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
                          className="w-16 rounded border border-[var(--line-2)] bg-[var(--ink-2)] px-1.5 py-1 text-center text-sm text-[var(--fg)]"
                        />
                      </div>
                      <button
                        onClick={() => removeExerciseFromDay(dayIndex, exIndex)}
                        className="mt-3 p-1 text-[var(--fg-4)] transition-colors hover:text-[var(--brand-400)]"
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
              <div className="border-t border-[var(--line)] pt-4">
                {/* Search and Filters */}
                <div className="space-y-2 mb-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--fg-4)]" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="input-field w-full pl-9"
                      placeholder="Search exercises..."
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={filterBodyPart}
                      onChange={(e) => setFilterBodyPart(e.target.value)}
                      className="input-field flex-1 py-2 text-sm"
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
                      className="input-field flex-1 py-2 text-sm"
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
                    <Loader2 className="h-5 w-5 animate-spin text-[var(--brand-400)]" />
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-1 mb-3">
                    {filteredExercises.length === 0 ? (
                      <p className="py-4 text-center text-sm text-[var(--fg-3)]">
                        No exercises found. Try a different search or add a custom exercise.
                      </p>
                    ) : (
                      filteredExercises.map((exercise) => (
                        <button
                          key={exercise.id}
                          onClick={() => addExerciseToDay(dayIndex, exercise)}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[var(--fg)] transition-colors hover:bg-[var(--ink-2)]"
                        >
                          <Plus className="h-3 w-3 flex-shrink-0 text-[var(--brand-400)]" />
                          <span className="flex-1 truncate">{exercise.name}</span>
                          <span className="flex items-center gap-1 flex-shrink-0">
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full capitalize ${getBodyPartBadgeClass(exercise.body_part)}`}>
                              {BODY_PARTS.find((bp) => bp.value === exercise.body_part)?.label}
                            </span>
                            <span className="rounded-full border border-[var(--line)] bg-transparent px-1.5 py-0.5 text-[10px] font-medium capitalize text-[var(--fg-3)]">
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
                  <div className="mb-3 space-y-2 rounded-lg border border-[var(--line)] bg-[var(--ink-2)] p-3">
                    <p className="text-sm font-medium text-[var(--fg)]">Add Custom Exercise</p>
                    <input
                      type="text"
                      value={customExercise.name}
                      onChange={(e) =>
                        setCustomExercise((prev) => ({ ...prev, name: e.target.value }))
                      }
                      className="input-field"
                      placeholder="Exercise name"
                    />
                    <div className="flex gap-2">
                      <select
                        value={customExercise.body_part}
                        onChange={(e) =>
                          setCustomExercise((prev) => ({ ...prev, body_part: e.target.value }))
                        }
                        className="input-field flex-1"
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
                        className="input-field flex-1"
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
                        className="btn btn-ghost px-3 py-1.5 text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveCustomExercise}
                        disabled={savingCustom}
                        className="btn btn-accent px-3 py-1.5 text-sm disabled:opacity-50"
                      >
                        {savingCustom && <Loader2 className="h-3 w-3 animate-spin" />}
                        Save & Add
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowCustomExercise(true)}
                    className="mb-3 text-sm font-medium text-[var(--brand-400)] transition-colors hover:text-[var(--brand-500)]"
                  >
                    + Add Custom Exercise
                  </button>
                )}

                <div className="border-t border-[var(--line)] pt-2">
                  <button
                    onClick={closePicker}
                    className="text-xs text-[var(--fg-3)] transition-colors hover:text-[var(--fg)]"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => openPicker(dayIndex)}
                className="flex items-center gap-1 text-sm font-medium text-[var(--brand-400)] transition-colors hover:text-[var(--brand-500)]"
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
        className="mb-8 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--line-strong)] py-3 text-[var(--fg-2)] transition-all duration-200 hover:border-[var(--brand-400)] hover:text-[var(--brand-400)]"
      >
        <Plus className="h-4 w-4" />
        Add Day
      </button>

      {/* Save */}
      <div className="flex gap-3 mb-8">
        <Link
          href="/training"
          className="btn btn-secondary px-6 py-3"
        >
          Cancel
        </Link>
        <button
          onClick={savePlan}
          disabled={saving || days.length === 0}
          className="btn btn-accent flex-1 justify-center py-3 disabled:opacity-50"
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
