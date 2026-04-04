'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Plus, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import Link from 'next/link'
import type { Exercise, UserProfile } from '@/lib/supabase/types'
import { BODY_PARTS, DEFAULT_REST_SECONDS, DEFAULT_SETS, DEFAULT_REPS } from '@/lib/constants'
import { isTrainerRole } from '@nutrigoal/shared'

interface DayExercise {
  tempId: string
  exercise_id: string
  exerciseName: string
  bodyPart: string
  sets: number
  reps: string
  rest_seconds: number
}

interface TrainingDay {
  tempId: string
  name: string
  exercises: DayExercise[]
}

export default function NewClientTrainingPlanPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { profile } = useUser()
  const [client, setClient] = useState<UserProfile | null>(null)
  const [planName, setPlanName] = useState('')
  const [description, setDescription] = useState('')
  const [days, setDays] = useState<TrainingDay[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loadingExercises, setLoadingExercises] = useState(true)
  const [saving, setSaving] = useState(false)

  // Exercise picker
  const [addingToDayIndex, setAddingToDayIndex] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterBodyPart, setFilterBodyPart] = useState('')

  useEffect(() => {
    if (!profile) return
    if (!isTrainerRole(profile.role)) { router.push('/dashboard'); return }

    const supabase = createClient()
    Promise.all([
      supabase.from('user_profiles').select('*').eq('id', id).single(),
      supabase.from('exercises').select('*'),
    ]).then(([clientRes, exRes]) => {
      if (clientRes.data) setClient(clientRes.data as UserProfile)
      if (exRes.data) setExercises(exRes.data as Exercise[])
      setLoadingExercises(false)
    })
  }, [profile, id, router])

  const filteredExercises = useMemo(() => {
    return exercises.filter(ex => {
      if (searchQuery && !ex.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
      if (filterBodyPart && ex.body_part !== filterBodyPart) return false
      return true
    })
  }, [exercises, searchQuery, filterBodyPart])

  if (!profile || !client) return <div className="text-gray-500">Loading...</div>

  function addDay() {
    setDays(prev => [...prev, { tempId: crypto.randomUUID(), name: `Day ${prev.length + 1}`, exercises: [] }])
  }

  function removeDay(index: number) {
    setDays(prev => prev.filter((_, i) => i !== index))
  }

  function addExercisesToDay(dayIndex: number, exercise: Exercise) {
    setDays(prev => {
      const updated = [...prev]
      updated[dayIndex].exercises.push({
        tempId: crypto.randomUUID(),
        exercise_id: exercise.id,
        exerciseName: exercise.name,
        bodyPart: exercise.body_part,
        sets: DEFAULT_SETS,
        reps: DEFAULT_REPS,
        rest_seconds: DEFAULT_REST_SECONDS,
      })
      return updated
    })
  }

  function removeExercise(dayIndex: number, exIndex: number) {
    setDays(prev => {
      const updated = [...prev]
      updated[dayIndex].exercises.splice(exIndex, 1)
      return updated
    })
  }

  function updateExercise(dayIndex: number, exIndex: number, field: 'sets' | 'reps' | 'rest_seconds', value: string) {
    setDays(prev => {
      const updated = [...prev]
      const ex = updated[dayIndex].exercises[exIndex]
      if (field === 'sets') ex.sets = parseInt(value) || 0
      else if (field === 'reps') ex.reps = value
      else ex.rest_seconds = parseInt(value) || 0
      return updated
    })
  }

  async function handleSave() {
    if (!planName.trim()) { toast.error('Enter a plan name'); return }
    if (days.length === 0) { toast.error('Add at least one day'); return }
    if (days.some(d => d.exercises.length === 0)) { toast.error('Each day needs at least one exercise'); return }

    setSaving(true)
    const supabase = createClient()

    await supabase.from('training_plans').update({ is_active: false }).eq('user_id', id).eq('is_active', true)

    const { data: plan, error } = await supabase.from('training_plans').insert({
      user_id: id, created_by: profile!.id, name: planName,
      description: description.trim() || null, days_per_week: days.length, is_active: true,
    }).select().single()

    if (error || !plan) { toast.error(error?.message || 'Failed'); setSaving(false); return }

    for (let i = 0; i < days.length; i++) {
      const { data: day } = await supabase.from('training_plan_days').insert({
        training_plan_id: plan.id, day_number: i + 1, name: days[i].name,
      }).select().single()
      if (!day) continue

      const rows = days[i].exercises.map((e, idx) => ({
        plan_day_id: day.id, exercise_id: e.exercise_id, order_index: idx,
        sets: e.sets, reps: e.reps, rest_seconds: e.rest_seconds,
      }))
      await supabase.from('training_plan_exercises').insert(rows)
    }

    toast.success(`Training plan created for ${client?.full_name}`)
    router.push(`/clients/${id}`)
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Link href={`/clients/${id}`} className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6">
        <ArrowLeft className="h-4 w-4" />
        <span>Back to {client.full_name || 'Client'}</span>
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">New Training Plan</h1>
      <p className="text-gray-500 mb-6">for {client.full_name}</p>

      {/* Client fitness info */}
      {(client.injuries?.length > 0 || client.training_experience || client.equipment_access) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6 text-sm space-y-1">
          {client.training_experience && <p className="text-gray-700">Experience: <strong>{client.training_experience}</strong></p>}
          {client.equipment_access && <p className="text-gray-700">Equipment: <strong>{client.equipment_access.replace(/_/g, ' ')}</strong></p>}
          {client.injuries?.length > 0 && <p className="text-red-700 font-medium">Injuries: {client.injuries.join(', ')}</p>}
          {client.medical_conditions?.length > 0 && <p className="text-orange-700">Conditions: {client.medical_conditions.join(', ')}</p>}
        </div>
      )}

      {/* Plan Name & Description */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name</label>
          <input type="text" value={planName} onChange={e => setPlanName(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="e.g. Push Pull Legs" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
          <input type="text" value={description} onChange={e => setDescription(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="e.g. 4-week hypertrophy focus" />
        </div>
      </div>

      {/* Days */}
      {days.map((day, di) => (
        <div key={day.tempId} className="card p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <input type="text" value={day.name} onChange={e => {
              setDays(prev => { const u = [...prev]; u[di].name = e.target.value; return u })
            }} className="text-lg font-semibold text-gray-900 bg-transparent border-none outline-none" />
            {days.length > 1 && (
              <button onClick={() => removeDay(di)} className="text-red-400 hover:text-red-600">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>

          {day.exercises.map((ex, ei) => (
            <div key={ex.tempId} className="flex items-center gap-3 py-3 border-t border-gray-50">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{ex.exerciseName}</p>
                <span className="text-xs text-gray-400">{ex.bodyPart}</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500">Sets</label>
                <input type="number" value={ex.sets} onChange={e => updateExercise(di, ei, 'sets', e.target.value)}
                  className="w-14 px-2 py-1 text-sm border border-gray-200 rounded text-center" />
                <label className="text-xs text-gray-500">Reps</label>
                <input type="text" value={ex.reps} onChange={e => updateExercise(di, ei, 'reps', e.target.value)}
                  className="w-16 px-2 py-1 text-sm border border-gray-200 rounded text-center" />
                <label className="text-xs text-gray-500">Rest</label>
                <input type="number" value={ex.rest_seconds} onChange={e => updateExercise(di, ei, 'rest_seconds', e.target.value)}
                  className="w-14 px-2 py-1 text-sm border border-gray-200 rounded text-center" />
                <span className="text-xs text-gray-400">s</span>
              </div>
              <button onClick={() => removeExercise(di, ei)} className="text-gray-300 hover:text-red-500">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}

          {/* Inline exercise picker */}
          {addingToDayIndex === di ? (
            <div className="mt-3 border-t border-gray-100 pt-3">
              <div className="flex gap-2 mb-2">
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg" placeholder="Search exercises..." />
                <select value={filterBodyPart} onChange={e => setFilterBodyPart(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg">
                  <option value="">All muscles</option>
                  {BODY_PARTS.map(bp => <option key={bp.value} value={bp.value}>{bp.label}</option>)}
                </select>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {loadingExercises ? <Loader2 className="h-4 w-4 animate-spin mx-auto my-4" /> :
                  filteredExercises.slice(0, 15).map(ex => (
                    <button key={ex.id} onClick={() => { addExercisesToDay(di, ex); setAddingToDayIndex(null) }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-purple-50 rounded flex justify-between items-center">
                      <div>
                        <span className="font-medium">{ex.name}</span>
                        <span className="text-xs text-gray-400 ml-2">{ex.body_part} · {ex.equipment}</span>
                      </div>
                      <Plus className="h-3 w-3 text-purple-600" />
                    </button>
                  ))
                }
              </div>
              <button onClick={() => setAddingToDayIndex(null)} className="text-xs text-gray-500 hover:text-gray-700 mt-2">Close</button>
            </div>
          ) : (
            <button onClick={() => { setAddingToDayIndex(di); setSearchQuery(''); setFilterBodyPart('') }}
              className="flex items-center space-x-1 text-sm text-green-600 hover:text-green-700 mt-3">
              <Plus className="h-4 w-4" />
              <span>Add Exercise</span>
            </button>
          )}
        </div>
      ))}

      <button onClick={addDay}
        className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm font-medium text-green-600 hover:border-green-300 hover:bg-green-50 transition-colors mb-6">
        + Add Day
      </button>

      <button onClick={handleSave} disabled={saving}
        className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50">
        {saving ? 'Creating...' : 'Create Training Plan'}
      </button>
    </div>
  )
}
