'use client'

import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'
import Link from 'next/link'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Scale,
  Plus,
  Trash2,
  Pencil,
  X,
  Check,
  Hourglass,
  Hash,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import type { WeightLog } from '@/lib/supabase/types'
import AppPageHeader from '@/components/ui/AppPageHeader'
import StatTile from '@/components/ui/StatTile'

type TimeRange = '7D' | '1M' | '3M' | '6M' | 'ALL'

function getDateThreshold(range: TimeRange): Date | null {
  const now = new Date()
  switch (range) {
    case '7D': return new Date(now.getTime() - 7 * 86400000)
    case '1M': return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
    case '3M': return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
    case '6M': return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())
    case 'ALL': return null
  }
}

function formatDate(dateStr: string, range: TimeRange): string {
  const d = new Date(dateStr + 'T00:00:00')
  if (range === '7D') return d.toLocaleDateString('en-US', { weekday: 'short' })
  if (range === '1M') return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
}

function formatFullDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
  })
}

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

export default function ProgressPage() {
  const { profile } = useUser()
  const [logs, setLogs] = useState<WeightLog[]>([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<TimeRange>('3M')

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [formWeight, setFormWeight] = useState('')
  const [formBodyFat, setFormBodyFat] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editWeight, setEditWeight] = useState('')
  const [editBodyFat, setEditBodyFat] = useState('')

  const loadLogs = useCallback(async () => {
    if (!profile) return
    const supabase = createClient()
    const { data, error } = await supabase
      .from('weight_logs')
      .select('*')
      .eq('user_id', profile.id)
      .order('date', { ascending: true })

    if (error) {
      toast.error('Failed to load weight logs')
      return
    }
    setLogs(data ?? [])
    setLoading(false)
  }, [profile])

  useEffect(() => { loadLogs() }, [loadLogs])

  async function handleSave() {
    if (!profile || !formWeight) return
    setSaving(true)
    const supabase = createClient()

    const { error } = await supabase.from('weight_logs').upsert({
      user_id: profile.id,
      date: formDate,
      weight_kg: parseFloat(formWeight),
      body_fat_pct: formBodyFat ? parseFloat(formBodyFat) : null,
      notes: formNotes || null,
    }, { onConflict: 'user_id,date' })

    if (error) {
      toast.error('Failed to save weight log')
      setSaving(false)
      return
    }

    await supabase.from('user_profiles').update({ weight_kg: parseFloat(formWeight) }).eq('id', profile.id)

    toast.success('Weight logged.')
    setShowForm(false)
    setFormWeight('')
    setFormBodyFat('')
    setFormNotes('')
    setSaving(false)
    loadLogs()
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this weight entry? This action cannot be undone.')) return
    const supabase = createClient()
    const { error } = await supabase.from('weight_logs').delete().eq('id', id)
    if (error) {
      toast.error('Failed to delete entry')
      return
    }
    toast.success('Entry deleted')
    loadLogs()
  }

  async function handleEditSave(log: WeightLog) {
    if (!editWeight) return
    const supabase = createClient()
    const { error } = await supabase.from('weight_logs').update({
      weight_kg: parseFloat(editWeight),
      body_fat_pct: editBodyFat ? parseFloat(editBodyFat) : null,
    }).eq('id', log.id)

    if (error) {
      toast.error('Failed to update')
      return
    }
    setEditingId(null)
    toast.success('Updated')
    loadLogs()
  }

  // Filter logs by range
  const threshold = getDateThreshold(range)
  const filteredLogs = threshold
    ? logs.filter(l => new Date(l.date + 'T00:00:00') >= threshold)
    : logs

  const chartData = filteredLogs.map(l => ({
    date: l.date,
    label: formatDate(l.date, range),
    weight: l.weight_kg,
    bodyFat: l.body_fat_pct,
  }))

  // Stats
  const currentWeight = logs.length > 0 ? logs[logs.length - 1].weight_kg : profile?.weight_kg ?? 0
  const startWeight = logs.length > 0 ? logs[0].weight_kg : profile?.weight_kg ?? 0
  const change = currentWeight - startWeight
  const targetWeight = profile?.target_weight_kg

  // Trend (last 7 entries)
  const recentLogs = logs.slice(-7)
  let trend: 'up' | 'down' | 'stable' = 'stable'
  if (recentLogs.length >= 2) {
    const diff = recentLogs[recentLogs.length - 1].weight_kg - recentLogs[0].weight_kg
    if (diff > 0.3) trend = 'up'
    else if (diff < -0.3) trend = 'down'
  }

  const trendIcon =
    trend === 'up' ? <TrendingUp className="h-3 w-3" />
    : trend === 'down' ? <TrendingDown className="h-3 w-3" />
    : <Minus className="h-3 w-3" />
  const trendTone: 'warn' | 'ok' | 'muted' =
    trend === 'up' ? 'warn' : trend === 'down' ? 'ok' : 'muted'
  const trendLabel = trend === 'up' ? 'Going up' : trend === 'down' ? 'Going down' : 'Stable'

  // Chart Y-axis domain
  const weights = chartData.map(d => d.weight)
  const yMin = weights.length > 0 ? Math.floor(Math.min(...weights, targetWeight ?? Infinity) - 1) : 60
  const yMax = weights.length > 0 ? Math.ceil(Math.max(...weights, targetWeight ?? -Infinity) + 1) : 100

  if (loading) {
    return (
      <div className="card p-8">
        <div
          className="mono"
          style={{ fontSize: 11, color: 'var(--fg-4)', letterSpacing: '0.14em' }}
        >
          LOADING
        </div>
        <div className="serif mt-2" style={{ fontSize: 24, color: 'var(--fg)' }}>
          Pulling your progress data.
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[920px]">
      {/* Sub-tab nav */}
      <div className="tab-row mb-6">
        <Link href="/progress" className="tab active">
          WEIGHT
        </Link>
        <Link href="/progress/measurements" className="tab">
          MEASUREMENTS
        </Link>
        <Link href="/progress/photos" className="tab">
          PHOTOS
        </Link>
      </div>

      <AppPageHeader
        eyebrow="Progress"
        title="Weight"
        accent="over time."
        subtitle="Track your weight and body composition."
        actions={
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn btn-accent"
          >
            <Plus className="h-4 w-4" />
            Log weight
          </button>
        }
      />

      {/* Quick Log Form */}
      {showForm && (
        <div className="card mb-6 p-6 animate-[fadeIn_0.2s_ease-out]">
          <div
            className="mono mb-4"
            style={{ fontSize: 11, color: 'var(--fg-4)', letterSpacing: '0.14em' }}
          >
            LOG WEIGHT
          </div>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            <div>
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
            <div>
              <label
                className="mono mb-2 block"
                style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.12em' }}
              >
                WEIGHT (KG) *
              </label>
              <input
                type="number"
                step="0.1"
                value={formWeight}
                onChange={(e) => setFormWeight(e.target.value)}
                placeholder={String(currentWeight || '')}
                style={inputStyle}
              />
            </div>
            <div>
              <label
                className="mono mb-2 block"
                style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.12em' }}
              >
                BODY FAT %
              </label>
              <input
                type="number"
                step="0.1"
                value={formBodyFat}
                onChange={(e) => setFormBodyFat(e.target.value)}
                placeholder="Optional"
                style={inputStyle}
              />
            </div>
            <div>
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
                placeholder="Optional"
                style={inputStyle}
              />
            </div>
          </div>
          <div className="row mt-5 justify-end gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="btn btn-ghost"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!formWeight || saving}
              className="btn btn-accent disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* Time Range Filters */}
      <div className="row mb-6 gap-1.5">
        {(['7D', '1M', '3M', '6M', 'ALL'] as TimeRange[]).map((r) => {
          const active = range === r
          return (
            <button
              key={r}
              onClick={() => setRange(r)}
              className="chip"
              style={{
                cursor: 'pointer',
                color: active ? 'var(--acc)' : 'var(--fg-3)',
                background: active ? 'var(--ink-3)' : 'var(--ink-2)',
                borderColor: active ? 'var(--acc)' : 'var(--line-2)',
                fontWeight: active ? 600 : 500,
              }}
            >
              {r}
            </button>
          )
        })}
      </div>

      {/* Stats Row */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile
          variant="card"
          hero
          icon={<Scale className="h-3.5 w-3.5" />}
          iconTone="acc"
          label="Current"
          value={`${currentWeight}kg`}
          change={
            <span className="row gap-1">
              {trendIcon}
              <span>{trendLabel}</span>
            </span>
          }
          changeTone={trendTone}
        />
        <StatTile
          variant="card"
          icon={<Hourglass className="h-3.5 w-3.5" />}
          label="Starting"
          value={`${startWeight}kg`}
        />
        <StatTile
          variant="card"
          icon={
            change > 0 ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : change < 0 ? (
              <TrendingDown className="h-3.5 w-3.5" />
            ) : (
              <Minus className="h-3.5 w-3.5" />
            )
          }
          iconTone={change > 0 ? 'warn' : change < 0 ? 'ok' : 'muted'}
          label="Change"
          value={`${change > 0 ? '+' : ''}${change.toFixed(1)}kg`}
          change={
            change > 0 ? 'Above start' : change < 0 ? 'Below start' : 'No change'
          }
          changeTone={change > 0 ? 'warn' : change < 0 ? 'ok' : 'muted'}
        />
        <StatTile
          variant="card"
          icon={<Hash className="h-3.5 w-3.5" />}
          label="Entries"
          value={logs.length}
        />
      </div>

      {/* Target Weight Banner */}
      {targetWeight && (
        <div
          className="card-2 mb-6 row gap-3 p-4"
          style={{ borderColor: 'var(--acc)', background: 'var(--acc-soft)' }}
        >
          <Scale className="h-4 w-4" style={{ color: 'var(--acc)' }} />
          <div
            className="mono"
            style={{ fontSize: 11, color: 'var(--acc)', letterSpacing: '0.14em' }}
          >
            TARGET · {targetWeight}KG
          </div>
          {currentWeight ? (
            <span style={{ fontSize: 13, color: 'var(--fg-2)' }}>
              {Math.abs(currentWeight - targetWeight).toFixed(1)}kg{' '}
              {currentWeight > targetWeight ? 'to lose' : 'to gain'}
            </span>
          ) : null}
        </div>
      )}

      {/* Chart */}
      {chartData.length >= 2 ? (
        <div className="card mb-6 p-6">
          <div
            className="mono mb-4"
            style={{ fontSize: 11, color: 'var(--fg-4)', letterSpacing: '0.14em' }}
          >
            WEIGHT OVER TIME
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#e63946" stopOpacity={0.32} />
                  <stop offset="95%" stopColor="#e63946" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(245, 241, 234, 0.10)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#8a847d' }} stroke="rgba(245, 241, 234, 0.20)" />
              <YAxis domain={[yMin, yMax]} tick={{ fontSize: 11, fill: '#8a847d' }} unit="kg" stroke="rgba(245, 241, 234, 0.20)" />
              <Tooltip
                contentStyle={{
                  borderRadius: '12px',
                  border: '1px solid rgba(245, 241, 234, 0.20)',
                  background: '#1a1719',
                  color: '#f5f1ea',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.28)',
                  fontSize: 12,
                }}
                formatter={(value) => [`${value}kg`, 'Weight']}
                labelFormatter={(_, payload) => {
                  if (payload?.[0]?.payload?.date) return formatFullDate(payload[0].payload.date)
                  return ''
                }}
              />
              {targetWeight && (
                <ReferenceLine
                  y={targetWeight}
                  stroke="#e63946"
                  strokeDasharray="6 4"
                  strokeOpacity={0.55}
                  label={{ value: `Target: ${targetWeight}kg`, position: 'right', fill: '#e63946', fontSize: 11 }}
                />
              )}
              <Area
                type="monotone"
                dataKey="weight"
                stroke="#e63946"
                strokeWidth={2.5}
                fill="url(#weightGradient)"
                dot={{ r: 4, fill: '#e63946', stroke: '#1a1719', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: '#f5f1ea', stroke: '#1a1719', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : chartData.length === 1 ? (
        <div className="card mb-6 p-12 text-center">
          <Scale className="mx-auto mb-3 h-10 w-10" style={{ color: 'var(--fg-4)' }} />
          <div className="serif" style={{ fontSize: 22 }}>
            Log at least{' '}
            <span className="italic-serif" style={{ color: 'var(--fg-3)' }}>
              two entries
            </span>{' '}
            to see your chart.
          </div>
          <p
            className="mt-2"
            style={{ fontSize: 13, color: 'var(--fg-2)' }}
          >
            You have 1 entry so far — keep going.
          </p>
        </div>
      ) : (
        <div className="card mb-6 p-12 text-center">
          <Scale className="mx-auto mb-3 h-10 w-10" style={{ color: 'var(--fg-4)' }} />
          <div className="serif" style={{ fontSize: 22 }}>
            No entries{' '}
            <span className="italic-serif" style={{ color: 'var(--fg-3)' }}>
              yet.
            </span>
          </div>
          <p
            className="mt-2"
            style={{ fontSize: 13, color: 'var(--fg-2)' }}
          >
            Click <span className="serif">Log weight</span> to start tracking your progress.
          </p>
        </div>
      )}

      {/* Recent Entries */}
      {logs.length > 0 && (
        <div className="card overflow-hidden">
          <div
            className="px-6 py-4"
            style={{ borderBottom: '1px solid var(--line)' }}
          >
            <div
              className="mono"
              style={{ fontSize: 11, color: 'var(--fg-4)', letterSpacing: '0.14em' }}
            >
              ALL ENTRIES
            </div>
          </div>
          <div>
            {[...logs].reverse().map((log, i, arr) => (
              <div
                key={log.id}
                className="row justify-between px-6 py-3.5"
                style={{
                  borderBottom: i < arr.length - 1 ? '1px solid var(--line)' : 'none',
                  fontSize: 13,
                }}
              >
                {editingId === log.id ? (
                  <>
                    <div className="row flex-1 gap-3">
                      <span
                        className="mono shrink-0"
                        style={{
                          fontSize: 11,
                          color: 'var(--fg-3)',
                          letterSpacing: '0.08em',
                          minWidth: 140,
                        }}
                      >
                        {formatFullDate(log.date).toUpperCase()}
                      </span>
                      <input
                        type="number"
                        step="0.1"
                        value={editWeight}
                        onChange={(e) => setEditWeight(e.target.value)}
                        style={{ ...inputStyle, width: 100, padding: '6px 10px' }}
                      />
                      <span style={{ fontSize: 11, color: 'var(--fg-4)' }}>kg</span>
                      <input
                        type="number"
                        step="0.1"
                        value={editBodyFat}
                        onChange={(e) => setEditBodyFat(e.target.value)}
                        placeholder="BF%"
                        style={{ ...inputStyle, width: 90, padding: '6px 10px' }}
                      />
                    </div>
                    <div className="row gap-1">
                      <button
                        onClick={() => handleEditSave(log)}
                        className="btn btn-ghost"
                        style={{ padding: 6, color: 'var(--ok)' }}
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="btn btn-ghost"
                        style={{ padding: 6 }}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="row gap-4">
                      <span
                        className="mono shrink-0"
                        style={{
                          fontSize: 11,
                          color: 'var(--fg-3)',
                          letterSpacing: '0.08em',
                          minWidth: 140,
                        }}
                      >
                        {formatFullDate(log.date).toUpperCase()}
                      </span>
                      <span className="serif" style={{ fontSize: 16, color: 'var(--fg)' }}>
                        {log.weight_kg}kg
                      </span>
                      {log.body_fat_pct && (
                        <span className="chip" style={{ color: 'var(--acc)' }}>
                          {log.body_fat_pct}% BF
                        </span>
                      )}
                      {log.notes && (
                        <span
                          className="truncate"
                          style={{ fontSize: 12, color: 'var(--fg-3)' }}
                        >
                          {log.notes}
                        </span>
                      )}
                    </div>
                    <div className="row gap-1">
                      <button
                        onClick={() => {
                          setEditingId(log.id)
                          setEditWeight(String(log.weight_kg))
                          setEditBodyFat(log.body_fat_pct ? String(log.body_fat_pct) : '')
                        }}
                        className="btn btn-ghost"
                        style={{ padding: 6 }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(log.id)}
                        className="btn btn-ghost"
                        style={{ padding: 6, color: 'var(--warn)' }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
