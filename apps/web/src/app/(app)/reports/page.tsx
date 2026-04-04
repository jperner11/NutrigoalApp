'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { BarChart3, Utensils, Dumbbell, Droplets, TrendingUp, TrendingDown, Minus, ChevronLeft, ChevronRight } from 'lucide-react'
import { generateWeeklyReport } from '@/lib/reports'
import type { WeeklyReport } from '@/lib/reports'
import { isTrainerRole } from '@nutrigoal/shared'

function getWeekRange(offset: number): { start: string; end: string; label: string } {
  const now = new Date()
  const day = now.getDay()
  // Start of this week (Monday)
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((day + 6) % 7) + (offset * 7))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const fmt = (d: Date) => d.toISOString().split('T')[0]
  const label = offset === 0
    ? 'This Week'
    : offset === -1
    ? 'Last Week'
    : `${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`

  return { start: fmt(monday), end: fmt(sunday), label }
}

function StatCard({ label, value, subtitle, icon: Icon, color }: {
  label: string
  value: string | number
  subtitle?: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}) {
  const colorClasses: Record<string, string> = {
    purple: 'bg-purple-50 text-purple-600',
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
    pink: 'bg-pink-50 text-pink-600',
  }

  return (
    <div className="card p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorClasses[color] || colorClasses.purple}`}>
          <Icon className="h-4.5 w-4.5" />
        </div>
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
  )
}

function AdherenceBar({ label, percentage, color }: { label: string; percentage: number; color: string }) {
  const barColor = color === 'purple' ? 'from-purple-500 to-indigo-500' : 'from-blue-500 to-cyan-500'
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm font-bold text-gray-900">{percentage}%</span>
      </div>
      <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${barColor} rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>
    </div>
  )
}

