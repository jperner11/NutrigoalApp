'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import {
  Utensils, Plus, Sparkles, Lightbulb, TrendingUp,
  Droplets, ArrowRightLeft, Pill, X,
} from 'lucide-react'
import Link from 'next/link'
import type { DietPlan } from '@/lib/supabase/types'
import { isManagedClientRole } from '@nutrigoal/shared'

interface CompanionContent {
  personal_rules: string[]
  timeline: string
  hydration_tips: string[]
  hydration_explanation: string
  snack_swaps: { current: string; swap: string; calories: number; why: string }[]
  supplement_note: string
}

function parseCompanionContent(notes: string | null | undefined): CompanionContent | null {
  if (!notes) return null
  try {
    const parsed = JSON.parse(notes)
    if (parsed && Array.isArray(parsed.personal_rules)) return parsed as CompanionContent
  } catch {
    // Not JSON
  }
  return null
}

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

  const activePlan = plans.find(p => p.is_active)
  const companion = activePlan ? parseCompanionContent(activePlan.notes) : null
  const managedClient = isManagedClientRole(profile?.role)

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Diet Plans</h1>
          <p className="text-gray-900 mt-1">Manage your meal plans and track your nutrition.</p>
        </div>
        {!managedClient && (
          <Link
            href="/diet/new"
            className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:shadow-lg transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>New Plan</span>
          </Link>
        )}
      </div>

      {plans.length === 0 ? (
        <div className="card p-12 text-center">
          <Utensils className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No diet plans yet</h3>
          <p className="text-gray-500 mb-6">
            {managedClient
              ? 'Your trainer has not assigned a diet plan yet. It will appear here as soon as it is ready.'
              : 'Create your first diet plan to start tracking your nutrition.'}
          </p>
          {!managedClient && (
            <Link
              href="/diet/new"
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all"
            >
              <Plus className="h-5 w-5" />
              <span>Create Diet Plan</span>
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Plan Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {plans.map((plan) => (
              <Link
                key={plan.id}
                href={`/diet/${plan.id}`}
                className="card p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center space-x-3 mb-3">
                  <div className="bg-orange-100 rounded-lg p-2">
                    <Utensils className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                    <div className="flex gap-1">
                      {plan.created_by !== profile?.id && (
                        <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">From PT</span>
                      )}
                      {plan.is_active && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Active</span>
                      )}
                    </div>
                  </div>
                </div>
                {plan.target_calories && (
                  <p className="text-sm text-gray-900">
                    {plan.target_calories} cal · {plan.target_protein}g P · {plan.target_carbs}g C · {plan.target_fat}g F
                  </p>
                )}
                {plan.notes && !plan.notes.startsWith('{') && (
                  <p className="text-sm text-gray-500 mt-2 line-clamp-2">{plan.notes}</p>
                )}
              </Link>
            ))}
          </div>

          {/* Coaching Insights for active plan */}
          {companion && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                <h2 className="text-xl font-bold text-gray-900">Your Coaching Insights</h2>
              </div>

              {/* Personal Rules */}
              {companion.personal_rules?.length > 0 && (
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 shadow-sm border border-gray-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                    <h3 className="font-semibold text-gray-900 text-sm">Your Personal Rules</h3>
                  </div>
                  <ol className="space-y-2">
                    {companion.personal_rules.map((rule, i) => (
                      <li key={i} className="flex gap-3 text-sm text-gray-700">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                        <span>{rule}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Realistic Timeline */}
              {companion.timeline && (
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 shadow-sm border border-gray-200">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <h3 className="font-semibold text-gray-900 text-sm">Your Realistic Timeline</h3>
                  </div>
                  <div className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                    {companion.timeline}
                  </div>
                </div>
              )}

              {/* Hydration Tips */}
              {companion.hydration_tips?.length > 0 && (
                <div className="bg-blue-50/60 rounded-xl p-5 border border-blue-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Droplets className="h-4 w-4 text-blue-500" />
                    <h3 className="font-semibold text-blue-900 text-sm">Hydration Tips</h3>
                  </div>
                  <ul className="space-y-2">
                    {companion.hydration_tips.map((tip, i) => (
                      <li key={i} className="flex gap-3 text-sm text-blue-800">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                  {companion.hydration_explanation && (
                    <p className="mt-4 text-sm text-blue-700/80 border-t border-blue-100 pt-3 leading-relaxed">
                      {companion.hydration_explanation}
                    </p>
                  )}
                </div>
              )}

              {/* Snack Swaps */}
              {companion.snack_swaps?.length > 0 && (
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 shadow-sm border border-gray-200">
                  <div className="flex items-center gap-2 mb-3">
                    <ArrowRightLeft className="h-4 w-4 text-purple-600" />
                    <h3 className="font-semibold text-gray-900 text-sm">Smarter Snack Swaps</h3>
                  </div>
                  <div className="space-y-3">
                    {companion.snack_swaps.map((swap, i) => (
                      <div key={i} className="flex items-start gap-3 bg-gray-50 rounded-lg p-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center mt-0.5">
                          <X className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            <span className="line-through text-gray-400">{swap.current}</span>
                            <span className="mx-2 text-gray-300">→</span>
                            <span className="text-green-700">{swap.swap}</span>
                            <span className="text-xs text-gray-400 ml-2">~{swap.calories} cal</span>
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">{swap.why}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Supplement Disclaimer */}
              {companion.supplement_note && (
                <div className="bg-amber-50/60 rounded-xl p-5 border border-amber-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Pill className="h-4 w-4 text-amber-600" />
                    <h3 className="font-semibold text-amber-900 text-sm">Supplements — The 1%</h3>
                  </div>
                  <p className="text-sm text-amber-800 leading-relaxed">
                    {companion.supplement_note}
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
