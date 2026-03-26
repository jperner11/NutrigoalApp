'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Dumbbell, Play, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

interface TodayTrainingPreviewProps {
  userId: string
}

interface ExercisePreview {
  name: string
  sets: number
  reps: string
  body_part: string
}

interface DayPreview {
  dayId: string
  dayName: string
  dayNumber: number
  exercises: ExercisePreview[]
  isCompleted: boolean
}

export default function TodayTrainingPreview({ userId }: TodayTrainingPreviewProps) {
  const [day, setDay] = useState<DayPreview | null>(null)
  const [loading, setLoading] = useState(true)
  const [noPlan, setNoPlan] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      // Get active training plan
      const { data: plans } = await supabase
        .from('training_plans')
        .select('id, days_per_week')
        .eq('user_id', userId)
        .eq('is_active', true)
        .limit(1)

      if (!plans || plans.length === 0) {
        setNoPlan(true)
        setLoading(false)
        return
      }

      const plan = plans[0]

      // Get all days for this plan
      const { data: days } = await supabase
        .from('training_plan_days')
        .select('id, day_number, name')
        .eq('training_plan_id', plan.id)
        .order('day_number')

      if (!days || days.length === 0) {
        setNoPlan(true)
        setLoading(false)
        return
      }

      // Determine which day to show: use day of week mapped to plan days
      // Simple approach: use (dayOfWeek % daysPerWeek) to cycle through plan days
      const dayOfWeek = new Date().getDay() // 0=Sun, 1=Mon...
      // Map Mon=0, Tue=1... Sun=6 for training
      const trainingDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      const todayPlanDay = days[trainingDayIndex % days.length]

      // Check if today's workout is already completed
      const today = new Date().toISOString().split('T')[0]
      const { count: completedCount } = await supabase
        .from('workout_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('date', today)
        .eq('plan_day_id', todayPlanDay.id)

      // Get exercises for this day
      const { data: planExercises } = await supabase
        .from('training_plan_exercises')
        .select('sets, reps, exercise_id, order_index')
        .eq('plan_day_id', todayPlanDay.id)
        .order('order_index')

      if (!planExercises || planExercises.length === 0) {
        setNoPlan(true)
        setLoading(false)
        return
      }

      // Get exercise details
      const exerciseIds = planExercises.map(e => e.exercise_id)
      const { data: exercises } = await supabase
        .from('exercises')
        .select('id, name, body_part')
        .in('id', exerciseIds)

      const exerciseMap = new Map(exercises?.map(e => [e.id, e]) ?? [])

      const exercisePreviews: ExercisePreview[] = planExercises.map(pe => {
        const ex = exerciseMap.get(pe.exercise_id)
        return {
          name: ex?.name ?? 'Unknown',
          sets: pe.sets,
          reps: pe.reps,
          body_part: ex?.body_part ?? '',
        }
      })

      setDay({
        dayId: todayPlanDay.id,
        dayName: todayPlanDay.name,
        dayNumber: todayPlanDay.day_number,
        exercises: exercisePreviews,
        isCompleted: (completedCount ?? 0) > 0,
      })
      setLoading(false)
    }

    load()
  }, [userId])

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-1/3 mb-3" />
        <div className="space-y-2">
          <div className="h-10 bg-gray-100 rounded" />
          <div className="h-10 bg-gray-100 rounded" />
          <div className="h-10 bg-gray-100 rounded" />
        </div>
      </div>
    )
  }

  if (noPlan || !day) return null

  return (
    <div className="bg-gradient-to-br from-white to-violet-50/40 rounded-xl p-5 shadow-sm border border-violet-100/60 hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-br from-violet-100 to-purple-100 rounded-full p-2">
            <Dumbbell className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">Today&apos;s Workout</h3>
            <p className="text-xs text-gray-500">{day.dayName}</p>
          </div>
        </div>
        {day.isCompleted ? (
          <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">
            <CheckCircle2 className="h-3 w-3" />
            Done
          </span>
        ) : (
          <Link
            href={`/training/session/${day.dayId}`}
            className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:shadow-lg transition-all"
          >
            <Play className="h-3 w-3" />
            Start
          </Link>
        )}
      </div>

      <div className="space-y-2">
        {day.exercises.slice(0, 6).map((ex, i) => (
          <div
            key={i}
            className={`flex items-center justify-between py-2 px-3 rounded-lg text-sm ${
              day.isCompleted ? 'bg-green-50/50' : 'bg-gray-50/80'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs text-gray-400 w-4 text-right flex-shrink-0">{i + 1}</span>
              <span className={`font-medium truncate ${day.isCompleted ? 'text-green-800' : 'text-gray-900'}`}>
                {ex.name}
              </span>
            </div>
            <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
              {ex.sets} x {ex.reps}
            </span>
          </div>
        ))}
        {day.exercises.length > 6 && (
          <p className="text-xs text-gray-400 text-center">+{day.exercises.length - 6} more exercises</p>
        )}
      </div>
    </div>
  )
}
