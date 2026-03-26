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
      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 shadow-sm border border-gray-200 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-1/3 mb-3" />
        <div className="grid grid-cols-3 gap-3">
          <div className="h-16 bg-gray-100 rounded-lg" />
          <div className="h-16 bg-gray-100 rounded-lg" />
          <div className="h-16 bg-gray-100 rounded-lg" />
        </div>
      </div>
    )
  }

  const best = Math.max(streaks.meals, streaks.water, streaks.workouts)

  const items = [
    { label: 'Meals', value: streaks.meals, icon: Utensils, color: 'orange' },
    { label: 'Water', value: streaks.water, icon: Droplets, color: 'cyan' },
    { label: 'Workouts', value: streaks.workouts, icon: Dumbbell, color: 'purple' },
  ]

  const colorMap: Record<string, { bg: string; text: string; icon: string; ring: string }> = {
    orange: { bg: 'bg-orange-50', text: 'text-orange-700', icon: 'text-orange-500', ring: 'ring-orange-200' },
    cyan: { bg: 'bg-cyan-50', text: 'text-cyan-700', icon: 'text-cyan-500', ring: 'ring-cyan-200' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-700', icon: 'text-purple-500', ring: 'ring-purple-200' },
  }

  return (
    <div className="bg-gradient-to-br from-white to-amber-50/30 rounded-xl p-5 shadow-sm border border-amber-100/60 hover:shadow-md transition-all duration-200">
      <div className="flex items-center gap-2 mb-4">
        <div className="bg-gradient-to-br from-amber-100 to-orange-100 rounded-full p-2">
          <Flame className={`h-5 w-5 ${best >= 7 ? 'text-orange-600' : best >= 3 ? 'text-amber-500' : 'text-gray-400'}`} />
        </div>
        <h3 className="font-semibold text-gray-900 text-sm">Streaks</h3>
        {best >= 7 && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium ml-auto">On fire!</span>}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {items.map(({ label, value, icon: Icon, color }) => {
          const c = colorMap[color]
          return (
            <div
              key={label}
              className={`${c.bg} rounded-lg p-3 text-center ring-1 ${c.ring}`}
            >
              <Icon className={`h-4 w-4 ${c.icon} mx-auto mb-1`} />
              <p className={`text-xl font-bold ${c.text}`}>{value}</p>
              <p className="text-xs text-gray-500">{value === 1 ? 'day' : 'days'}</p>
              <p className="text-xs text-gray-400 mt-0.5">{label}</p>
            </div>
          )
        })}
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
