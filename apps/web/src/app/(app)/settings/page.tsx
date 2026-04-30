'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { Settings, User, Crown, Target, Calendar, HeartPulse, Dumbbell, Utensils, Activity, Lock, Trash2, AlertTriangle, Loader2, ExternalLink, Compass } from 'lucide-react'
import { toast } from 'react-hot-toast'
import Link from 'next/link'
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
import type { ActivityLevel, FitnessGoal, Gender, PersonalTrainerCustomIntakeQuestion, CustomIntakeQuestionType, CoachPublicProfile, CoachOffer, CoachOfferBillingPeriod } from '@/lib/supabase/types'
import { BaseClientIntakePreview } from '@/components/onboarding/BaseClientIntakePreview'
import { SUPPORT_EMAIL } from '@/lib/site'
import { COACH_MARKETPLACE_CURRENCIES, COACH_OFFER_BILLING_PERIODS, buildCoachProfileSlug, formatCoachPriceRange, formatOfferPrice } from '@/lib/coachMarketplace'
import { isTrainerRole } from '@nutrigoal/shared'
import { AppHeroPanel } from '@/components/ui/AppDesign'
import { apiFetch, ApiError } from '@/lib/apiClient'

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

type TabKey = typeof TABS[number]['key'] | 'trainer_intake' | 'trainer_marketplace'
type TrainerQuestionDraft = PersonalTrainerCustomIntakeQuestion & { localKey: string }
type TrainerOfferDraft = CoachOffer & { localKey: string }
const QUESTION_TYPE_OPTIONS: Array<{ value: CustomIntakeQuestionType; label: string }> = [
  { value: 'short_text', label: 'Short text' },
  { value: 'long_text', label: 'Long text' },
  { value: 'single_select', label: 'Single select' },
  { value: 'multi_select', label: 'Multi select' },
  { value: 'yes_no', label: 'Yes / No' },
]

const labelClass = 'mono mb-2 block'
const fieldClass = 'w-full rounded-xl border border-[var(--line-2)] bg-[var(--ink-2)] px-3.5 py-3 text-sm text-[var(--fg)] outline-none transition focus:border-[var(--acc)]'
const disabledFieldClass = 'w-full rounded-xl border border-[var(--line)] bg-[var(--ink-2)] px-3.5 py-3 text-sm text-[var(--fg-3)] outline-none'
const fieldStyle: React.CSSProperties = {
  borderColor: 'var(--line-2)',
}
const labelStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--fg-4)',
  letterSpacing: '0.12em',
}

function chipClass(active: boolean) {
  return [
    'chip transition',
    active ? 'border-[var(--acc)] bg-[var(--ink-3)] text-[var(--acc)]' : 'hover:border-[var(--acc)]',
  ].join(' ')
}

