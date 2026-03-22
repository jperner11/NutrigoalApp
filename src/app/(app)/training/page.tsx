'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { Dumbbell, Plus, Lock } from 'lucide-react'
import Link from 'next/link'
import type { TrainingPlan } from '@/lib/supabase/types'

export default function TrainingPage() {
  const { profile } = useUser()
  const [plans, setPlans] = useState<TrainingPlan[]>([])
  const [loading, setLoading] = useState(true)

  const canCreatePlans = profile?.role === 'pro' || profile?.role === 'nutritionist'

  useEffect(() => {
    if (!profile) return
    const supabase = createClient()

    async function loadPlans() {
      const { data } = await supabase
        .from('training_plans')
        .select('*')
        .eq('user_id', profile!.id)
        .order('created_at', { ascending: false })

      setPlans(data ?? [])
      setLoading(false)
    }

    loadPlans()
  }, [profile])

  if (loading) return <div className="text-gray-500">Loading training plans...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Training Plans</h1>
          <p className="text-gray-600 mt-1">Build and manage your workout routines.</p>
        </div>
        {canCreatePlans ? (
          <Link
            href="/training/new"
            className="flex items-center space-x-2 bg-gradient-to-r from-green-500 to-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:shadow-lg transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>New Plan</span>
          </Link>
        ) : (
          <div className="flex items-center space-x-2 text-gray-400 bg-gray-100 px-4 py-2 rounded-lg text-sm">
            <Lock className="h-4 w-4" />
            <span>Pro feature</span>
          </div>
        )}
      </div>

      {!canCreatePlans && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-6 mb-8">
          <h3 className="font-semibold text-gray-900 mb-2">Upgrade to create custom training plans</h3>
          <p className="text-gray-600 text-sm mb-4">
            Pro users can build custom workout plans with exercises, sets, and reps.
          </p>
          <Link
            href="/pricing"
            className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:shadow-lg transition-all"
          >
            <span>View Plans</span>
          </Link>
        </div>
      )}

      {plans.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
          <Dumbbell className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No training plans yet</h3>
          <p className="text-gray-500 mb-6">
            {canCreatePlans
              ? 'Create your first training plan to start building your workouts.'
              : 'Upgrade to Pro to create custom workout plans.'}
          </p>
          {canCreatePlans && (
            <Link
              href="/training/new"
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-green-500 to-blue-500 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all"
            >
              <Plus className="h-5 w-5" />
              <span>Create Training Plan</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Link
              key={plan.id}
              href={`/training/${plan.id}`}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center space-x-3 mb-3">
                <div className="bg-green-100 rounded-lg p-2">
                  <Dumbbell className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                  {plan.is_active && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Active</span>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-600">{plan.days_per_week} days/week</p>
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
