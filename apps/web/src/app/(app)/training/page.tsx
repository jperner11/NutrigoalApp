'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { Dumbbell, Plus, Sparkles } from 'lucide-react'
import Link from 'next/link'
import type { Exercise, TrainingPlan, TrainingPlanDay, TrainingPlanExercise } from '@/lib/supabase/types'
import ProgressCheckIn from '@/components/training/ProgressCheckIn'
import AppPageHeader from '@/components/ui/AppPageHeader'
import { isManagedClientRole } from '@nutrigoal/shared'

type ExercisePreview = TrainingPlanExercise & { exercises: Exercise | null }

interface WorkoutPreview extends TrainingPlanDay {
  exercises: ExercisePreview[]
}

interface PlanWithMeta extends TrainingPlan {
  dayCount: number
  lastWorkout: string | null
  workouts: WorkoutPreview[]
}

function estimateDurationMinutes(exercises: ExercisePreview[]) {
  const totalSets = exercises.reduce((sum, exercise) => sum + (exercise.sets ?? 0), 0)
  return Math.max(20, Math.round(totalSets * 3.5))
}

function effortLabel(exercise: ExercisePreview) {
  const rpeMatch = exercise.notes?.match(/rpe\s*([0-9.]+)/i)
  if (rpeMatch) return `RPE ${rpeMatch[1]}`
  if (exercise.rest_seconds) return `REST ${exercise.rest_seconds}s`
  return 'RPE -'
}

