'use client'

import { useState, useEffect } from 'react'
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

  return (
    <div>
      {/* Welcome */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {profile.full_name?.split(' ')[0] || 'there'}!
          </h1>
          <p className="text-gray-600 mt-1">
            Here&apos;s your overview for today.
          </p>
        </div>
        {profile.role === 'free' && (
          <Link
            href="/pricing"
            className="flex items-center space-x-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:shadow-lg transition-all"
          >
            <Crown className="h-4 w-4" />
            <span>Upgrade</span>
          </Link>
        )}
      </div>

      {/* Onboarding prompt */}
      {!profile.onboarding_completed && (
        <div className="mb-6 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-2">Complete your profile</h3>
          <p className="text-gray-600 text-sm mb-4">
            Set up your metrics and goals to get personalized nutrition targets.
          </p>
          <Link
            href="/onboarding"
            className="inline-flex items-center space-x-2 bg-gradient-to-r from-green-500 to-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:shadow-lg transition-all"
          >
            <span>Complete Setup</span>
          </Link>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Calories & Macros */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 rounded-full p-3">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <span className="text-2xl font-bold text-gray-900">{todayStats.caloriesConsumed}</span>
                <span className="text-sm text-gray-500 ml-1">/ {profile.daily_calories ?? '—'} cal</span>
              </div>
            </div>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
              {Math.round(calorieProgress)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${calorieProgress}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Protein</p>
              <p className="text-sm font-bold text-green-700">{Math.round(todayStats.proteinConsumed)}g</p>
              <p className="text-xs text-gray-400">/ {profile.daily_protein ?? '—'}g</p>
              <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                <div
                  className="bg-green-500 h-1 rounded-full transition-all duration-300"
                  style={{ width: `${profile.daily_protein ? Math.min((todayStats.proteinConsumed / profile.daily_protein) * 100, 100) : 0}%` }}
                />
              </div>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Carbs</p>
              <p className="text-sm font-bold text-amber-700">{Math.round(todayStats.carbsConsumed)}g</p>
              <p className="text-xs text-gray-400">/ {profile.daily_carbs ?? '—'}g</p>
              <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                <div
                  className="bg-amber-500 h-1 rounded-full transition-all duration-300"
                  style={{ width: `${profile.daily_carbs ? Math.min((todayStats.carbsConsumed / profile.daily_carbs) * 100, 100) : 0}%` }}
                />
              </div>
            </div>
            <div className="bg-rose-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Fat</p>
              <p className="text-sm font-bold text-rose-700">{Math.round(todayStats.fatConsumed)}g</p>
              <p className="text-xs text-gray-400">/ {profile.daily_fat ?? '—'}g</p>
              <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                <div
                  className="bg-rose-500 h-1 rounded-full transition-all duration-300"
                  style={{ width: `${profile.daily_fat ? Math.min((todayStats.fatConsumed / profile.daily_fat) * 100, 100) : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Water */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-cyan-100 rounded-full p-3">
              <Droplets className="h-6 w-6 text-cyan-600" />
            </div>
            <span className="text-xs bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded-full font-medium">
              {Math.round(waterProgress)}%
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-2xl font-bold text-gray-900">{todayStats.waterConsumed}ml</span>
              <span className="text-sm text-gray-500">/ {profile.daily_water_ml ?? '—'}ml</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-cyan-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${waterProgress}%` }}
              />
            </div>
            <div className="flex gap-2 mt-3">
              {[{ amount: 250, label: '250ml' }, { amount: 500, label: '500ml' }, { amount: 1000, label: '1L' }].map(({ amount, label }) => (
                <button
                  key={amount}
                  onClick={() => addWater(amount)}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-cyan-50 text-cyan-700 rounded-lg hover:bg-cyan-100 transition-colors text-xs font-medium"
                >
                  <Plus className="h-3 w-3" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Workouts */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-100 rounded-full p-3">
              <Dumbbell className="h-6 w-6 text-green-600" />
            </div>
            <span className="text-sm text-gray-500">Today</span>
          </div>
          <div className="space-y-2">
            <span className="text-2xl font-bold text-gray-900">{todayStats.workoutsCompleted}</span>
            <p className="text-sm text-gray-600">Workouts completed</p>
          </div>
        </div>

        {/* Cardio */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-red-100 rounded-full p-3">
              <HeartPulse className="h-6 w-6 text-red-600" />
            </div>
            <span className="text-sm text-gray-500">Today</span>
          </div>
          <div className="space-y-2">
            <span className="text-2xl font-bold text-gray-900">{todayStats.cardioMinutes} min</span>
            <p className="text-sm text-gray-600">Cardio completed</p>
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
        <Link href="/diet" className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 hover:shadow-md transition-shadow flex items-center space-x-4">
          <div className="bg-orange-100 rounded-lg p-3">
            <Utensils className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Log a Meal</h3>
            <p className="text-sm text-gray-500">Track your food intake</p>
          </div>
        </Link>

        <Link href="/water" className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 hover:shadow-md transition-shadow flex items-center space-x-4">
          <div className="bg-cyan-100 rounded-lg p-3">
            <Droplets className="h-6 w-6 text-cyan-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Log Water</h3>
            <p className="text-sm text-gray-500">Track hydration</p>
          </div>
        </Link>

        <Link href="/training" className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 hover:shadow-md transition-shadow flex items-center space-x-4">
          <div className="bg-green-100 rounded-lg p-3">
            <Dumbbell className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Start Workout</h3>
            <p className="text-sm text-gray-500">Follow your training plan</p>
          </div>
        </Link>

        <Link href="/cardio" className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 hover:shadow-md transition-shadow flex items-center space-x-4">
          <div className="bg-red-100 rounded-lg p-3">
            <HeartPulse className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Log Cardio</h3>
            <p className="text-sm text-gray-500">Record a cardio session</p>
          </div>
        </Link>

        <Link href="/ai/suggest" className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 hover:shadow-md transition-shadow flex items-center space-x-4">
          <div className="bg-purple-100 rounded-lg p-3">
            <Sparkles className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">AI Suggestions</h3>
            <p className="text-sm text-gray-500">Get meal ideas</p>
          </div>
        </Link>

        {profile.role === 'nutritionist' && (
          <Link href="/clients" className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 hover:shadow-md transition-shadow flex items-center space-x-4">
            <div className="bg-indigo-100 rounded-lg p-3">
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
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Client Overview</h2>
            <Link href="/clients" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              View All
            </Link>
          </div>
          {clientCount === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-4">No clients yet. Start by inviting your first client.</p>
              <Link
                href="/clients/invite"
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-green-500 to-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:shadow-lg transition-all"
              >
                <span>Invite Client</span>
              </Link>
            </div>
          ) : (
            <p className="text-gray-600">
              You have <span className="font-semibold">{clientCount}</span> active client{clientCount !== 1 ? 's' : ''}.
            </p>
          )}
        </div>
      )}

      {/* Progress Section */}
      {profile.onboarding_completed && (
        <div className="mt-8 bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Weekly Progress</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <TrendingUp className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <div className="text-sm text-gray-600">Avg. daily goal</div>
              <div className="text-lg font-bold text-blue-600">—</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <Dumbbell className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <div className="text-sm text-gray-600">Workouts this week</div>
              <div className="text-lg font-bold text-green-600">—</div>
            </div>
            <div className="text-center p-4 bg-cyan-50 rounded-lg">
              <Droplets className="h-6 w-6 text-cyan-600 mx-auto mb-2" />
              <div className="text-sm text-gray-600">Avg. water intake</div>
              <div className="text-lg font-bold text-cyan-600">—</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
