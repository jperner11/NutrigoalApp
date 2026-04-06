'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  ArrowLeft, MessageSquare, ClipboardList, Plus, Utensils, Dumbbell,
  AlertTriangle, Stethoscope, Leaf, ThumbsDown, Activity, Weight, Target,
} from 'lucide-react'
import type { UserProfile, DietPlan, TrainingPlan } from '@/lib/supabase/types'
import { isTrainerRole } from '@nutrigoal/shared'

interface ClientOverviewState {
  lastMealDate: string | null
  lastWorkoutDate: string | null
  latestWeight: number | null
  pendingFeedbackCount: number
  unreadMessageCount: number
}

interface CustomIntakeResponseRow {
  id: string
  response_text: string | null
  response_json: string[] | boolean | null
  question: {
    label: string
  } | null
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useUser()
  const router = useRouter()
  const [client, setClient] = useState<UserProfile | null>(null)
  const [dietPlans, setDietPlans] = useState<DietPlan[]>([])
  const [trainingPlans, setTrainingPlans] = useState<TrainingPlan[]>([])
  const [overview, setOverview] = useState<ClientOverviewState>({
    lastMealDate: null,
    lastWorkoutDate: null,
    latestWeight: null,
    pendingFeedbackCount: 0,
    unreadMessageCount: 0,
  })
  const [customResponses, setCustomResponses] = useState<CustomIntakeResponseRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    if (!isTrainerRole(profile.role)) { router.push('/dashboard'); return }

    const trainerId = profile.id
    const supabase = createClient()
    async function load() {
      const [clientRes, dietRes, trainingRes, mealLogRes, workoutLogRes, weightRes, feedbackRes, conversationRes, customResponseRes] = await Promise.all([
        supabase.from('user_profiles').select('*').eq('id', id).single(),
        supabase.from('diet_plans').select('*').eq('user_id', id).order('created_at', { ascending: false }),
        supabase.from('training_plans').select('*').eq('user_id', id).order('created_at', { ascending: false }),
        supabase.from('meal_logs').select('date').eq('user_id', id).order('date', { ascending: false }).limit(1),
        supabase.from('workout_logs').select('date').eq('user_id', id).order('date', { ascending: false }).limit(1),
        supabase.from('weight_logs').select('weight_kg, date').eq('user_id', id).order('date', { ascending: false }).limit(1),
        supabase.from('feedback_requests').select('id', { count: 'exact', head: true }).eq('nutritionist_id', trainerId).eq('client_id', id).eq('status', 'pending'),
        supabase.from('conversations').select('id').eq('nutritionist_id', trainerId).eq('client_id', id).maybeSingle(),
        supabase.from('personal_trainer_custom_intake_responses').select('id, response_text, response_json, question:question_id(label)').eq('trainer_id', trainerId).eq('client_id', id),
      ])
      if (clientRes.data) setClient(clientRes.data as UserProfile)
      if (dietRes.data) setDietPlans(dietRes.data as DietPlan[])
      if (trainingRes.data) setTrainingPlans(trainingRes.data as TrainingPlan[])
      setCustomResponses((customResponseRes.data as CustomIntakeResponseRow[] | null) ?? [])

      let unreadMessageCount = 0
      if (conversationRes.data?.id) {
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conversationRes.data.id)
          .neq('sender_id', trainerId)
          .is('read_at', null)
        unreadMessageCount = count ?? 0
      }

