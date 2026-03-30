'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { Settings, User, Crown, Target, Calendar, HeartPulse, Dumbbell, Utensils, Activity, Lock, Trash2, AlertTriangle, Loader2, ExternalLink } from 'lucide-react'
import { toast } from 'react-hot-toast'
import {
  PRICING,
  ACTIVITY_LEVELS,
  FITNESS_GOALS,
  TRAINING_EXPERIENCE,
  EQUIPMENT_ACCESS,
  TRAINING_STYLES,
  COMMON_INJURIES,
  COMMON_CONDITIONS,
  DIETARY_RESTRICTIONS,
  COMMON_FOOD_DISLIKES,
  COOKING_SKILLS,
  MEAL_PREP_PREFERENCES,
  WORK_TYPES,
  SLEEP_QUALITY_OPTIONS,
  STRESS_LEVELS,
  GOAL_TIMELINES,
  MOTIVATIONS,
} from '@/lib/constants'
import { calculateNutritionTargets } from '@/lib/nutrition'
import type { ActivityLevel, FitnessGoal, Gender } from '@/lib/supabase/types'

const TABS = [
  { key: 'profile', label: 'Profile', icon: User },
  { key: 'goals', label: 'Goals', icon: Target },
  { key: 'schedule', label: 'Schedule', icon: Calendar },
  { key: 'health', label: 'Health', icon: HeartPulse },
  { key: 'fitness', label: 'Fitness', icon: Dumbbell },
  { key: 'nutrition', label: 'Nutrition', icon: Utensils },
  { key: 'lifestyle', label: 'Lifestyle', icon: Activity },
  { key: 'account', label: 'Account', icon: Lock },
] as const

type TabKey = typeof TABS[number]['key']