function TimeSelect({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const times: string[] = []
  for (let h = 0; h < 24; h++) {
    for (const m of ['00', '30']) {
      times.push(`${String(h).padStart(2, '0')}:${m}`)
    }
  }
  return (
    <div>
      <label className={labelClass} style={labelStyle}>{label.toUpperCase()}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={fieldClass}
        style={fieldStyle}
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
      <label className={labelClass} style={labelStyle}>{label.toUpperCase()}</label>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(
              selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt]
            )}
            className={chipClass(selected.includes(opt))}
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
  const isTrainer = isTrainerRole(profile?.role)
  const [supportHistory, setSupportHistory] = useState<Array<{
    id: string
    category: string
    subject: string
    status: string
    created_at: string
  }>>([])
  const [loadingSupportHistory, setLoadingSupportHistory] = useState(false)
  const [trainerQuestions, setTrainerQuestions] = useState<TrainerQuestionDraft[]>([])
  const [loadingTrainerQuestions, setLoadingTrainerQuestions] = useState(false)
  const [savingTrainerQuestions, setSavingTrainerQuestions] = useState(false)
  const [trainerQuestionInitialized, setTrainerQuestionInitialized] = useState(false)
  const [marketplaceProfile, setMarketplaceProfile] = useState<CoachPublicProfile>({
    coach_id: '',
    slug: '',
    is_public: false,
    headline: '',
    bio: '',
    location_label: '',
    consultation_url: '',
    price_from: null,
    price_to: null,
    currency: 'GBP',
    accepting_new_clients: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })
  const [loadingMarketplaceProfile, setLoadingMarketplaceProfile] = useState(false)
  const [savingMarketplaceProfile, setSavingMarketplaceProfile] = useState(false)
  const [marketplaceInitialized, setMarketplaceInitialized] = useState(false)
  const [coachOffers, setCoachOffers] = useState<TrainerOfferDraft[]>([])
  const [loadingCoachOffers, setLoadingCoachOffers] = useState(false)
  const [savingCoachOffers, setSavingCoachOffers] = useState(false)
  const [coachOffersInitialized, setCoachOffersInitialized] = useState(false)

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

  useEffect(() => {
    async function loadSupportHistory() {
      if (!profile) return
      setLoadingSupportHistory(true)
      const supabase = createClient()
      const { data } = await supabase
        .from('support_requests')
        .select('id, category, subject, status, created_at')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(5)

      setSupportHistory(data ?? [])
      setLoadingSupportHistory(false)
    }

    loadSupportHistory()
  }, [profile])

  useEffect(() => {
    async function loadTrainerQuestions() {
      if (!profile || !isTrainer || trainerQuestionInitialized) return
      setLoadingTrainerQuestions(true)
      const supabase = createClient()
      const { data } = await supabase
        .from('personal_trainer_custom_intake_questions')
        .select('*')
        .eq('trainer_id', profile.id)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })

      setTrainerQuestions(((data as PersonalTrainerCustomIntakeQuestion[] | null) ?? []).map((question) => ({
        ...question,
        localKey: question.id,
      })))
      setTrainerQuestionInitialized(true)
      setLoadingTrainerQuestions(false)
    }

    loadTrainerQuestions()
  }, [profile, isTrainer, trainerQuestionInitialized])

  // Subscription management state
  const [managingSubscription, setManagingSubscription] = useState(false)
  const [supportCategory, setSupportCategory] = useState('bug')
  const [supportSubject, setSupportSubject] = useState('')
  const [supportMessage, setSupportMessage] = useState('')
  const [submittingSupport, setSubmittingSupport] = useState(false)
  const visibleTabs = isTrainer
    ? [...TABS.slice(0, 7), { key: 'trainer_intake' as const, label: 'Coach Intake', icon: Settings }, { key: 'trainer_marketplace' as const, label: 'Marketplace', icon: Compass }, TABS[7]]
    : TABS

  useEffect(() => {
    async function loadMarketplaceProfile() {
      if (!profile || !isTrainer || marketplaceInitialized) return

      setLoadingMarketplaceProfile(true)
      const supabase = createClient()
      const { data } = await supabase
        .from('coach_public_profiles')
        .select('*')
        .eq('coach_id', profile.id)
        .maybeSingle()

      const fallbackSlug = buildCoachProfileSlug(profile.full_name || profile.email || 'coach', profile.id)
      const row = data as CoachPublicProfile | null

      setMarketplaceProfile({
        coach_id: profile.id,
        slug: row?.slug ?? fallbackSlug,
        is_public: row?.is_public ?? false,
        headline: row?.headline ?? '',
        bio: row?.bio ?? '',
        location_label: row?.location_label ?? '',
        consultation_url: row?.consultation_url ?? '',
        price_from: row?.price_from ?? null,
        price_to: row?.price_to ?? null,
        currency: row?.currency ?? 'GBP',
        accepting_new_clients: row?.accepting_new_clients ?? true,
        created_at: row?.created_at ?? new Date().toISOString(),
        updated_at: row?.updated_at ?? new Date().toISOString(),
      })
      setMarketplaceInitialized(true)
      setLoadingMarketplaceProfile(false)
    }

    loadMarketplaceProfile()
  }, [profile, isTrainer, marketplaceInitialized])

  useEffect(() => {
    async function loadCoachOffers() {
      if (!profile || !isTrainer || coachOffersInitialized) return

      setLoadingCoachOffers(true)
      const supabase = createClient()
      const { data } = await supabase
        .from('coach_offers')
        .select('*')
        .eq('coach_id', profile.id)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })

      setCoachOffers(((data as CoachOffer[] | null) ?? []).map((offer) => ({
        ...offer,
        localKey: offer.id,
      })))
      setCoachOffersInitialized(true)
      setLoadingCoachOffers(false)
    }

    loadCoachOffers()
  }, [profile, isTrainer, coachOffersInitialized])

  async function handleManageSubscription() {
    setManagingSubscription(true)
    try {
      const data = await apiFetch<{ url?: string; message?: string }>('/api/stripe/portal', {
        method: 'POST',
        context: { feature: 'settings', action: 'open-billing-portal' },
      })
      if (data?.url) {
        window.location.href = data.url
      } else {
        toast.error(data?.message || 'Could not open billing portal')
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Something went wrong')
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

  async function handleSupportRequest() {
    if (!profile || !supportSubject.trim() || !supportMessage.trim()) {
      toast.error('Please add a subject and message.')
      return
    }

    setSubmittingSupport(true)
    const supabase = createClient()
    const { error } = await supabase.from('support_requests').insert({
      user_id: profile.id,
      email: profile.email,
      account_role: profile.role,
      platform: 'web',
      category: supportCategory,
      subject: supportSubject.trim(),
      message: supportMessage.trim(),
    })

    if (error) {
      toast.error('Failed to submit support request.')
    } else {
      toast.success('Support request submitted.')
      setSupportCategory('bug')
      setSupportSubject('')
      setSupportMessage('')
      setSupportHistory((prev) => [
        {
          id: crypto.randomUUID(),
          category: supportCategory,
          subject: supportSubject.trim(),
          status: 'open',
          created_at: new Date().toISOString(),
        },
        ...prev,
      ].slice(0, 5))
    }
    setSubmittingSupport(false)
  }

  function addTrainerQuestion() {
    const activeCount = trainerQuestions.filter((question) => question.is_active).length
    if (activeCount >= 5) {
      toast.error('You can have up to 5 active custom intake questions.')
      return
    }

    setTrainerQuestions((prev) => [
      ...prev,
      {
        id: `draft-${crypto.randomUUID()}`,
        localKey: crypto.randomUUID(),
        trainer_id: profile?.id ?? '',
        label: '',
        help_text: '',
        type: 'short_text',
        options: [],
        required: false,
        sort_order: prev.length,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])
  }

  function updateTrainerQuestion(localKey: string, patch: Partial<TrainerQuestionDraft>) {
    setTrainerQuestions((prev) => prev.map((question) => question.localKey === localKey ? { ...question, ...patch } : question))
  }

  function moveTrainerQuestion(localKey: string, direction: -1 | 1) {
    setTrainerQuestions((prev) => {
      const index = prev.findIndex((question) => question.localKey === localKey)
      const target = index + direction
      if (index < 0 || target < 0 || target >= prev.length) return prev
      const next = [...prev]
      const [question] = next.splice(index, 1)
      next.splice(target, 0, question)
      return next.map((item, order) => ({ ...item, sort_order: order }))
    })
  }

  function archiveTrainerQuestion(localKey: string) {
    setTrainerQuestions((prev) => prev.map((question) => (
      question.localKey === localKey
        ? { ...question, is_active: false }
        : question
    )))
  }

  async function saveTrainerQuestions() {
    if (!profile || !isTrainer) return

    const activeQuestions = trainerQuestions.filter((question) => question.is_active)
    if (activeQuestions.length > 5) {
      toast.error('You can have up to 5 active custom intake questions.')
      return
    }

    for (const question of activeQuestions) {
      if (!question.label.trim()) {
        toast.error('Every active custom question needs a label.')
        return
      }
      if ((question.type === 'single_select' || question.type === 'multi_select') && question.options.length < 2) {
        toast.error('Select questions need at least 2 options.')
        return
      }
    }

    setSavingTrainerQuestions(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('personal_trainer_custom_intake_questions')
      .upsert(
        trainerQuestions
          .filter((question) => question.is_active || !question.id.startsWith('draft-'))
          .map((question, index) => ({
          id: question.id.startsWith('draft-') ? undefined : question.id,
          trainer_id: profile.id,
          label: question.label.trim(),
          help_text: question.help_text?.trim() || null,
          type: question.type,
          options: question.type === 'single_select' || question.type === 'multi_select' ? question.options : [],
          required: question.required,
          sort_order: index,
          is_active: question.is_active,
          })),
        { onConflict: 'id' }
      )

    if (error) {
      toast.error('Failed to save custom intake questions.')
      setSavingTrainerQuestions(false)
      return
    }

    const { data: refreshed } = await supabase
      .from('personal_trainer_custom_intake_questions')
      .select('*')
      .eq('trainer_id', profile.id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    setTrainerQuestions(((refreshed as PersonalTrainerCustomIntakeQuestion[] | null) ?? []).map((question) => ({
      ...question,
      localKey: question.id,
    })))
    toast.success('Custom intake questions saved.')
    setSavingTrainerQuestions(false)
  }

  function setMarketplaceField<K extends keyof CoachPublicProfile>(key: K, value: CoachPublicProfile[K]) {
    setMarketplaceProfile((prev) => ({ ...prev, [key]: value }))
  }

  async function saveMarketplaceProfile() {
    if (!profile || !isTrainer) return

    const slug = buildCoachProfileSlug(form.full_name || profile.full_name || profile.email || 'coach', profile.id)
    if (marketplaceProfile.is_public) {
      if (!marketplaceProfile.headline?.trim()) {
        toast.error('Add a headline before making your profile public.')
        return
      }
      if (!marketplaceProfile.bio?.trim()) {
        toast.error('Add a short bio before making your profile public.')
        return
      }
    }

    setSavingMarketplaceProfile(true)
    const supabase = createClient()
    const payload = {
      coach_id: profile.id,
      slug,
      is_public: marketplaceProfile.is_public,
      headline: marketplaceProfile.headline?.trim() || null,
      bio: marketplaceProfile.bio?.trim() || null,
      location_label: marketplaceProfile.location_label?.trim() || null,
      consultation_url: marketplaceProfile.consultation_url?.trim() || null,
      price_from: marketplaceProfile.price_from ?? null,
      price_to: marketplaceProfile.price_to ?? null,
      currency: marketplaceProfile.currency || 'GBP',
      accepting_new_clients: marketplaceProfile.accepting_new_clients,
    }

    const { data, error } = await supabase
      .from('coach_public_profiles')
      .upsert(payload, { onConflict: 'coach_id' })
      .select('*')
      .single()

    if (error) {
      toast.error('Failed to save marketplace profile.')
      setSavingMarketplaceProfile(false)
      return
    }

    setMarketplaceProfile(data as CoachPublicProfile)
    toast.success(marketplaceProfile.is_public ? 'Marketplace profile updated and visible in Discover.' : 'Marketplace profile saved.')
    setSavingMarketplaceProfile(false)
  }

  function addCoachOffer() {
    if ((coachOffers.filter((offer) => offer.is_active).length) >= 3) {
      toast.error('Keep marketplace offers focused. You can have up to 3 active offers.')
      return
    }

    setCoachOffers((prev) => [
      ...prev,
      {
        id: `draft-${crypto.randomUUID()}`,
        localKey: crypto.randomUUID(),
        coach_id: profile?.id ?? '',
        title: '',
        description: '',
        price: 0,
        billing_period: 'monthly',
        cta_label: 'Apply for coaching',
        is_active: true,
        sort_order: prev.length,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])
  }

  function updateCoachOffer(localKey: string, patch: Partial<TrainerOfferDraft>) {
    setCoachOffers((prev) => prev.map((offer) => offer.localKey === localKey ? { ...offer, ...patch } : offer))
  }

  function moveCoachOffer(localKey: string, direction: -1 | 1) {
    setCoachOffers((prev) => {
      const index = prev.findIndex((offer) => offer.localKey === localKey)
      const target = index + direction
      if (index < 0 || target < 0 || target >= prev.length) return prev
      const next = [...prev]
      const [offer] = next.splice(index, 1)
      next.splice(target, 0, offer)
      return next.map((item, order) => ({ ...item, sort_order: order }))
    })
  }

  function archiveCoachOffer(localKey: string) {
    setCoachOffers((prev) => prev.map((offer) => offer.localKey === localKey ? { ...offer, is_active: false } : offer))
  }

  async function saveCoachOffers() {
    if (!profile || !isTrainer) return

    const activeOffers = coachOffers.filter((offer) => offer.is_active)
    if (activeOffers.length > 3) {
      toast.error('You can have up to 3 active offers.')
      return
    }

    for (const offer of activeOffers) {
      if (!offer.title.trim()) {
        toast.error('Each active offer needs a title.')
        return
      }
      if (offer.price <= 0) {
        toast.error('Each active offer needs a price greater than zero.')
        return
      }
    }

    setSavingCoachOffers(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('coach_offers')
      .upsert(
        coachOffers
          .filter((offer) => offer.is_active || !offer.id.startsWith('draft-'))
          .map((offer, index) => ({
            id: offer.id.startsWith('draft-') ? undefined : offer.id,
            coach_id: profile.id,
            title: offer.title.trim(),
            description: offer.description?.trim() || null,
            price: offer.price,
            billing_period: offer.billing_period,
            cta_label: offer.cta_label.trim() || 'Apply for coaching',
            is_active: offer.is_active,
            sort_order: index,
          })),
        { onConflict: 'id' }
      )

    if (error) {
      toast.error('Failed to save coach offers.')
      setSavingCoachOffers(false)
      return
    }

    const { data: refreshed } = await supabase
      .from('coach_offers')
      .select('*')
      .eq('coach_id', profile.id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    setCoachOffers(((refreshed as CoachOffer[] | null) ?? []).map((offer) => ({
      ...offer,
      localKey: offer.id,
    })))
    toast.success('Coach offers saved.')
    setSavingCoachOffers(false)
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

  const inputClass = fieldClass
  const selectClass = inputClass
  const marketplaceReadySignals = [
    profile.coach_specialties?.length ? `${profile.coach_specialties.length} specialties` : null,
    profile.coach_formats?.length ? profile.coach_formats.join(', ') : null,
    profile.coach_services?.length ? `${profile.coach_services.length} listed services` : null,
    profile.coach_style ? `Style: ${profile.coach_style.replace(/_/g, ' ')}` : null,
  ].filter(Boolean) as string[]
  const statusTone: Record<string, React.CSSProperties> = {
    open: { color: 'var(--warn)' },
    in_progress: { color: 'var(--acc)' },
    resolved: { color: 'var(--ok)' },
  }

  return (
    <div className="mx-auto max-w-[1100px]">
      <AppHeroPanel
        eyebrow="N° 10 · Account"
        title="Settings"
        accent="control."
        subtitle="Manage profile data, goals, coaching preferences, subscription, and the public coach surface from one calm control room."
      />

      {/* Subscription */}
      <div className="card mb-6 p-6">
        <div className="row mb-4 flex-wrap justify-between gap-3">
          <div className="row gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: 'var(--ink-3)', color: 'var(--acc)' }}
            >
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--fg-4)', letterSpacing: '0.14em' }}>
                SUBSCRIPTION
              </div>
              <h2 className="serif mt-1" style={{ fontSize: 24, lineHeight: 1.1 }}>
                {currentPlan.name}{' '}
                <span className="italic-serif" style={{ color: 'var(--fg-3)' }}>
                  plan.
                </span>
              </h2>
            </div>
          </div>
          {profile.role === 'free' ? (
            <a
              href="/pricing"
              className="btn btn-accent"
            >
              Upgrade
            </a>
          ) : (
            <button
              onClick={handleManageSubscription}
              disabled={managingSubscription}
              className="btn btn-ghost disabled:opacity-50"
            >
              {managingSubscription ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
              Manage Subscription
            </button>
          )}
        </div>
        <div className="row flex-wrap gap-2">
          <span className="chip">{currentPlan.price === 0 ? 'FREE' : `$${currentPlan.price}/MO`}</span>
          <span className="chip">{profile.role.toUpperCase()}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-row mb-6 overflow-x-auto">
        {visibleTabs.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`tab row shrink-0 gap-2 whitespace-nowrap ${activeTab === tab.key ? 'active' : ''}`}
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
              <label className={labelClass} style={labelStyle}>Full Name</label>
              <input type="text" value={form.full_name} onChange={(e) => set('full_name', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass} style={labelStyle}>Email</label>
              <input type="email" value={profile.email} disabled className={disabledFieldClass} style={fieldStyle} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass} style={labelStyle}>Age</label>
                <input type="number" value={form.age} onChange={(e) => set('age', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass} style={labelStyle}>Gender</label>
                <select value={form.gender} onChange={(e) => set('gender', e.target.value)} className={selectClass}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass} style={labelStyle}>Height (cm)</label>
                <input type="number" value={form.height_cm} onChange={(e) => set('height_cm', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass} style={labelStyle}>Weight (kg)</label>
                <input type="number" value={form.weight_kg} onChange={(e) => set('weight_kg', e.target.value)} className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass} style={labelStyle}>Activity Level</label>
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
              <label className={labelClass} style={labelStyle}>Fitness Goal</label>
              <select value={form.goal} onChange={(e) => set('goal', e.target.value)} className={selectClass}>
                <option value="">Select...</option>
                {FITNESS_GOALS.map(g => <option key={g.value} value={g.value}>{g.label} — {g.description}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass} style={labelStyle}>Target Weight (kg)</label>
              <input type="number" value={form.target_weight_kg} onChange={(e) => set('target_weight_kg', e.target.value)} className={inputClass} placeholder="Optional" />
            </div>
            <div>
              <label className={labelClass} style={labelStyle}>Timeline</label>
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
                <label className={labelClass} style={labelStyle}>Workout Days/Week</label>
                <select value={form.workout_days_per_week} onChange={(e) => set('workout_days_per_week', Number(e.target.value))} className={selectClass}>
                  {[1,2,3,4,5,6,7].map(n => <option key={n} value={n}>{n} days</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass} style={labelStyle}>Meals/Day</label>
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
              <label className={labelClass} style={labelStyle}>Medications</label>
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
              <label className={labelClass} style={labelStyle}>Training Experience</label>
              <select value={form.training_experience} onChange={(e) => set('training_experience', e.target.value)} className={selectClass}>
                <option value="">Select...</option>
                {TRAINING_EXPERIENCE.map(t => <option key={t.value} value={t.value}>{t.label} — {t.description}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass} style={labelStyle}>Equipment Access</label>
              <select value={form.equipment_access} onChange={(e) => set('equipment_access', e.target.value)} className={selectClass}>
                <option value="">Select...</option>
                {EQUIPMENT_ACCESS.map(e => <option key={e.value} value={e.value}>{e.label} — {e.description}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass} style={labelStyle}>Training Style</label>
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
                    className={chipClass(form.training_style.includes(s.value))}
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
              <label className={labelClass} style={labelStyle}>Dietary Restrictions</label>
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
                    className={chipClass(form.dietary_restrictions.includes(r.value))}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelClass} style={labelStyle}>Allergies</label>
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
              <label className={labelClass} style={labelStyle}>Favourite Foods</label>
              <input
                type="text"
                value={form.favourite_foods.join(', ')}
                onChange={(e) => set('favourite_foods', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                className={inputClass}
                placeholder="Enter favourite foods separated by commas"
              />
            </div>
            <div>
              <label className={labelClass} style={labelStyle}>Cooking Skill</label>
              <select value={form.cooking_skill} onChange={(e) => set('cooking_skill', e.target.value)} className={selectClass}>
                <option value="">Select...</option>
                {COOKING_SKILLS.map(c => <option key={c.value} value={c.value}>{c.label} — {c.description}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass} style={labelStyle}>Meal Prep Preference</label>
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
              <label className={labelClass} style={labelStyle}>Work Type</label>
              <select value={form.work_type} onChange={(e) => set('work_type', e.target.value)} className={selectClass}>
                <option value="">Select...</option>
                {WORK_TYPES.map(w => <option key={w.value} value={w.value}>{w.label} — {w.description}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass} style={labelStyle}>Sleep Quality</label>
              <select value={form.sleep_quality} onChange={(e) => set('sleep_quality', e.target.value)} className={selectClass}>
                <option value="">Select...</option>
                {SLEEP_QUALITY_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label} — {s.description}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass} style={labelStyle}>Stress Level</label>
              <select value={form.stress_level} onChange={(e) => set('stress_level', e.target.value)} className={selectClass}>
                <option value="">Select...</option>
                {STRESS_LEVELS.map(s => <option key={s.value} value={s.value}>{s.label} — {s.description}</option>)}
              </select>
            </div>
          </div>
        )}

        {activeTab === 'trainer_intake' && (
          <div className="space-y-6">
            <div className="card-2 p-5">
              <h3 className="serif" style={{ fontSize: 20, color: 'var(--fg)' }}>Coach custom intake questions</h3>
              <p className="mt-2 text-sm leading-6" style={{ color: 'var(--fg-2)' }}>
                Add up to 5 extra questions after the standard client intake. These are best for your coaching preferences, equipment checks, and prospect qualification.
              </p>
            </div>

            <BaseClientIntakePreview />

            <div className="card-2 row justify-between gap-4 p-4">
              <div>
                <div className="serif" style={{ fontSize: 18, color: 'var(--fg)' }}>Active questions</div>
                <div className="mono mt-1" style={{ fontSize: 10, color: 'var(--fg-4)', letterSpacing: '0.1em' }}>{trainerQuestions.filter((question) => question.is_active).length} OF 5 IN USE</div>
              </div>
              <button
                type="button"
                onClick={addTrainerQuestion}
                disabled={trainerQuestions.filter((question) => question.is_active).length >= 5}
                className="btn btn-accent disabled:opacity-50"
              >
                Add question
              </button>
            </div>

            {loadingTrainerQuestions ? (
              <div className="text-sm" style={{ color: 'var(--fg-3)' }}>Loading custom intake questions...</div>
            ) : trainerQuestions.length === 0 ? (
              <div className="card-2 px-4 py-8 text-sm" style={{ color: 'var(--fg-3)' }}>
                No custom questions yet. Add one if you want clients to answer coach-specific questions after the standard intake.
              </div>
            ) : (
              <div className="space-y-4">
                {trainerQuestions.map((question, index) => (
                  <div key={question.localKey} className={`card-2 p-5 ${question.is_active ? '' : 'opacity-80'}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="serif" style={{ fontSize: 17, color: 'var(--fg)' }}>
                          Question {index + 1} {question.is_active ? '' : '(Archived)'}
                        </div>
                        <div className="mono mt-1" style={{ fontSize: 10, color: 'var(--fg-4)', letterSpacing: '0.12em' }}>{QUESTION_TYPE_OPTIONS.find((option) => option.value === question.type)?.label}</div>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => moveTrainerQuestion(question.localKey, -1)} disabled={index === 0} className="btn btn-ghost px-3 py-1.5 text-xs disabled:opacity-40">Up</button>
                        <button type="button" onClick={() => moveTrainerQuestion(question.localKey, 1)} disabled={index === trainerQuestions.length - 1} className="btn btn-ghost px-3 py-1.5 text-xs disabled:opacity-40">Down</button>
                        {question.is_active && (
                          <button type="button" onClick={() => archiveTrainerQuestion(question.localKey)} className="btn btn-ghost px-3 py-1.5 text-xs" style={{ color: 'var(--warn)' }}>
                            Archive
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 space-y-4">
                      <div>
                        <label className={labelClass} style={labelStyle}>Question label</label>
                        <input
                          type="text"
                          value={question.label}
                          onChange={(e) => updateTrainerQuestion(question.localKey, { label: e.target.value })}
                          className={inputClass}
                          placeholder="e.g. Are you willing to track macros?"
                          disabled={!question.is_active}
                        />
                      </div>
                      <div>
                        <label className={labelClass} style={labelStyle}>Help text</label>
                        <input
                          type="text"
                          value={question.help_text ?? ''}
                          onChange={(e) => updateTrainerQuestion(question.localKey, { help_text: e.target.value })}
                          className={inputClass}
                          placeholder="Optional guidance shown under the question"
                          disabled={!question.is_active}
                        />
                      </div>
                      <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                        <div>
                          <label className={labelClass} style={labelStyle}>Answer type</label>
                          <select
                            value={question.type}
                            onChange={(e) => updateTrainerQuestion(question.localKey, { type: e.target.value as CustomIntakeQuestionType, options: e.target.value === 'single_select' || e.target.value === 'multi_select' ? question.options : [] })}
                            className={selectClass}
                            disabled={!question.is_active}
                          >
                            {QUESTION_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                          </select>
                        </div>
                        <label className="mono mt-6 inline-flex items-center gap-2" style={{ fontSize: 11, color: 'var(--fg-4)', letterSpacing: '0.12em' }}>
                          <input
                            type="checkbox"
                            checked={question.required}
                            onChange={(e) => updateTrainerQuestion(question.localKey, { required: e.target.checked })}
                            disabled={!question.is_active}
                          />
                          REQUIRED
                        </label>
                      </div>
                      {(question.type === 'single_select' || question.type === 'multi_select') && (
                        <div>
                          <label className={labelClass} style={labelStyle}>Options</label>
                          <input
                            type="text"
                            value={question.options.join(', ')}
                            onChange={(e) => updateTrainerQuestion(question.localKey, {
                              options: e.target.value.split(',').map((item) => item.trim()).filter(Boolean).slice(0, 6),
                            })}
                            className={inputClass}
                            placeholder="Comma separated options, max 6"
                            disabled={!question.is_active}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end border-t pt-4" style={{ borderColor: 'var(--line)' }}>
              <button
                type="button"
                onClick={saveTrainerQuestions}
                disabled={savingTrainerQuestions || loadingTrainerQuestions}
                className="btn btn-accent disabled:opacity-50"
              >
                {savingTrainerQuestions ? 'Saving...' : 'Save custom intake questions'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'trainer_marketplace' && (
          <div className="space-y-6">
            <div className="card-2 p-5">
              <h3 className="serif" style={{ fontSize: 20, color: 'var(--fg)' }}>Coach marketplace profile</h3>
              <p className="mt-2 text-sm leading-6" style={{ color: 'var(--fg-2)' }}>
                This powers the Discover Coaches experience. Your coach specialties, formats, and services from onboarding are reused as trust signals, while this tab controls your public listing, pricing, and lead intake status.
              </p>
            </div>

            {loadingMarketplaceProfile ? (
              <div className="text-sm" style={{ color: 'var(--fg-3)' }}>Loading marketplace profile...</div>
            ) : (
              <>
                <div className="card-2 p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="serif" style={{ fontSize: 18, color: 'var(--fg)' }}>Discovery visibility</div>
                      <p className="mt-1 text-sm leading-6" style={{ color: 'var(--fg-2)' }}>
                        Turn this on when your headline, bio, pricing, and coach setup are ready for public discovery.
                      </p>
                    </div>
                    <label className="inline-flex items-center gap-3 text-sm font-medium" style={{ color: 'var(--fg)' }}>
                      <input
                        type="checkbox"
                        checked={marketplaceProfile.is_public}
                        onChange={(e) => setMarketplaceField('is_public', e.target.checked)}
                      />
                      Show me in Discover
                    </label>
                  </div>

                  <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="serif" style={{ fontSize: 18, color: 'var(--fg)' }}>Lead availability</div>
                      <p className="mt-1 text-sm leading-6" style={{ color: 'var(--fg-2)' }}>
                        If you are at capacity, keep your listing visible but pause new inbound requests.
                      </p>
                    </div>
                    <label className="inline-flex items-center gap-3 text-sm font-medium" style={{ color: 'var(--fg)' }}>
                      <input
                        type="checkbox"
                        checked={marketplaceProfile.accepting_new_clients}
                        onChange={(e) => setMarketplaceField('accepting_new_clients', e.target.checked)}
                      />
                      Accepting new clients
                    </label>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className={labelClass} style={labelStyle}>Profile slug</label>
                    <input
                      type="text"
                      value={marketplaceProfile.slug}
                      disabled
                      className={disabledFieldClass} style={fieldStyle}
                    />
                    <p className="mt-1 text-xs" style={{ color: 'var(--fg-3)' }}>Generated from your name. We can make this editable later if needed.</p>
                  </div>
                  <div>
                    <label className={labelClass} style={labelStyle}>Location</label>
                    <input
                      type="text"
                      value={marketplaceProfile.location_label ?? ''}
                      onChange={(e) => setMarketplaceField('location_label', e.target.value)}
                      className={inputClass}
                      placeholder="e.g. London, UK or Online only"
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass} style={labelStyle}>Headline</label>
                  <input
                    type="text"
                    value={marketplaceProfile.headline ?? ''}
                    onChange={(e) => setMarketplaceField('headline', e.target.value)}
                    className={inputClass}
                    placeholder="e.g. Helping busy professionals lose fat without training 6 days a week"
                  />
                </div>

                <div>
                  <label className={labelClass} style={labelStyle}>Short bio</label>
                  <textarea
                    value={marketplaceProfile.bio ?? ''}
                    onChange={(e) => setMarketplaceField('bio', e.target.value)}
                    className={`${inputClass} min-h-[140px]`}
                    placeholder="What kind of clients you help, how you coach, and what makes your approach a strong fit."
                  />
                </div>

                <div>
                  <label className={labelClass} style={labelStyle}>Consultation link</label>
                  <input
                    type="url"
                    value={marketplaceProfile.consultation_url ?? ''}
                    onChange={(e) => setMarketplaceField('consultation_url', e.target.value)}
                    className={inputClass}
                    placeholder="https://cal.com/your-name/intro-call"
                  />
                  <p className="mt-1 text-xs" style={{ color: 'var(--fg-3)' }}>Optional. Add this if you want discovery to feel more like a Trainerize-style consult flow.</p>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className={labelClass} style={labelStyle}>Price from</label>
                    <input
                      type="number"
                      min={0}
                      value={marketplaceProfile.price_from ?? ''}
                      onChange={(e) => setMarketplaceField('price_from', e.target.value ? Number(e.target.value) : null)}
                      className={inputClass}
                      placeholder="120"
                    />
                  </div>
                  <div>
                    <label className={labelClass} style={labelStyle}>Price to</label>
                    <input
                      type="number"
                      min={0}
                      value={marketplaceProfile.price_to ?? ''}
                      onChange={(e) => setMarketplaceField('price_to', e.target.value ? Number(e.target.value) : null)}
                      className={inputClass}
                      placeholder="250"
                    />
                  </div>
                  <div>
                    <label className={labelClass} style={labelStyle}>Currency</label>
                    <select
                      value={marketplaceProfile.currency}
                      onChange={(e) => setMarketplaceField('currency', e.target.value)}
                      className={selectClass}
                    >
                      {COACH_MARKETPLACE_CURRENCIES.map((code) => (
                        <option key={code} value={code}>{code}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="card-2 p-5">
                  <div className="mono" style={{ fontSize: 10, color: 'var(--fg-4)', letterSpacing: '0.12em' }}>PUBLIC DISCOVERY PREVIEW</div>
                  <div className="mt-4 space-y-3">
                    <div className="serif" style={{ fontSize: 22, color: 'var(--fg)' }}>{form.full_name || profile.full_name || 'Coach profile'}</div>
                    <div className="text-sm" style={{ color: 'var(--fg-2)' }}>{marketplaceProfile.headline || 'Add a headline to explain the kind of coaching you offer.'}</div>
                    <div className="flex flex-wrap gap-2">
                      {marketplaceReadySignals.length > 0 ? marketplaceReadySignals.map((item) => (
                        <span key={item} className="chip">
                          {item}
                        </span>
                      )) : (
                        <span className="text-sm" style={{ color: 'var(--warn)' }}>Complete your coach onboarding to improve how your listing appears in discovery.</span>
                      )}
                    </div>
                    <div className="text-sm" style={{ color: 'var(--fg-3)' }}>
                      {formatCoachPriceRange(marketplaceProfile.price_from, marketplaceProfile.price_to, marketplaceProfile.currency)}
                      {marketplaceProfile.location_label ? ` · ${marketplaceProfile.location_label}` : ''}
                    </div>
                    {marketplaceProfile.consultation_url && (
                      <div className="text-sm" style={{ color: 'var(--acc)' }}>Consult link ready</div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end border-t pt-4" style={{ borderColor: 'var(--line)' }}>
                  <button
                    type="button"
                    onClick={saveMarketplaceProfile}
                    disabled={savingMarketplaceProfile}
                    className="btn btn-accent disabled:opacity-50"
                  >
                    {savingMarketplaceProfile ? 'Saving...' : 'Save marketplace profile'}
                  </button>
                </div>

                <div className="card-2 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="serif" style={{ fontSize: 18, color: 'var(--fg)' }}>Coaching offers</div>
                      <p className="mt-1 text-sm leading-6" style={{ color: 'var(--fg-2)' }}>
                        Define up to 3 public packages so leads can apply for a specific offer instead of sending a vague message.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={addCoachOffer}
                      disabled={coachOffers.filter((offer) => offer.is_active).length >= 3}
                      className="btn btn-accent disabled:opacity-50"
                    >
                      Add offer
                    </button>
                  </div>

                  {loadingCoachOffers ? (
                    <div className="mt-4 text-sm" style={{ color: 'var(--fg-3)' }}>Loading offers...</div>
                  ) : coachOffers.length === 0 ? (
                    <div className="card-2 mt-4 px-4 py-8 text-sm" style={{ color: 'var(--fg-3)' }}>
                      No public offers yet. Add a focused monthly, weekly, or one-off package to help prospects self-qualify.
                    </div>
                  ) : (
                    <div className="mt-4 space-y-4">
                      {coachOffers.map((offer, index) => (
                        <div key={offer.localKey} className={`card-2 p-5 ${offer.is_active ? '' : 'opacity-80'}`}>
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="serif" style={{ fontSize: 17, color: 'var(--fg)' }}>
                                Offer {index + 1} {offer.is_active ? '' : '(Archived)'}
                              </div>
                              <div className="mono mt-1" style={{ fontSize: 10, color: 'var(--fg-4)', letterSpacing: '0.12em' }}>
                                {formatOfferPrice(offer.price || 0, marketplaceProfile.currency, offer.billing_period)}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button type="button" onClick={() => moveCoachOffer(offer.localKey, -1)} disabled={index === 0} className="btn btn-ghost px-3 py-1.5 text-xs disabled:opacity-40">Up</button>
                              <button type="button" onClick={() => moveCoachOffer(offer.localKey, 1)} disabled={index === coachOffers.length - 1} className="btn btn-ghost px-3 py-1.5 text-xs disabled:opacity-40">Down</button>
                              {offer.is_active && (
                                <button type="button" onClick={() => archiveCoachOffer(offer.localKey)} className="btn btn-ghost px-3 py-1.5 text-xs" style={{ color: 'var(--warn)' }}>
                                  Archive
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="mt-4 grid gap-4 md:grid-cols-2">
                            <div>
                              <label className={labelClass} style={labelStyle}>Offer title</label>
                              <input
                                type="text"
                                value={offer.title}
                                onChange={(e) => updateCoachOffer(offer.localKey, { title: e.target.value })}
                                className={inputClass}
                                placeholder="e.g. Premium monthly coaching"
                                disabled={!offer.is_active}
                              />
                            </div>
                            <div>
                              <label className={labelClass} style={labelStyle}>CTA label</label>
                              <input
                                type="text"
                                value={offer.cta_label}
                                onChange={(e) => updateCoachOffer(offer.localKey, { cta_label: e.target.value })}
                                className={inputClass}
                                placeholder="Apply for coaching"
                                disabled={!offer.is_active}
                              />
                            </div>
                            <div>
                              <label className={labelClass} style={labelStyle}>Price</label>
                              <input
                                type="number"
                                min={1}
                                value={offer.price}
                                onChange={(e) => updateCoachOffer(offer.localKey, { price: Number(e.target.value) || 0 })}
                                className={inputClass}
                                disabled={!offer.is_active}
                              />
                            </div>
                            <div>
                              <label className={labelClass} style={labelStyle}>Billing period</label>
                              <select
                                value={offer.billing_period}
                                onChange={(e) => updateCoachOffer(offer.localKey, { billing_period: e.target.value as CoachOfferBillingPeriod })}
                                className={selectClass}
                                disabled={!offer.is_active}
                              >
                                {COACH_OFFER_BILLING_PERIODS.map((period) => (
                                  <option key={period} value={period}>{period.replace('_', ' ')}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="mt-4">
                            <label className={labelClass} style={labelStyle}>Offer description</label>
                            <textarea
                              value={offer.description ?? ''}
                              onChange={(e) => updateCoachOffer(offer.localKey, { description: e.target.value })}
                              className={`${inputClass} min-h-[110px]`}
                              placeholder="Describe what is included, who it is for, and what the first month looks like."
                              disabled={!offer.is_active}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 flex justify-end border-t pt-4" style={{ borderColor: 'var(--line)' }}>
                    <button
                      type="button"
                      onClick={saveCoachOffers}
                      disabled={savingCoachOffers || loadingCoachOffers}
                      className="btn btn-accent disabled:opacity-50"
                    >
                      {savingCoachOffers ? 'Saving...' : 'Save coaching offers'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Account Tab */}
        {activeTab === 'account' && (
          <div className="space-y-8">
            <div className="card-2 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="serif" style={{ fontSize: 20, color: 'var(--fg)' }}>Beta support</h3>
                  <p className="mt-2 text-sm leading-6" style={{ color: 'var(--fg-2)' }}>
                    Need help with onboarding, invites, trainer-client linking, or a broken workflow? Contact support or review the public beta guidance.
                  </p>
                </div>
                <AlertTriangle className="h-5 w-5" style={{ color: 'var(--acc)' }} />
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <a
                  href={`mailto:${SUPPORT_EMAIL}?subject=treno%20beta%20support`}
                  className="btn btn-accent"
                >
                  Email support
                  <ExternalLink className="h-4 w-4" />
                </a>
                <Link
                  href="/support"
                  className="btn btn-ghost"
                >
                  Support page
                </Link>
                <Link
                  href="/faq"
                  className="btn btn-ghost"
                >
                  Beta FAQ
                </Link>
              </div>
            </div>

            <div className="card-2 p-5">
              <h3 className="serif" style={{ fontSize: 20, color: 'var(--fg)' }}>Report an issue</h3>
              <p className="mt-2 text-sm leading-6" style={{ color: 'var(--fg-2)' }}>
                Send bugs, onboarding issues, and workflow blockers directly into the beta support queue.
              </p>
              <div className="mt-4 space-y-4">
                <div>
                  <label className={labelClass} style={labelStyle}>Category</label>
                  <select value={supportCategory} onChange={(e) => setSupportCategory(e.target.value)} className={selectClass}>
                    <option value="bug">Bug</option>
                    <option value="invite">Invite / onboarding</option>
                    <option value="billing">Billing</option>
                    <option value="feedback">Product feedback</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass} style={labelStyle}>Subject</label>
                  <input
                    type="text"
                    value={supportSubject}
                    onChange={(e) => setSupportSubject(e.target.value)}
                    className={inputClass}
                    placeholder="Short summary of the issue"
                  />
                </div>
                <div>
                  <label className={labelClass} style={labelStyle}>Message</label>
                  <textarea
                    value={supportMessage}
                    onChange={(e) => setSupportMessage(e.target.value)}
                    className={`${inputClass} min-h-[120px]`}
                    placeholder="What happened, what you expected, and how we can reproduce it"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSupportRequest}
                  disabled={submittingSupport || !supportSubject.trim() || !supportMessage.trim()}
                  className="btn btn-accent disabled:opacity-50"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>{submittingSupport ? 'Sending...' : 'Submit report'}</span>
                </button>
              </div>
            </div>

            <div className="card-2 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="serif" style={{ fontSize: 20, color: 'var(--fg)' }}>Recent support requests</h3>
                  <p className="mt-2 text-sm leading-6" style={{ color: 'var(--fg-2)' }}>
                    Track the most recent issues you have already sent to the beta support queue.
                  </p>
                </div>
              </div>

              {loadingSupportHistory ? (
                <div className="mt-4 text-sm" style={{ color: 'var(--fg-3)' }}>Loading support history...</div>
              ) : supportHistory.length === 0 ? (
                <div className="card-2 mt-4 px-4 py-5 text-sm" style={{ color: 'var(--fg-3)' }}>
                  No support requests yet. Use the form above if you hit a blocker or want to share product feedback.
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {supportHistory.map((request) => (
                    <div key={request.id} className="card-2 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="serif" style={{ fontSize: 16, color: 'var(--fg)' }}>{request.subject}</div>
                          <div className="mono mt-1" style={{ fontSize: 10, color: 'var(--fg-4)', letterSpacing: '0.12em' }}>
                            {request.category} · {new Date(request.created_at).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </div>
                        </div>
                        <span className="chip capitalize" style={statusTone[request.status]}>
                          {request.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Change Password */}
            <div className="card-2 p-5">
              <h3 className="serif mb-4 flex items-center gap-2" style={{ fontSize: 20, color: 'var(--fg)' }}>
                <Lock className="h-5 w-5" style={{ color: 'var(--acc)' }} />
                Change Password
              </h3>
              <div className="space-y-3">
                <div>
                  <label className={labelClass} style={labelStyle}>New Password</label>
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
                  <label className={labelClass} style={labelStyle}>Confirm New Password</label>
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
                  className="btn btn-accent disabled:opacity-50"
                >
                  <Lock className="h-4 w-4" />
                  <span>{changingPassword ? 'Updating...' : 'Update Password'}</span>
                </button>
              </div>
            </div>

            {/* Delete Account */}
            <div className="card-2 p-5">
              <h3 className="serif mb-2 flex items-center gap-2" style={{ fontSize: 20, color: 'var(--warn)' }}>
                <AlertTriangle className="h-5 w-5" />
                Danger Zone
              </h3>
              <p className="mb-4 text-sm" style={{ color: 'var(--fg-2)' }}>
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
              {!showDeleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="btn btn-ghost"
                  style={{ color: 'var(--warn)' }}
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete Account</span>
                </button>
              ) : (
                <div className="card-2 space-y-3 p-4">
                  <p className="text-sm font-medium" style={{ color: 'var(--warn)' }}>
                    Type <span className="mono rounded px-1" style={{ background: 'var(--ink-3)' }}>DELETE</span> to confirm:
                  </p>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    className={inputClass}
                    placeholder="Type DELETE"
                  />
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleDeleteAccount}
                      disabled={deleteConfirmText !== 'DELETE' || deleting}
                      className="btn btn-accent disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>{deleting ? 'Deleting...' : 'Permanently Delete'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText('') }}
                      className="btn btn-ghost"
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
        {activeTab !== 'account' && activeTab !== 'trainer_intake' && activeTab !== 'trainer_marketplace' && (
          <div className="mt-6 flex justify-end border-t pt-4" style={{ borderColor: 'var(--line)' }}>
            <button
              type="submit"
              disabled={saving}
              className="btn btn-accent disabled:opacity-50"
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
