'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  ArrowLeft, MessageSquare, ClipboardList, Plus, Utensils, Dumbbell,
  AlertTriangle, Stethoscope, Leaf, ThumbsDown, Activity, Weight,
} from 'lucide-react'
import type { UserProfile, DietPlan, TrainingPlan } from '@/lib/supabase/types'

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useUser()
  const router = useRouter()
  const [client, setClient] = useState<UserProfile | null>(null)
  const [dietPlans, setDietPlans] = useState<DietPlan[]>([])
  const [trainingPlans, setTrainingPlans] = useState<TrainingPlan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    if (profile.role !== 'nutritionist') { router.push('/dashboard'); return }

    const supabase = createClient()
    async function load() {
      const [clientRes, dietRes, trainingRes] = await Promise.all([
        supabase.from('user_profiles').select('*').eq('id', id).single(),
        supabase.from('diet_plans').select('*').eq('user_id', id).order('created_at', { ascending: false }),
        supabase.from('training_plans').select('*').eq('user_id', id).order('created_at', { ascending: false }),
      ])
      if (clientRes.data) setClient(clientRes.data as UserProfile)
      if (dietRes.data) setDietPlans(dietRes.data as DietPlan[])
      if (trainingRes.data) setTrainingPlans(trainingRes.data as TrainingPlan[])
      setLoading(false)
    }
    load()
  }, [profile, id, router])

  if (loading) return <div className="text-gray-500">Loading client...</div>
  if (!client) return <div className="text-gray-500">Client not found</div>

  return (
    <div>
      <Link href="/clients" className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6">
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Clients</span>
      </Link>

      {/* Profile Card */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-2xl font-bold text-white">
              {(client.full_name || '?')[0].toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{client.full_name || 'Client'}</h1>
              <p className="text-gray-500">{client.email}</p>
              <p className="text-sm text-gray-400 mt-1">
                {client.gender}, {client.age}y · {client.weight_kg}kg · {client.height_cm}cm
                {client.goal && ` · ${client.goal}`}
              </p>
            </div>
          </div>
        </div>

        {/* Macro Targets */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <MacroPill label="Calories" value={client.daily_calories} unit="kcal" color="text-green-600" bg="bg-green-50" />
          <MacroPill label="Protein" value={client.daily_protein} unit="g" color="text-blue-600" bg="bg-blue-50" />
          <MacroPill label="Carbs" value={client.daily_carbs} unit="g" color="text-amber-600" bg="bg-amber-50" />
          <MacroPill label="Fat" value={client.daily_fat} unit="g" color="text-red-600" bg="bg-red-50" />
        </div>

        {/* Anamnesis Summary */}
        {(client.injuries?.length > 0 || client.medical_conditions?.length > 0 || client.dietary_restrictions?.length > 0 || client.food_dislikes?.length > 0) && (
          <div className="border-t border-gray-100 mt-6 pt-4 space-y-2">
            {client.injuries?.length > 0 && (
              <AnamnesisRow icon={<AlertTriangle className="h-4 w-4 text-red-500" />} label="Injuries" value={client.injuries.join(', ')} />
            )}
            {client.medical_conditions?.length > 0 && (
              <AnamnesisRow icon={<Stethoscope className="h-4 w-4 text-orange-500" />} label="Conditions" value={client.medical_conditions.join(', ')} />
            )}
            {client.dietary_restrictions?.length > 0 && (
              <AnamnesisRow icon={<Leaf className="h-4 w-4 text-green-500" />} label="Diet Restrictions" value={client.dietary_restrictions.join(', ')} />
            )}
            {client.food_dislikes?.length > 0 && (
              <AnamnesisRow icon={<ThumbsDown className="h-4 w-4 text-gray-500" />} label="Dislikes" value={client.food_dislikes.join(', ')} />
            )}
            {client.training_experience && (
              <AnamnesisRow icon={<Activity className="h-4 w-4 text-purple-500" />} label="Experience" value={client.training_experience} />
            )}
            {client.equipment_access && (
              <AnamnesisRow icon={<Weight className="h-4 w-4 text-indigo-500" />} label="Equipment" value={client.equipment_access.replace(/_/g, ' ')} />
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Link href={`/clients/${id}/messages`}
          className="flex items-center justify-center space-x-2 bg-white rounded-xl p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <MessageSquare className="h-5 w-5 text-blue-600" />
          <span className="font-medium text-gray-900">Messages</span>
        </Link>
        <Link href={`/clients/${id}/feedback`}
          className="flex items-center justify-center space-x-2 bg-white rounded-xl p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <ClipboardList className="h-5 w-5 text-purple-600" />
          <span className="font-medium text-gray-900">Feedback</span>
        </Link>
      </div>

      {/* Diet Plans */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-900">Diet Plans</h2>
          <Link href={`/clients/${id}/diet/new`}
            className="flex items-center space-x-1 text-sm font-medium text-green-600 hover:text-green-700">
            <Plus className="h-4 w-4" />
            <span>New Plan</span>
          </Link>
        </div>
        {dietPlans.length === 0 ? (
          <p className="text-gray-400 text-sm italic">No diet plans yet</p>
        ) : (
          <div className="space-y-2">
            {dietPlans.map(plan => (
              <div key={plan.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Utensils className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-semibold text-gray-900">{plan.name}</p>
                    <p className="text-xs text-gray-500">
                      {plan.target_calories} kcal · P{plan.target_protein}g C{plan.target_carbs}g F{plan.target_fat}g
                    </p>
                  </div>
                </div>
                {plan.is_active && (
                  <span className="text-xs font-medium px-3 py-1 rounded-full bg-green-100 text-green-700">Active</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Training Plans */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-900">Training Plans</h2>
          <Link href={`/clients/${id}/training/new`}
            className="flex items-center space-x-1 text-sm font-medium text-green-600 hover:text-green-700">
            <Plus className="h-4 w-4" />
            <span>New Plan</span>
          </Link>
        </div>
        {trainingPlans.length === 0 ? (
          <p className="text-gray-400 text-sm italic">No training plans yet</p>
        ) : (
          <div className="space-y-2">
            {trainingPlans.map(plan => (
              <div key={plan.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Dumbbell className="h-5 w-5 text-purple-500" />
                  <div>
                    <p className="font-semibold text-gray-900">{plan.name}</p>
                    <p className="text-xs text-gray-500">{plan.days_per_week}x/week{plan.description ? ` · ${plan.description}` : ''}</p>
                  </div>
                </div>
                {plan.is_active && (
                  <span className="text-xs font-medium px-3 py-1 rounded-full bg-purple-100 text-purple-700">Active</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function MacroPill({ label, value, unit, color, bg }: { label: string; value: number | null; unit: string; color: string; bg: string }) {
  return (
    <div className={`${bg} rounded-lg p-3 text-center`}>
      <p className={`text-lg font-bold ${color}`}>{value ?? '—'}</p>
      <p className="text-xs text-gray-500">{label}{value ? ` ${unit}` : ''}</p>
    </div>
  )
}

function AnamnesisRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center space-x-2">
      {icon}
      <span className="text-xs font-semibold text-gray-500">{label}:</span>
      <span className="text-xs text-gray-700">{value}</span>
    </div>
  )
}
