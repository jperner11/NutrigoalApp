'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Flame, Utensils, Droplets, Dumbbell } from 'lucide-react'

interface StreaksWidgetProps {
  userId: string
}

interface StreakData {
  meals: number
  water: number
  workouts: number
}

export default function StreaksWidget({ userId }: StreaksWidgetProps) {
  const [streaks, setStreaks] = useState<StreakData>({ meals: 0, water: 0, workouts: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function calcStreaks() {
      const supabase = createClient()
      const today = new Date()

      // Get last 90 days of data to calculate streaks
      const ninetyDaysAgo = new Date(today)
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
      const startStr = ninetyDaysAgo.toISOString().split('T')[0]

      const [mealRes, waterRes, workoutRes] = await Promise.all([
        supabase
          .from('meal_logs')
          .select('date')
          .eq('user_id', userId)
          .gte('date', startStr)
          .order('date', { ascending: false }),
        supabase
          .from('water_logs')
          .select('date')
          .eq('user_id', userId)
          .gte('date', startStr)
          .order('date', { ascending: false }),
        supabase
          .from('workout_logs')
          .select('date')
          .eq('user_id', userId)
          .gte('date', startStr)
          .order('date', { ascending: false }),
      ])

      setStreaks({
        meals: calcStreak(mealRes.data?.map(d => d.date) ?? []),
        water: calcStreak(waterRes.data?.map(d => d.date) ?? []),
        workouts: calcStreak(workoutRes.data?.map(d => d.date) ?? []),
      })
      setLoading(false)
    }

    calcStreaks()
  }, [userId])

  if (loading) {
    return (
      <div className="card animate-pulse" style={{ padding: 18 }}>
        <div className="mb-3 h-5 w-1/3 rounded" style={{ background: 'var(--line)' }} />
        <div className="grid grid-cols-3 gap-3">
          <div className="h-16 rounded-lg" style={{ background: 'var(--line)' }} />
          <div className="h-16 rounded-lg" style={{ background: 'var(--line)' }} />
          <div className="h-16 rounded-lg" style={{ background: 'var(--line)' }} />
        </div>
      </div>
    )
  }

  const best = Math.max(streaks.meals, streaks.water, streaks.workouts)

  const items = [
    { label: 'Meals', value: streaks.meals, icon: Utensils },
    { label: 'Water', value: streaks.water, icon: Droplets },
    { label: 'Workouts', value: streaks.workouts, icon: Dumbbell },
  ]

  return (
    <div className="card" style={{ padding: 18 }}>
      <div className="row mb-4 justify-between">
        <div className="row gap-2">
          <Flame
            className="h-4 w-4"
            style={{ color: best >= 7 ? 'var(--acc)' : 'var(--fg-3)' }}
          />
          <div
            className="mono"
            style={{
              fontSize: 10,
              color: 'var(--fg-4)',
              letterSpacing: '0.14em',
            }}
          >
            STREAKS
          </div>
        </div>
        {best >= 7 ? (
          <span className="chip" style={{ color: 'var(--acc)' }}>
            ● On fire
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {items.map(({ label, value, icon: Icon }) => (
          <div key={label} className="card-2" style={{ padding: 12 }}>
            <Icon
              className="mb-1.5 h-4 w-4"
              style={{ color: 'var(--fg-3)' }}
            />
            <div className="serif" style={{ fontSize: 22, lineHeight: 1 }}>
              {value}
            </div>
            <div
              className="mono mt-1"
              style={{
                fontSize: 9,
                color: 'var(--fg-4)',
                letterSpacing: '0.1em',
              }}
            >
              {label.toUpperCase()} · {value === 1 ? 'DAY' : 'DAYS'}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function calcStreak(dates: string[]): number {
  if (dates.length === 0) return 0

  const uniqueDates = [...new Set(dates)].sort().reverse()
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  // Streak must include today or yesterday
  if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) return 0

  let streak = 1
  for (let i = 1; i < uniqueDates.length; i++) {
    const curr = new Date(uniqueDates[i - 1])
    const prev = new Date(uniqueDates[i])
    const diffDays = (curr.getTime() - prev.getTime()) / 86400000

    if (diffDays === 1) {
      streak++
    } else {
      break
    }
  }

  return streak
}
