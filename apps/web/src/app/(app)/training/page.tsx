'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { Dumbbell, Plus, Calendar, Clock, Sparkles } from 'lucide-react'
import Link from 'next/link'
import type { TrainingPlan } from '@/lib/supabase/types'
import ProgressCheckIn from '@/components/training/ProgressCheckIn'
import { isManagedClientRole } from '@nutrigoal/shared'

interface PlanWithMeta extends TrainingPlan {
  dayCount: number
  lastWorkout: string | null
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

      // Get day counts and last workout for each plan
      const enriched = await Promise.all(
        rawPlans.map(async (plan) => {
          const { count } = await supabase
            .from('training_plan_days')
            .select('*', { count: 'exact', head: true })
            .eq('training_plan_id', plan.id)

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
            dayCount: count ?? 0,
            lastWorkout,
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
      <div className="min-h-screen">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
        </div>
      </div>
    )
  }

  const managedClient = isManagedClientRole(profile?.role)

  return (
    <div className="min-h-screen">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50/40 via-transparent to-indigo-50/30 pointer-events-none -z-10" />

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Training Plans</h1>
          <p className="text-gray-800 mt-1">Build and manage your workout routines.</p>
        </div>
        {!managedClient && (
          <Link
            href="/training/new"
            className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-200"
          >
            <Plus className="h-4 w-4" />
            <span>New Plan</span>
          </Link>
        )}
      </div>

      {profile && (
        <ProgressCheckIn
          userId={profile.id}
          onPlanRegenerate={() => router.push('/generate-plans')}
        />
      )}

      {plans.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-12 shadow-sm border border-gray-200 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 mb-5">
            <Dumbbell className="h-10 w-10 text-purple-500" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Ready to build your first workout?</h3>
          <p className="text-gray-500 mb-8 max-w-sm mx-auto">
            {managedClient
              ? 'Your trainer has not assigned a training plan yet. It will show up here as soon as your programme is ready.'
              : 'Create a training plan to organize your exercises, track progress, and crush your fitness goals.'}
          </p>
          {!managedClient && (
            <Link
              href="/training/new"
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-200"
            >
              <Sparkles className="h-5 w-5" />
              <span>Create Your First Plan</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Link
              key={plan.id}
              href={`/training/${plan.id}`}
              className={`bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 block ${
                plan.is_active ? 'border-l-4 border-l-purple-500' : ''
              }`}
            >
              <div className="flex items-center space-x-3 mb-3">
                <div className="bg-gradient-to-br from-purple-100 to-indigo-100 rounded-lg p-2">
                  <Dumbbell className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                  <div className="flex gap-1">
                    {plan.created_by !== profile?.id && (
                      <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-medium">From PT</span>
                    )}
                    {plan.is_active && (
                      <span className="text-xs bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">Active</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {plan.dayCount} days
                </span>
                {plan.lastWorkout && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    Last: {new Date(plan.lastWorkout).toLocaleDateString()}
                  </span>
                )}
              </div>
              {plan.description && (
                <p className="text-sm text-gray-500 mt-2 line-clamp-2">{plan.description}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