function TimeSelect({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const times: string[] = []
  for (let h = 0; h < 24; h++) {
    for (const m of ['00', '30']) {
      times.push(`${String(h).padStart(2, '0')}:${m}`)
    }
  }
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
      >
        {times.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
    </div>
  )
}

function ChipSelect({ options, selected, onChange, label }: {
  options: readonly string[]
  selected: string[]
  onChange: (v: string[]) => void
  label: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(
              selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt]
            )}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selected.includes(opt)
                ? 'bg-purple-100 text-purple-700 border border-purple-300'
                : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const { profile } = useUser()
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('profile')
  const [initialized, setInitialized] = useState(false)

  // Form state
  const [form, setForm] = useState({
    // Profile
    full_name: '',
    age: '' as string | number,
    height_cm: '' as string | number,
    weight_kg: '' as string | number,
    gender: 'male' as string,
    // Goals
    goal: '' as string,
    target_weight_kg: '' as string | number,
    goal_timeline: '' as string,
    motivation: [] as string[],
    activity_level: '' as string,
    // Schedule
    wake_time: '07:00',
    sleep_time: '23:00',
    workout_time: '18:00',
    work_start_time: '09:00',
    work_end_time: '17:00',
    workout_days_per_week: 4 as number,
    meals_per_day: 3 as number,
    // Health
    injuries: [] as string[],
    medical_conditions: [] as string[],
    medications: [] as string[],
    // Fitness
    training_experience: '' as string,
    equipment_access: '' as string,
    training_style: [] as string[],
    // Nutrition
    dietary_preferences: [] as string[],
    allergies: [] as string[],
    dietary_restrictions: [] as string[],
    food_dislikes: [] as string[],
    favourite_foods: [] as string[],
    cooking_skill: '' as string,
    meal_prep_preference: '' as string,
    // Lifestyle
    work_type: '' as string,
    sleep_quality: '' as string,
    stress_level: '' as string,
  })

  // Initialize form from profile
  useEffect(() => {
    if (profile && !initialized) {
      setForm({
        full_name: profile.full_name ?? '',
        age: profile.age ?? '',
        height_cm: profile.height_cm ?? '',
        weight_kg: profile.weight_kg ?? '',
        gender: profile.gender ?? 'male',
        goal: profile.goal ?? '',
        target_weight_kg: profile.target_weight_kg ?? '',
        goal_timeline: profile.goal_timeline ?? '',
        motivation: profile.motivation ?? [],
        activity_level: profile.activity_level ?? '',
        wake_time: profile.wake_time ?? '07:00',
        sleep_time: profile.sleep_time ?? '23:00',
        workout_time: profile.workout_time ?? '18:00',
        work_start_time: profile.work_start_time ?? '09:00',
        work_end_time: profile.work_end_time ?? '17:00',
        workout_days_per_week: profile.workout_days_per_week ?? 4,
        meals_per_day: profile.meals_per_day ?? 3,
        injuries: profile.injuries ?? [],
        medical_conditions: profile.medical_conditions ?? [],
        medications: profile.medications ?? [],
        training_experience: profile.training_experience ?? '',
        equipment_access: profile.equipment_access ?? '',
        training_style: profile.training_style ?? [],
        dietary_preferences: profile.dietary_preferences ?? [],
        allergies: profile.allergies ?? [],
        dietary_restrictions: profile.dietary_restrictions ?? [],
        food_dislikes: profile.food_dislikes ?? [],
        favourite_foods: profile.favourite_foods ?? [],
        cooking_skill: profile.cooking_skill ?? '',
        meal_prep_preference: profile.meal_prep_preference ?? '',
        work_type: profile.work_type ?? '',
        sleep_quality: profile.sleep_quality ?? '',
        stress_level: profile.stress_level ?? '',
      })
      setInitialized(true)
    }
  }, [profile, initialized])

  // Subscription management state
  const [managingSubscription, setManagingSubscription] = useState(false)

  async function handleManageSubscription() {
    setManagingSubscription(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        toast.error(data.message || 'Could not open billing portal')
      }
    } catch {
      toast.error('Something went wrong')
    }
    setManagingSubscription(false)
  }

  // Password change state
  const [passwords, setPasswords] = useState({ newPassword: '', confirmPassword: '' })
  const [changingPassword, setChangingPassword] = useState(false)

  // Account deletion state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    if (passwords.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setChangingPassword(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: passwords.newPassword })

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Password updated')
      setPasswords({ newPassword: '', confirmPassword: '' })
    }
    setChangingPassword(false)
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText !== 'DELETE') return

    setDeleting(true)
    const supabase = createClient()

    // Delete the user profile (cascading deletes will handle related data via RLS/triggers)
    const { error } = await supabase.from('user_profiles').delete().eq('id', profile!.id)
    if (error) {
      toast.error('Failed to delete account: ' + error.message)
      setDeleting(false)
      return
    }

    // Sign out and redirect
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return

    setSaving(true)
    const supabase = createClient()

    const age = form.age ? Number(form.age) : null
    const height = form.height_cm ? Number(form.height_cm) : null
    const weight = form.weight_kg ? Number(form.weight_kg) : null
    const gender = form.gender as Gender
    const activityLevel = form.activity_level as ActivityLevel
    const goal = form.goal as FitnessGoal

    // Recalculate nutrition targets if we have the required fields
    let nutritionUpdate: Record<string, number | null> = {}
    if (age && height && weight && gender && activityLevel && goal && gender !== 'other') {
      const targets = calculateNutritionTargets({
        age, height, weight, gender, activityLevel, goal,
      })
      nutritionUpdate = {
        daily_calories: Math.round(targets.calories),
        daily_protein: Math.round(targets.protein),
        daily_carbs: Math.round(targets.carbs),
        daily_fat: Math.round(targets.fat),
        daily_water_ml: Math.round(targets.water),
      }
    }

    const { error } = await supabase
      .from('user_profiles')
      .update({
        full_name: form.full_name || null,
        age,
        height_cm: height,
        weight_kg: weight,
        gender: form.gender || null,
        goal: form.goal || null,
        target_weight_kg: form.target_weight_kg ? Number(form.target_weight_kg) : null,
        goal_timeline: form.goal_timeline || null,
        motivation: form.motivation,
        activity_level: form.activity_level || null,
        wake_time: form.wake_time || null,
        sleep_time: form.sleep_time || null,
        workout_time: form.workout_time || null,
        work_start_time: form.work_start_time || null,
        work_end_time: form.work_end_time || null,
        workout_days_per_week: form.workout_days_per_week,
        meals_per_day: form.meals_per_day,
        injuries: form.injuries,
        medical_conditions: form.medical_conditions,
        medications: form.medications,
        training_experience: form.training_experience || null,
        equipment_access: form.equipment_access || null,
        training_style: form.training_style,
        dietary_preferences: form.dietary_preferences,
        allergies: form.allergies,
        dietary_restrictions: form.dietary_restrictions,
        food_dislikes: form.food_dislikes,
        favourite_foods: form.favourite_foods,
        cooking_skill: form.cooking_skill || null,
        meal_prep_preference: form.meal_prep_preference || null,
        work_type: form.work_type || null,
        sleep_quality: form.sleep_quality || null,
        stress_level: form.stress_level || null,
        ...nutritionUpdate,
      })
      .eq('id', profile.id)

    if (error) {
      toast.error('Failed to save settings')
    } else {
      toast.success(Object.keys(nutritionUpdate).length > 0
        ? 'Settings saved — daily targets recalculated!'
        : 'Settings saved')
    }
    setSaving(false)
  }

  if (!profile) return null

  const currentPlan = PRICING[profile.role]

  const set = (key: string, value: unknown) => setForm(prev => ({ ...prev, [key]: value }))

  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
  const selectClass = inputClass

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your profile and subscription.</p>
      </div>

      {/* Subscription */}
      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Crown className="h-6 w-6 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">Subscription</h2>
          </div>
          {profile.role === 'free' ? (
            <a
              href="/pricing"
              className="text-sm bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1.5 rounded-lg font-medium hover:shadow-lg transition-all"
            >
              Upgrade
            </a>
          ) : (
            <button
              onClick={handleManageSubscription}
              disabled={managingSubscription}
              className="flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-800 font-medium disabled:opacity-50"
            >
              {managingSubscription ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
              Manage Subscription
            </button>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-900">{currentPlan.name}</span>
          <span className="text-sm text-gray-500">
            {currentPlan.price === 0 ? '— Free' : `— $${currentPlan.price}/mo`}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-1 mb-6 bg-gray-100 rounded-xl p-1">
        {TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.key
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Form */}
      <form onSubmit={handleSave} className="card p-6">
        <div key={activeTab} className="animate-fade-in">

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input type="text" value={form.full_name} onChange={(e) => set('full_name', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={profile.email} disabled className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                <input type="number" value={form.age} onChange={(e) => set('age', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                <select value={form.gender} onChange={(e) => set('gender', e.target.value)} className={selectClass}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Height (cm)</label>
                <input type="number" value={form.height_cm} onChange={(e) => set('height_cm', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                <input type="number" value={form.weight_kg} onChange={(e) => set('weight_kg', e.target.value)} className={inputClass} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Activity Level</label>
              <select value={form.activity_level} onChange={(e) => set('activity_level', e.target.value)} className={selectClass}>
                <option value="">Select...</option>
                {ACTIVITY_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label} — {l.description}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Goals Tab */}
        {activeTab === 'goals' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fitness Goal</label>
              <select value={form.goal} onChange={(e) => set('goal', e.target.value)} className={selectClass}>
                <option value="">Select...</option>
                {FITNESS_GOALS.map(g => <option key={g.value} value={g.value}>{g.label} — {g.description}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Weight (kg)</label>
              <input type="number" value={form.target_weight_kg} onChange={(e) => set('target_weight_kg', e.target.value)} className={inputClass} placeholder="Optional" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Timeline</label>
              <select value={form.goal_timeline} onChange={(e) => set('goal_timeline', e.target.value)} className={selectClass}>
                <option value="">Select...</option>
                {GOAL_TIMELINES.map(t => <option key={t.value} value={t.value}>{t.label} — {t.description}</option>)}
              </select>
            </div>
            <ChipSelect
              label="Motivation"
              options={MOTIVATIONS}
              selected={form.motivation}
              onChange={(v) => set('motivation', v)}
            />
          </div>
        )}

        {/* Schedule Tab */}
        {activeTab === 'schedule' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <TimeSelect label="Wake Time" value={form.wake_time} onChange={(v) => set('wake_time', v)} />
              <TimeSelect label="Sleep Time" value={form.sleep_time} onChange={(v) => set('sleep_time', v)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TimeSelect label="Work Start" value={form.work_start_time} onChange={(v) => set('work_start_time', v)} />
              <TimeSelect label="Work End" value={form.work_end_time} onChange={(v) => set('work_end_time', v)} />
            </div>
            <TimeSelect label="Workout Time" value={form.workout_time} onChange={(v) => set('workout_time', v)} />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Workout Days/Week</label>
                <select value={form.workout_days_per_week} onChange={(e) => set('workout_days_per_week', Number(e.target.value))} className={selectClass}>
                  {[1,2,3,4,5,6,7].map(n => <option key={n} value={n}>{n} days</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meals/Day</label>
                <select value={form.meals_per_day} onChange={(e) => set('meals_per_day', Number(e.target.value))} className={selectClass}>
                  {[2,3,4,5,6].map(n => <option key={n} value={n}>{n} meals</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Health Tab */}
        {activeTab === 'health' && (
          <div className="space-y-5">
            <ChipSelect
              label="Injuries"
              options={COMMON_INJURIES}
              selected={form.injuries}
              onChange={(v) => set('injuries', v)}
            />
            <ChipSelect
              label="Medical Conditions"
              options={COMMON_CONDITIONS}
              selected={form.medical_conditions}
              onChange={(v) => set('medical_conditions', v)}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Medications</label>
              <input
                type="text"
                value={form.medications.join(', ')}
                onChange={(e) => set('medications', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                className={inputClass}
                placeholder="Enter medications separated by commas"
              />
            </div>
          </div>
        )}

        {/* Fitness Tab */}
        {activeTab === 'fitness' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Training Experience</label>
              <select value={form.training_experience} onChange={(e) => set('training_experience', e.target.value)} className={selectClass}>
                <option value="">Select...</option>
                {TRAINING_EXPERIENCE.map(t => <option key={t.value} value={t.value}>{t.label} — {t.description}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Equipment Access</label>
              <select value={form.equipment_access} onChange={(e) => set('equipment_access', e.target.value)} className={selectClass}>
                <option value="">Select...</option>
                {EQUIPMENT_ACCESS.map(e => <option key={e.value} value={e.value}>{e.label} — {e.description}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Training Style</label>
              <div className="flex flex-wrap gap-2">
                {TRAINING_STYLES.map(s => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => set('training_style',
                      form.training_style.includes(s.value)
                        ? form.training_style.filter(v => v !== s.value)
                        : [...form.training_style, s.value]
                    )}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      form.training_style.includes(s.value)
                        ? 'bg-purple-100 text-purple-700 border border-purple-300'
                        : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Nutrition Tab */}
        {activeTab === 'nutrition' && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Dietary Restrictions</label>
              <div className="flex flex-wrap gap-2">
                {DIETARY_RESTRICTIONS.map(r => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => set('dietary_restrictions',
                      form.dietary_restrictions.includes(r.value)
                        ? form.dietary_restrictions.filter(v => v !== r.value)
                        : [...form.dietary_restrictions, r.value]
                    )}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      form.dietary_restrictions.includes(r.value)
                        ? 'bg-purple-100 text-purple-700 border border-purple-300'
                        : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Allergies</label>
              <input
                type="text"
                value={form.allergies.join(', ')}
                onChange={(e) => set('allergies', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                className={inputClass}
                placeholder="Enter allergies separated by commas"
              />
            </div>
            <ChipSelect
              label="Food Dislikes"
              options={COMMON_FOOD_DISLIKES}
              selected={form.food_dislikes}
              onChange={(v) => set('food_dislikes', v)}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Favourite Foods</label>
              <input
                type="text"
                value={form.favourite_foods.join(', ')}
                onChange={(e) => set('favourite_foods', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                className={inputClass}
                placeholder="Enter favourite foods separated by commas"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cooking Skill</label>
              <select value={form.cooking_skill} onChange={(e) => set('cooking_skill', e.target.value)} className={selectClass}>
                <option value="">Select...</option>
                {COOKING_SKILLS.map(c => <option key={c.value} value={c.value}>{c.label} — {c.description}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Meal Prep Preference</label>
              <select value={form.meal_prep_preference} onChange={(e) => set('meal_prep_preference', e.target.value)} className={selectClass}>
                <option value="">Select...</option>
                {MEAL_PREP_PREFERENCES.map(m => <option key={m.value} value={m.value}>{m.label} — {m.description}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Lifestyle Tab */}
        {activeTab === 'lifestyle' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Work Type</label>
              <select value={form.work_type} onChange={(e) => set('work_type', e.target.value)} className={selectClass}>
                <option value="">Select...</option>
                {WORK_TYPES.map(w => <option key={w.value} value={w.value}>{w.label} — {w.description}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sleep Quality</label>
              <select value={form.sleep_quality} onChange={(e) => set('sleep_quality', e.target.value)} className={selectClass}>
                <option value="">Select...</option>
                {SLEEP_QUALITY_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label} — {s.description}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stress Level</label>
              <select value={form.stress_level} onChange={(e) => set('stress_level', e.target.value)} className={selectClass}>
                <option value="">Select...</option>
                {STRESS_LEVELS.map(s => <option key={s.value} value={s.value}>{s.label} — {s.description}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Account Tab */}
        {activeTab === 'account' && (
          <div className="space-y-8">
            {/* Change Password */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Lock className="h-5 w-5 text-purple-600" />
                Change Password
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <input
                    type="password"
                    value={passwords.newPassword}
                    onChange={(e) => setPasswords(p => ({ ...p, newPassword: e.target.value }))}
                    className={inputClass}
                    placeholder="Min. 6 characters"
                    minLength={6}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={passwords.confirmPassword}
                    onChange={(e) => setPasswords(p => ({ ...p, confirmPassword: e.target.value }))}
                    className={inputClass}
                    placeholder="Confirm your new password"
                  />
                </div>
                <button
                  type="button"
                  onClick={handlePasswordChange}
                  disabled={changingPassword || !passwords.newPassword}
                  className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  <Lock className="h-4 w-4" />
                  <span>{changingPassword ? 'Updating...' : 'Update Password'}</span>
                </button>
              </div>
            </div>

            {/* Delete Account */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-red-600 mb-2 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Danger Zone
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
              {!showDeleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center space-x-2 border border-red-300 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete Account</span>
                </button>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
                  <p className="text-sm font-medium text-red-800">
                    Type <span className="font-mono bg-red-100 px-1 rounded">DELETE</span> to confirm:
                  </p>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Type DELETE"
                  />
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleDeleteAccount}
                      disabled={deleteConfirmText !== 'DELETE' || deleting}
                      className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>{deleting ? 'Deleting...' : 'Permanently Delete'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText('') }}
                      className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        </div>{/* end animate-fade-in */}

        {/* Save Button — hide on account tab since it has its own actions */}
        {activeTab !== 'account' && (
          <div className="flex justify-end mt-6 pt-4 border-t border-gray-100">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50"
            >
              <Settings className="h-4 w-4" />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        )}
      </form>
    </div>
  )
}
