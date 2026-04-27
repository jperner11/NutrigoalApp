'use client'

import { useState, useEffect, useMemo } from 'react'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import {
  Droplets,
  Dumbbell,
  HeartPulse,
  Utensils,
  Users,
  Sparkles,
  Crown,
  Plus,
  RefreshCw,
  Target,
  TrendingUp,
  Beef,
  Wheat,
  EggFried,
  Scale,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import MealPlanTracker from '@/components/dashboard/MealPlanTracker'
import { canAccess } from '@/lib/tierUtils'
import StreaksWidget from '@/components/dashboard/StreaksWidget'
import TodayTrainingPreview from '@/components/dashboard/TodayTrainingPreview'
import QuickWeightLog from '@/components/dashboard/QuickWeightLog'
import SupplementWidget from '@/components/dashboard/SupplementWidget'
import TrainerDashboard from '@/components/dashboard/TrainerDashboard'
import AppPageHeader from '@/components/ui/AppPageHeader'
import StatTile from '@/components/ui/StatTile'
import AINudgeCard from '@/components/ui/AINudgeCard'
import { isManagedClientRole, isTrainerRole } from '@nutrigoal/shared'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function DashboardPage() {
  const { profile } = useUser()
  const [todayStats, setTodayStats] = useState({
    caloriesConsumed: 0,
    proteinConsumed: 0,
    carbsConsumed: 0,
    fatConsumed: 0,
    waterConsumed: 0,
    workoutsCompleted: 0,
    cardioMinutes: 0,
  })
  const [clientCount, setClientCount] = useState(0)
  const [pendingInviteCount, setPendingInviteCount] = useState(0)
  const [trainerInfo, setTrainerInfo] = useState<{ id: string; full_name: string | null; email: string } | null>(null)
  const [managedClientPlanState, setManagedClientPlanState] = useState({ hasDietPlan: false, hasTrainingPlan: false })
  const [weeklyStats, setWeeklyStats] = useState({
    avgGoalPct: null as number | null,
    workoutsThisWeek: 0,
    avgWaterMl: null as number | null,
  })
  const [weightData, setWeightData] = useState({
    current: null as number | null,
    previous: null as number | null,
    trend: 'stable' as 'up' | 'down' | 'stable',
  })

  const greeting = useMemo(() => getGreeting(), [])

  async function addWater(amount: number) {
    if (!profile) return
    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]

    const { error } = await supabase.from('water_logs').insert({
      user_id: profile.id,
      date: today,
      amount_ml: amount,
    })

    if (error) {
      toast.error('Failed to log water')
      return
    }

    setTodayStats(prev => ({ ...prev, waterConsumed: prev.waterConsumed + amount }))
    toast.success(`+${amount}ml logged`)
  }

  useEffect(() => {
    if (!profile) return

    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]

    async function loadTodayStats() {
      // Load meal logs for today
      const { data: mealLogs } = await supabase
        .from('meal_logs')
        .select('total_calories, total_protein, total_carbs, total_fat')
        .eq('user_id', profile!.id)
        .eq('date', today)

      const caloriesConsumed = mealLogs?.reduce((sum, log) => sum + log.total_calories, 0) ?? 0
      const proteinConsumed = mealLogs?.reduce((sum, log) => sum + (log.total_protein ?? 0), 0) ?? 0
      const carbsConsumed = mealLogs?.reduce((sum, log) => sum + (log.total_carbs ?? 0), 0) ?? 0
      const fatConsumed = mealLogs?.reduce((sum, log) => sum + (log.total_fat ?? 0), 0) ?? 0

      // Load water logs for today
      const { data: waterLogs } = await supabase
        .from('water_logs')
        .select('amount_ml')
        .eq('user_id', profile!.id)
        .eq('date', today)

      const waterConsumed = waterLogs?.reduce((sum, log) => sum + log.amount_ml, 0) ?? 0

      // Load workout logs for today
      const { count: workoutCount } = await supabase
        .from('workout_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile!.id)
        .eq('date', today)

      // Load cardio sessions for today
      const { data: cardioSessions } = await supabase
        .from('cardio_sessions')
        .select('duration_minutes')
        .eq('user_id', profile!.id)
        .eq('date', today)
        .eq('is_completed', true)

      const cardioMinutes = cardioSessions?.reduce((sum, s) => sum + s.duration_minutes, 0) ?? 0

      setTodayStats({
        caloriesConsumed,
        proteinConsumed,
        carbsConsumed,
        fatConsumed,
        waterConsumed,
        workoutsCompleted: workoutCount ?? 0,
        cardioMinutes,
      })

      // Weekly progress stats
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()) // Sunday
      const weekStartStr = weekStart.toISOString().split('T')[0]

      // Avg daily calorie goal % over past 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
      const { data: weekMealLogs } = await supabase
        .from('meal_logs')
        .select('date, total_calories')
        .eq('user_id', profile!.id)
        .gte('date', sevenDaysAgo)

      let avgGoalPct: number | null = null
      if (weekMealLogs && weekMealLogs.length > 0 && profile!.daily_calories) {
        const dailyTotals = new Map<string, number>()
        weekMealLogs.forEach(l => {
          dailyTotals.set(l.date, (dailyTotals.get(l.date) ?? 0) + l.total_calories)
        })
        const pcts = Array.from(dailyTotals.values()).map(c => (c / profile!.daily_calories!) * 100)
        avgGoalPct = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length)
      }

      // Workouts this week
      const { count: weekWorkoutCount } = await supabase
        .from('workout_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile!.id)
        .gte('date', weekStartStr)

      // Avg water this week
      const { data: weekWaterLogs } = await supabase
        .from('water_logs')
        .select('date, amount_ml')
        .eq('user_id', profile!.id)
        .gte('date', sevenDaysAgo)

      let avgWaterMl: number | null = null
      if (weekWaterLogs && weekWaterLogs.length > 0) {
        const dailyWater = new Map<string, number>()
        weekWaterLogs.forEach(l => {
          dailyWater.set(l.date, (dailyWater.get(l.date) ?? 0) + l.amount_ml)
        })
        const totals = Array.from(dailyWater.values())
        avgWaterMl = Math.round(totals.reduce((a, b) => a + b, 0) / totals.length)
      }

      setWeeklyStats({
        avgGoalPct,
        workoutsThisWeek: weekWorkoutCount ?? 0,
        avgWaterMl,
      })

      // Latest weight data
      const { data: recentWeights } = await supabase
        .from('weight_logs')
        .select('weight_kg, date')
        .eq('user_id', profile!.id)
        .order('date', { ascending: false })
        .limit(2)

      if (recentWeights && recentWeights.length > 0) {
        const current = recentWeights[0].weight_kg
        const previous = recentWeights.length > 1 ? recentWeights[1].weight_kg : null
        const diff = previous ? current - previous : 0
        setWeightData({
          current,
          previous,
          trend: diff > 0.3 ? 'up' : diff < -0.3 ? 'down' : 'stable',
        })
      }

      if (isTrainerRole(profile!.role)) {
        const { count } = await supabase
          .from('nutritionist_clients')
          .select('*', { count: 'exact', head: true })
          .eq('nutritionist_id', profile!.id)
          .eq('status', 'active')

        setClientCount(count ?? 0)

        const { count: pendingCount } = await supabase
          .from('personal_trainer_invites')
          .select('*', { count: 'exact', head: true })
          .eq('personal_trainer_id', profile!.id)
          .eq('status', 'pending')

        setPendingInviteCount(pendingCount ?? 0)
      } else if (isManagedClientRole(profile!.role)) {
        const trainerId = profile!.personal_trainer_id ?? profile!.nutritionist_id
        const [{ count: dietCount }, { count: trainingCount }, trainerResponse] = await Promise.all([
          supabase
            .from('diet_plans')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', profile!.id)
            .eq('is_active', true),
          supabase
            .from('training_plans')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', profile!.id)
            .eq('is_active', true),
          trainerId
            ? supabase.from('user_profiles').select('id, full_name, email').eq('id', trainerId).single()
            : Promise.resolve({ data: null }),
        ])

        setManagedClientPlanState({
          hasDietPlan: (dietCount ?? 0) > 0,
          hasTrainingPlan: (trainingCount ?? 0) > 0,
        })
        setTrainerInfo(trainerResponse.data ?? null)
      }
    }

    loadTodayStats()
  }, [profile])

  if (!profile) return null
  if (isTrainerRole(profile.role)) {
    if (!profile.onboarding_completed) {
      return (
        <div className="panel-strong p-8">
          <h1 className="font-display text-3xl font-bold text-[var(--foreground)]">Complete your coach setup</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Tell us how you coach, who you work with, and what information you need from clients before programming.
          </p>
          <Link
            href="/onboarding"
            className="btn-primary mt-6 inline-flex items-center space-x-2 rounded-2xl px-5 py-3 text-sm font-semibold"
          >
            <span>Finish coach setup</span>
          </Link>
        </div>
      )
    }
    return <TrainerDashboard trainerId={profile.id} trainerName={profile.full_name?.split(' ')[0] || profile.email || 'Coach'} />
  }

  const calorieProgress = profile.daily_calories
    ? Math.min((todayStats.caloriesConsumed / profile.daily_calories) * 100, 100)
    : 0

  const firstName = profile.full_name?.split(' ')[0] || 'there'

  const dateLabel = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <div className="-m-4 p-4 sm:-m-6 sm:p-6 lg:-m-8 lg:p-8">
      <AppPageHeader
        eyebrow={dateLabel}
        title={`${greeting}, ${firstName}`}
        accent="."
        actions={
          profile.role === 'free' ? (
            <Link href="/pricing" className="btn btn-accent">
              <Crown className="h-4 w-4" />
              <span>Upgrade</span>
            </Link>
          ) : null
        }
      />

      {/* Onboarding prompt */}
      {!profile.onboarding_completed && (
        <AINudgeCard
          className="mb-6"
          kicker={isManagedClientRole(profile.role) ? 'Complete your coach intake' : 'Complete your profile'}
          body={
            <div>
              <p>
                {isManagedClientRole(profile.role)
                  ? 'Your trainer needs a few details before they can review your case and assign your first plan.'
                  : 'Set up your metrics and goals to get personalized nutrition targets.'}
              </p>
            </div>
          }
          actions={
            <Link href="/onboarding" className="btn btn-accent">
              Complete setup →
            </Link>
          }
        />
      )}

      {isManagedClientRole(profile.role) && (
        <div className="mb-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="card p-6">
            <div className="mono" style={{ fontSize: 11, color: 'var(--fg-4)', letterSpacing: '0.14em' }}>
              TRAINER CONNECTED
            </div>
            <h3 className="serif mt-2" style={{ fontSize: 26, lineHeight: 1.15 }}>
              {trainerInfo?.full_name || 'Your personal trainer'}{' '}
              <span className="italic-serif" style={{ color: 'var(--fg-3)' }}>
                is managing your plan.
              </span>
            </h3>
            <p className="mt-3" style={{ fontSize: 14, color: 'var(--fg-2)', lineHeight: 1.6 }}>
              Your nutrition and training programme is now coach-managed. Use the app to follow your plans, log progress,
              and stay in touch when you need support.
            </p>
            <div className="row mt-5 flex-wrap gap-2">
              <Link href="/my-nutritionist" className="btn btn-accent">
                Open my coach
              </Link>
              <Link href="/diet" className="btn btn-ghost">
                View plans
              </Link>
            </div>
          </div>

          <div className="card p-6">
            <div className="mono" style={{ fontSize: 11, color: 'var(--fg-4)', letterSpacing: '0.14em' }}>
              PLAN STATUS
            </div>
            <div className="mt-4 col gap-2.5">
              <div className="card-2 p-4">
                <div className="serif" style={{ fontSize: 16 }}>Diet plan</div>
                <div className="mt-1" style={{ fontSize: 13, color: 'var(--fg-2)' }}>
                  {managedClientPlanState.hasDietPlan
                    ? 'Assigned and ready to follow.'
                    : 'Your trainer has not assigned this yet.'}
                </div>
              </div>
              <div className="card-2 p-4">
                <div className="serif" style={{ fontSize: 16 }}>Training plan</div>
                <div className="mt-1" style={{ fontSize: 13, color: 'var(--fg-2)' }}>
                  {managedClientPlanState.hasTrainingPlan
                    ? 'Assigned and ready to follow.'
                    : 'Waiting for your trainer to publish your programme.'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Today's KPIs \u2014 single editorial row */}
      <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          variant="card"
          hero
          icon={<Target className="h-3.5 w-3.5" />}
          iconTone="acc"
          label="Calories"
          value={todayStats.caloriesConsumed}
          unit={profile.daily_calories ? `/ ${profile.daily_calories}` : undefined}
          progress={
            profile.daily_calories
              ? Math.min(todayStats.caloriesConsumed / profile.daily_calories, 1)
              : undefined
          }
        />
        <StatTile
          variant="card"
          icon={<Droplets className="h-3.5 w-3.5" />}
          label="Water"
          value={`${(todayStats.waterConsumed / 1000).toFixed(1)}L`}
          unit={
            profile.daily_water_ml
              ? `/ ${(profile.daily_water_ml / 1000).toFixed(1)}L`
              : undefined
          }
          progress={
            profile.daily_water_ml
              ? Math.min(todayStats.waterConsumed / profile.daily_water_ml, 1)
              : undefined
          }
        />
        <StatTile
          variant="card"
          icon={<Dumbbell className="h-3.5 w-3.5" />}
          label="Workouts today"
          value={todayStats.workoutsCompleted}
          unit={
            todayStats.cardioMinutes > 0
              ? `+ ${todayStats.cardioMinutes}m cardio`
              : undefined
          }
        />
        <StatTile
          variant="card"
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          label="Goal"
          value={`${Math.round(calorieProgress)}%`}
          changeTone="acc"
          change={
            calorieProgress >= 100
              ? 'On target'
              : calorieProgress >= 75
                ? 'On track'
                : 'Keep going'
          }
        />
      </div>

      {/* Macro breakdown */}
      <div className="mb-3 grid grid-cols-3 gap-3">
        <StatTile
          size="sm"
          icon={<Beef className="h-3 w-3" />}
          label="Protein"
          value={`${Math.round(todayStats.proteinConsumed)}g`}
          unit={profile.daily_protein ? `/ ${profile.daily_protein}g` : undefined}
          progress={
            profile.daily_protein
              ? Math.min(todayStats.proteinConsumed / profile.daily_protein, 1)
              : undefined
          }
        />
        <StatTile
          size="sm"
          icon={<Wheat className="h-3 w-3" />}
          label="Carbs"
          value={`${Math.round(todayStats.carbsConsumed)}g`}
          unit={profile.daily_carbs ? `/ ${profile.daily_carbs}g` : undefined}
          progress={
            profile.daily_carbs
              ? Math.min(todayStats.carbsConsumed / profile.daily_carbs, 1)
              : undefined
          }
        />
        <StatTile
          size="sm"
          icon={<EggFried className="h-3 w-3" />}
          label="Fat"
          value={`${Math.round(todayStats.fatConsumed)}g`}
          unit={profile.daily_fat ? `/ ${profile.daily_fat}g` : undefined}
          progress={
            profile.daily_fat
              ? Math.min(todayStats.fatConsumed / profile.daily_fat, 1)
              : undefined
          }
        />
      </div>

      {/* Water quick-add */}
      <div className="mb-8 row gap-2">
        {[
          { amount: 250, label: '+250ml' },
          { amount: 500, label: '+500ml' },
          { amount: 1000, label: '+1L' },
        ].map(({ amount, label }) => (
          <button
            key={amount}
            onClick={() => addWater(amount)}
            className="btn btn-ghost flex-1 justify-center"
            style={{ fontSize: 13 }}
          >
            <Droplets className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Today's Meal Plan */}
      {profile.onboarding_completed && (
        <MealPlanTracker
          userId={profile.id}
          userRole={profile.role}
          onMacrosUpdate={(macros) => {
            setTodayStats(prev => ({
              ...prev,
              caloriesConsumed: macros.calories,
              proteinConsumed: macros.protein,
              carbsConsumed: macros.carbs,
              fatConsumed: macros.fat,
            }))
          }}
        />
      )}

      {/* Widgets: Streaks, Training Preview, Quick Weight, Supplements */}
      {profile.onboarding_completed && (
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <StreaksWidget userId={profile.id} />
          <TodayTrainingPreview userId={profile.id} />
          <QuickWeightLog
            userId={profile.id}
            currentWeight={weightData.current}
            onWeightLogged={(w) => setWeightData(prev => ({
              ...prev,
              previous: prev.current,
              current: w,
              trend: prev.current ? (w > prev.current + 0.3 ? 'up' : w < prev.current - 0.3 ? 'down' : 'stable') : 'stable',
            }))}
          />
          <SupplementWidget userId={profile.id} />
        </div>
      )}

      {/* Quick Actions */}
      <div className="mb-3">
        <div
          className="mono"
          style={{ fontSize: 11, color: 'var(--fg-4)', letterSpacing: '0.14em' }}
        >
          <span style={{ color: 'var(--acc)', marginRight: 6 }}>✦</span>
          QUICK ACTIONS
        </div>
      </div>
      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { href: '/diet', label: 'Log a meal', sub: 'Track your food intake', icon: Utensils },
          { href: '/water', label: 'Log water', sub: 'Track hydration', icon: Droplets },
          { href: '/training', label: 'Start workout', sub: 'Follow your training plan', icon: Dumbbell },
          { href: '/cardio', label: 'Log cardio', sub: 'Record a cardio session', icon: HeartPulse },
          { href: '/ai/suggest', label: 'AI suggestions', sub: 'Get meal ideas', icon: Sparkles },
          ...(canAccess(profile.role, 'regenerate')
            ? [{ href: '/generate-plans', label: 'Regenerate plans', sub: 'Get new AI-generated plans', icon: RefreshCw }]
            : []),
          ...(isTrainerRole(profile.role)
            ? [{
                href: '/clients',
                label: 'Client roster',
                sub: `${clientCount} active · ${pendingInviteCount} pending`,
                icon: Users,
              }]
            : []),
        ].map(({ href, label, sub, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="card-2 row gap-3 p-4 transition hover:border-[var(--acc)]"
          >
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
              style={{
                background: 'var(--ink-3)',
                color: 'var(--acc)',
              }}
            >
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="serif" style={{ fontSize: 15, lineHeight: 1.2 }}>
                {label}
              </div>
              <div
                className="mt-0.5 truncate"
                style={{ fontSize: 12, color: 'var(--fg-3)' }}
              >
                {sub}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Trainer Client Summary */}
      {isTrainerRole(profile.role) && (
        <div className="card p-6">
          <div className="row mb-4 justify-between">
            <div>
              <div
                className="mono"
                style={{ fontSize: 11, color: 'var(--fg-4)', letterSpacing: '0.14em' }}
              >
                CLIENT OVERVIEW
              </div>
            </div>
            <Link
              href="/clients"
              className="mono"
              style={{ fontSize: 10, color: 'var(--acc)', letterSpacing: '0.1em' }}
            >
              VIEW ALL \u2192
            </Link>
          </div>
          {clientCount === 0 && pendingInviteCount === 0 ? (
            <div className="py-6 text-center">
              <Users
                className="mx-auto mb-3 h-8 w-8"
                style={{ color: 'var(--fg-4)' }}
              />
              <div className="serif" style={{ fontSize: 22 }}>
                No clients yet.
              </div>
              <p
                className="mx-auto mt-2 max-w-[400px]"
                style={{ fontSize: 13, color: 'var(--fg-2)' }}
              >
                Start growing your roster by inviting your first client.
              </p>
              <Link href="/clients/invite" className="btn btn-accent mt-5">
                <Plus className="h-4 w-4" />
                Invite client
              </Link>
            </div>
          ) : (
            <div>
              <div className="serif" style={{ fontSize: 22 }}>
                {clientCount}{' '}
                <span className="italic-serif" style={{ color: 'var(--fg-3)' }}>
                  active client{clientCount !== 1 ? 's' : ''}.
                </span>
              </div>
              <p
                className="mt-1.5"
                style={{ fontSize: 13, color: 'var(--fg-2)' }}
              >
                {pendingInviteCount} pending invite
                {pendingInviteCount !== 1 ? 's' : ''} still waiting for acceptance.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Weekly Progress */}
      {profile.onboarding_completed && (
        <div className="mt-8">
          <div className="row mb-3 justify-between">
            <div
              className="mono"
              style={{ fontSize: 11, color: 'var(--fg-4)', letterSpacing: '0.14em' }}
            >
              WEEKLY PROGRESS
            </div>
            <Link
              href="/progress"
              className="mono"
              style={{ fontSize: 10, color: 'var(--acc)', letterSpacing: '0.1em' }}
            >
              VIEW ALL \u2192
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile
              variant="card"
              icon={<Scale className="h-3.5 w-3.5" />}
              label="Weight"
              value={weightData.current ? `${weightData.current}kg` : '\u2014'}
              change={
                weightData.current && weightData.previous
                  ? `${(weightData.current - weightData.previous) > 0 ? '+' : ''}${(weightData.current - weightData.previous).toFixed(1)}kg`
                  : undefined
              }
              changeTone={
                weightData.trend === 'up'
                  ? 'warn'
                  : weightData.trend === 'down'
                    ? 'ok'
                    : 'muted'
              }
            />
            <StatTile
              variant="card"
              icon={<TrendingUp className="h-3.5 w-3.5" />}
              label="Avg. daily goal"
              value={
                weeklyStats.avgGoalPct !== null
                  ? `${weeklyStats.avgGoalPct}%`
                  : '\u2014'
              }
              progress={
                weeklyStats.avgGoalPct !== null
                  ? Math.min(weeklyStats.avgGoalPct / 100, 1)
                  : undefined
              }
            />
            <StatTile
              variant="card"
              icon={<Dumbbell className="h-3.5 w-3.5" />}
              label="Workouts this week"
              value={weeklyStats.workoutsThisWeek}
              unit={
                profile.workout_days_per_week
                  ? `/ ${profile.workout_days_per_week}`
                  : undefined
              }
              progress={
                profile.workout_days_per_week
                  ? Math.min(
                      weeklyStats.workoutsThisWeek /
                        profile.workout_days_per_week,
                      1,
                    )
                  : undefined
              }
            />
            <StatTile
              variant="card"
              icon={<Droplets className="h-3.5 w-3.5" />}
              label="Avg. water intake"
              value={
                weeklyStats.avgWaterMl !== null
                  ? `${(weeklyStats.avgWaterMl / 1000).toFixed(1)}L`
                  : '\u2014'
              }
              unit={
                weeklyStats.avgWaterMl !== null && profile.daily_water_ml
                  ? `/ ${(profile.daily_water_ml / 1000).toFixed(1)}L`
                  : undefined
              }
              progress={
                weeklyStats.avgWaterMl !== null && profile.daily_water_ml
                  ? Math.min(
                      weeklyStats.avgWaterMl / profile.daily_water_ml,
                      1,
                    )
                  : undefined
              }
            />
          </div>
        </div>
      )}
    </div>
  )
}
