'use client'

import { useState, useEffect, useMemo } from 'react'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import {
  Target,
  Droplets,
  TrendingUp,
  TrendingDown,
  Minus,
  Dumbbell,
  HeartPulse,
  Utensils,
  Users,
  Sparkles,
  Crown,
  Plus,
  Scale,
  RefreshCw,
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

  const waterProgress = profile.daily_water_ml
    ? Math.min((todayStats.waterConsumed / profile.daily_water_ml) * 100, 100)
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
        <div className="panel-strong mb-6 animate-[fadeIn_0.5s_ease-out_forwards] p-6">
          <h3 className="font-display text-2xl font-bold text-[var(--foreground)] mb-2">
            {isManagedClientRole(profile.role) ? 'Complete your coach intake' : 'Complete your profile'}
          </h3>
          <p className="text-sm text-[var(--muted)] mb-4">
            {isManagedClientRole(profile.role)
              ? 'Your trainer needs a few details before they can review your case and assign your first plan.'
              : 'Set up your metrics and goals to get personalized nutrition targets.'}
          </p>
          <Link
            href="/onboarding"
            className="btn-primary inline-flex items-center space-x-2 rounded-2xl px-5 py-3 text-sm font-semibold"
          >
            <span>Complete Setup</span>
          </Link>
        </div>
      )}

      {isManagedClientRole(profile.role) && (
        <div className="mb-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="panel-strong p-6">
            <div className="eyebrow mb-3">Trainer connected</div>
            <h3 className="font-display text-2xl font-bold text-[var(--foreground)]">
              {trainerInfo?.full_name || 'Your personal trainer'} is managing your plan.
            </h3>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              Your nutrition and training programme is now coach-managed. Use the app to follow your plans, log progress,
              and stay in touch when you need support.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/my-nutritionist" className="btn-primary rounded-2xl px-5 py-3 text-sm font-semibold">
                Open My Trainer
              </Link>
              <Link href="/diet" className="btn-secondary rounded-2xl px-5 py-3 text-sm font-semibold">
                View plans
              </Link>
            </div>
          </div>

          <div className="panel-strong p-6">
            <h3 className="font-display text-2xl font-bold text-[var(--foreground)]">Plan status</h3>
            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border border-[var(--line)] bg-white/72 px-4 py-4">
                <div className="text-sm font-semibold text-[var(--foreground)]">Diet plan</div>
                <div className="mt-1 text-sm text-[var(--muted)]">
                  {managedClientPlanState.hasDietPlan ? 'Assigned and ready to follow.' : 'Your trainer has not assigned this yet.'}
                </div>
              </div>
              <div className="rounded-2xl border border-[var(--line)] bg-white/72 px-4 py-4">
                <div className="text-sm font-semibold text-[var(--foreground)]">Training plan</div>
                <div className="mt-1 text-sm text-[var(--muted)]">
                  {managedClientPlanState.hasTrainingPlan ? 'Assigned and ready to follow.' : 'Waiting for your trainer to publish your programme.'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-12">
        {/* Calories & Macros */}
        <div className="panel-strong relative overflow-hidden p-6 animate-[fadeIn_0.3s_ease-out_forwards] lg:col-span-7 lg:row-span-2">
          {/* Accent bar */}
          <div className="absolute left-0 right-0 top-0 h-1 bg-[linear-gradient(90deg,#0d1b2a,#1da8f0,#4dc4ff)] rounded-t-xl" />
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-[var(--brand-100)] p-3 shadow-sm">
                <Target className="h-6 w-6 text-[var(--brand-900)]" />
              </div>
              <div>
                <span className="text-2xl font-bold text-[var(--foreground)]">{todayStats.caloriesConsumed}</span>
                <span className="text-sm text-[var(--muted)] ml-1">/ {profile.daily_calories ?? '\u2014'} cal</span>
              </div>
            </div>
            <span className="rounded-full bg-[var(--brand-100)] px-2.5 py-1 text-xs font-semibold text-[#0f4262]">
              {Math.round(calorieProgress)}%
            </span>
          </div>
          <div className="mb-5 h-2.5 w-full rounded-full bg-[var(--brand-200)]">
            <div
              className="h-2.5 rounded-full bg-[linear-gradient(90deg,#0d1b2a,#1da8f0)] transition-all duration-500 ease-out"
              style={{ width: `${calorieProgress}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50/80 rounded-lg p-3 text-center border border-green-100/50">
              <p className="text-xs text-gray-500 mb-1">Protein</p>
              <p className="text-sm font-bold text-green-700">{Math.round(todayStats.proteinConsumed)}g</p>
              <p className="text-xs text-gray-400">/ {profile.daily_protein ?? '\u2014'}g</p>
              <div className="w-full bg-green-100 rounded-full h-1.5 mt-2">
                <div
                  className="bg-gradient-to-r from-green-400 to-emerald-500 h-1.5 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${profile.daily_protein ? Math.min((todayStats.proteinConsumed / profile.daily_protein) * 100, 100) : 0}%` }}
                />
              </div>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-orange-50/80 rounded-lg p-3 text-center border border-amber-100/50">
              <p className="text-xs text-gray-500 mb-1">Carbs</p>
              <p className="text-sm font-bold text-amber-700">{Math.round(todayStats.carbsConsumed)}g</p>
              <p className="text-xs text-gray-400">/ {profile.daily_carbs ?? '\u2014'}g</p>
              <div className="w-full bg-amber-100 rounded-full h-1.5 mt-2">
                <div
                  className="bg-gradient-to-r from-amber-400 to-orange-500 h-1.5 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${profile.daily_carbs ? Math.min((todayStats.carbsConsumed / profile.daily_carbs) * 100, 100) : 0}%` }}
                />
              </div>
            </div>
            <div className="bg-gradient-to-br from-rose-50 to-pink-50/80 rounded-lg p-3 text-center border border-rose-100/50">
              <p className="text-xs text-gray-500 mb-1">Fat</p>
              <p className="text-sm font-bold text-rose-700">{Math.round(todayStats.fatConsumed)}g</p>
              <p className="text-xs text-gray-400">/ {profile.daily_fat ?? '\u2014'}g</p>
              <div className="w-full bg-rose-100 rounded-full h-1.5 mt-2">
                <div
                  className="bg-gradient-to-r from-rose-400 to-pink-500 h-1.5 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${profile.daily_fat ? Math.min((todayStats.fatConsumed / profile.daily_fat) * 100, 100) : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Water */}
        <div className="panel-strong relative overflow-hidden p-6 animate-[fadeIn_0.4s_ease-out_forwards] lg:col-span-3">
          {/* Accent bar */}
          <div className="absolute left-0 right-0 top-0 h-1 rounded-t-xl bg-[linear-gradient(90deg,#4dc4ff,#1da8f0,#0d1b2a)]" />
          <div className="flex items-center justify-between mb-4">
            <div className="rounded-full bg-[var(--brand-100)] p-3 shadow-sm">
              <Droplets className="h-6 w-6 text-[var(--brand-500)]" />
            </div>
            <span className="rounded-full bg-[var(--brand-100)] px-2.5 py-1 text-xs font-semibold text-[#0f4262]">
              {Math.round(waterProgress)}%
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <div>
                <span className="text-3xl font-extrabold text-[var(--brand-900)]">{todayStats.waterConsumed}</span>
                <span className="text-sm text-[var(--muted)] ml-0.5">ml</span>
              </div>
              <span className="text-sm text-[var(--muted-soft)]">/ {profile.daily_water_ml ?? '\u2014'}ml</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-[var(--brand-200)]">
              <div
                className="h-2.5 rounded-full bg-[linear-gradient(90deg,#4dc4ff,#1da8f0)] transition-all duration-500 ease-out"
                style={{ width: `${waterProgress}%` }}
              />
            </div>
            <div className="flex gap-2 mt-3">
              {[{ amount: 250, label: '250ml' }, { amount: 500, label: '500ml' }, { amount: 1000, label: '1L' }].map(({ amount, label }) => (
                <button
                  key={amount}
                  onClick={() => addWater(amount)}
                  className="flex-1 flex items-center justify-center gap-1 rounded-xl border border-[var(--line)] bg-white/72 px-2 py-1.5 text-xs font-medium text-[var(--brand-900)] transition-all duration-150 hover:border-[rgba(29,168,240,0.3)] hover:bg-[var(--brand-100)] active:scale-95"
                >
                  <Plus className="h-3 w-3" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Workouts */}
        <div className="panel-strong relative overflow-hidden p-6 animate-[fadeIn_0.5s_ease-out_forwards] lg:col-span-2">
          <div className="absolute left-0 right-0 top-0 h-1 rounded-t-xl bg-[linear-gradient(90deg,#0d1b2a,#1f3650,#4dc4ff)]" />
          <div className="flex items-center justify-between mb-4">
            <div className="rounded-full bg-[var(--brand-100)] p-3 shadow-sm">
              <Dumbbell className="h-6 w-6 text-[var(--brand-900)]" />
            </div>
            <span className="text-xs text-[var(--muted-soft)] font-medium">Today</span>
          </div>
          <div className="space-y-1">
            <span className="text-3xl font-extrabold text-[var(--foreground)]">{todayStats.workoutsCompleted}</span>
            <p className="text-sm text-[var(--muted)]">Workouts completed</p>
          </div>
        </div>

        {/* Cardio */}
        <div className="relative overflow-hidden rounded-2xl border border-red-100/60 bg-gradient-to-br from-white to-red-50/40 p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md animate-[fadeIn_0.6s_ease-out_forwards] lg:col-span-5 lg:col-start-8">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-400 via-rose-500 to-red-400 rounded-t-xl" />
          <div className="flex items-center justify-between mb-4">
            <div className="bg-gradient-to-br from-red-100 to-rose-100 rounded-full p-3 shadow-sm">
              <HeartPulse className="h-6 w-6 text-red-600" />
            </div>
            <span className="text-xs text-gray-400 font-medium">Today</span>
          </div>
          <div className="space-y-1">
            <span className="text-3xl font-extrabold text-gray-900">{todayStats.cardioMinutes} <span className="text-lg font-semibold text-gray-400">min</span></span>
            <p className="text-sm text-gray-500">Cardio completed</p>
          </div>
        </div>
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
      <h2 className="font-display mb-4 text-2xl font-bold text-[var(--foreground)]">Quick Actions</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <Link href="/diet" className="group panel-strong flex items-center space-x-4 p-5">
          <div className="rounded-2xl bg-[var(--brand-100)] p-3 transition-shadow group-hover:shadow-sm">
            <Utensils className="h-6 w-6 text-[var(--brand-900)]" />
          </div>
          <div>
            <h3 className="font-semibold text-[var(--foreground)]">Log a Meal</h3>
            <p className="text-sm text-[var(--muted)]">Track your food intake</p>
          </div>
        </Link>

        <Link href="/water" className="group panel-strong flex items-center space-x-4 p-5">
          <div className="rounded-2xl bg-[var(--brand-100)] p-3 transition-shadow group-hover:shadow-sm">
            <Droplets className="h-6 w-6 text-[var(--brand-500)]" />
          </div>
          <div>
            <h3 className="font-semibold text-[var(--foreground)]">Log Water</h3>
            <p className="text-sm text-[var(--muted)]">Track hydration</p>
          </div>
        </Link>

        <Link href="/training" className="group panel-strong flex items-center space-x-4 p-5">
          <div className="rounded-2xl bg-[var(--brand-100)] p-3 transition-shadow group-hover:shadow-sm">
            <Dumbbell className="h-6 w-6 text-[var(--brand-900)]" />
          </div>
          <div>
            <h3 className="font-semibold text-[var(--foreground)]">Start Workout</h3>
            <p className="text-sm text-[var(--muted)]">Follow your training plan</p>
          </div>
        </Link>

        <Link href="/cardio" className="group panel-strong flex items-center space-x-4 p-5">
          <div className="rounded-2xl bg-[var(--brand-100)] p-3 transition-shadow group-hover:shadow-sm">
            <HeartPulse className="h-6 w-6 text-[var(--brand-500)]" />
          </div>
          <div>
            <h3 className="font-semibold text-[var(--foreground)]">Log Cardio</h3>
            <p className="text-sm text-[var(--muted)]">Record a cardio session</p>
          </div>
        </Link>

        <Link href="/ai/suggest" className="group panel-strong flex items-center space-x-4 p-5">
          <div className="rounded-2xl bg-[var(--brand-100)] p-3 transition-shadow group-hover:shadow-sm">
            <Sparkles className="h-6 w-6 text-[var(--brand-500)]" />
          </div>
          <div>
            <h3 className="font-semibold text-[var(--foreground)]">AI Suggestions</h3>
            <p className="text-sm text-[var(--muted)]">Get meal ideas</p>
          </div>
        </Link>

        {canAccess(profile.role, 'regenerate') && (
          <Link href="/generate-plans" className="group panel-strong flex items-center space-x-4 p-5">
            <div className="rounded-2xl bg-[var(--brand-100)] p-3 transition-shadow group-hover:shadow-sm">
              <RefreshCw className="h-6 w-6 text-[var(--brand-900)]" />
            </div>
            <div>
              <h3 className="font-semibold text-[var(--foreground)]">Regenerate Plans</h3>
              <p className="text-sm text-[var(--muted)]">Get new AI-generated plans</p>
            </div>
          </Link>
        )}

        {isTrainerRole(profile.role) && (
          <Link href="/clients" className="group panel-strong flex items-center space-x-4 p-5">
            <div className="rounded-2xl bg-[var(--brand-100)] p-3 transition-shadow group-hover:shadow-sm">
              <Users className="h-6 w-6 text-[var(--brand-900)]" />
            </div>
            <div>
              <h3 className="font-semibold text-[var(--foreground)]">Client Roster</h3>
              <p className="text-sm text-[var(--muted)]">{clientCount} active · {pendingInviteCount} pending</p>
            </div>
          </Link>
        )}
      </div>

      {/* Trainer Client Summary */}
      {isTrainerRole(profile.role) && (
        <div className="panel-strong p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl font-bold text-[var(--foreground)]">Client Overview</h2>
            <Link href="/clients" className="text-sm font-semibold text-[var(--brand-500)] transition-colors hover:text-[var(--brand-900)]">
              View All
            </Link>
          </div>
          {clientCount === 0 && pendingInviteCount === 0 ? (
            <div className="text-center py-8">
              <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-[var(--brand-100)]">
                <Users className="h-8 w-8 text-[var(--brand-500)]" />
              </div>
              <p className="mb-1 font-medium text-[var(--muted)]">No clients yet</p>
              <p className="mb-5 text-sm text-[var(--muted-soft)]">Start growing your roster by inviting your first client.</p>
              <Link
                href="/clients/invite"
                className="btn-primary inline-flex items-center space-x-2 rounded-2xl px-5 py-3 text-sm font-semibold"
              >
                <Plus className="h-4 w-4" />
                <span>Invite Client</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-2 text-[var(--foreground)]">
              <p>
                You have <span className="font-semibold text-[var(--brand-500)]">{clientCount}</span> active client{clientCount !== 1 ? 's' : ''}.
              </p>
              <p className="text-sm text-[var(--muted)]">
                {pendingInviteCount} pending invite{pendingInviteCount !== 1 ? 's' : ''} still waiting for acceptance.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Progress Section */}
      {profile.onboarding_completed && (
        <div className="panel-strong mt-8 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl font-bold text-[var(--foreground)]">Weekly Progress</h2>
            <Link href="/progress" className="text-sm font-semibold text-[var(--brand-500)] transition-colors hover:text-[var(--brand-900)]">
              View All
            </Link>
          </div>
          <div className="grid md:grid-cols-4 gap-4">
            {/* Weight Widget */}
            <Link href="/progress" className="text-center p-4 bg-gradient-to-br from-indigo-50 to-purple-50/80 rounded-xl border border-indigo-100/40 hover:shadow-md transition-all group">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-indigo-100 rounded-full mb-2 group-hover:scale-110 transition-transform">
                <Scale className="h-5 w-5 text-indigo-600" />
              </div>
              <div className="text-sm text-gray-500">Weight</div>
              <div className="text-lg font-bold text-indigo-600">
                {weightData.current ? `${weightData.current}kg` : '\u2014'}
              </div>
              {weightData.current && weightData.previous && (
                <div className={`flex items-center justify-center gap-1 text-xs font-medium mt-0.5 ${
                  weightData.trend === 'up' ? 'text-amber-600' : weightData.trend === 'down' ? 'text-green-600' : 'text-gray-400'
                }`}>
                  {weightData.trend === 'up' ? <TrendingUp className="h-3 w-3" /> : weightData.trend === 'down' ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                  <span>{(weightData.current - weightData.previous) > 0 ? '+' : ''}{(weightData.current - weightData.previous).toFixed(1)}kg</span>
                </div>
              )}
            </Link>

            {/* Avg Daily Goal */}
            <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-indigo-50/80 rounded-xl border border-purple-100/40">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-purple-100 rounded-full mb-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div className="text-sm text-gray-500">Avg. daily goal</div>
              <div className="text-lg font-bold text-purple-600">
                {weeklyStats.avgGoalPct !== null ? `${weeklyStats.avgGoalPct}%` : '\u2014'}
              </div>
            </div>

            {/* Workouts This Week */}
            <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-violet-50/80 rounded-xl border border-purple-100/40">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-purple-100 rounded-full mb-2">
                <Dumbbell className="h-5 w-5 text-purple-600" />
              </div>
              <div className="text-sm text-gray-500">Workouts this week</div>
              <div className="text-lg font-bold text-purple-600">
                {weeklyStats.workoutsThisWeek}
                {profile.workout_days_per_week && (
                  <span className="text-sm text-gray-400 font-normal"> / {profile.workout_days_per_week}</span>
                )}
              </div>
            </div>

            {/* Avg Water */}
            <div className="text-center p-4 bg-gradient-to-br from-cyan-50 to-blue-50/80 rounded-xl border border-cyan-100/40">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-cyan-100 rounded-full mb-2">
                <Droplets className="h-5 w-5 text-cyan-600" />
              </div>
              <div className="text-sm text-gray-500">Avg. water intake</div>
              <div className="text-lg font-bold text-cyan-600">
                {weeklyStats.avgWaterMl !== null
                  ? `${(weeklyStats.avgWaterMl / 1000).toFixed(1)}L`
                  : '\u2014'
                }
              </div>
              {weeklyStats.avgWaterMl !== null && profile.daily_water_ml && (
                <div className="text-xs text-gray-400 mt-0.5">
                  / {(profile.daily_water_ml / 1000).toFixed(1)}L goal
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
