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
  Lock,
} from 'lucide-react'
import Link from 'next/link'
import { isFeatureLocked } from '@/lib/tierUtils'
import {
  SUPPLEMENT_FREQUENCIES,
  SUPPLEMENT_TIMES,
  COMMON_SUPPLEMENTS,
} from '@nutrigoal/shared'
import type { UserSupplement, SupplementLog } from '@/lib/supabase/types'
import { AppHeroPanel, EmptyStateCard, ListCard } from '@/components/ui/AppDesign'

const labelClass = 'mono mb-2 block text-[11px] tracking-[0.12em] text-[var(--fg-4)]'
const fieldClass = 'w-full rounded-xl border border-[var(--line-2)] bg-[var(--ink-2)] px-3 py-2.5 text-sm text-[var(--fg)] outline-none transition focus:border-[var(--acc)]'

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

  if (isFeatureLocked(profile.role, 'supplements')) {
    return (
      <div className="mx-auto max-w-[900px]">
        <EmptyStateCard
          icon={<Lock className="h-7 w-7" />}
          title="Supplement tracking is a Pro tool."
          body="Track daily supplements and vitamins once your plan includes this module."
          action={
          <Link
            href="/pricing"
            className="btn btn-accent"
          >
            <span>Upgrade to Pro</span>
          </Link>
          }
        />
      </div>
    )
  }

  const takenCount = todayLogs.length
  const totalActive = supplements.length
  const progress = totalActive > 0 ? Math.round((takenCount / totalActive) * 100) : 0

  const freqLabel = (v: string) => SUPPLEMENT_FREQUENCIES.find(f => f.value === v)?.label ?? v
  const timeLabel = (v: string) => SUPPLEMENT_TIMES.find(t => t.value === v)?.label ?? v

  return (
    <div className="mx-auto max-w-[900px]">
      <AppHeroPanel
        eyebrow="N° 06 · Supplements"
        title="Supplements,"
        accent="accounted."
        subtitle="Keep the daily stack visible, mark what is done, and make the routine feel boring in the best way."
        actions={
        <button
          onClick={() => setShowForm(!showForm)}
          className={showForm ? 'btn btn-secondary' : 'btn btn-accent'}
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? 'Cancel' : 'Add Supplement'}
        </button>
        }
        meta={
          <div className="app-card-topline min-w-[160px]">
            <span>TODAY</span>
            <span style={{ color: 'var(--acc)' }}>{takenCount}/{totalActive}</span>
          </div>
        }
      />

      {/* Today's Progress */}
      {totalActive > 0 && (
        <ListCard className="mb-6" eyebrow="TODAY'S PROGRESS">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Pill className="h-5 w-5 text-[var(--ok)]" />
              <h3 className="text-sm font-semibold text-[var(--fg)]">Daily stack</h3>
            </div>
            <span className="app-status-pill text-xs" style={{ color: 'var(--ok)' }}>
              {takenCount}/{totalActive}
            </span>
          </div>
          <div className="app-progress-track">
            <div
              className="transition-all duration-500 ease-out"
              style={{ width: `${progress}%`, background: 'var(--ok)' }}
            />
          </div>
        </ListCard>
      )}

      {/* Add Form */}
      {showForm && (
        <form onSubmit={handleAdd} className="card mb-6 space-y-4 p-6">
          <div>
            <label className={labelClass}>SUPPLEMENT NAME</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g., Vitamin D"
              className={fieldClass}
              required
            />
            {/* Quick picks */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {COMMON_SUPPLEMENTS.filter(s => !supplements.some(ex => ex.name === s)).slice(0, 10).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, name: s }))}
                  className="chip text-xs"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className={labelClass}>DOSAGE</label>
              <input
                type="text"
                value={form.dosage}
                onChange={(e) => setForm(f => ({ ...f, dosage: e.target.value }))}
                placeholder="e.g., 1000 IU"
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>FREQUENCY</label>
              <div className="relative">
                <select
                  value={form.frequency}
                  onChange={(e) => setForm(f => ({ ...f, frequency: e.target.value }))}
                  className={`${fieldClass} appearance-none`}
                >
                  {SUPPLEMENT_FREQUENCIES.map(f => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-[var(--fg-3)]" />
              </div>
            </div>
            <div>
              <label className={labelClass}>TIME</label>
              <div className="relative">
                <select
                  value={form.time_of_day}
                  onChange={(e) => setForm(f => ({ ...f, time_of_day: e.target.value }))}
                  className={`${fieldClass} appearance-none`}
                >
                  {SUPPLEMENT_TIMES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-[var(--fg-3)]" />
              </div>
            </div>
          </div>

          <div>
            <label className={labelClass}>NOTES</label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="e.g., Take with food"
              className={fieldClass}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="btn btn-accent w-full disabled:opacity-50"
          >
            {saving ? 'Adding...' : 'Add supplement'}
          </button>
        </form>
      )}

      {/* Supplement List */}
      {loading ? (
        <ListCard eyebrow="LOADING" title="Pulling your supplement stack.">
          <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--ink-2)]">
            <div
              className="h-full w-1/3 animate-pulse rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </ListCard>
      ) : supplements.length === 0 ? (
        <EmptyStateCard
          icon={<Pill className="h-7 w-7" />}
          title="No supplements yet."
          body="Add your stack to track the routine from here."
          action={
            <button
              onClick={() => setShowForm(true)}
              className="btn btn-accent"
            >
              <Plus className="h-4 w-4" />
              Add your first supplement
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {supplements.map(sup => {
            const isTaken = todayLogs.some(l => l.supplement_id === sup.id)

            return (
              <div
                key={sup.id}
                className="card-flat overflow-hidden transition hover:border-[var(--line-strong)]"
                style={isTaken ? { borderColor: 'rgba(26, 163, 122, 0.42)', background: 'rgba(26, 163, 122, 0.08)' } : undefined}
              >
                <div className="flex items-center p-4">
                  <button
                    onClick={() => toggleLog(sup)}
                    className="mr-4 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors"
                    style={{
                      borderColor: isTaken ? 'var(--ok)' : 'var(--line-2)',
                      background: isTaken ? 'var(--ok)' : 'transparent',
                      color: isTaken ? '#131012' : 'var(--fg-3)',
                    }}
                  >
                    {isTaken && <Check className="h-4 w-4" />}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-[var(--fg)]">
                        {sup.name}
                      </h3>
                      {sup.dosage && (
                        <span className="app-status-pill text-xs">
                          {sup.dosage}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[var(--fg-3)]">
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
                    className="btn btn-ghost ml-2 flex-shrink-0 p-2 text-[var(--fg-3)] hover:text-[var(--brand-400)]"
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
