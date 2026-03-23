'use client'

import { useState, useEffect, useMemo } from 'react'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import {
  Target,
  Droplets,
  TrendingUp,
  Dumbbell,
  HeartPulse,
  Utensils,
  Users,
  Sparkles,
  Crown,
  Plus,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import MealPlanTracker from '@/components/dashboard/MealPlanTracker'

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

      // If nutritionist, count clients
      if (profile!.role === 'nutritionist') {
        const { count } = await supabase
          .from('nutritionist_clients')
          .select('*', { count: 'exact', head: true })
          .eq('nutritionist_id', profile!.id)
          .eq('status', 'active')

        setClientCount(count ?? 0)
      }
    }

    loadTodayStats()
  }, [profile])

  if (!profile) return null

  const calorieProgress = profile.daily_calories
    ? Math.min((todayStats.caloriesConsumed / profile.daily_calories) * 100, 100)
    : 0

  const waterProgress = profile.daily_water_ml
    ? Math.min((todayStats.waterConsumed / profile.daily_water_ml) * 100, 100)
    : 0

  const firstName = profile.full_name?.split(' ')[0] || 'there'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-indigo-50/20 -m-4 p-4 sm:-m-6 sm:p-6 lg:-m-8 lg:p-8">
      {/* Welcome */}
      <div className="mb-8 flex items-center justify-between animate-[fadeIn_0.4s_ease-out_forwards]">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {greeting}, {firstName} <span className="inline-block animate-[wave_1.5s_ease-in-out_infinite]" style={{ transformOrigin: '70% 70%' }}>&#128075;</span>
          </h1>
          <p className="text-gray-500 mt-1">
            Here&apos;s your overview for today.
          </p>
        </div>
        {profile.role === 'free' && (
          <Link
            href="/pricing"
            className="flex items-center space-x-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:shadow-lg hover:scale-105 transition-all duration-200"
          >
            <Crown className="h-4 w-4" />
            <span>Upgrade</span>
          </Link>
        )}
      </div>

      {/* Onboarding prompt */}
      {!profile.onboarding_completed && (
        <div className="mb-6 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-6 shadow-sm animate-[fadeIn_0.5s_ease-out_forwards]">
          <h3 className="font-semibold text-gray-900 mb-2">Complete your profile</h3>
          <p className="text-gray-800 text-sm mb-4">
            Set up your metrics and goals to get personalized nutrition targets.
          </p>
          <Link
            href="/onboarding"
            className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:shadow-lg transition-all"
          >
            <span>Complete Setup</span>
          </Link>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Calories & Macros */}
        <div className="bg-gradient-to-br from-white to-purple-50/50 rounded-xl p-6 shadow-sm border border-purple-100/60 lg:col-span-2 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 relative overflow-hidden animate-[fadeIn_0.3s_ease-out_forwards]">
          {/* Accent bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-400 rounded-t-xl" />
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-purple-100 to-indigo-100 rounded-full p-3 shadow-sm">
                <Target className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <span className="text-2xl font-bold text-gray-900">{todayStats.caloriesConsumed}</span>
                <span className="text-sm text-gray-500 ml-1">/ {profile.daily_calories ?? '\u2014'} cal</span>
              </div>
            </div>
            <span className="text-xs bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full font-semibold">
              {Math.round(calorieProgress)}%
            </span>
          </div>
          <div className="w-full bg-purple-100/50 rounded-full h-2.5 mb-5">
            <div
              className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2.5 rounded-full transition-all duration-500 ease-out"
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
        <div className="bg-gradient-to-br from-white to-cyan-50/50 rounded-xl p-6 shadow-sm border border-cyan-100/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 relative overflow-hidden animate-[fadeIn_0.4s_ease-out_forwards]">
          {/* Accent bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-400 rounded-t-xl" />
          <div className="flex items-center justify-between mb-4">
            <div className="bg-gradient-to-br from-cyan-100 to-blue-100 rounded-full p-3 shadow-sm">
              <Droplets className="h-6 w-6 text-cyan-600" />
            </div>
            <span className="text-xs bg-cyan-100 text-cyan-700 px-2.5 py-1 rounded-full font-semibold">
              {Math.round(waterProgress)}%
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <div>
                <span className="text-3xl font-extrabold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">{todayStats.waterConsumed}</span>
                <span className="text-sm text-gray-500 ml-0.5">ml</span>
              </div>
              <span className="text-sm text-gray-400">/ {profile.daily_water_ml ?? '\u2014'}ml</span>
            </div>
            <div className="w-full bg-cyan-100/50 rounded-full h-2.5">
              <div
                className="bg-gradient-to-r from-cyan-400 to-blue-500 h-2.5 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${waterProgress}%` }}
              />
            </div>
            <div className="flex gap-2 mt-3">
              {[{ amount: 250, label: '250ml' }, { amount: 500, label: '500ml' }, { amount: 1000, label: '1L' }].map(({ amount, label }) => (
                <button
                  key={amount}
                  onClick={() => addWater(amount)}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-cyan-50 text-cyan-700 rounded-lg hover:bg-cyan-100 hover:shadow-sm active:scale-95 transition-all duration-150 text-xs font-medium border border-cyan-100/50"
                >
                  <Plus className="h-3 w-3" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Workouts */}
        <div className="bg-gradient-to-br from-white to-purple-50/50 rounded-xl p-6 shadow-sm border border-purple-100/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 relative overflow-hidden animate-[fadeIn_0.5s_ease-out_forwards]">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-400 via-violet-500 to-purple-400 rounded-t-xl" />
          <div className="flex items-center justify-between mb-4">
            <div className="bg-gradient-to-br from-purple-100 to-violet-100 rounded-full p-3 shadow-sm">
              <Dumbbell className="h-6 w-6 text-purple-600" />
            </div>
            <span className="text-xs text-gray-400 font-medium">Today</span>
          </div>
          <div className="space-y-1">
            <span className="text-3xl font-extrabold text-gray-900">{todayStats.workoutsCompleted}</span>
            <p className="text-sm text-gray-500">Workouts completed</p>
          </div>
        </div>

        {/* Cardio */}
        <div className="bg-gradient-to-br from-white to-red-50/40 rounded-xl p-6 shadow-sm border border-red-100/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 relative overflow-hidden animate-[fadeIn_0.6s_ease-out_forwards]">
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

      {/* Quick Actions */}
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <Link href="/diet" className="group bg-gradient-to-br from-white to-orange-50/30 rounded-xl p-5 shadow-sm border border-gray-200/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center space-x-4">
          <div className="bg-gradient-to-br from-orange-100 to-amber-100 rounded-lg p-3 group-hover:shadow-sm transition-shadow">
            <Utensils className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Log a Meal</h3>
            <p className="text-sm text-gray-500">Track your food intake</p>
          </div>
        </Link>

        <Link href="/water" className="group bg-gradient-to-br from-white to-cyan-50/30 rounded-xl p-5 shadow-sm border border-gray-200/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center space-x-4">
          <div className="bg-gradient-to-br from-cyan-100 to-blue-100 rounded-lg p-3 group-hover:shadow-sm transition-shadow">
            <Droplets className="h-6 w-6 text-cyan-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Log Water</h3>
            <p className="text-sm text-gray-500">Track hydration</p>
          </div>
        </Link>

        <Link href="/training" className="group bg-gradient-to-br from-white to-purple-50/30 rounded-xl p-5 shadow-sm border border-gray-200/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center space-x-4">
          <div className="bg-gradient-to-br from-purple-100 to-violet-100 rounded-lg p-3 group-hover:shadow-sm transition-shadow">
            <Dumbbell className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Start Workout</h3>
            <p className="text-sm text-gray-500">Follow your training plan</p>
          </div>
        </Link>

        <Link href="/cardio" className="group bg-gradient-to-br from-white to-red-50/30 rounded-xl p-5 shadow-sm border border-gray-200/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center space-x-4">
          <div className="bg-gradient-to-br from-red-100 to-rose-100 rounded-lg p-3 group-hover:shadow-sm transition-shadow">
            <HeartPulse className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Log Cardio</h3>
            <p className="text-sm text-gray-500">Record a cardio session</p>
          </div>
        </Link>

        <Link href="/ai/suggest" className="group bg-gradient-to-br from-white to-purple-50/30 rounded-xl p-5 shadow-sm border border-gray-200/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center space-x-4">
          <div className="bg-gradient-to-br from-purple-100 to-indigo-100 rounded-lg p-3 group-hover:shadow-sm transition-shadow">
            <Sparkles className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">AI Suggestions</h3>
            <p className="text-sm text-gray-500">Get meal ideas</p>
          </div>
        </Link>

        {profile.role === 'nutritionist' && (
          <Link href="/clients" className="group bg-gradient-to-br from-white to-indigo-50/30 rounded-xl p-5 shadow-sm border border-gray-200/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center space-x-4">
            <div className="bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg p-3 group-hover:shadow-sm transition-shadow">
              <Users className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">My Clients</h3>
              <p className="text-sm text-gray-500">{clientCount} active clients</p>
            </div>
          </Link>
        )}
      </div>

      {/* Nutritionist Client Summary */}
      {profile.role === 'nutritionist' && (
        <div className="bg-gradient-to-br from-white to-indigo-50/40 rounded-xl p-6 shadow-sm border border-indigo-100/60 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Client Overview</h2>
            <Link href="/clients" className="text-sm text-purple-600 hover:text-purple-800 font-medium transition-colors">
              View All
            </Link>
          </div>
          {clientCount === 0 ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full mb-4">
                <Users className="h-8 w-8 text-indigo-400" />
              </div>
              <p className="text-gray-500 mb-1 font-medium">No clients yet</p>
              <p className="text-gray-400 text-sm mb-5">Start growing your practice by inviting your first client!</p>
              <Link
                href="/clients/invite"
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:shadow-lg hover:scale-105 transition-all duration-200"
              >
                <Plus className="h-4 w-4" />
                <span>Invite Client</span>
              </Link>
            </div>
          ) : (
            <p className="text-gray-900">
              You have <span className="font-semibold text-purple-600">{clientCount}</span> active client{clientCount !== 1 ? 's' : ''}.
            </p>
          )}
        </div>
      )}

      {/* Progress Section */}
      {profile.onboarding_completed && (
        <div className="mt-8 bg-gradient-to-br from-white to-purple-50/40 rounded-xl p-6 shadow-sm border border-purple-100/60 hover:shadow-md transition-all duration-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Weekly Progress</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-indigo-50/80 rounded-xl border border-purple-100/40">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-purple-100 rounded-full mb-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div className="text-sm text-gray-500">Avg. daily goal</div>
              <div className="text-lg font-bold text-purple-600">&mdash;</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-violet-50/80 rounded-xl border border-purple-100/40">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-purple-100 rounded-full mb-2">
                <Dumbbell className="h-5 w-5 text-purple-600" />
              </div>
              <div className="text-sm text-gray-500">Workouts this week</div>
              <div className="text-lg font-bold text-purple-600">&mdash;</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-cyan-50 to-blue-50/80 rounded-xl border border-cyan-100/40">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-cyan-100 rounded-full mb-2">
                <Droplets className="h-5 w-5 text-cyan-600" />
              </div>
              <div className="text-sm text-gray-500">Avg. water intake</div>
              <div className="text-lg font-bold text-cyan-600">&mdash;</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
