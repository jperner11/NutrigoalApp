'use client'

import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Scale,
  Target,
  Hash,
  Plus,
  Trash2,
  Pencil,
  X,
  Check,
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

    // Also update profile weight_kg to latest
    await supabase.from('user_profiles').update({ weight_kg: parseFloat(formWeight) }).eq('id', profile.id)

    toast.success('Weight logged!')
    setShowForm(false)
    setFormWeight('')
    setFormBodyFat('')
    setFormNotes('')
    setSaving(false)
    loadLogs()
  }

  async function handleDelete(id: string) {
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

  // Chart data
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

  const trendIcon = trend === 'up' ? <TrendingUp className="h-4 w-4" /> : trend === 'down' ? <TrendingDown className="h-4 w-4" /> : <Minus className="h-4 w-4" />
  const trendColor = trend === 'up' ? 'text-amber-600' : trend === 'down' ? 'text-green-600' : 'text-gray-500'
  const trendLabel = trend === 'up' ? 'Going up' : trend === 'down' ? 'Going down' : 'Stable'

  // Chart Y-axis domain
  const weights = chartData.map(d => d.weight)
  const yMin = weights.length > 0 ? Math.floor(Math.min(...weights, targetWeight ?? Infinity) - 1) : 60
  const yMax = weights.length > 0 ? Math.ceil(Math.max(...weights, targetWeight ?? -Infinity) + 1) : 100

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Progress</h1>
          <p className="text-gray-500 mt-1">Track your weight and body composition over time.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium hover:shadow-lg transition-all"
        >
          <Plus className="h-4 w-4" />
          Log Weight
        </button>
      </div>

      {/* Quick Log Form */}
      {showForm && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6 animate-[fadeIn_0.2s_ease-out]">
          <h3 className="font-semibold text-gray-900 mb-4">Log Weight</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs text-gray-500 font-medium mb-1 block">Date</label>
              <input
                type="date"
                value={formDate}
                onChange={e => setFormDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium mb-1 block">Weight (kg) *</label>
              <input
                type="number"
                step="0.1"
                value={formWeight}
                onChange={e => setFormWeight(e.target.value)}
                placeholder={String(currentWeight || '')}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium mb-1 block">Body Fat %</label>
              <input
                type="number"
                step="0.1"
                value={formBodyFat}
                onChange={e => setFormBodyFat(e.target.value)}
                placeholder="Optional"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium mb-1 block">Notes</label>
              <input
                type="text"
                value={formNotes}
                onChange={e => setFormNotes(e.target.value)}
                placeholder="Optional"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!formWeight || saving}
              className="px-5 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-all"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* Time Range Filters */}
      <div className="flex gap-2 mb-6">
        {(['7D', '1M', '3M', '6M', 'ALL'] as TimeRange[]).map(r => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              range === r
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 bg-purple-100 rounded-full mb-2">
            <Scale className="h-5 w-5 text-purple-600" />
          </div>
          <p className="text-xs text-gray-500">Current</p>
          <p className="text-2xl font-bold text-gray-900">{currentWeight}<span className="text-sm text-gray-400">kg</span></p>
          <div className={`flex items-center justify-center gap-1 text-xs font-medium mt-1 ${trendColor}`}>
            {trendIcon}
            <span>{trendLabel}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 bg-indigo-100 rounded-full mb-2">
            <Scale className="h-5 w-5 text-indigo-600" />
          </div>
          <p className="text-xs text-gray-500">Starting</p>
          <p className="text-2xl font-bold text-gray-900">{startWeight}<span className="text-sm text-gray-400">kg</span></p>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 bg-emerald-100 rounded-full mb-2">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="text-xs text-gray-500">Change</p>
          <p className={`text-2xl font-bold ${change > 0 ? 'text-amber-600' : change < 0 ? 'text-green-600' : 'text-gray-900'}`}>
            {change > 0 ? '+' : ''}{change.toFixed(1)}<span className="text-sm text-gray-400">kg</span>
          </p>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full mb-2">
            <Hash className="h-5 w-5 text-blue-600" />
          </div>
          <p className="text-xs text-gray-500">Entries</p>
          <p className="text-2xl font-bold text-gray-900">{logs.length}</p>
        </div>
      </div>

      {/* Target Weight Banner */}
      {targetWeight && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 rounded-xl p-4 mb-6 flex items-center gap-3">
          <Target className="h-5 w-5 text-purple-600" />
          <div>
            <span className="text-sm font-medium text-purple-800">Target Weight</span>
            <span className="text-sm text-purple-600 ml-2">{targetWeight}kg</span>
            {currentWeight && (
              <span className="text-xs text-purple-400 ml-2">
                ({Math.abs(currentWeight - targetWeight).toFixed(1)}kg {currentWeight > targetWeight ? 'to lose' : 'to gain'})
              </span>
            )}
          </div>
        </div>
      )}

      {/* Chart */}
      {chartData.length >= 2 ? (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Weight Over Time</h3>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#9ca3af' }} />
              <YAxis domain={[yMin, yMax]} tick={{ fontSize: 12, fill: '#9ca3af' }} unit="kg" />
              <Tooltip
                contentStyle={{
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
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
                  stroke="#a78bfa"
                  strokeDasharray="6 4"
                  label={{ value: `Target: ${targetWeight}kg`, position: 'right', fill: '#8b5cf6', fontSize: 11 }}
                />
              )}
              <Area
                type="monotone"
                dataKey="weight"
                stroke="#8b5cf6"
                strokeWidth={2.5}
                fill="url(#weightGradient)"
                dot={{ r: 4, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: '#7c3aed', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : chartData.length === 1 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 mb-6 text-center">
          <Scale className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Log at least 2 entries to see your chart</p>
          <p className="text-gray-400 text-sm mt-1">You have 1 entry so far — keep going!</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 mb-6 text-center">
          <Scale className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No weight entries yet</p>
          <p className="text-gray-400 text-sm mt-1">Click &quot;Log Weight&quot; to start tracking your progress.</p>
        </div>
      )}

      {/* Recent Entries */}
      {logs.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">All Entries</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {[...logs].reverse().map(log => (
              <div key={log.id} className="px-6 py-3.5 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                {editingId === log.id ? (
                  <>
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-sm text-gray-500 min-w-[120px]">{formatFullDate(log.date)}</span>
                      <input
                        type="number"
                        step="0.1"
                        value={editWeight}
                        onChange={e => setEditWeight(e.target.value)}
                        className="w-24 px-2 py-1 border border-gray-200 rounded text-sm"
                      />
                      <span className="text-xs text-gray-400">kg</span>
                      <input
                        type="number"
                        step="0.1"
                        value={editBodyFat}
                        onChange={e => setEditBodyFat(e.target.value)}
                        placeholder="BF%"
                        className="w-20 px-2 py-1 border border-gray-200 rounded text-sm"
                      />
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => handleEditSave(log)} className="p-1.5 text-green-600 hover:bg-green-50 rounded">
                        <Check className="h-4 w-4" />
                      </button>
                      <button onClick={() => setEditingId(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-500 min-w-[120px]">{formatFullDate(log.date)}</span>
                      <span className="text-sm font-bold text-gray-900">{log.weight_kg}kg</span>
                      {log.body_fat_pct && (
                        <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-medium">
                          {log.body_fat_pct}% BF
                        </span>
                      )}
                      {log.notes && <span className="text-xs text-gray-400">{log.notes}</span>}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setEditingId(log.id)
                          setEditWeight(String(log.weight_kg))
                          setEditBodyFat(log.body_fat_pct ? String(log.body_fat_pct) : '')
                        }}
                        className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(log.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
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