export default function ReportsPage() {
  const { profile } = useUser()
  const [weekOffset, setWeekOffset] = useState(0)
  const [report, setReport] = useState<WeeklyReport | null>(null)
  const [trainerEvents, setTrainerEvents] = useState<Array<{ event_name: string; created_at: string; metadata: Record<string, unknown> }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    loadReport()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, weekOffset])

  async function loadReport() {
    setLoading(true)
    if (isTrainerRole(profile!.role)) {
      const supabase = createClient()
      const { data } = await supabase
        .from('beta_events')
        .select('event_name, created_at, metadata')
        .eq('user_id', profile!.id)
        .order('created_at', { ascending: false })
        .limit(100)
      setTrainerEvents((data as Array<{ event_name: string; created_at: string; metadata: Record<string, unknown> }>) ?? [])
      setLoading(false)
      return
    }

    const { start, end } = getWeekRange(weekOffset)
    const data = await generateWeeklyReport(profile!.id, start, end, {
      calories: profile!.daily_calories,
      protein: profile!.daily_protein,
      waterMl: profile!.daily_water_ml,
    })
    setReport(data)
    setLoading(false)
  }

  if (!profile) return null

  const { label: weekLabel } = getWeekRange(weekOffset)

  if (isTrainerRole(profile.role)) {
    const getCount = (eventName: string) => trainerEvents.filter((event) => event.event_name === eventName).length
    const recentEvents = trainerEvents.slice(0, 8)

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Beta Reports</h1>
          <p className="text-gray-600 mt-1">A quick operational view of onboarding and activation during the beta.</p>
        </div>

        {loading ? (
          <div className="text-gray-500 text-center py-12">Loading beta metrics...</div>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Invites sent" value={getCount('client_invite_sent')} icon={BarChart3} color="blue" />
              <StatCard label="Invites accepted" value={getCount('client_invite_accepted')} icon={TrendingUp} color="green" />
              <StatCard label="Diet plans assigned" value={getCount('diet_plan_assigned')} icon={Utensils} color="orange" />
              <StatCard label="Training plans assigned" value={getCount('training_plan_assigned')} icon={Dumbbell} color="purple" />
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <StatCard label="First meals logged" value={getCount('first_meal_logged')} icon={Utensils} color="orange" />
              <StatCard label="First workouts logged" value={getCount('first_workout_logged')} icon={Dumbbell} color="blue" />
              <StatCard label="First messages sent" value={getCount('first_message_sent')} icon={BarChart3} color="purple" />
              <StatCard label="First feedback completed" value={getCount('first_feedback_completed')} icon={TrendingUp} color="green" />
            </div>

            <div className="card p-5">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent beta activity</h2>
              {recentEvents.length === 0 ? (
                <p className="text-sm text-gray-500">No beta events recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {recentEvents.map((event, index) => (
                    <div key={`${event.event_name}-${event.created_at}-${index}`} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/70 px-4 py-3">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{event.event_name.replaceAll('_', ' ')}</div>
                        <div className="text-xs text-gray-500">{new Date(event.created_at).toLocaleString('en-GB')}</div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {typeof event.metadata?.invited_email === 'string' ? event.metadata.invited_email : ''}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600 mt-1">Weekly summary of your progress.</p>
        </div>
      </div>

      {/* Week Selector */}
      <div className="flex items-center justify-between card p-3 mb-6">
        <button
          onClick={() => setWeekOffset(prev => prev - 1)}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>
        <span className="text-sm font-semibold text-gray-900">{weekLabel}</span>
        <button
          onClick={() => setWeekOffset(prev => Math.min(0, prev + 1))}
          disabled={weekOffset >= 0}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-30"
        >
          <ChevronRight className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      {loading ? (
        <div className="text-gray-500 text-center py-12">Loading report...</div>
      ) : report ? (
        <div className="space-y-6">
          {/* Adherence */}
          <div className="card p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Adherence</h2>
            <div className="space-y-4">
              <AdherenceBar label="Calorie Target" percentage={report.calorieAdherence} color="purple" />
              <AdherenceBar label="Water Intake" percentage={report.waterAdherence} color="blue" />
            </div>
          </div>

          {/* Nutrition Stats */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Utensils className="h-5 w-5 text-purple-600" />
              Nutrition
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                label="Avg Calories"
                value={report.avgCalories}
                subtitle={`Target: ${report.targetCalories}`}
                icon={BarChart3}
                color="purple"
              />
              <StatCard
                label="Avg Protein"
                value={`${report.avgProtein}g`}
                subtitle={`Target: ${report.targetProtein}g`}
                icon={BarChart3}
                color="pink"
              />
              <StatCard
                label="Meals Logged"
                value={report.mealsLogged}
                subtitle={`${report.daysWithMeals} days tracked`}
                icon={Utensils}
                color="orange"
              />
              <StatCard
                label="Avg Macros"
                value={`${report.avgCarbs}C / ${report.avgFat}F`}
                subtitle="Carbs / Fat (g)"
                icon={BarChart3}
                color="purple"
              />
            </div>
          </div>

          {/* Training Stats */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-blue-600" />
              Training
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                label="Workouts"
                value={report.workoutsCompleted}
                subtitle={report.totalWorkoutMinutes > 0 ? `${report.totalWorkoutMinutes} min total` : undefined}
                icon={Dumbbell}
                color="blue"
              />
              <StatCard
                label="Cardio Sessions"
                value={report.cardioSessions}
                subtitle={report.totalCardioCalories > 0 ? `${report.totalCardioCalories} cal burned` : undefined}
                icon={Dumbbell}
                color="green"
              />
            </div>
          </div>

          {/* Water & Weight */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Droplets className="h-5 w-5 text-cyan-600" />
              Water & Weight
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                label="Avg Water"
                value={`${report.avgWaterMl}ml`}
                subtitle={`Target: ${report.targetWaterMl}ml · ${report.daysWithWater} days`}
                icon={Droplets}
                color="blue"
              />
              {report.weightChange !== null ? (
                <StatCard
                  label="Weight Change"
                  value={`${report.weightChange > 0 ? '+' : ''}${report.weightChange}kg`}
                  subtitle={`${report.startWeight}kg → ${report.endWeight}kg`}
                  icon={report.weightChange > 0 ? TrendingUp : report.weightChange < 0 ? TrendingDown : Minus}
                  color={report.weightChange === 0 ? 'purple' : 'green'}
                />
              ) : (
                <StatCard
                  label="Weight"
                  value="No data"
                  subtitle="Log weight to track changes"
                  icon={TrendingUp}
                  color="purple"
                />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
