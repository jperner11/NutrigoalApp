'use client'

import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'
import { Plus, Ruler, TrendingDown, TrendingUp, Minus } from 'lucide-react'
import Link from 'next/link'
import type { BodyMeasurement } from '@/lib/supabase/types'
import { AppHeroPanel, AppSectionHeader, EmptyStateCard, ListCard } from '@/components/ui/AppDesign'

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

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  background: 'var(--ink-2)',
  border: '1px solid var(--line-2)',
  borderRadius: 10,
  fontSize: 14,
  color: 'var(--fg)',
  outline: 'none',
}

function DiffBadge({ current, previous }: { current: number | null; previous: number | null }) {
  if (current === null || previous === null) return null
  const diff = Math.round((current - previous) * 10) / 10
  if (diff === 0) {
    return (
      <span
        className="row mono gap-1"
        style={{ fontSize: 10, color: 'var(--fg-4)', letterSpacing: '0.04em' }}
      >
        <Minus className="h-3 w-3" />0
      </span>
    )
  }
  const tone = diff > 0 ? 'var(--acc)' : 'var(--ok)'
  return (
    <span
      className="row mono gap-1"
      style={{ fontSize: 10, color: tone, letterSpacing: '0.04em', fontWeight: 600 }}
    >
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
      toast.success('Measurements saved.')
      setShowForm(false)
      setFormValues({})
      setFormNotes('')
      loadMeasurements()
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <ListCard eyebrow="LOADING" title="Pulling your measurement history.">
        <div className="app-progress-track">
          <div className="w-1/3 animate-pulse" />
        </div>
      </ListCard>
    )
  }

  const latest = measurements[0] ?? null
  const previous = measurements[1] ?? null

  return (
    <div className="mx-auto max-w-[920px]">
      {/* Sub-tab nav */}
      <div className="tab-row mb-6">
        <Link href="/progress" className="tab">
          WEIGHT
        </Link>
        <Link href="/progress/measurements" className="tab active">
          MEASUREMENTS
        </Link>
        <Link href="/progress/photos" className="tab">
          PHOTOS
        </Link>
      </div>

      <AppHeroPanel
        eyebrow="N° 07 · Measurements"
        title="Body"
        accent="measurements."
        subtitle="Track circumference changes with compact history and latest-vs-previous context."
        actions={
          <button
            onClick={() => setShowForm(!showForm)}
            className={showForm ? 'btn btn-secondary' : 'btn btn-accent'}
          >
            <Plus className="h-4 w-4" />
            {showForm ? 'Close log' : 'Log measurements'}
          </button>
        }
      />

      {/* Add Form */}
      {showForm && (
        <div className="card mb-6 p-6">
          <div
            className="mono mb-4"
            style={{ fontSize: 11, color: 'var(--fg-4)', letterSpacing: '0.14em' }}
          >
            LOG MEASUREMENTS
          </div>

          <div className="mb-4 max-w-[260px]">
            <label
              className="mono mb-2 block"
              style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.12em' }}
            >
              DATE
            </label>
            <input
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              style={inputStyle}
            />
          </div>

          <p
            className="mb-4"
            style={{ fontSize: 12, color: 'var(--fg-3)', lineHeight: 1.5 }}
          >
            All measurements in centimetres (cm). Leave blank to skip.
          </p>

          {['Upper Body', 'Arms', 'Core', 'Legs'].map((group) => (
            <div key={group} className="mb-4">
              <div
                className="mono mb-2"
                style={{ fontSize: 10, color: 'var(--fg-4)', letterSpacing: '0.12em' }}
              >
                {group.toUpperCase()}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {MEASUREMENT_FIELDS.filter((f) => f.group === group).map((field) => (
                  <div key={field.key}>
                    <label
                      className="mb-1 block"
                      style={{ fontSize: 12, color: 'var(--fg-2)' }}
                    >
                      {field.label}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formValues[field.key] ?? ''}
                      onChange={(e) =>
                        setFormValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                      }
                      placeholder="cm"
                      style={inputStyle}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="mb-5">
            <label
              className="mono mb-2 block"
              style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.12em' }}
            >
              NOTES
            </label>
            <input
              type="text"
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="Optional notes"
              style={inputStyle}
            />
          </div>

          <div className="row gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn btn-accent disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="btn btn-ghost"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Latest Comparison Card */}
      {latest && (
        <div className="card mb-6 p-6">
          <AppSectionHeader
            index="01"
            eyebrow={`LATEST · ${new Date(latest.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()}`}
            title="Latest"
            accent="snapshot."
            className="app-section-compact"
            summary={previous ? `vs ${new Date(previous.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : undefined}
            action={<Ruler className="h-4 w-4 text-[var(--acc)]" />}
          />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {MEASUREMENT_FIELDS.map((field) => {
              const val = latest[field.key] as number | null
              if (val === null) return null
              const prevVal = previous ? (previous[field.key] as number | null) : null

              return (
                <div key={field.key} className="card-2 p-3">
                  <div className="row justify-between">
                    <span
                      className="mono"
                      style={{
                        fontSize: 9,
                        color: 'var(--fg-4)',
                        letterSpacing: '0.12em',
                      }}
                    >
                      {field.label.toUpperCase()}
                    </span>
                    <DiffBadge current={val} previous={prevVal} />
                  </div>
                  <div className="row mt-1.5 items-baseline gap-1">
                    <span className="serif" style={{ fontSize: 20, lineHeight: 1 }}>
                      {val}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>cm</span>
                  </div>
                </div>
              )
            })}
          </div>

          {latest.notes && (
            <p
              className="mt-4 pt-4"
              style={{
                fontSize: 13,
                color: 'var(--fg-2)',
                lineHeight: 1.5,
                borderTop: '1px solid var(--line)',
              }}
            >
              {latest.notes}
            </p>
          )}
        </div>
      )}

      {/* History */}
      {measurements.length > 1 && (
        <div className="card overflow-hidden">
          <div
            className="px-5 py-4"
            style={{ borderBottom: '1px solid var(--line)' }}
          >
            <AppSectionHeader
              index="02"
              eyebrow="HISTORY"
              title="Earlier"
              accent="logs."
              className="app-section-compact"
            />
          </div>
          <div>
            {measurements.slice(1).map((m, idx, arr) => {
              const prev = measurements[idx + 2] ?? null
              const filledFields = MEASUREMENT_FIELDS.filter((f) => (m[f.key] as number | null) !== null)

              return (
                <div
                  key={m.id}
                  className="px-5 py-4"
                  style={{
                    borderBottom: idx < arr.length - 1 ? '1px solid var(--line)' : 'none',
                  }}
                >
                  <div
                    className="mono mb-2"
                    style={{
                      fontSize: 10,
                      color: 'var(--fg-3)',
                      letterSpacing: '0.1em',
                    }}
                  >
                    {new Date(m.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()}
                  </div>
                  <div className="row flex-wrap gap-3">
                    {filledFields.map((field) => {
                      const val = m[field.key] as number
                      const prevVal = prev ? (prev[field.key] as number | null) : null
                      return (
                        <div
                          key={field.key}
                          className="row gap-1.5"
                          style={{ fontSize: 12, color: 'var(--fg-2)' }}
                        >
                          <span>
                            {field.label}:{' '}
                            <span className="serif" style={{ color: 'var(--fg)' }}>
                              {val}cm
                            </span>
                          </span>
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
        <EmptyStateCard
          icon={<Ruler className="h-7 w-7" />}
          title="No measurements yet."
          body="Start tracking body measurements to see changes over time."
          action={
            <button
              onClick={() => setShowForm(true)}
              className="btn btn-accent"
            >
              <Plus className="h-4 w-4" />
              Log first measurement
            </button>
          }
        />
      )}
    </div>
  )
}