      setOverview({
        lastMealDate: mealLogRes.data?.[0]?.date ?? null,
        lastWorkoutDate: workoutLogRes.data?.[0]?.date ?? null,
        latestWeight: weightRes.data?.[0]?.weight_kg ?? null,
        pendingFeedbackCount: feedbackRes.count ?? 0,
        unreadMessageCount,
      })
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
      <div className="card p-6 mb-6">
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
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
            client.onboarding_completed
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-sky-100 text-sky-700'
          }`}>
            {client.onboarding_completed ? 'Intake complete' : 'Intake pending'}
          </span>
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

        <div className="border-t border-gray-100 mt-6 pt-4">
          <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-gray-500 mb-3">Coach intake summary</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {client.desired_outcome && <AnamnesisRow icon={<Target className="h-4 w-4 text-blue-500" />} label="Desired outcome" value={client.desired_outcome} />}
            {client.past_dieting_challenges && <AnamnesisRow icon={<AlertTriangle className="h-4 w-4 text-amber-500" />} label="Past challenges" value={client.past_dieting_challenges} />}
            {client.weekly_derailers && <AnamnesisRow icon={<ClipboardList className="h-4 w-4 text-rose-500" />} label="Derailers" value={client.weekly_derailers} />}
            {client.equipment_access && <AnamnesisRow icon={<Weight className="h-4 w-4 text-indigo-500" />} label="Equipment" value={client.equipment_access.replace(/_/g, ' ')} />}
            {client.workout_days_per_week && <AnamnesisRow icon={<Dumbbell className="h-4 w-4 text-purple-500" />} label="Training availability" value={`${client.workout_days_per_week} days / week`} />}
            {client.max_session_minutes && <AnamnesisRow icon={<Activity className="h-4 w-4 text-emerald-500" />} label="Session length" value={`${client.max_session_minutes} min`} />}
            {client.plan_preference && <AnamnesisRow icon={<ClipboardList className="h-4 w-4 text-cyan-500" />} label="Plan style" value={client.plan_preference.replace(/_/g, ' ')} />}
            {client.sleep_quality && <AnamnesisRow icon={<Stethoscope className="h-4 w-4 text-slate-500" />} label="Recovery context" value={`${client.sleep_quality}${client.stress_level ? ` · stress ${client.stress_level}` : ''}`} />}
          </div>
        </div>

        {customResponses.length > 0 && (
          <div className="border-t border-gray-100 mt-6 pt-4">
            <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-gray-500 mb-3">Custom intake answers</h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {customResponses.map((response) => {
                const value = Array.isArray(response.response_json)
                  ? response.response_json.join(', ')
                  : typeof response.response_json === 'boolean'
                    ? response.response_json ? 'Yes' : 'No'
                    : response.response_text ?? ''
                return (
                  <AnamnesisRow
                    key={response.id}
                    icon={<ClipboardList className="h-4 w-4 text-violet-500" />}
                    label={response.question?.label ?? 'Custom question'}
                    value={value}
                  />
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6 lg:grid-cols-4">
        <OverviewCard label="Last meal log" value={overview.lastMealDate ? new Date(overview.lastMealDate).toLocaleDateString('en-GB') : 'No logs yet'} tone="blue" />
        <OverviewCard label="Last workout" value={overview.lastWorkoutDate ? new Date(overview.lastWorkoutDate).toLocaleDateString('en-GB') : 'No logs yet'} tone="purple" />
        <OverviewCard label="Latest weight" value={overview.latestWeight ? `${overview.latestWeight}kg` : 'No data'} tone="green" />
        <OverviewCard label="Needs response" value={`${overview.pendingFeedbackCount + overview.unreadMessageCount}`} tone="amber" />
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Link href={`/clients/${id}/messages`}
          className="flex items-center justify-center space-x-2 card p-4 hover:shadow-md transition-shadow">
          <MessageSquare className="h-5 w-5 text-blue-600" />
          <span className="font-medium text-gray-900">Messages</span>
        </Link>
        <Link href={`/clients/${id}/feedback`}
          className="flex items-center justify-center space-x-2 card p-4 hover:shadow-md transition-shadow">
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
              <div key={plan.id} className="card p-4 flex items-center justify-between">
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
              <div key={plan.id} className="card p-4 flex items-center justify-between">
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

function OverviewCard({ label, value, tone }: { label: string; value: string; tone: 'blue' | 'purple' | 'green' | 'amber' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700',
    purple: 'bg-purple-50 text-purple-700',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
  }

  return (
    <div className="card p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">{label}</div>
      <div className={`mt-3 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${tones[tone]}`}>{value}</div>
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
