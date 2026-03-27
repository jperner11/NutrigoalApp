'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { calculateCardioCalories } from '@/lib/cardio'
import { HeartPulse, Plus, Flame, Clock, Lock } from 'lucide-react'
import Link from 'next/link'
import { isFeatureLocked } from '@/lib/tierUtils'
import { toast } from 'react-hot-toast'
import type { CardioSession, CardioType } from '@/lib/supabase/types'

export default function CardioPage() {
  const { profile } = useUser()
  const [sessions, setSessions] = useState<(CardioSession & { cardio_type?: CardioType })[]>([])
  const [cardioTypes, setCardioTypes] = useState<CardioType[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    cardio_type_id: '',
    duration_minutes: 30,
    avg_bpm: '' as string | number,
    date: new Date().toISOString().split('T')[0],
  })

  useEffect(() => {
    if (!profile) return
    const supabase = createClient()

    async function load() {
      const [{ data: types }, { data: sessionsData }] = await Promise.all([
        supabase.from('cardio_types').select('*').order('name'),
        supabase
          .from('cardio_sessions')
          .select('*, cardio_types(*)')
          .eq('user_id', profile!.id)
          .order('date', { ascending: false })
          .limit(20),
      ])

      setCardioTypes(types ?? [])
      if (types?.length) {
        setFormData(prev => ({ ...prev, cardio_type_id: types[0].id }))
      }

      const mapped = (sessionsData ?? []).map((s) => ({
        ...s,
        cardio_type: s.cardio_types as unknown as CardioType,
      }))
      setSessions(mapped)
      setLoading(false)
    }

    load()
  }, [profile])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return

    const selectedType = cardioTypes.find(t => t.id === formData.cardio_type_id)
    if (!selectedType) return

    const avgBpm = formData.avg_bpm ? Number(formData.avg_bpm) : null

    const caloriesBurned = calculateCardioCalories({
      durationMinutes: formData.duration_minutes,
      avgBpm,
      weightKg: profile.weight_kg ?? 70,
      age: profile.age ?? 30,
      gender: profile.gender ?? 'male',
      metValue: selectedType.default_met,
    })

    const supabase = createClient()
    const { error } = await supabase.from('cardio_sessions').insert({
      user_id: profile.id,
      created_by: profile.id,
      cardio_type_id: formData.cardio_type_id,
      date: formData.date,
      duration_minutes: formData.duration_minutes,
      avg_bpm: avgBpm,
      calories_burned: caloriesBurned,
      is_completed: true,
    })

    if (error) {
      toast.error('Failed to log cardio session')
      return
    }

    toast.success(`Logged ${formData.duration_minutes} min of ${selectedType.name} — ${caloriesBurned} cal burned!`)
    setShowForm(false)

    // Reload sessions
    const { data } = await supabase
      .from('cardio_sessions')
      .select('*, cardio_types(*)')
      .eq('user_id', profile.id)
      .order('date', { ascending: false })
      .limit(20)

    setSessions(
      (data ?? []).map((s) => ({
        ...s,
        cardio_type: s.cardio_types as unknown as CardioType,
      }))
    )
  }

  if (loading) return <div className="text-gray-500">Loading cardio sessions...</div>

  if (isFeatureLocked(profile?.role ?? 'free', 'cardio')) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-100 mb-4">
            <Lock className="h-7 w-7 text-purple-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Cardio Tracking</h2>
          <p className="text-gray-500 mb-6 max-w-sm mx-auto">
            Track your cardio sessions and monitor heart rate calories. Available on Pro plan and above.
          </p>
          <Link
            href="/pricing"
            className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            <span>Upgrade to Pro</span>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cardio</h1>
          <p className="text-gray-900 mt-1">Track your cardiovascular sessions.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center space-x-2 bg-gradient-to-r from-red-500 to-pink-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:shadow-lg transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>Log Session</span>
        </button>
      </div>

      {/* Log Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-8">
          <h3 className="font-semibold text-gray-900 mb-4">Log Cardio Session</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Activity</label>
              <select
                value={formData.cardio_type_id}
                onChange={(e) => setFormData(prev => ({ ...prev, cardio_type_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                {cardioTypes.map(type => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
              <input
                type="number"
                min={1}
                value={formData.duration_minutes}
                onChange={(e) => setFormData(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Avg Heart Rate (BPM) <span className="text-gray-400">— optional</span></label>
              <input
                type="number"
                min={40}
                max={220}
                value={formData.avg_bpm}
                onChange={(e) => setFormData(prev => ({ ...prev, avg_bpm: e.target.value }))}
                placeholder="e.g. 145"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-gray-900 hover:bg-gray-100 rounded-lg text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all"
            >
              Log Session
            </button>
          </div>
        </form>
      )}

      {/* Sessions List */}
      {sessions.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
          <HeartPulse className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No cardio sessions yet</h3>
          <p className="text-gray-500">Start logging your cardio to track calories burned.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <div key={session.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-red-100 rounded-lg p-2">
                  <HeartPulse className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{session.cardio_type?.name ?? 'Cardio'}</h3>
                  <p className="text-sm text-gray-500">{session.date}</p>
                </div>
              </div>
              <div className="flex items-center space-x-6 text-sm">
                <div className="flex items-center space-x-1 text-gray-900">
                  <Clock className="h-4 w-4" />
                  <span>{session.duration_minutes} min</span>
                </div>
                {session.avg_bpm && (
                  <div className="flex items-center space-x-1 text-gray-900">
                    <HeartPulse className="h-4 w-4" />
                    <span>{session.avg_bpm} bpm</span>
                  </div>
                )}
                <div className="flex items-center space-x-1 text-orange-600 font-medium">
                  <Flame className="h-4 w-4" />
                  <span>{session.calories_burned} cal</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
