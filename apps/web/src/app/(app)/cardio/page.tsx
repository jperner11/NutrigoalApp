'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { calculateCardioCalories } from '@/lib/cardio'
import { HeartPulse, Lock } from 'lucide-react'
import Link from 'next/link'
import { isFeatureLocked } from '@/lib/tierUtils'
import { toast } from 'react-hot-toast'
import type { CardioSession, CardioType } from '@/lib/supabase/types'
import { AppHeroPanel, AppSectionHeader, EmptyStateCard, ListCard } from '@/components/ui/AppDesign'

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

function formatSessionDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

export default function CardioPage() {
  const { profile } = useUser()
  const [sessions, setSessions] = useState<(CardioSession & { cardio_type?: CardioType })[]>([])
  const [cardioTypes, setCardioTypes] = useState<CardioType[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
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

    setSubmitting(true)
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
      setSubmitting(false)
      return
    }

    toast.success(`Logged ${formData.duration_minutes} min of ${selectedType.name} — ${caloriesBurned} cal burned.`)

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

    setFormData(prev => ({
      ...prev,
      avg_bpm: '',
      date: new Date().toISOString().split('T')[0],
    }))
    setSubmitting(false)
  }

  if (loading) {
    return (
      <ListCard eyebrow="Loading" title="Pulling your cardio sessions.">
        <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--line)]">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-[var(--acc)]" />
        </div>
      </ListCard>
    )
  }

  if (isFeatureLocked(profile?.role ?? 'free', 'cardio')) {
    return (
      <div className="mx-auto max-w-[520px]">
        <AppHeroPanel
          eyebrow="N° 04 · Movement"
          title="Cardio,"
          accent="measured."
          subtitle="Track sessions, monitor heart rate, and estimate calories burned."
        />
        <div className="card p-10 text-center">
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ background: 'var(--ink-3)', color: 'var(--acc)' }}
          >
            <Lock className="h-6 w-6" />
          </div>
          <div className="serif" style={{ fontSize: 26 }}>
            Cardio tracking{' '}
            <span className="italic-serif" style={{ color: 'var(--fg-3)' }}>
              is on Pro.
            </span>
          </div>
          <p
            className="mx-auto mt-3 max-w-[420px]"
            style={{ fontSize: 14, color: 'var(--fg-2)', lineHeight: 1.6 }}
          >
            Track your cardio sessions and monitor heart-rate calories. Available on Pro plan and above.
          </p>
          <Link href="/pricing" className="btn btn-accent mt-6">
            Upgrade to Pro →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1100px]">
      <AppHeroPanel
        eyebrow="N° 04 · Movement"
        title="Cardio,"
        accent="measured."
        subtitle="Track cardiovascular work, heart rate, and energy output with a quiet session log."
      />

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        {/* Sessions list */}
        <section>
          <AppSectionHeader
            index="1"
            eyebrow="recent sessions"
            title="Last"
            accent="20."
            summary={`${sessions.length} logged`}
          />

          {sessions.length === 0 ? (
            <EmptyStateCard
              icon={<HeartPulse className="h-6 w-6" />}
              title="No sessions yet."
              body="Log your first session on the right to start tracking calories burned."
            />
          ) : (
            <div className="col gap-2">
              {sessions.map((session) => (
                <div key={session.id} className="card-2 p-4">
                  <div className="row justify-between gap-4">
                    <div className="min-w-0">
                      <div
                        className="mono"
                        style={{
                          fontSize: 10,
                          color: 'var(--fg-4)',
                          letterSpacing: '0.12em',
                        }}
                      >
                        {formatSessionDate(session.date).toUpperCase()}
                      </div>
                      <div
                        className="serif mt-1 truncate"
                        style={{ fontSize: 18, lineHeight: 1.2 }}
                      >
                        {session.cardio_type?.name ?? 'Cardio'}
                      </div>
                    </div>
                    <div className="row shrink-0 gap-4">
                      <div className="col">
                        <div
                          className="mono"
                          style={{
                            fontSize: 9,
                            color: 'var(--fg-4)',
                            letterSpacing: '0.1em',
                          }}
                        >
                          DURATION
                        </div>
                        <div className="serif mt-0.5" style={{ fontSize: 16 }}>
                          {session.duration_minutes}
                          <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>
                            {' '}
                            min
                          </span>
                        </div>
                      </div>
                      {session.avg_bpm ? (
                        <div className="col">
                          <div
                            className="mono"
                            style={{
                              fontSize: 9,
                              color: 'var(--fg-4)',
                              letterSpacing: '0.1em',
                            }}
                          >
                            BPM
                          </div>
                          <div className="serif mt-0.5" style={{ fontSize: 16 }}>
                            {session.avg_bpm}
                          </div>
                        </div>
                      ) : null}
                      <div className="col">
                        <div
                          className="mono"
                          style={{
                            fontSize: 9,
                            color: 'var(--acc)',
                            letterSpacing: '0.1em',
                          }}
                        >
                          KCAL
                        </div>
                        <div className="serif mt-0.5" style={{ fontSize: 16 }}>
                          {session.calories_burned}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Log form */}
        <aside>
          <form onSubmit={handleSubmit} className="card p-5">
            <div
              className="mono"
              style={{ fontSize: 11, color: 'var(--fg-4)', letterSpacing: '0.14em' }}
            >
              LOG NEW SESSION
            </div>
            <div className="serif mt-1" style={{ fontSize: 22, lineHeight: 1.2 }}>
              What did you{' '}
              <span className="italic-serif" style={{ color: 'var(--fg-3)' }}>
                just do?
              </span>
            </div>

            <div className="col mt-5 gap-3.5">
              <div>
                <label
                  className="mono mb-2 block"
                  style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.12em' }}
                >
                  ACTIVITY
                </label>
                <select
                  value={formData.cardio_type_id}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, cardio_type_id: e.target.value }))
                  }
                  style={inputStyle}
                >
                  {cardioTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  className="mono mb-2 block"
                  style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.12em' }}
                >
                  DATE
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, date: e.target.value }))
                  }
                  style={inputStyle}
                />
              </div>

              <div>
                <label
                  className="mono mb-2 block"
                  style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.12em' }}
                >
                  DURATION (MINUTES)
                </label>
                <input
                  type="number"
                  min={1}
                  value={formData.duration_minutes}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      duration_minutes: parseInt(e.target.value) || 0,
                    }))
                  }
                  style={inputStyle}
                />
              </div>

              <div>
                <label
                  className="mono mb-2 block"
                  style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.12em' }}
                >
                  AVG HEART RATE — OPTIONAL
                </label>
                <input
                  type="number"
                  min={40}
                  max={220}
                  value={formData.avg_bpm}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, avg_bpm: e.target.value }))
                  }
                  placeholder="e.g. 145 bpm"
                  style={inputStyle}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !formData.cardio_type_id}
              className="btn btn-accent mt-5 w-full justify-center disabled:opacity-50"
              style={{ padding: '12px 18px', fontSize: 14 }}
            >
              {submitting ? 'Logging…' : 'Log session →'}
            </button>

            <p
              className="mt-3"
              style={{ fontSize: 11, color: 'var(--fg-4)', lineHeight: 1.5 }}
            >
              Calories burned are estimated from MET value and your profile (weight, age, gender).
            </p>
          </form>
        </aside>
      </div>
    </div>
  )
}
