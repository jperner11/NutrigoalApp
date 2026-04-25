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
      <div className="card animate-pulse" style={{ padding: 18 }}>
        <div className="mb-3 h-5 w-1/3 rounded" style={{ background: 'var(--line)' }} />
        <div className="col gap-2">
          <div className="h-10 rounded" style={{ background: 'var(--line)' }} />
          <div className="h-10 rounded" style={{ background: 'var(--line)' }} />
          <div className="h-10 rounded" style={{ background: 'var(--line)' }} />
        </div>
      </div>
    )
  }

  if (noPlan || !day) return null

  return (
    <div className="card" style={{ padding: 18 }}>
      <div className="row mb-4 justify-between">
        <div>
          <div
            className="mono"
            style={{
              fontSize: 10,
              color: 'var(--fg-4)',
              letterSpacing: '0.14em',
            }}
          >
            <Dumbbell className="mr-1.5 inline h-3 w-3" />
            NEXT UP · TODAY
          </div>
          <div className="serif mt-1" style={{ fontSize: 18 }}>
            {day.dayName}
          </div>
        </div>
        {day.isCompleted ? (
          <span className="chip" style={{ color: 'var(--ok)' }}>
            <CheckCircle2 className="h-3 w-3" />
            Done
          </span>
        ) : (
          <Link
            href={`/training/session/${day.dayId}`}
            className="btn btn-accent"
            style={{ padding: '6px 12px', fontSize: 12 }}
          >
            <Play className="h-3 w-3" />
            Start
          </Link>
        )}
      </div>

      <div className="col">
        {day.exercises.slice(0, 6).map((ex, i) => (
          <div
            key={i}
            className="row justify-between"
            style={{
              padding: '10px 0',
              borderBottom:
                i < Math.min(day.exercises.length, 6) - 1
                  ? '1px solid var(--line)'
                  : 'none',
              fontSize: 13,
            }}
          >
            <div className="row min-w-0 gap-2">
              <span
                className="mono w-4 shrink-0 text-right"
                style={{ fontSize: 10, color: 'var(--fg-4)' }}
              >
                {i + 1}
              </span>
              <span
                className="truncate"
                style={{
                  color: day.isCompleted ? 'var(--fg-3)' : 'var(--fg)',
                  textDecoration: day.isCompleted ? 'line-through' : 'none',
                }}
              >
                {ex.name}
              </span>
            </div>
            <span
              className="mono ml-2 shrink-0"
              style={{ fontSize: 10, color: 'var(--fg-3)' }}
            >
              {ex.sets} × {ex.reps}
            </span>
          </div>
        ))}
        {day.exercises.length > 6 && (
          <div
            className="mono mt-2 text-center"
            style={{
              fontSize: 10,
              color: 'var(--fg-4)',
              letterSpacing: '0.1em',
            }}
          >
            +{day.exercises.length - 6} MORE
          </div>
        )}
      </div>
    </div>
  )
}
