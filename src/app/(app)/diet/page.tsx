'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { Utensils, Plus } from 'lucide-react'
import Link from 'next/link'
import type { DietPlan } from '@/lib/supabase/types'

export default function DietPage() {
  const { profile } = useUser()
  const [plans, setPlans] = useState<DietPlan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    const supabase = createClient()

    async function loadPlans() {
      const { data } = await supabase
        .from('diet_plans')
        .select('*')
        .eq('user_id', profile!.id)
        .order('created_at', { ascending: false })

      setPlans(data ?? [])
      setLoading(false)
    }

    loadPlans()
  }, [profile])

  if (loading) return <div className="text-gray-500">Loading diet plans...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Diet Plans</h1>
          <p className="text-gray-900 mt-1">Manage your meal plans and track your nutrition.</p>
        </div>
        <Link
          href="/diet/new"
          className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:shadow-lg transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>New Plan</span>
        </Link>
      </div>

      {plans.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
          <Utensils className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No diet plans yet</h3>
          <p className="text-gray-500 mb-6">Create your first diet plan to start tracking your nutrition.</p>
          <Link
            href="/diet/new"
            className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all"
          >
            <Plus className="h-5 w-5" />
            <span>Create Diet Plan</span>
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Link
              key={plan.id}
              href={`/diet/${plan.id}`}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center space-x-3 mb-3">
                <div className="bg-orange-100 rounded-lg p-2">
                  <Utensils className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                  {plan.is_active && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Active</span>
                  )}
                </div>
              </div>
              {plan.target_calories && (
                <p className="text-sm text-gray-900">
                  {plan.target_calories} cal · {plan.target_protein}g P · {plan.target_carbs}g C · {plan.target_fat}g F
                </p>
              )}
              {plan.notes && (
                <p className="text-sm text-gray-500 mt-2 line-clamp-2">{plan.notes}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
