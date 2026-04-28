'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  ArrowLeft, MessageSquare, ClipboardList, Plus, Utensils, Dumbbell,
  AlertTriangle, Stethoscope, Leaf, ThumbsDown, Activity, Weight, Target,
  Pencil, Loader2, Check, X,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import type { UserProfile, DietPlan, TrainingPlan } from '@/lib/supabase/types'
import { isTrainerRole } from '@nutrigoal/shared'
import { AppHeroPanel, AppSectionHeader, EmptyStateCard, MetricCard } from '@/components/ui/AppDesign'

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

  if (loading) return <div className="text-[var(--fg-3)]">Loading client...</div>
  if (!client) return <div className="text-[var(--fg-3)]">Client not found</div>

  return (
    <div className="mx-auto max-w-[1100px]">
      <Link href="/clients" className="btn btn-ghost mb-4 inline-flex">
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Clients</span>
      </Link>

      <AppHeroPanel
        eyebrow="N° 12 · Client file"
        title={client.full_name || 'Client'}
        accent={client.onboarding_completed ? 'ready.' : 'intake pending.'}
        subtitle={`${client.email} · ${client.gender}, ${client.age}y · ${client.weight_kg}kg · ${client.height_cm}cm${client.goal ? ` · ${client.goal}` : ''}`}
        meta={
          <span className="app-status-pill" style={{ color: client.onboarding_completed ? 'var(--ok)' : 'var(--warn)' }}>
            {client.onboarding_completed ? 'Intake complete' : 'Intake pending'}
          </span>
        }
      />

      <div className="card mb-6 p-6">

        {/* Macro Targets */}
        <EditableMacros client={client} onUpdated={(updated) => setClient(updated)} />

        {/* Anamnesis Summary */}
        {(client.injuries?.length > 0 || client.medical_conditions?.length > 0 || client.dietary_restrictions?.length > 0 || client.food_dislikes?.length > 0) && (
          <div className="mt-6 space-y-2 border-t border-[var(--line)] pt-4">
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
              <AnamnesisRow icon={<ThumbsDown className="h-4 w-4 text-[var(--fg-3)]" />} label="Dislikes" value={client.food_dislikes.join(', ')} />
            )}
            {client.training_experience && (
              <AnamnesisRow icon={<Activity className="h-4 w-4 text-[var(--brand-400)]" />} label="Experience" value={client.training_experience} />
            )}
            {client.equipment_access && (
              <AnamnesisRow icon={<Weight className="h-4 w-4 text-indigo-500" />} label="Equipment" value={client.equipment_access.replace(/_/g, ' ')} />
            )}
          </div>
        )}

        <div className="mt-6 border-t border-[var(--line)] pt-4">
          <h2 className="app-mono-label mb-3">Coach intake summary</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {client.desired_outcome && <AnamnesisRow icon={<Target className="h-4 w-4 text-blue-500" />} label="Desired outcome" value={client.desired_outcome} />}
            {client.past_dieting_challenges && <AnamnesisRow icon={<AlertTriangle className="h-4 w-4 text-amber-500" />} label="Past challenges" value={client.past_dieting_challenges} />}
            {client.weekly_derailers && <AnamnesisRow icon={<ClipboardList className="h-4 w-4 text-rose-500" />} label="Derailers" value={client.weekly_derailers} />}
            {client.equipment_access && <AnamnesisRow icon={<Weight className="h-4 w-4 text-indigo-500" />} label="Equipment" value={client.equipment_access.replace(/_/g, ' ')} />}
            {client.workout_days_per_week && <AnamnesisRow icon={<Dumbbell className="h-4 w-4 text-[var(--brand-400)]" />} label="Training availability" value={`${client.workout_days_per_week} days / week`} />}
            {client.max_session_minutes && <AnamnesisRow icon={<Activity className="h-4 w-4 text-emerald-500" />} label="Session length" value={`${client.max_session_minutes} min`} />}
            {client.plan_preference && <AnamnesisRow icon={<ClipboardList className="h-4 w-4 text-cyan-500" />} label="Plan style" value={client.plan_preference.replace(/_/g, ' ')} />}
            {client.sleep_quality && <AnamnesisRow icon={<Stethoscope className="h-4 w-4 text-slate-500" />} label="Recovery context" value={`${client.sleep_quality}${client.stress_level ? ` · stress ${client.stress_level}` : ''}`} />}
          </div>
        </div>

        {customResponses.length > 0 && (
          <div className="mt-6 border-t border-[var(--line)] pt-4">
            <h2 className="app-mono-label mb-3">Custom intake answers</h2>
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

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Last meal log" value={overview.lastMealDate ? new Date(overview.lastMealDate).toLocaleDateString('en-GB') : 'No logs'} tone="muted" />
        <MetricCard label="Last workout" value={overview.lastWorkoutDate ? new Date(overview.lastWorkoutDate).toLocaleDateString('en-GB') : 'No logs'} tone="accent" />
        <MetricCard label="Latest weight" value={overview.latestWeight ? `${overview.latestWeight}kg` : 'No data'} tone="success" />
        <MetricCard label="Needs response" value={overview.pendingFeedbackCount + overview.unreadMessageCount} tone="warn" />
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Link href={`/clients/${id}/messages`}
          className="card flex items-center justify-center space-x-2 p-4 transition hover:border-[var(--line-strong)]">
          <MessageSquare className="h-5 w-5 text-[var(--brand-400)]" />
          <span className="font-medium text-[var(--fg)]">Messages</span>
        </Link>
        <Link href={`/clients/${id}/feedback`}
          className="card flex items-center justify-center space-x-2 p-4 transition hover:border-[var(--line-strong)]">
          <ClipboardList className="h-5 w-5 text-[var(--brand-400)]" />
          <span className="font-medium text-[var(--fg)]">Check-ins</span>
        </Link>
      </div>

      {/* Diet Plans */}
      <div className="mb-6">
        <AppSectionHeader
          index="01"
          eyebrow="NUTRITION"
          title="Diet"
          accent="plans."
          action={
          <Link href={`/clients/${id}/diet/new`}
            className="btn btn-secondary">
            <Plus className="h-4 w-4" />
            <span>New Plan</span>
          </Link>
          }
        />
        {dietPlans.length === 0 ? (
          <EmptyStateCard title="No diet plans yet." />
        ) : (
          <div className="space-y-2">
            {dietPlans.map(plan => (
              <div key={plan.id} className="card p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Utensils className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-semibold text-[var(--fg)]">{plan.name}</p>
                    <p className="text-xs text-[var(--fg-3)]">
                      {plan.target_calories} kcal · P{plan.target_protein}g C{plan.target_carbs}g F{plan.target_fat}g
                    </p>
                  </div>
                </div>
                {plan.is_active && (
                  <span className="app-status-pill text-xs" style={{ color: 'var(--ok)' }}>Active</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Training Plans */}
      <div>
        <AppSectionHeader
          index="02"
          eyebrow="TRAINING"
          title="Training"
          accent="plans."
          action={
          <Link href={`/clients/${id}/training/new`}
            className="btn btn-secondary">
            <Plus className="h-4 w-4" />
            <span>New Plan</span>
          </Link>
          }
        />
        {trainingPlans.length === 0 ? (
          <EmptyStateCard title="No training plans yet." />
        ) : (
          <div className="space-y-2">
            {trainingPlans.map(plan => (
              <div key={plan.id} className="card p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Dumbbell className="h-5 w-5 text-[var(--brand-400)]" />
                  <div>
                    <p className="font-semibold text-[var(--fg)]">{plan.name}</p>
                    <p className="text-xs text-[var(--fg-3)]">{plan.days_per_week}x/week{plan.description ? ` · ${plan.description}` : ''}</p>
                  </div>
                </div>
                {plan.is_active && (
                  <span className="app-status-pill text-xs">Active</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function EditableMacros({ client, onUpdated }: { client: UserProfile; onUpdated: (c: UserProfile) => void }) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [calories, setCalories] = useState(client.daily_calories?.toString() ?? '')
  const [protein, setProtein] = useState(client.daily_protein?.toString() ?? '')
  const [carbs, setCarbs] = useState(client.daily_carbs?.toString() ?? '')
  const [fat, setFat] = useState(client.daily_fat?.toString() ?? '')

  function reset() {
    setCalories(client.daily_calories?.toString() ?? '')
    setProtein(client.daily_protein?.toString() ?? '')
    setCarbs(client.daily_carbs?.toString() ?? '')
    setFat(client.daily_fat?.toString() ?? '')
    setEditing(false)
  }

  async function handleSave() {
    setSaving(true)
    const supabase = createClient()
    const updates = {
      daily_calories: calories ? parseInt(calories) : null,
      daily_protein: protein ? parseInt(protein) : null,
      daily_carbs: carbs ? parseInt(carbs) : null,
      daily_fat: fat ? parseInt(fat) : null,
    }
    const { error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', client.id)
    setSaving(false)
    if (error) { toast.error('Failed to update macros'); return }
    toast.success('Macro targets updated')
    onUpdated({ ...client, ...updates })
    setEditing(false)
  }

  if (!editing) {
    return (
      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <span className="app-mono-label">Macro targets</span>
          <button onClick={() => setEditing(true)}
            className="flex items-center gap-1 text-xs font-medium text-[var(--brand-400)] hover:text-[var(--brand-500)]">
            <Pencil className="h-3 w-3" />
            Edit
          </button>
        </div>
        <div className="grid grid-cols-4 gap-4">
          <MacroPill label="Calories" value={client.daily_calories} unit="kcal" />
          <MacroPill label="Protein" value={client.daily_protein} unit="g" />
          <MacroPill label="Carbs" value={client.daily_carbs} unit="g" />
          <MacroPill label="Fat" value={client.daily_fat} unit="g" />
        </div>
      </div>
    )
  }

  return (
    <div className="mt-6 rounded-xl border border-[var(--line)] bg-[var(--ink-2)] p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="app-mono-label">Edit macro targets</span>
        <div className="flex items-center gap-2">
          <button onClick={reset} className="rounded-lg p-1.5 text-[var(--fg-4)] hover:bg-[var(--ink-3)] hover:text-[var(--fg-2)]">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3">
        <div>
          <label className="app-mono-label mb-1 block">Calories</label>
          <input type="number" value={calories} onChange={e => setCalories(e.target.value)}
            className="input-field px-3 py-2 text-sm"
            placeholder="kcal" />
        </div>
        <div>
          <label className="app-mono-label mb-1 block">Protein</label>
          <input type="number" value={protein} onChange={e => setProtein(e.target.value)}
            className="input-field px-3 py-2 text-sm"
            placeholder="g" />
        </div>
        <div>
          <label className="app-mono-label mb-1 block">Carbs</label>
          <input type="number" value={carbs} onChange={e => setCarbs(e.target.value)}
            className="input-field px-3 py-2 text-sm"
            placeholder="g" />
        </div>
        <div>
          <label className="app-mono-label mb-1 block">Fat</label>
          <input type="number" value={fat} onChange={e => setFat(e.target.value)}
            className="input-field px-3 py-2 text-sm"
            placeholder="g" />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-3">
        <button onClick={reset}
          className="btn btn-secondary px-4 py-2 text-sm">
          Cancel
        </button>
        <button onClick={handleSave} disabled={saving}
          className="btn btn-accent px-4 py-2 text-sm disabled:opacity-50">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}

function MacroPill({ label, value, unit }: { label: string; value: number | null; unit: string }) {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--ink-2)] p-3 text-center">
      <p className="text-lg font-bold text-[var(--fg)]">{value ?? '—'}</p>
      <p className="text-xs text-[var(--fg-3)]">{label}{value ? ` ${unit}` : ''}</p>
    </div>
  )
}

function AnamnesisRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center space-x-2">
      {icon}
      <span className="text-xs font-semibold text-[var(--fg-3)]">{label}:</span>
      <span className="text-xs text-[var(--fg-2)]">{value}</span>
    </div>
  )
}
