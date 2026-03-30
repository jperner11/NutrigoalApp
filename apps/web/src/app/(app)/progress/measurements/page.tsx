'use client'

import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'
import { Plus, Ruler, TrendingDown, TrendingUp, Minus } from 'lucide-react'
import Link from 'next/link'
import type { BodyMeasurement } from '@/lib/supabase/types'

const MEASUREMENT_FIELDS: { key: keyof BodyMeasurement; label: string; group: string }[] = [
  { key: 'neck', label: 'Neck', group: 'Upper Body' },
  { key: 'shoulders', label: 'Shoulders', group: 'Upper Body' },
  { key: 'chest', label: 'Chest', group: 'Upper Body' },
  { key: 'left_arm', label: 'Left Arm', group: 'Arms' },
  { key: 'right_arm', label: 'Right Arm', group: 'Arms' },
  { key: 'waist', label: 'Waist', group: 'Core' },
  { key: 'hips', label: 'Hips', group: 'Core' },
  { key: 'left_thigh', label: 'Left Thigh', group: 'Legs' },
  { key: 'right_thigh', label: 'Right Thigh', group: 'Legs' },
  { key: 'left_calf', label: 'Left Calf', group: 'Legs' },
  { key: 'right_calf', label: 'Right Calf', group: 'Legs' },
]

function DiffBadge({ current, previous }: { current: number | null; previous: number | null }) {
  if (current === null || previous === null) return null
  const diff = Math.round((current - previous) * 10) / 10
  if (diff === 0) return (
    <span className="flex items-center gap-0.5 text-xs text-gray-400">
      <Minus className="h-3 w-3" />0
    </span>
  )
  return (
    <span className={`flex items-center gap-0.5 text-xs font-medium ${diff > 0 ? 'text-blue-600' : 'text-green-600'}`}>
      {diff > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {diff > 0 ? '+' : ''}{diff}cm
    </span>
  )
}

export default function MeasurementsPage() {
  const { profile } = useUser()
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0])
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [formNotes, setFormNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const loadMeasurements = useCallback(async () => {
    if (!profile) return
    const supabase = createClient()
    const { data } = await supabase
      .from('body_measurements')
      .select('*')
      .eq('user_id', profile.id)
      .order('date', { ascending: false })
      .limit(20)

    setMeasurements(data ?? [])
    setLoading(false)
  }, [profile])

  useEffect(() => { loadMeasurements() }, [loadMeasurements])

  async function handleSave() {
    if (!profile) return
    setSaving(true)
    const supabase = createClient()

    const values: Record<string, number | null> = {}
    for (const field of MEASUREMENT_FIELDS) {
      const v = formValues[field.key]
      values[field.key as string] = v ? parseFloat(v) : null
    }

    const { error } = await supabase.from('body_measurements').upsert({
      user_id: profile.id,
      date: formDate,
      ...values,
      notes: formNotes || null,
    }, { onConflict: 'user_id,date' })

    if (error) {
      toast.error('Failed to save measurements')
    } else {
      toast.success('Measurements saved')
      setShowForm(false)
      setFormValues({})
      setFormNotes('')
      loadMeasurements()
    }
    setSaving(false)
  }

  if (loading) return <div className="text-gray-500">Loading...</div>

  // Latest and previous for diff calculation
  const latest = measurements[0] ?? null
  const previous = measurements[1] ?? null

  return (
    <div className="max-w-3xl mx-auto">
      {/* Tab nav */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
        <Link href="/progress" className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-center text-gray-600 hover:text-gray-900">
          Weight
        </Link>
        <Link href="/progress/measurements" className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-center bg-white text-purple-700 shadow-sm">
          Measurements
        </Link>
        <Link href="/progress/photos" className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-center text-gray-600 hover:text-gray-900">
          Photos
        </Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Body Measurements</h1>
          <p className="text-gray-600 mt-1">Track your body circumference over time.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:shadow-lg transition-all"
        >
          <Plus className="h-4 w-4" />
          Log Measurements
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="card p-6 mb-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <p className="text-xs text-gray-500 mb-3">All measurements in centimeters (cm). Leave blank to skip.</p>

          {['Upper Body', 'Arms', 'Core', 'Legs'].map(group => (
            <div key={group} className="mb-4">
              <h4 className="text-sm font-semibold text-gray-800 mb-2">{group}</h4>
              <div className="grid grid-cols-2 gap-3">
                {MEASUREMENT_FIELDS.filter(f => f.group === group).map(field => (
                  <div key={field.key}>
                    <label className="block text-xs text-gray-600 mb-1">{field.label}</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formValues[field.key] ?? ''}
                      onChange={(e) => setFormValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="cm"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="mb-4">
            <label className="block text-xs text-gray-600 mb-1">Notes</label>
            <input
              type="text"
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Optional notes"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:shadow-lg transition-all disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-5 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Latest Comparison Card */}
      {latest && (
        <div className="card p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Ruler className="h-5 w-5 text-purple-600" />
            <h2 className="font-semibold text-gray-900">
              Latest — {new Date(latest.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </h2>
            {previous && (
              <span className="text-xs text-gray-400">
                vs {new Date(previous.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {MEASUREMENT_FIELDS.map(field => {
              const val = latest[field.key] as number | null
              if (val === null) return null
              const prevVal = previous ? (previous[field.key] as number | null) : null

              return (
                <div key={field.key} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500">{field.label}</span>
                    <DiffBadge current={val} previous={prevVal} />
                  </div>
                  <p className="text-lg font-bold text-gray-900">{val}<span className="text-sm font-normal text-gray-400">cm</span></p>
                </div>
              )
            })}
          </div>

          {latest.notes && (
            <p className="text-sm text-gray-600 mt-3 pt-3 border-t border-gray-100">{latest.notes}</p>
          )}
        </div>
      )}

      {/* History */}
      {measurements.length > 1 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">History</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {measurements.slice(1).map((m, idx) => {
              const prev = measurements[idx + 2] ?? null
              const filledFields = MEASUREMENT_FIELDS.filter(f => (m[f.key] as number | null) !== null)

              return (
                <div key={m.id} className="px-5 py-3">
                  <p className="text-sm font-medium text-gray-800 mb-1">
                    {new Date(m.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {filledFields.map(field => {
                      const val = m[field.key] as number
                      const prevVal = prev ? (prev[field.key] as number | null) : null
                      return (
                        <div key={field.key} className="flex items-center gap-1.5 text-xs text-gray-600">
                          <span>{field.label}: {val}cm</span>
                          <DiffBadge current={val} previous={prevVal} />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {measurements.length === 0 && !showForm && (
        <div className="card p-12 text-center">
          <Ruler className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No measurements yet</h3>
          <p className="text-gray-500 mb-4">Start tracking your body measurements to see changes over time.</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            Log First Measurement
          </button>
        </div>
      )}
    </div>
  )
}
