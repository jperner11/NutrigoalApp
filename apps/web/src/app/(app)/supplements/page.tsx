'use client'

import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'
import {
  Pill,
  Plus,
  Trash2,
  Check,
  X,
  Clock,
  ChevronDown,
} from 'lucide-react'
import {
  SUPPLEMENT_FREQUENCIES,
  SUPPLEMENT_TIMES,
  COMMON_SUPPLEMENTS,
} from '@nutrigoal/shared'
import type { UserSupplement, SupplementLog } from '@/lib/supabase/types'

export default function SupplementsPage() {
  const { profile } = useUser()
  const [supplements, setSupplements] = useState<UserSupplement[]>([])
  const [todayLogs, setTodayLogs] = useState<SupplementLog[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name: '',
    dosage: '',
    frequency: 'daily',
    time_of_day: 'morning',
    notes: '',
  })

  const today = new Date().toISOString().split('T')[0]

  const load = useCallback(async () => {
    if (!profile) return
    const supabase = createClient()

    const [supRes, logRes] = await Promise.all([
      supabase
        .from('user_supplements')
        .select('*')
        .eq('user_id', profile.id)
        .eq('is_active', true)
        .order('created_at'),
      supabase
        .from('supplement_logs')
        .select('*')
        .eq('user_id', profile.id)
        .eq('date', today),
    ])

    setSupplements(supRes.data ?? [])
    setTodayLogs(logRes.data ?? [])
    setLoading(false)
  }, [profile, today])

  useEffect(() => { load() }, [load])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!profile || !form.name.trim()) return

    setSaving(true)
    const supabase = createClient()

    const { error } = await supabase.from('user_supplements').insert({
      user_id: profile.id,
      name: form.name.trim(),
      dosage: form.dosage.trim() || null,
      frequency: form.frequency,
      time_of_day: form.time_of_day,
      notes: form.notes.trim() || null,
    })

    if (error) {
      toast.error('Failed to add supplement')
      setSaving(false)
      return
    }

    toast.success(`${form.name} added`)
    setForm({ name: '', dosage: '', frequency: 'daily', time_of_day: 'morning', notes: '' })
    setShowForm(false)
    setSaving(false)
    load()
  }

  async function handleDelete(sup: UserSupplement) {
    if (!confirm(`Remove ${sup.name}?`)) return
    const supabase = createClient()

    const { error } = await supabase
      .from('user_supplements')
      .update({ is_active: false })
      .eq('id', sup.id)

    if (error) {
      toast.error('Failed to remove')
      return
    }

    toast.success(`${sup.name} removed`)
    load()
  }

  async function toggleLog(sup: UserSupplement) {
    if (!profile) return
    const supabase = createClient()
    const isLogged = todayLogs.some(l => l.supplement_id === sup.id)

    if (isLogged) {
      const { error } = await supabase
        .from('supplement_logs')
        .delete()
        .eq('user_id', profile.id)
        .eq('supplement_id', sup.id)
        .eq('date', today)

      if (error) {
        toast.error('Failed to unlog')
        return
      }
      setTodayLogs(prev => prev.filter(l => l.supplement_id !== sup.id))
      toast.success(`${sup.name} unmarked`)
    } else {
      const { data, error } = await supabase
        .from('supplement_logs')
        .insert({
          user_id: profile.id,
          supplement_id: sup.id,
          date: today,
        })
        .select()
        .single()

      if (error) {
        toast.error('Failed to log')
        return
      }
      setTodayLogs(prev => [...prev, data])
      toast.success(`${sup.name} taken!`)
    }
  }

  if (!profile) return null

  const takenCount = todayLogs.length
  const totalActive = supplements.length
  const progress = totalActive > 0 ? Math.round((takenCount / totalActive) * 100) : 0

  const freqLabel = (v: string) => SUPPLEMENT_FREQUENCIES.find(f => f.value === v)?.label ?? v
  const timeLabel = (v: string) => SUPPLEMENT_TIMES.find(t => t.value === v)?.label ?? v

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Supplements</h1>
          <p className="text-gray-500 mt-1">Track your daily supplement intake</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:shadow-lg transition-all"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? 'Cancel' : 'Add Supplement'}
        </button>
      </div>

      {/* Today's Progress */}
      {totalActive > 0 && (
        <div className="bg-gradient-to-br from-white to-green-50/40 rounded-xl p-5 shadow-sm border border-green-100/60 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Pill className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold text-gray-900 text-sm">Today&apos;s Progress</h3>
            </div>
            <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-semibold">
              {takenCount}/{totalActive}
            </span>
          </div>
          <div className="w-full bg-green-100/50 rounded-full h-2.5">
            <div
              className="bg-gradient-to-r from-green-400 to-emerald-500 h-2.5 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Add Form */}
      {showForm && (
        <form onSubmit={handleAdd} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Supplement name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g., Vitamin D"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              required
            />
            {/* Quick picks */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {COMMON_SUPPLEMENTS.filter(s => !supplements.some(ex => ex.name === s)).slice(0, 10).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, name: s }))}
                  className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full hover:bg-purple-100 hover:text-purple-700 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dosage</label>
              <input
                type="text"
                value={form.dosage}
                onChange={(e) => setForm(f => ({ ...f, dosage: e.target.value }))}
                placeholder="e.g., 1000 IU"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
              <div className="relative">
                <select
                  value={form.frequency}
                  onChange={(e) => setForm(f => ({ ...f, frequency: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none appearance-none"
                >
                  {SUPPLEMENT_FREQUENCIES.map(f => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
              <div className="relative">
                <select
                  value={form.time_of_day}
                  onChange={(e) => setForm(f => ({ ...f, time_of_day: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none appearance-none"
                >
                  {SUPPLEMENT_TIMES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="e.g., Take with food"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-2.5 rounded-lg text-sm font-medium hover:shadow-lg transition-all disabled:opacity-50"
          >
            {saving ? 'Adding...' : 'Add Supplement'}
          </button>
        </form>
      )}

      {/* Supplement List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
        </div>
      ) : supplements.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
          <Pill className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No supplements yet</h3>
          <p className="text-gray-500 mb-4">Add your supplements to track daily intake.</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:shadow-lg transition-all"
          >
            <Plus className="h-4 w-4" />
            Add Your First Supplement
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {supplements.map(sup => {
            const isTaken = todayLogs.some(l => l.supplement_id === sup.id)

            return (
              <div
                key={sup.id}
                className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all hover:shadow-md ${
                  isTaken ? 'border-green-200 bg-green-50/30' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center p-4">
                  <button
                    onClick={() => toggleLog(sup)}
                    className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors mr-4 ${
                      isTaken
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-gray-300 hover:border-green-400'
                    }`}
                  >
                    {isTaken && <Check className="h-4 w-4" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className={`font-semibold ${isTaken ? 'text-green-800' : 'text-gray-900'}`}>
                        {sup.name}
                      </h3>
                      {sup.dosage && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                          {sup.dosage}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {timeLabel(sup.time_of_day)}
                      </span>
                      <span>{freqLabel(sup.frequency)}</span>
                      {sup.notes && <span className="italic">{sup.notes}</span>}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(sup)}
                    className="flex-shrink-0 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-2"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
