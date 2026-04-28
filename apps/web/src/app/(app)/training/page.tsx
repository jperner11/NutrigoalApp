'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import {
  Activity,
  CalendarDays,
  Dumbbell,
  Plus,
  Sparkles,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import type { Exercise, TrainingPlan, TrainingPlanDay, TrainingPlanExercise } from '@/lib/supabase/types'
import ProgressCheckIn from '@/components/training/ProgressCheckIn'
import {
  AppHeroPanel,
  AppSectionHeader,
  EmptyStateCard,
  HeartbeatLine,
  ListCard,
  MetricCard,
  StatusPill,
} from '@/components/ui/AppDesign'
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

function formatPlanDate(date: string | null) {
  if (!date) return 'No sessions yet'
  return `Last ${new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
}

function getRecentPr(workout?: WorkoutPreview) {
  const exercise = workout?.exercises.find((item) => item.sets || item.reps)
  if (!exercise) {
    return {
      title: 'No recent PR yet',
      meta: 'Start logging sessions to surface momentum.',
    }
  }

  return {
    title: exercise.exercises?.name ?? 'Recent lift',
    meta: `${exercise.sets ?? 0} x ${exercise.reps ?? '-'} · active plan`,
  }
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
      <ListCard eyebrow="Loading" title="Preparing your training plans.">
        <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--line)]">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-[var(--acc)]" />
        </div>
      </ListCard>
    )
  }

  const managedClient = isManagedClientRole(profile?.role)
  const activePlan = plans.find(plan => plan.is_active) ?? plans[0]
  const activeWorkouts = activePlan?.workouts ?? []
  const recentPr = getRecentPr(activeWorkouts[0])
  const planProgress = activePlan?.dayCount ? Math.min((activeWorkouts.length || 0) / activePlan.dayCount, 1) : 0
  const totalMinutes = activeWorkouts.reduce((sum, workout) => sum + estimateDurationMinutes(workout.exercises), 0)

  return (
    <div>
      <AppHeroPanel
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <Dumbbell className="h-3.5 w-3.5" />
            N° 03 · Strength & cardio
          </span>
        }
        title="Training,"
        accent="kept honest."
        subtitle="Build, follow, and adjust your weekly routine with less noise and clearer momentum."
        actions={
          <>
            <Link href="/training" className="btn btn-ghost">
              <CalendarDays className="h-4 w-4" />
              Schedule
            </Link>
            {!managedClient ? (
              <Link href="/training/new" className="btn btn-accent">
                <Plus className="h-4 w-4" />
                New plan
              </Link>
            ) : null}
          </>
        }
      />

      {profile && (
        <div className="mt-6">
          <ProgressCheckIn
            userId={profile.id}
            onPlanRegenerate={() => router.push('/generate-plans')}
          />
        </div>
      )}

      {plans.length === 0 ? (
        <div className="mt-8">
          <EmptyStateCard
            icon={<Dumbbell className="h-6 w-6" />}
            title="Ready to build your first workout?"
            body={
              managedClient
                ? 'Your trainer has not assigned a training plan yet. It will show up here as soon as your programme is ready.'
                : 'Create a training plan to organize your exercises, track progress, and keep your weekly structure visible.'
            }
            action={!managedClient ? (
              <Link href="/training/new" className="btn btn-accent">
                <Sparkles className="h-4 w-4" />
                Create first plan
              </Link>
            ) : null}
          />
        </div>
      ) : activePlan ? (
        <>
          <div className="mt-8 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
            <MetricCard
              label="This week · volume"
              value={`${activeWorkouts.length || activePlan.dayCount}`}
              unit={`/ ${activePlan.dayCount || activeWorkouts.length || 0}`}
              icon={<Activity className="h-4 w-4" />}
              progress={planProgress}
              footer={`${activePlan.dayCount || activeWorkouts.length || 0} sessions structured · ${totalMinutes || 0} min under tension`}
              tone="accent"
            />

            <ListCard
              eyebrow="Recent PR"
              title={<>{recentPr.title} <span className="text-[var(--acc)]">+</span></>}
              meta={recentPr.meta}
            >
              <HeartbeatLine />
            </ListCard>
          </div>

          <ListCard
            className="mt-6"
            eyebrow="Active program · week 3 of 8"
            title={
              <>
                {activePlan.name}{' '}
                <span className="italic-serif text-[var(--fg-3)]">Hybrid Cut.</span>
              </>
            }
            meta={`${activeWorkouts.length} of ${activePlan.dayCount || activeWorkouts.length} sessions available · ${totalMinutes || 0} min under tension · ${formatPlanDate(activePlan.lastWorkout)}`}
            action={
              <Link href={`/training/${activePlan.id}`} className="btn btn-ghost">
                Open plan -&gt;
              </Link>
            }
          >
            <div className="app-progress-track">
              <div style={{ width: `${Math.max(8, planProgress * 100)}%` }} />
            </div>
          </ListCard>

          <div className="grid gap-6 xl:grid-cols-[1.45fr_0.9fr]">
            <section>
              <AppSectionHeader
                index={4}
                eyebrow="Today's work"
                title="Sessions,"
                accent="on deck."
                summary={`${activeWorkouts.length} sessions in this plan`}
              />

              <div className="grid gap-5">
                {activeWorkouts.length === 0 ? (
                  <EmptyStateCard
                    title="No workout days yet."
                    body="Open this plan to add training days and exercises."
                    action={<Link href={`/training/${activePlan.id}`} className="btn btn-ghost">Open plan</Link>}
                  />
                ) : (
                  activeWorkouts.map((workout, workoutIndex) => (
                    <ListCard
                      key={workout.id}
                      tone={workoutIndex === 0 ? 'accent' : 'default'}
                      eyebrow={`${workout.name} · day ${workout.day_number}`}
                      title={workoutIndex === 0 ? 'Heavy push, controlled tempo.' : workout.name}
                      action={
                        <StatusPill>
                          {estimateDurationMinutes(workout.exercises)} min
                        </StatusPill>
                      }
                    >
                      <div className="divide-y divide-[var(--line)]">
                        {workout.exercises.length === 0 ? (
                          <p className="py-4 text-sm text-[var(--fg-3)]">No exercises added to this workout yet.</p>
                        ) : (
                          workout.exercises.slice(0, 7).map((exercise) => (
                            <div key={exercise.id} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-5 py-4">
                              <div className="flex min-w-0 items-center gap-4">
                                <span className="h-7 w-7 shrink-0 rounded-full border border-[var(--line-strong)]" />
                                <span className="truncate text-[var(--foreground)]">
                                  {exercise.exercises?.name ?? 'Exercise'}
                                </span>
                              </div>
                              <span className="mono text-xs text-[var(--fg-3)]">
                                {exercise.sets} × {exercise.reps}
                              </span>
                              <span className="mono text-xs text-[var(--fg-4)]">
                                {effortLabel(exercise)}
                              </span>
                            </div>
                          ))
                        )}
                      </div>

                      {workout.exercises.length > 7 ? (
                        <div className="mono mt-4 text-xs text-[var(--fg-4)]">
                          +{workout.exercises.length - 7} more exercise
                          {workout.exercises.length - 7 === 1 ? '' : 's'}
                        </div>
                      ) : null}

                      <Link href={`/training/session/${workout.id}`} className="btn btn-accent mt-6">
                        <Zap className="h-4 w-4" />
                        Start session
                      </Link>
                    </ListCard>
                  ))
                )}
              </div>
            </section>

            <aside>
              <AppSectionHeader
                index={5}
                eyebrow="Plan library"
                title="Choose"
                accent="structure."
              />
              <div className="grid gap-4">
                {plans.map(plan => {
                  const selected = plan.id === activePlan.id
                  return (
                    <Link
                      key={plan.id}
                      href={`/training/${plan.id}`}
                      className={`app-list-card block transition hover:border-[var(--line-2)] ${selected ? 'is-accent' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="app-mono-label">
                            {plan.dayCount || 0} days / week
                          </div>
                          <h3>{plan.name}</h3>
                        </div>
                        {plan.is_active ? <StatusPill tone="accent">Active</StatusPill> : null}
                      </div>
                      {plan.description ? (
                        <p className="mt-4 line-clamp-3 text-sm">{plan.description}</p>
                      ) : (
                        <p className="mt-4 text-sm">No description yet.</p>
                      )}
                    </Link>
                  )
                })}
              </div>
            </aside>
          </div>
        </>
      ) : null}
    </div>
  )
}