export default function TrainingPage() {
  const { profile } = useUser()
  const router = useRouter()
  const [plans, setPlans] = useState<PlanWithMeta[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    const supabase = createClient()

    async function loadPlans() {
      const { data: rawPlans } = await supabase
        .from('training_plans')
        .select('*')
        .eq('user_id', profile!.id)
        .order('created_at', { ascending: false })

      if (!rawPlans || rawPlans.length === 0) {
        setPlans([])
        setLoading(false)
        return
      }

      // Get day counts, workout previews, and last workout for each plan
      const enriched = await Promise.all(
        rawPlans.map(async (plan) => {
          const { data: days } = await supabase
            .from('training_plan_days')
            .select('*')
            .eq('training_plan_id', plan.id)
            .order('day_number')

          const workouts = await Promise.all(
            (days ?? []).map(async (day) => {
              const { data: exercises } = await supabase
                .from('training_plan_exercises')
                .select('*, exercises(*)')
                .eq('plan_day_id', day.id)
                .order('order_index')

              return {
                ...day,
                exercises: (exercises ?? []) as ExercisePreview[],
              }
            })
          )

          const { data: lastLog } = await supabase
            .from('workout_logs')
            .select('date, plan_day_id')
            .eq('user_id', profile!.id)
            .not('plan_day_id', 'is', null)
            .order('date', { ascending: false })
            .limit(1)

          // Check if the last log's plan_day belongs to this plan
          let lastWorkout: string | null = null
          if (lastLog && lastLog.length > 0) {
            const { data: dayCheck } = await supabase
              .from('training_plan_days')
              .select('training_plan_id')
              .eq('id', lastLog[0].plan_day_id!)
              .eq('training_plan_id', plan.id)
              .limit(1)

            if (dayCheck && dayCheck.length > 0) {
              lastWorkout = lastLog[0].date
            }
          }

          return {
            ...plan,
            dayCount: days?.length ?? 0,
            lastWorkout,
            workouts,
          }
        })
      )

      setPlans(enriched)
      setLoading(false)
    }

    loadPlans()
  }, [profile])

  if (loading) {
    return (
      <div className="card p-8">
        <div className="mono" style={{ fontSize: 11, color: 'var(--fg-4)', letterSpacing: '0.14em' }}>
          LOADING
        </div>
        <div className="serif mt-2" style={{ fontSize: 24, color: 'var(--fg)' }}>
          Preparing your training plans.
        </div>
      </div>
    )
  }

  const managedClient = isManagedClientRole(profile?.role)
  const activePlan = plans.find(plan => plan.is_active) ?? plans[0]

  return (
    <div>
      <AppPageHeader
        eyebrow="Strength & cardio"
        title="Training"
        subtitle="Build and manage your workout routines."
        actions={
          !managedClient ? (
            <Link href="/training/new" className="btn btn-accent">
              <Plus className="h-4 w-4" />
              <span>New plan</span>
            </Link>
          ) : null
        }
      />

      {profile && (
        <ProgressCheckIn
          userId={profile.id}
          onPlanRegenerate={() => router.push('/generate-plans')}
        />
      )}

      {plans.length === 0 ? (
        <div className="card p-8 text-center sm:p-12">
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ background: 'var(--ink-3)', color: 'var(--acc)' }}
          >
            <Dumbbell className="h-6 w-6" />
          </div>
          <h3 className="serif" style={{ fontSize: 28, color: 'var(--fg)' }}>
            Ready to build your first workout?
          </h3>
          <p
            className="mx-auto mt-2 max-w-[520px]"
            style={{ fontSize: 14, color: 'var(--fg-2)', lineHeight: 1.6 }}
          >
            {managedClient
              ? 'Your trainer has not assigned a training plan yet. It will show up here as soon as your programme is ready.'
              : 'Create a training plan to organize your exercises, track progress, and crush your fitness goals.'}
          </p>
          {!managedClient && (
            <Link href="/training/new" className="btn btn-accent mt-6">
              <Sparkles className="h-4 w-4" />
              <span>Create first plan</span>
            </Link>
          )}
        </div>
      ) : activePlan ? (
        <div className="grid gap-5 lg:grid-cols-[1.6fr_0.85fr]">
          <section>
            <div className="row mb-3 flex-wrap justify-between gap-3">
              <div>
                <div
                  className="mono"
                  style={{ fontSize: 10, color: 'var(--fg-4)', letterSpacing: '0.12em' }}
                >
                  ACTIVE PROGRAM
                </div>
                <div className="serif mt-1" style={{ fontSize: 24, lineHeight: 1.15 }}>
                  {activePlan.name}{' '}
                  <span className="italic-serif" style={{ color: 'var(--fg-3)' }}>
                    this week.
                  </span>
                </div>
              </div>
              <Link
                href={`/training/${activePlan.id}`}
                className="mono"
                style={{ fontSize: 10, color: 'var(--acc)', letterSpacing: '0.1em' }}
              >
                OPEN PLAN -&gt;
              </Link>
            </div>

            <div className="col gap-4">
              {activePlan.workouts.length === 0 ? (
                <div className="card-2 p-5">
                  <div className="serif" style={{ fontSize: 20, color: 'var(--fg)' }}>
                    No workout days yet.
                  </div>
                  <p className="mt-2" style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.6 }}>
                    Open this plan to add training days and exercises.
                  </p>
                </div>
              ) : (
                activePlan.workouts.map(workout => (
                  <div key={workout.id} className="card-2 p-5">
                    <div className="row justify-between gap-4">
                      <div
                        className="mono"
                        style={{ fontSize: 11, color: 'var(--acc)', letterSpacing: '0.14em' }}
                      >
                        {workout.name.toUpperCase()} · DAY {workout.day_number}
                      </div>
                      <span className="chip">
                        {estimateDurationMinutes(workout.exercises)} min
                      </span>
                    </div>

                    <div className="mt-3">
                      {workout.exercises.length === 0 ? (
                        <p style={{ fontSize: 13, color: 'var(--fg-3)', lineHeight: 1.6 }}>
                          No exercises added to this workout yet.
                        </p>
                      ) : (
                        workout.exercises.slice(0, 6).map((exercise, index) => (
                          <div
                            key={exercise.id}
                            className="row justify-between gap-4"
                            style={{
                              padding: '12px 0',
                              borderBottom:
                                index < Math.min(workout.exercises.length, 6) - 1
                                  ? '1px solid var(--line)'
                                  : 'none',
                            }}
                          >
                            <span style={{ fontSize: 14, color: 'var(--fg)' }}>
                              {exercise.exercises?.name ?? 'Exercise'}
                            </span>
                            <div className="row shrink-0 gap-16">
                              <span className="mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>
                                {exercise.sets} × {exercise.reps}
                              </span>
                              <span className="mono" style={{ fontSize: 11, color: 'var(--fg-4)' }}>
                                {effortLabel(exercise)}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                      {workout.exercises.length > 6 && (
                        <div
                          className="mono mt-3 text-center"
                          style={{ fontSize: 10, color: 'var(--fg-4)', letterSpacing: '0.1em' }}
                        >
                          +{workout.exercises.length - 6} MORE
                        </div>
                      )}
                    </div>

                    <Link href={`/training/session/${workout.id}`} className="btn btn-accent mt-4">
                      Start session -&gt;
                    </Link>
                  </div>
                ))
              )}
            </div>
          </section>

          <aside className="col gap-4">
            <div className="card p-5">
              <div
                className="mono"
                style={{ fontSize: 10, color: 'var(--fg-4)', letterSpacing: '0.12em' }}
              >
                PLAN LIBRARY
              </div>
              <div className="col mt-4 gap-2">
                {plans.map(plan => (
                  <Link key={plan.id} href={`/training/${plan.id}`} className="card-2 p-3">
                    <div className="row justify-between gap-3">
                      <div className="min-w-0">
                        <div className="serif truncate" style={{ fontSize: 15, color: 'var(--fg)' }}>
                          {plan.name}
                        </div>
                        <div
                          className="mono mt-1"
                          style={{ fontSize: 10, color: 'var(--fg-4)', letterSpacing: '0.08em' }}
                        >
                          {plan.dayCount} DAYS
                          {plan.lastWorkout ? ` · LAST ${new Date(plan.lastWorkout).toLocaleDateString()}` : ''}
                        </div>
                      </div>
                      <div className="row shrink-0 gap-1">
                        {plan.created_by !== profile?.id && <span className="chip">FROM PT</span>}
                        {plan.is_active && <span className="chip" style={{ color: 'var(--acc)' }}>ACTIVE</span>}
                      </div>
                    </div>
                    {plan.description && (
                      <p className="mt-2 line-clamp-2" style={{ fontSize: 12, color: 'var(--fg-3)', lineHeight: 1.5 }}>
                        {plan.description}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  )
}
