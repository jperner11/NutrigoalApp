'use client'

import { useState, useEffect, useRef } from 'react'
import {
  ArrowRight, ArrowLeft, User, Utensils,
  Calculator, Heart, Dumbbell, Briefcase, Calendar, Sparkles, Users, ClipboardList, MessageSquare,
  Cookie, Camera, Globe,
} from 'lucide-react'
import {
  ACTIVITY_LEVELS, FITNESS_GOALS, TRAINING_EXPERIENCE, EQUIPMENT_ACCESS,
  TRAINING_STYLES, SECONDARY_TRAINING_GOALS, SESSION_DURATIONS, CARDIO_TYPES,
  COMMON_INJURIES, COMMON_CONDITIONS, DIETARY_RESTRICTIONS,
  COMMON_FOOD_DISLIKES, COOKING_SKILLS, MEAL_PREP_PREFERENCES, WORK_TYPES,
  SLEEP_QUALITY_OPTIONS, STRESS_LEVELS, GOAL_TIMELINES, MOTIVATIONS,
  ALCOHOL_FREQUENCIES, SNACK_MOTIVATIONS, SNACK_PREFERENCES,
  PLAN_PREFERENCES, HARDER_DAYS_OPTIONS, EATING_OUT_FREQUENCIES,
  calculateNutritionTargets,
} from '@nutrigoal/shared'
import type { UserMetrics, PersonalTrainerCustomIntakeQuestion } from '@nutrigoal/shared'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import {
  clearWizardAnswers,
  loadWizardAnswers,
  saveLeadWizardPreferences,
  type CoachWizardAnswers,
} from '@/lib/findCoach'
import { buildCoachProfileSlug, COACH_MARKETPLACE_CURRENCIES } from '@/lib/coachMarketplace'
import { toast } from 'react-hot-toast'
import { isManagedClientRole, isTrainerRole } from '@nutrigoal/shared'
import { BaseClientIntakePreview } from '@/components/onboarding/BaseClientIntakePreview'
import {
  TrainerCustomQuestionsEditor,
  createDraftCustomQuestion,
  type DraftCustomQuestion,
} from '@/components/onboarding/TrainerCustomQuestionsEditor'

const CLIENT_STEPS = ['My Stats', 'Lifestyle', 'Food Preferences', 'Snack Habits', 'Health', 'Training', 'Goals', 'Schedule', 'Review']
const MANAGED_CLIENT_STEPS = ['My Stats', 'Lifestyle', 'Food Preferences', 'Snack Habits', 'Health', 'Training', 'Goals', 'Schedule', 'Coach Questions', 'Review']
const TRAINER_STEPS = ['Coach Profile', 'Your Public Profile', 'Ideal Clients', 'Coaching Style', 'Client Intake', 'Workflow']
const COACH_SPECIALTY_OPTIONS = ['Fat loss', 'Muscle gain', 'General fitness', 'Lifestyle nutrition', 'Strength training', 'Online coaching']
const COACH_SERVICE_OPTIONS = ['Training plans', 'Nutrition guidance', 'Habit coaching', 'Check-ins', 'Messaging support', 'Progress reviews']
const COACH_FORMAT_OPTIONS = ['Online', 'In person', 'Hybrid']
const COACH_INTAKE_REQUIREMENT_OPTIONS = ['Goals', 'Injuries', 'Medical conditions', 'Food preferences', 'Schedule', 'Progress photos', 'Measurements']
type IntakeAnswerValue = string | string[]
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2).toString().padStart(2, '0')
  const m = i % 2 === 0 ? '00' : '30'
  return `${h}:${m}`
})

function fmt12(t: string) {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${m.toString().padStart(2, '0')} ${ampm}`
}

function mapWizardGoal(goal: string | null): UserMetrics['goal'] | null {
  if (goal === 'Fat loss') return 'cutting'
  if (goal === 'Muscle gain') return 'bulking'
  if (goal === 'Body recomp') return 'maintenance'
  if (goal === 'General fitness' || goal === 'Lifestyle/wellness' || goal === 'Sport-specific') return 'maintenance'
  return null
}

function mapWizardTimeline(timeline: string | null) {
  if (timeline === '1-4 weeks') return '4_weeks'
  if (timeline === '1-3 months') return '12_weeks'
  if (timeline === '3-6 months') return '6_months'
  if (timeline === 'As long as it takes') return 'steady'
  if (timeline === 'I just need one session') return '4_weeks'
  return null
}

function mapWizardExperience(experience: string | null) {
  if (experience === 'Complete beginner') return 'beginner'
  if (experience === 'Some experience') return 'beginner'
  if (experience === 'Intermediate') return 'intermediate'
  if (experience === 'Advanced') return 'advanced'
  return null
}

function mapWizardFocusAreas(focusAreas: string[]) {
  return Array.from(new Set(focusAreas.flatMap((area) => {
    if (area === 'Weight training') return ['strength']
    if (area === 'Cardio' || area === 'HIIT' || area === 'Sport performance') return ['endurance']
    if (area === 'Mobility') return ['functional']
    return []
  })))
}

export default function OnboardingPage() {
  const { profile } = useUser()
  const wizardPrefillApplied = useRef(false)
  const wizardAnswersRef = useRef<CoachWizardAnswers | null>(null)
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const isTrainer = isTrainerRole(profile?.role)
  const isManagedClient = isManagedClientRole(profile?.role)
  const [coachCustomQuestions, setCoachCustomQuestions] = useState<PersonalTrainerCustomIntakeQuestion[]>([])
  const [coachQuestionAnswers, setCoachQuestionAnswers] = useState<Record<string, IntakeAnswerValue>>({})
  const steps = isTrainer ? TRAINER_STEPS : isManagedClient && coachCustomQuestions.length > 0 ? MANAGED_CLIENT_STEPS : CLIENT_STEPS

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [step])

  useEffect(() => {
    if (profile?.onboarding_completed) {
      window.location.href = '/dashboard'
    }
  }, [profile])

  useEffect(() => {
    if (!profile || isTrainer || wizardPrefillApplied.current) return

    const wizardAnswers = loadWizardAnswers()
    if (!wizardAnswers) return

    wizardAnswersRef.current = wizardAnswers
    wizardPrefillApplied.current = true

    const mappedGoal = mapWizardGoal(wizardAnswers.goal)
    const mappedTimeline = mapWizardTimeline(wizardAnswers.timeline)
    const mappedExperience = mapWizardExperience(wizardAnswers.experience_level)
    const mappedTrainingStyles = mapWizardFocusAreas(wizardAnswers.focus_areas)

    if (mappedGoal) setGoal(mappedGoal)
    if (mappedTimeline) setGoalTimeline(mappedTimeline)
    if (mappedExperience) setExperience(mappedExperience)
    if (mappedTrainingStyles.length > 0) setTrainingStyles(mappedTrainingStyles)
    if (wizardAnswers.context_text.trim()) setDesiredOutcome(wizardAnswers.context_text.trim())
  }, [profile, isTrainer])

  useEffect(() => {
    async function loadCoachQuestions() {
      if (!profile || !isManagedClient) return
      const trainerId = profile.personal_trainer_id ?? profile.nutritionist_id
      if (!trainerId) return

      const supabase = createClient()
      const { data: questions } = await supabase
        .from('personal_trainer_custom_intake_questions')
        .select('*')
        .eq('trainer_id', trainerId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })

      const customQuestions = (questions as PersonalTrainerCustomIntakeQuestion[] | null) ?? []
      setCoachCustomQuestions(customQuestions)

      if (customQuestions.length === 0) return

      const { data: existingResponses } = await supabase
        .from('personal_trainer_custom_intake_responses')
        .select('question_id, response_text, response_json')
        .eq('client_id', profile.id)
        .eq('trainer_id', trainerId)

      if (!existingResponses) return

      const mapped = Object.fromEntries(existingResponses.map((response) => [
        response.question_id,
        Array.isArray(response.response_json) ? response.response_json : response.response_text ?? '',
      ]))
      setCoachQuestionAnswers(mapped)
    }

    loadCoachQuestions()
  }, [profile, isManagedClient])

  // ── Trainer Setup ──
  const [coachSpecialties, setCoachSpecialties] = useState<string[]>(profile?.coach_specialties ?? [])
  const [coachIdealClient, setCoachIdealClient] = useState(profile?.coach_ideal_client ?? '')
  const [coachServices, setCoachServices] = useState<string[]>(profile?.coach_services ?? [])
  const [coachFormats, setCoachFormats] = useState<string[]>(profile?.coach_formats ?? [])
  const [coachCheckInFrequency, setCoachCheckInFrequency] = useState(profile?.coach_check_in_frequency ?? 'weekly')
  const [coachStyle, setCoachStyle] = useState(profile?.coach_style ?? 'balanced')
  const [coachIntakeRequirements, setCoachIntakeRequirements] = useState<string[]>(profile?.coach_intake_requirements ?? [])
  const [coachPostIntakeAction, setCoachPostIntakeAction] = useState(profile?.coach_post_intake_action ?? 'review_and_plan')
  const [coachAppFocus, setCoachAppFocus] = useState(profile?.coach_app_focus ?? 'client_management')
  const [trainerDraftQuestions, setTrainerDraftQuestions] = useState<DraftCustomQuestion[]>([])
  const initialTrainerQuestionIdsRef = useRef<string[]>([])

  // ── Public Profile step state ──
  const [profileHeadline, setProfileHeadline] = useState('')
  const [profileBio, setProfileBio] = useState('')
  const [profilePriceFrom, setProfilePriceFrom] = useState('')
  const [profilePriceTo, setProfilePriceTo] = useState('')
  const [profileCurrency, setProfileCurrency] = useState('USD')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url ?? null)


  useEffect(() => {
    if (!profile || !isTrainer) return
    const supabase = createClient()
    let cancelled = false
    supabase
      .from('personal_trainer_custom_intake_questions')
      .select('*')
      .eq('trainer_id', profile.id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (cancelled || !data) return
        const rows = data as PersonalTrainerCustomIntakeQuestion[]
        initialTrainerQuestionIdsRef.current = rows.map((r) => r.id)
        setTrainerDraftQuestions(
          rows.map((q) =>
            createDraftCustomQuestion({
              localId: q.id,
              label: q.label,
              help_text: q.help_text ?? '',
              type: q.type,
              options: q.options ?? [],
              required: q.required,
            })
          )
        )
      })
    return () => {
      cancelled = true
    }
  }, [profile, isTrainer])

  // ── Step 0: My Stats ──
  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [age, setAge] = useState(profile?.age?.toString() ?? '')
  const [gender, setGender] = useState<'male' | 'female'>((profile?.gender as 'male' | 'female') ?? 'male')
  const [height, setHeight] = useState(profile?.height_cm?.toString() ?? '')
  const [weight, setWeight] = useState(profile?.weight_kg?.toString() ?? '')
  const [goal, setGoal] = useState<UserMetrics['goal']>(
    (profile?.goal as UserMetrics['goal']) ?? 'cutting'
  )
  const [bodyFatPct, setBodyFatPct] = useState(profile?.body_fat_pct?.toString() ?? '')
  const [targetWeight, setTargetWeight] = useState(profile?.target_weight_kg?.toString() ?? '')
  const [goalTimeline, setGoalTimeline] = useState(profile?.goal_timeline ?? 'steady')
  const [desiredOutcome, setDesiredOutcome] = useState(profile?.desired_outcome ?? '')
  const [pastDietingChallenges, setPastDietingChallenges] = useState(profile?.past_dieting_challenges ?? '')

  // ── Step 1: My Lifestyle ──
  const [workType, setWorkType] = useState(profile?.work_type ?? 'desk')
  const [activityLevel, setActivityLevel] = useState<UserMetrics['activityLevel']>(
    (profile?.activity_level as UserMetrics['activityLevel']) ?? 'moderately_active'
  )
  const [sleepHours, setSleepHours] = useState(profile?.sleep_hours?.toString() ?? '7')
  const [sleepQuality, setSleepQuality] = useState(profile?.sleep_quality ?? 'average')
  const [stressLevel, setStressLevel] = useState(profile?.stress_level ?? 'moderate')
  const [alcoholFrequency, setAlcoholFrequency] = useState(profile?.alcohol_frequency ?? 'none')
  const [alcoholDetails, setAlcoholDetails] = useState(profile?.alcohol_details ?? '')

  // ── Step 2: My Food Preferences ──
  const [favouriteFoods, setFavouriteFoods] = useState(profile?.favourite_foods?.join(', ') ?? '')
  const [foodDislikes, setFoodDislikes] = useState(profile?.food_dislikes?.join(', ') ?? '')
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>(profile?.dietary_restrictions ?? [])
  const [allergies, setAllergies] = useState(profile?.allergies?.join(', ') ?? '')
  const [cookingSkill, setCookingSkill] = useState(profile?.cooking_skill ?? 'intermediate')
  const [mealPrepPref, setMealPrepPref] = useState(profile?.meal_prep_preference ?? 'daily')
  const [foodAdventurousness, setFoodAdventurousness] = useState(profile?.food_adventurousness ?? 5)

  // ── Step 3: My Snack Habits ──
  const [currentSnacks, setCurrentSnacks] = useState(profile?.current_snacks?.join(', ') ?? '')
  const [snackMotivation, setSnackMotivation] = useState(profile?.snack_motivation ?? 'hunger')
  const [snackPreference, setSnackPreference] = useState(profile?.snack_preference ?? 'both')
  const [lateNightSnacking, setLateNightSnacking] = useState(profile?.late_night_snacking ?? false)
  const [harderDays, setHarderDays] = useState(profile?.harder_days ?? 'weekends')
  const [eatingOutFrequency, setEatingOutFrequency] = useState(profile?.eating_out_frequency ?? 'sometimes')
  const [planPreference, setPlanPreference] = useState(profile?.plan_preference ?? 'balanced')
  const [weeklyDerailers, setWeeklyDerailers] = useState(profile?.weekly_derailers ?? '')

  // ── Step 4: Health & Medical ──
  const [injuries, setInjuries] = useState<string[]>(profile?.injuries ?? [])
  const [customInjury, setCustomInjury] = useState('')
  const [conditions, setConditions] = useState<string[]>(profile?.medical_conditions ?? [])
  const [medications, setMedications] = useState(profile?.medications?.join(', ') ?? '')

  // ── Step 5: Training Background ──
  const [yearsTraining, setYearsTraining] = useState(profile?.years_training?.toString() ?? '')
  const [experience, setExperience] = useState(profile?.training_experience ?? 'beginner')
  const [equipmentAccess, setEquipmentAccess] = useState(profile?.equipment_access ?? 'full_gym')
  const [trainingStyles, setTrainingStyles] = useState<string[]>(profile?.training_style ?? ['hypertrophy'])
  const [secondaryGoal, setSecondaryGoal] = useState(profile?.secondary_training_goal ?? 'none')
  const [maxSessionMinutes, setMaxSessionMinutes] = useState(profile?.max_session_minutes ?? 60)
  const [squat1rm, setSquat1rm] = useState(profile?.squat_1rm?.toString() ?? '')
  const [bench1rm, setBench1rm] = useState(profile?.bench_1rm?.toString() ?? '')
  const [deadlift1rm, setDeadlift1rm] = useState(profile?.deadlift_1rm?.toString() ?? '')
  const [ohp1rm, setOhp1rm] = useState(profile?.ohp_1rm?.toString() ?? '')
  const [doesCardio, setDoesCardio] = useState(profile?.does_cardio ?? false)
  const [cardioTypesPreferred, setCardioTypesPreferred] = useState<string[]>(profile?.cardio_types_preferred ?? [])
  const [cardioFrequency, setCardioFrequency] = useState(profile?.cardio_frequency_per_week ?? 2)
  const [cardioDuration, setCardioDuration] = useState(profile?.cardio_duration_minutes ?? 30)

  // ── Step 6: Schedule ──
  const [sleepTime, setSleepTime] = useState(profile?.sleep_time ?? '23:00')
  const [wakeTime, setWakeTime] = useState(profile?.wake_time ?? '07:00')
  const [workoutTime, setWorkoutTime] = useState(profile?.workout_time ?? '08:00')
  const [workStartTime, setWorkStartTime] = useState(profile?.work_start_time ?? '09:00')
  const [workEndTime, setWorkEndTime] = useState(profile?.work_end_time ?? '17:00')
  const [workoutDays, setWorkoutDays] = useState(profile?.workout_days_per_week ?? 4)
  const [mealsPerDay, setMealsPerDay] = useState(profile?.meals_per_day ?? 3)
  const [breakfastTime, setBreakfastTime] = useState(profile?.breakfast_time ?? '08:00')
  const [lunchTime, setLunchTime] = useState(profile?.lunch_time ?? '12:30')
  const [dinnerTime, setDinnerTime] = useState(profile?.dinner_time ?? '19:00')
  const [motivation, setMotivation] = useState<string[]>(profile?.motivation ?? [])

  const toggleArray = (arr: string[], setArr: (a: string[]) => void, val: string) => {
    setArr(arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val])
  }

  const updateCoachQuestionAnswer = (questionId: string, value: IntakeAnswerValue) => {
    setCoachQuestionAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  const toggleCoachMultiSelect = (questionId: string, option: string) => {
    const current = Array.isArray(coachQuestionAnswers[questionId]) ? coachQuestionAnswers[questionId] as string[] : []
    updateCoachQuestionAnswer(
      questionId,
      current.includes(option) ? current.filter((item) => item !== option) : [...current, option]
    )
  }

  const customQuestionStep = isManagedClient && coachCustomQuestions.length > 0 ? steps.length - 2 : -1
  const reviewStep = steps.length - 1

  const canContinue = () => {
    if (isTrainer) {
      switch (step) {
        case 0: return fullName.trim().length > 0 && coachSpecialties.length > 0 && coachFormats.length > 0
        case 1: return profileHeadline.trim().length > 0
        case 2: return coachIdealClient.trim().length > 0 && coachServices.length > 0
        case 3: return coachIntakeRequirements.length > 0
        default: return true
      }
    }

    if (step === customQuestionStep) {
      return coachCustomQuestions.every((question) => {
        if (!question.required) return true
        const answer = coachQuestionAnswers[question.id]
        return Array.isArray(answer) ? answer.length > 0 : String(answer ?? '').trim().length > 0
      })
    }

    switch (step) {
      case 0: return fullName.trim().length > 0 && age && height && weight
      default: return true
    }
  }

  const getNutritionTargets = () => {
    if (!age || !height || !weight) return null
    const metrics: UserMetrics = {
      age: parseInt(age),
      height: parseInt(height),
      weight: parseInt(weight),
      gender,
      activityLevel,
      goal,
    }
    return calculateNutritionTargets(metrics)
  }

  const handleTrainerFinish = async () => {
    if (!profile) return
    setSaving(true)

    const supabase = createClient()

    // Upload avatar if selected
    let avatarUrl = profile.avatar_url ?? null
    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop() ?? 'jpg'
      const path = `${profile.id}/avatar.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, avatarFile, { upsert: true })
      if (uploadError) {
        toast.error('Failed to upload profile picture: ' + uploadError.message)
        setSaving(false)
        return
      }
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
      avatarUrl = urlData.publicUrl
    }

    const { error } = await supabase
      .from('user_profiles')
      .update({
        full_name: fullName.trim(),
        avatar_url: avatarUrl,
        coach_specialties: coachSpecialties,
        coach_ideal_client: coachIdealClient.trim(),
        coach_services: coachServices,
        coach_formats: coachFormats,
        coach_check_in_frequency: coachCheckInFrequency,
        coach_style: coachStyle,
        coach_intake_requirements: coachIntakeRequirements,
        coach_post_intake_action: coachPostIntakeAction,
        coach_app_focus: coachAppFocus,
        onboarding_completed: true,
      })
      .eq('id', profile.id)

    if (error) {
      toast.error('Failed to save coach setup: ' + error.message)
      setSaving(false)
      return
    }

    // Upsert coach public profile
    const slug = buildCoachProfileSlug(fullName.trim(), profile.id)
    const { error: profileError } = await supabase
      .from('coach_public_profiles')
      .upsert({
        coach_id: profile.id,
        slug,
        is_public: true,
        headline: profileHeadline.trim() || null,
        bio: profileBio.trim() || null,
        price_from: profilePriceFrom ? parseInt(profilePriceFrom) : null,
        price_to: profilePriceTo ? parseInt(profilePriceTo) : null,
        currency: profileCurrency,
        accepting_new_clients: true,
      }, { onConflict: 'coach_id' })

    if (profileError) {
      toast.error('Profile saved but marketplace listing failed: ' + profileError.message)
    }

    // Persist custom intake questions the coach drafted during onboarding.
    const validDrafts = trainerDraftQuestions.filter((q) => q.label.trim().length > 0)
    const existingDrafts = validDrafts.filter((q) => !q.localId.startsWith('tmp-'))
    const newDrafts = validDrafts.filter((q) => q.localId.startsWith('tmp-'))
    const keptIds = new Set(existingDrafts.map((q) => q.localId))
    const toDeleteIds = initialTrainerQuestionIdsRef.current.filter((id) => !keptIds.has(id))

    if (toDeleteIds.length > 0) {
      const { error: deleteError } = await supabase
        .from('personal_trainer_custom_intake_questions')
        .delete()
        .in('id', toDeleteIds)
      if (deleteError) {
        toast.error('Failed to remove old questions: ' + deleteError.message)
        setSaving(false)
        return
      }
    }

    if (existingDrafts.length > 0) {
      const { error: upsertError } = await supabase
        .from('personal_trainer_custom_intake_questions')
        .upsert(
          existingDrafts.map((q, i) => ({
            id: q.localId,
            trainer_id: profile.id,
            label: q.label.trim(),
            help_text: q.help_text.trim() || null,
            type: q.type,
            options: q.options,
            required: q.required,
            sort_order: i,
            is_active: true,
          }))
        )
      if (upsertError) {
        toast.error('Failed to save questions: ' + upsertError.message)
        setSaving(false)
        return
      }
    }

    if (newDrafts.length > 0) {
      const { error: insertError } = await supabase
        .from('personal_trainer_custom_intake_questions')
        .insert(
          newDrafts.map((q, idx) => ({
            trainer_id: profile.id,
            label: q.label.trim(),
            help_text: q.help_text.trim() || null,
            type: q.type,
            options: q.options,
            required: q.required,
            sort_order: existingDrafts.length + idx,
            is_active: true,
          }))
        )
      if (insertError) {
        toast.error('Failed to add new questions: ' + insertError.message)
        setSaving(false)
        return
      }
    }

    toast.success('Coach setup complete!')
    window.location.href = '/dashboard'
  }

  const handleFinish = async (navigateTo: 'dashboard' | 'ai-generate') => {
    if (!profile) return
    setSaving(true)

    const targets = getNutritionTargets()
    if (!targets) {
      toast.error('Missing required fields')
      setSaving(false)
      return
    }

    const allInjuries = [...injuries]
    if (customInjury.trim()) allInjuries.push(customInjury.trim())

    const supabase = createClient()
    const { error } = await supabase
      .from('user_profiles')
      .update({
        full_name: fullName,
        age: parseInt(age),
        height_cm: parseInt(height),
        weight_kg: parseInt(weight),
        gender,
        activity_level: activityLevel,
        goal,
        daily_calories: targets.calories,
        daily_protein: targets.protein,
        daily_carbs: targets.carbs,
        daily_fat: targets.fat,
        daily_water_ml: targets.water,
        // Health
        injuries: allInjuries,
        medical_conditions: conditions,
        medications: medications.split(',').map(m => m.trim()).filter(Boolean),
        body_fat_pct: bodyFatPct ? parseFloat(bodyFatPct) : null,
        // Fitness
        years_training: yearsTraining ? parseFloat(yearsTraining) : null,
        training_experience: experience,
        equipment_access: equipmentAccess,
        training_style: trainingStyles,
        secondary_training_goal: secondaryGoal,
        max_session_minutes: maxSessionMinutes,
        squat_1rm: squat1rm ? parseFloat(squat1rm) : null,
        bench_1rm: bench1rm ? parseFloat(bench1rm) : null,
        deadlift_1rm: deadlift1rm ? parseFloat(deadlift1rm) : null,
        ohp_1rm: ohp1rm ? parseFloat(ohp1rm) : null,
        does_cardio: doesCardio,
        cardio_types_preferred: doesCardio ? cardioTypesPreferred : [],
        cardio_frequency_per_week: doesCardio ? cardioFrequency : null,
        cardio_duration_minutes: doesCardio ? cardioDuration : null,
        // Nutrition
        dietary_restrictions: dietaryRestrictions,
        allergies: allergies.split(',').map(a => a.trim()).filter(Boolean),
        food_dislikes: foodDislikes.split(',').map(s => s.trim()).filter(Boolean),
        favourite_foods: favouriteFoods.split(',').map(s => s.trim()).filter(Boolean),
        cooking_skill: cookingSkill,
        meal_prep_preference: mealPrepPref,
        food_adventurousness: foodAdventurousness,
        // Lifestyle
        work_type: workType,
        sleep_quality: sleepQuality,
        sleep_hours: sleepHours ? parseFloat(sleepHours) : null,
        stress_level: stressLevel,
        alcohol_frequency: alcoholFrequency,
        alcohol_details: alcoholDetails.trim() || null,
        // Snack habits
        current_snacks: currentSnacks.split(',').map(s => s.trim()).filter(Boolean),
        snack_motivation: snackMotivation,
        snack_preference: snackPreference,
        late_night_snacking: lateNightSnacking,
        harder_days: harderDays,
        eating_out_frequency: eatingOutFrequency,
        plan_preference: planPreference,
        weekly_derailers: weeklyDerailers.trim() || null,
        // Goals
        target_weight_kg: targetWeight ? parseFloat(targetWeight) : null,
        goal_timeline: goalTimeline,
        motivation,
        desired_outcome: desiredOutcome.trim() || null,
        past_dieting_challenges: pastDietingChallenges.trim() || null,
        // Schedule
        sleep_time: sleepTime,
        wake_time: wakeTime,
        workout_time: workoutTime,
        work_start_time: workStartTime,
        work_end_time: workEndTime,
        workout_days_per_week: workoutDays,
        meals_per_day: mealsPerDay,
        breakfast_time: breakfastTime,
        lunch_time: lunchTime,
        dinner_time: dinnerTime,
        onboarding_completed: true,
      })
      .eq('id', profile.id)

    if (error) {
      toast.error('Failed to save profile: ' + error.message)
      setSaving(false)
      return
    }

    if (isManagedClient && coachCustomQuestions.length > 0) {
      const trainerId = profile.personal_trainer_id ?? profile.nutritionist_id
      if (trainerId) {
        const responsePayload = coachCustomQuestions
          .map((question) => {
            const answer = coachQuestionAnswers[question.id]
            const hasAnswer = Array.isArray(answer) ? answer.length > 0 : String(answer ?? '').trim().length > 0
            if (!hasAnswer) return null
            return {
              question_id: question.id,
              trainer_id: trainerId,
              client_id: profile.id,
              response_text: Array.isArray(answer) ? null : String(answer).trim(),
              response_json: Array.isArray(answer) ? answer : null,
            }
          })
          .filter(Boolean)

        if (responsePayload.length > 0) {
          const { error: responseError } = await supabase
            .from('personal_trainer_custom_intake_responses')
            .upsert(responsePayload, { onConflict: 'question_id,client_id' })

          if (responseError) {
            toast.error('Your profile saved, but custom intake answers failed to save.')
            setSaving(false)
            return
          }
        }
      }
    }

    if (wizardAnswersRef.current) {
      saveLeadWizardPreferences(wizardAnswersRef.current)
      clearWizardAnswers()
    }

    toast.success('Profile setup complete!')
    window.location.href = navigateTo === 'ai-generate' ? '/generate-plans' : '/dashboard'
  }

  const renderTrainerStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-6">
            <StepHeader
              icon={<User className="h-12 w-12 text-purple-600" />}
              title="Set up your coaching profile"
              subtitle="This tells Nutrigoal who you coach, how you work, and how to frame client intake around your process."
            />
            <div className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 -mt-2">
              <span className="text-sm font-medium text-indigo-600">Clients will see this reflected in their coach-led intake and dashboard journey.</span>
            </div>
            <div>
              <Label>Display name</Label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                placeholder="Your name"
              />
            </div>
            <div>
              <Label>Primary specialties</Label>
              <p className="text-sm text-gray-500 mb-3">Pick the outcomes you want to be known for.</p>
              <ChipGrid
                items={COACH_SPECIALTY_OPTIONS.map((item) => ({ value: item, label: item }))}
                selected={coachSpecialties}
                onToggle={(val) => toggleArray(coachSpecialties, setCoachSpecialties, val)}
              />
            </div>
            <div>
              <Label>How do you coach?</Label>
              <div className="flex flex-wrap gap-3">
                {COACH_FORMAT_OPTIONS.map((format) => (
                  <button
                    key={format}
                    type="button"
                    onClick={() => toggleArray(coachFormats, setCoachFormats, format)}
                    className={`px-4 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
                      coachFormats.includes(format)
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    {format}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )
      case 1:
        return (
          <div className="space-y-6">
            <StepHeader
              icon={<Globe className="h-12 w-12 text-sky-500" />}
              title="Set up your public profile"
              subtitle="This is what potential clients see in the coach directory. You can update it anytime from Settings."
            />

            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Profile"
                    className="h-24 w-24 rounded-full object-cover border-4 border-purple-100"
                  />
                ) : (
                  <div className="h-24 w-24 rounded-full bg-gray-100 flex items-center justify-center border-4 border-purple-100">
                    <Camera className="h-8 w-8 text-gray-400" />
                  </div>
                )}
                <label className="absolute -bottom-1 -right-1 cursor-pointer rounded-full bg-purple-600 p-2 text-white shadow-lg hover:bg-purple-700 transition-colors">
                  <Camera className="h-4 w-4" />
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      if (file.size > 5 * 1024 * 1024) {
                        toast.error('Image must be under 5MB')
                        return
                      }
                      setAvatarFile(file)
                      setAvatarPreview(URL.createObjectURL(file))
                    }}
                  />
                </label>
              </div>
              <p className="text-sm text-gray-500">Upload a profile picture (optional, max 5MB)</p>
            </div>

            <div>
              <Label>Headline *</Label>
              <p className="text-sm text-gray-500 mb-2">One line that explains what you do.</p>
              <input
                type="text"
                value={profileHeadline}
                onChange={(e) => setProfileHeadline(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                placeholder="e.g. Online fat loss and strength coach for busy professionals"
                maxLength={120}
              />
              <p className="text-xs text-gray-400 mt-1">{profileHeadline.length}/120</p>
            </div>

            <div>
              <Label>Short bio</Label>
              <textarea
                value={profileBio}
                onChange={(e) => setProfileBio(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                rows={4}
                placeholder="Tell potential clients about your experience and approach..."
                maxLength={500}
              />
              <p className="text-xs text-gray-400 mt-1">{profileBio.length}/500</p>
            </div>

            <div>
              <Label>Price range (optional)</Label>
              <p className="text-sm text-gray-500 mb-2">Give clients an idea of your rates. You can add exact offers later in Settings.</p>
              <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-3 items-center">
                <input
                  type="number"
                  value={profilePriceFrom}
                  onChange={(e) => setProfilePriceFrom(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="From"
                  min={0}
                />
                <span className="text-gray-400">–</span>
                <input
                  type="number"
                  value={profilePriceTo}
                  onChange={(e) => setProfilePriceTo(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="To"
                  min={0}
                />
                <select
                  value={profileCurrency}
                  onChange={(e) => setProfileCurrency(e.target.value)}
                  className="px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                >
                  {COACH_MARKETPLACE_CURRENCIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
              <span className="text-sm font-medium text-green-700">Your profile will be published to the coach directory when you finish setup.</span>
            </div>
          </div>
        )
      case 2:
        return (
          <div className="space-y-6">
            <StepHeader
              icon={<Users className="h-12 w-12 text-indigo-500" />}
              title="Who do you work best with?"
              subtitle="We'll use this to shape the trainer dashboard and the way client intake is framed after an invite is accepted."
            />
            <div>
              <Label>Ideal client summary</Label>
              <textarea
                value={coachIdealClient}
                onChange={(e) => setCoachIdealClient(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                rows={4}
                placeholder="e.g. busy professionals who want fat loss, strength, and simple nutrition they can sustain"
              />
            </div>
            <div>
              <Label>Services you offer</Label>
              <ChipGrid
                items={COACH_SERVICE_OPTIONS.map((item) => ({ value: item, label: item }))}
                selected={coachServices}
                onToggle={(val) => toggleArray(coachServices, setCoachServices, val)}
              />
            </div>
            <div>
              <Label>Main reason you&apos;re using the app</Label>
              <div className="space-y-2">
                {[
                  ['client_management', 'Client management', 'Use Nutrigoal mainly to onboard, review, and coach existing clients.'],
                  ['prospecting', 'Prospecting', 'Use Nutrigoal mainly to capture and qualify new leads.'],
                  ['both', 'Both', 'Use Nutrigoal for both delivery and growth.'],
                ].map(([value, title, description]) => (
                  <OptionCard
                    key={value}
                    title={title}
                    description={description}
                    selected={coachAppFocus === value}
                    onClick={() => setCoachAppFocus(value as typeof coachAppFocus)}
                  />
                ))}
              </div>
            </div>
          </div>
        )
      case 3:
        return (
          <div className="space-y-6">
            <StepHeader
              icon={<ClipboardList className="h-12 w-12 text-amber-500" />}
              title="How do you run accountability?"
              subtitle="These answers shape what the app highlights to you once client responses start coming in."
            />
            <div>
              <Label>Coaching style</Label>
              <div className="space-y-2">
                {[
                  ['structured', 'Structured', 'Tighter guardrails, more precise plans, more direct accountability.'],
                  ['balanced', 'Balanced', 'Clear structure with practical flexibility for real life.'],
                  ['flexible', 'Flexible', 'Outcome-focused coaching with more room for autonomy and adaptation.'],
                ].map(([value, title, description]) => (
                  <OptionCard
                    key={value}
                    title={title}
                    description={description}
                    selected={coachStyle === value}
                    onClick={() => setCoachStyle(value as typeof coachStyle)}
                  />
                ))}
              </div>
            </div>
            <div>
              <Label>Check-in frequency</Label>
              <div className="flex flex-wrap gap-3">
                {[
                  ['weekly', 'Weekly'],
                  ['biweekly', 'Bi-weekly'],
                  ['monthly', 'Monthly'],
                  ['as_needed', 'As needed'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setCoachCheckInFrequency(value as typeof coachCheckInFrequency)}
                    className={`py-2.5 px-4 rounded-xl border-2 font-semibold text-sm transition-all ${
                      coachCheckInFrequency === value
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>What must every client answer before coaching starts?</Label>
              <ChipGrid
                items={COACH_INTAKE_REQUIREMENT_OPTIONS.map((item) => ({ value: item, label: item }))}
                selected={coachIntakeRequirements}
                onToggle={(val) => toggleArray(coachIntakeRequirements, setCoachIntakeRequirements, val)}
              />
            </div>
          </div>
        )
      case 4:
        return (
          <div className="space-y-6">
            <StepHeader
              icon={<ClipboardList className="h-12 w-12 text-purple-600" />}
              title="Your custom client intake"
              subtitle="Add questions your clients must answer after the base onboarding. Check what we already collect first so you don't duplicate it."
            />
            <BaseClientIntakePreview />
            <TrainerCustomQuestionsEditor
              value={trainerDraftQuestions}
              onChange={setTrainerDraftQuestions}
            />
            <p className="text-xs text-gray-500">
              You can edit these anytime from <span className="font-semibold">Settings → Coach Intake</span>.
            </p>
          </div>
        )
      case 5:
        return (
          <div className="space-y-6">
            <StepHeader
              icon={<MessageSquare className="h-12 w-12 text-indigo-500" />}
              title="What happens after intake?"
              subtitle="Choose the default next step once a client accepts your invite and finishes their questionnaire."
            />
            <div>
              <Label>Default post-intake action</Label>
              <div className="space-y-2">
                {[
                  ['review_and_plan', 'Review and build a plan', 'Best when you want the questionnaire to flow straight into programming.'],
                  ['message_first', 'Message first', 'Best when you want to welcome the client and clarify a few details before planning.'],
                  ['book_consult', 'Book a consult', 'Best when you use intake to qualify for a call or onboarding session.'],
                  ['send_assessment', 'Send assessment first', 'Best when you still need a movement screen, photos, or deeper assessment.'],
                ].map(([value, title, description]) => (
                  <OptionCard
                    key={value}
                    title={title}
                    description={description}
                    selected={coachPostIntakeAction === value}
                    onClick={() => setCoachPostIntakeAction(value as typeof coachPostIntakeAction)}
                  />
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <h3 className="text-sm font-bold text-purple-700 uppercase tracking-wider mb-4">Setup summary</h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <ReviewRow label="Display name" value={fullName || 'Not set'} />
                <ReviewRow label="Headline" value={profileHeadline || 'Not set'} />
                <ReviewRow label="Avatar" value={avatarPreview ? 'Uploaded' : 'Not set'} />
                <ReviewRow label="Specialties" value={coachSpecialties.join(', ') || 'Not set'} />
                <ReviewRow label="Formats" value={coachFormats.join(', ') || 'Not set'} />
                <ReviewRow label="Ideal client" value={coachIdealClient || 'Not set'} />
                <ReviewRow label="Services" value={coachServices.join(', ') || 'Not set'} />
                <ReviewRow label="Price range" value={profilePriceFrom || profilePriceTo ? `${profilePriceFrom || '?'} – ${profilePriceTo || '?'} ${profileCurrency}` : 'On request'} />
                <ReviewRow label="Style" value={coachStyle.replace(/_/g, ' ')} />
                <ReviewRow label="Check-ins" value={coachCheckInFrequency.replace(/_/g, ' ')} />
                <ReviewRow label="Required intake" value={coachIntakeRequirements.join(', ') || 'Not set'} />
              </div>
            </div>

            <div className="flex gap-3 bg-purple-50 border border-purple-200 rounded-2xl p-5">
              <Sparkles className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-purple-800 leading-relaxed">
                Clients will be guided through a coach-led intake after they accept your invite, and your dashboard will flag who is still pending versus ready for review.
              </p>
            </div>

            <button
              onClick={handleTrainerFinish}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-4 rounded-xl text-base font-semibold hover:shadow-lg transition-all disabled:opacity-50"
            >
              <span>{saving ? 'Saving...' : 'Finish coach setup'}</span>
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        )
      default:
        return null
    }
  }

  const renderStep = () => {
    if (step === customQuestionStep) {
      return (
        <div className="space-y-6">
          <StepHeader
            icon={<ClipboardList className="h-12 w-12 text-indigo-500" />}
            title="Coach-specific questions"
            subtitle="These extra answers go straight into your coach&apos;s dashboard so they can tailor your next step more precisely."
          />

          {coachCustomQuestions.map((question) => (
            <div key={question.id} className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Label>{question.label}{question.required ? ' *' : ''}</Label>
                  {question.help_text && <p className="mb-3 text-sm text-gray-500">{question.help_text}</p>}
                </div>
              </div>

              {question.type === 'short_text' && (
                <input
                  type="text"
                  value={Array.isArray(coachQuestionAnswers[question.id]) ? '' : String(coachQuestionAnswers[question.id] ?? '')}
                  onChange={(e) => updateCoachQuestionAnswer(question.id, e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="Type your answer"
                />
              )}

              {question.type === 'long_text' && (
                <textarea
                  value={Array.isArray(coachQuestionAnswers[question.id]) ? '' : String(coachQuestionAnswers[question.id] ?? '')}
                  onChange={(e) => updateCoachQuestionAnswer(question.id, e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                  rows={4}
                  placeholder="Type your answer"
                />
              )}

              {question.type === 'yes_no' && (
                <div className="grid grid-cols-2 gap-3">
                  {['Yes', 'No'].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => updateCoachQuestionAnswer(question.id, option)}
                      className={`py-3 px-4 rounded-xl border-2 font-semibold transition-all ${
                        coachQuestionAnswers[question.id] === option
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}

              {question.type === 'single_select' && (
                <div className="space-y-2">
                  {question.options.map((option) => (
                    <OptionCard
                      key={option}
                      title={option}
                      description=""
                      selected={coachQuestionAnswers[question.id] === option}
                      onClick={() => updateCoachQuestionAnswer(question.id, option)}
                    />
                  ))}
                </div>
              )}

              {question.type === 'multi_select' && (
                <ChipGrid
                  items={question.options.map((option) => ({ value: option, label: option }))}
                  selected={Array.isArray(coachQuestionAnswers[question.id]) ? coachQuestionAnswers[question.id] as string[] : []}
                  onToggle={(value) => toggleCoachMultiSelect(question.id, value)}
                />
              )}
            </div>
          ))}
        </div>
      )
    }

    switch (step === reviewStep ? 8 : step) {
      /* ── Step 0: My Stats ──────────────────────────── */
      case 0:
        return (
          <div className="space-y-6">
            <StepHeader
              icon={<User className="h-12 w-12 text-purple-600" />}
              title={isManagedClient ? 'Your coach needs a quick intake' : "Let's Get to Know You"}
              subtitle={isManagedClient
                ? 'These details give your coach the baseline for planning, progress review, and realistic expectations.'
                : 'Your stats give us the baseline for calories, macros, hydration, and realistic rate of progress.'}
            />
            <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 -mt-2">
              <span className="text-indigo-600 text-sm font-medium">
                {isManagedClient
                  ? 'This takes about 5–10 minutes and helps your coach understand your goals, constraints, and what kind of support you need.'
                  : 'This questionnaire takes about 5–10 minutes and helps us build plans tailored specifically to you.'}
              </span>
            </div>
            <div>
              <Label>Full Name</Label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                placeholder="Your name"
              />
            </div>
            <div>
              <Label>Biological Sex</Label>
              <div className="grid grid-cols-2 gap-3">
                {(['male', 'female'] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    className={`py-3 px-4 rounded-xl border-2 font-semibold transition-all ${
                      gender === g
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    {g === 'male' ? 'Male' : 'Female'}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label>Age</Label>
                <input type="number" value={age} onChange={(e) => setAge(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all" placeholder="Years" />
              </div>
              <div>
                <Label>Height (cm)</Label>
                <input type="number" value={height} onChange={(e) => setHeight(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all" placeholder="175" />
              </div>
              <div>
                <Label>Weight (kg)</Label>
                <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all" placeholder="70" />
              </div>
              <div>
                <Label>Body fat % (optional)</Label>
                <input type="number" step="0.1" value={bodyFatPct} onChange={(e) => setBodyFatPct(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all" placeholder="e.g. 18" />
              </div>
            </div>

            <div>
              <Label>What&apos;s your primary goal?</Label>
              <div className="space-y-2">
                {FITNESS_GOALS.map((g) => (
                  <OptionCard key={g.value} title={g.label} description={g.description}
                    selected={goal === g.value} onClick={() => setGoal(g.value as UserMetrics['goal'])} />
                ))}
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Goal weight (optional)</Label>
                <p className="text-sm text-gray-500 mb-2">Leave this blank if you care more about how you want to look, feel, or perform than a specific number on the scale.</p>
                <input type="number" value={targetWeight} onChange={(e) => setTargetWeight(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="kg — or leave blank if you're not sure" />
              </div>
              <div>
                <Label>How quickly?</Label>
                <div className="flex flex-wrap gap-2">
                  {GOAL_TIMELINES.map((t) => (
                    <button key={t.value} type="button" onClick={() => setGoalTimeline(t.value)}
                      className={`py-2.5 px-4 rounded-xl border-2 font-semibold text-sm transition-all ${
                        goalTimeline === t.value
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )

      /* ── Step 1: My Lifestyle ──────────────────────── */
      case 1:
        return (
          <div className="space-y-6">
            <StepHeader
              icon={<Briefcase className="h-12 w-12 text-indigo-500" />}
              title="Your Lifestyle"
              subtitle="This helps us set calorie targets based on your real life, not a generic online calculator."
            />
            <div>
              <Label>What&apos;s your job like?</Label>
              <div className="space-y-2">
                {WORK_TYPES.map((w) => (
                  <OptionCard key={w.value} title={w.label} description={w.description}
                    selected={workType === w.value} onClick={() => setWorkType(w.value)} />
                ))}
              </div>
            </div>
            <div>
              <Label>Overall activity level (job + exercise combined)</Label>
              <p className="text-sm text-gray-500 mb-2">Based on your job type AND how often you exercise</p>
              <div className="space-y-2">
                {ACTIVITY_LEVELS.map((level) => (
                  <OptionCard key={level.value} title={level.label} description={level.description}
                    selected={activityLevel === level.value}
                    onClick={() => setActivityLevel(level.value as UserMetrics['activityLevel'])} />
                ))}
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Hours of sleep per night</Label>
                <input type="number" step="0.5" min="3" max="12" value={sleepHours}
                  onChange={(e) => setSleepHours(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="7" />
              </div>
              <div>
                <Label>Sleep quality</Label>
                <div className="flex flex-wrap gap-3">
                  {SLEEP_QUALITY_OPTIONS.map((s) => (
                    <button key={s.value} type="button" onClick={() => setSleepQuality(s.value)}
                      className={`flex-1 min-w-[90px] py-3 px-3 rounded-xl border-2 font-semibold text-sm transition-all ${
                        sleepQuality === s.value
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <Label>Stress level</Label>
              <div className="flex flex-wrap gap-3">
                {STRESS_LEVELS.map((s) => (
                  <button key={s.value} type="button" onClick={() => setStressLevel(s.value)}
                    className={`flex-1 min-w-[100px] py-3 px-4 rounded-xl border-2 font-semibold text-sm transition-all ${
                      stressLevel === s.value
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Do you drink alcohol?</Label>
              <div className="space-y-2">
                {ALCOHOL_FREQUENCIES.map((a) => (
                  <OptionCard key={a.value} title={a.label} description={a.description}
                    selected={alcoholFrequency === a.value} onClick={() => setAlcoholFrequency(a.value)} />
                ))}
              </div>
              {alcoholFrequency !== 'none' && (
                <input type="text" value={alcoholDetails}
                  onChange={(e) => setAlcoholDetails(e.target.value)}
                  className="w-full mt-3 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="e.g. 2-3 beers on weekends, glass of wine with dinner" />
              )}
            </div>
          </div>
        )

      /* ── Step 2: My Food Preferences ───────────────── */
      case 2:
        return (
          <div className="space-y-6">
            <StepHeader
              icon={<Utensils className="h-12 w-12 text-orange-500" />}
              title="Your Food Preferences"
              subtitle="Tell us what you genuinely enjoy eating so the plan feels like it was built by a real nutritionist, not a template."
            />
            <div>
              <Label>Top 5 favourite meals or dishes (any cuisine)</Label>
              <p className="text-sm text-gray-500 mb-2">Think meals, not just ingredients &mdash; e.g. &quot;chicken stir-fry&quot;, &quot;pasta carbonara&quot;, &quot;salmon with rice&quot;</p>
              <textarea value={favouriteFoods} onChange={(e) => setFavouriteFoods(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                rows={3} placeholder="e.g. chicken stir-fry, spaghetti bolognese, salmon with rice, tacos, Greek salad" />
            </div>
            <div>
              <Label>Foods you absolutely hate and would never eat</Label>
              <textarea value={foodDislikes} onChange={(e) => setFoodDislikes(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                rows={2} placeholder="e.g. tofu, liver, sardines, coconut" />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {COMMON_FOOD_DISLIKES.map(f => (
                  <button key={f} type="button"
                    onClick={() => setFoodDislikes(prev => {
                      const items = prev.split(',').map(s => s.trim()).filter(Boolean)
                      if (items.some(i => i.toLowerCase() === f.toLowerCase())) return prev
                      return prev ? `${prev}, ${f}` : f
                    })}
                    className="text-xs px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full hover:bg-red-100 hover:text-red-700 transition-colors">
                    + {f}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Dietary restrictions or allergies</Label>
              <ChipGrid
                items={DIETARY_RESTRICTIONS.map(r => ({ value: r.value, label: r.label }))}
                selected={dietaryRestrictions}
                onToggle={(val) => toggleArray(dietaryRestrictions, setDietaryRestrictions, val)}
              />
              <input type="text" value={allergies} onChange={(e) => setAllergies(e.target.value)}
                className="w-full mt-3 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                placeholder="Any specific allergies? e.g. peanuts, shellfish, gluten" />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Cooking style</Label>
                <div className="space-y-2">
                  {COOKING_SKILLS.map((c) => (
                    <OptionCard key={c.value} title={c.label} description={c.description}
                      selected={cookingSkill === c.value} onClick={() => setCookingSkill(c.value)} />
                  ))}
                </div>
              </div>
              <div>
                <Label>Meal prep preference</Label>
                <div className="space-y-2">
                  {MEAL_PREP_PREFERENCES.map((m) => (
                    <OptionCard key={m.value} title={m.label} description={m.description}
                      selected={mealPrepPref === m.value} onClick={() => setMealPrepPref(m.value)} />
                  ))}
                </div>
              </div>
            </div>
            <div>
              <Label>How adventurous are you with food? (1 = stick to what I know, 10 = try anything)</Label>
              <div className="flex items-center gap-4 mt-2">
                <span className="text-sm text-gray-500">1</span>
                <input type="range" min={1} max={10} value={foodAdventurousness}
                  onChange={(e) => setFoodAdventurousness(parseInt(e.target.value))}
                  className="flex-1 accent-purple-600" />
                <span className="text-sm text-gray-500">10</span>
                <span className="text-lg font-bold text-purple-600 w-8 text-center">{foodAdventurousness}</span>
              </div>
            </div>
          </div>
        )

      /* ── Step 3: My Snack Habits ───────────────────── */
      case 3:
        return (
          <div className="space-y-6">
            <StepHeader
              icon={<Cookie className="h-12 w-12 text-amber-500" />}
              title="Your Snack Habits"
              subtitle="No judgment here. Understanding your snack pattern helps us build smarter swaps and a more realistic cut."
            />
            <div>
              <Label>What snacks do you currently reach for?</Label>
              <textarea value={currentSnacks} onChange={(e) => setCurrentSnacks(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                rows={3} placeholder="e.g. crisps, chocolate, biscuits, protein bars, fruit, yogurt, nuts" />
            </div>
            <div>
              <Label>Why do you tend to snack?</Label>
              <div className="space-y-2">
                {SNACK_MOTIVATIONS.map((s) => (
                  <OptionCard key={s.value} title={s.label} description={s.description}
                    selected={snackMotivation === s.value} onClick={() => setSnackMotivation(s.value)} />
                ))}
              </div>
            </div>
            <div>
              <Label>Do you prefer sweet or savoury snacks?</Label>
              <div className="flex flex-wrap gap-3">
                {SNACK_PREFERENCES.map((s) => (
                  <button key={s.value} type="button" onClick={() => setSnackPreference(s.value)}
                    className={`flex-1 min-w-[100px] py-3 px-4 rounded-xl border-2 font-semibold text-sm transition-all ${
                      snackPreference === s.value
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Do you snack late at night?</Label>
              <div className="grid grid-cols-2 gap-3">
                {[{ val: true, label: 'Yes, often' }, { val: false, label: 'Not really' }].map(({ val, label }) => (
                  <button key={label} type="button" onClick={() => setLateNightSnacking(val)}
                    className={`py-3 px-4 rounded-xl border-2 font-semibold transition-all ${
                      lateNightSnacking === val
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Which days are harder to stay on track?</Label>
              <div className="space-y-2">
                {HARDER_DAYS_OPTIONS.map((option) => (
                  <OptionCard key={option.value} title={option.label} description={option.description}
                    selected={harderDays === option.value} onClick={() => setHarderDays(option.value)} />
                ))}
              </div>
            </div>
            <div>
              <Label>How often do you eat out or order in?</Label>
              <div className="space-y-2">
                {EATING_OUT_FREQUENCIES.map((option) => (
                  <OptionCard key={option.value} title={option.label} description={option.description}
                    selected={eatingOutFrequency === option.value} onClick={() => setEatingOutFrequency(option.value)} />
                ))}
              </div>
            </div>
            <div>
              <Label>What style of plan helps you most?</Label>
              <div className="space-y-2">
                {PLAN_PREFERENCES.map((option) => (
                  <OptionCard key={option.value} title={option.label} description={option.description}
                    selected={planPreference === option.value} onClick={() => setPlanPreference(option.value)} />
                ))}
              </div>
            </div>
            <div>
              <Label>What usually throws you off track?</Label>
              <textarea value={weeklyDerailers} onChange={(e) => setWeeklyDerailers(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                rows={3} placeholder="e.g. stressful work days, social drinks, skipping meals then overeating later" />
            </div>
          </div>
        )

      /* ── Step 4: Health & Medical ──────────────────── */
      case 4:
        return (
          <div className="space-y-6">
            <StepHeader
              icon={<Heart className="h-12 w-12 text-red-500" />}
              title="Health & Medical"
              subtitle="This helps us avoid exercises, nutrition choices, or recovery recommendations that could cause problems."
            />
            <div>
              <Label>Any injuries or physical limitations?</Label>
              <p className="text-sm text-gray-500 mb-3">Select all that apply (or skip)</p>
              <ChipGrid
                items={COMMON_INJURIES.map(i => ({ value: i, label: i }))}
                selected={injuries}
                onToggle={(val) => toggleArray(injuries, setInjuries, val)}
              />
              <input type="text" value={customInjury} onChange={(e) => setCustomInjury(e.target.value)}
                className="w-full mt-3 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                placeholder="Other injury (optional)" />
            </div>
            <div>
              <Label>Medical conditions?</Label>
              <p className="text-sm text-gray-500 mb-3">Select any that apply</p>
              <ChipGrid
                items={COMMON_CONDITIONS.map(c => ({ value: c, label: c }))}
                selected={conditions}
                onToggle={(val) => toggleArray(conditions, setConditions, val)}
              />
            </div>
            <div>
              <Label>Current medications (optional)</Label>
              <input type="text" value={medications} onChange={(e) => setMedications(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                placeholder="e.g. Metformin, Levothyroxine" />
            </div>
          </div>
        )

      /* ── Step 5: Training Background ──────────────── */
      case 5:
        return (
          <div className="space-y-6">
            <StepHeader
              icon={<Dumbbell className="h-12 w-12 text-purple-600" />}
              title="Training Background"
              subtitle="This shapes your workout plan: exercise selection, volume, progression, and how hard we push."
            />
            <div>
              <Label>Training experience</Label>
              <div className="space-y-2">
                {TRAINING_EXPERIENCE.map((level) => (
                  <OptionCard key={level.value} title={level.label} description={level.description}
                    selected={experience === level.value} onClick={() => setExperience(level.value)} />
                ))}
              </div>
            </div>
            {experience !== 'never' && (
              <div>
                <Label>How many years have you been training?</Label>
                <input type="number" step="0.5" min="0" value={yearsTraining} onChange={(e) => setYearsTraining(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="e.g. 3" />
              </div>
            )}
            <div>
              <Label>Equipment access</Label>
              <div className="space-y-2">
                {EQUIPMENT_ACCESS.map((eq) => (
                  <OptionCard key={eq.value} title={eq.label} description={eq.description}
                    selected={equipmentAccess === eq.value} onClick={() => setEquipmentAccess(eq.value)} />
                ))}
              </div>
            </div>
            <div>
              <Label>Preferred training style</Label>
              <p className="text-sm text-gray-500 mb-3">Select one or more</p>
              <ChipGrid
                items={TRAINING_STYLES.map(s => ({ value: s.value, label: s.label }))}
                selected={trainingStyles}
                onToggle={(val) => toggleArray(trainingStyles, setTrainingStyles, val)}
              />
            </div>
            <div>
              <Label>Secondary goal</Label>
              <p className="text-sm text-gray-500 mb-2">Anything else you&apos;d like your plan to address?</p>
              <div className="space-y-2">
                {SECONDARY_TRAINING_GOALS.map((g) => (
                  <OptionCard key={g.value} title={g.label} description={g.description}
                    selected={secondaryGoal === g.value} onClick={() => setSecondaryGoal(g.value)} />
                ))}
              </div>
            </div>
            <div>
              <Label>How long can you train per session?</Label>
              <div className="flex flex-wrap gap-3">
                {SESSION_DURATIONS.map((d) => (
                  <button key={d.value} type="button" onClick={() => setMaxSessionMinutes(d.value)}
                    className={`py-2.5 px-5 rounded-xl border-2 font-semibold text-sm transition-all ${
                      maxSessionMinutes === d.value
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
            {experience !== 'never' && (
              <div>
                <Label>Estimated 1-rep maxes (optional — helps us dial in intensity)</Label>
                <p className="text-sm text-gray-500 mb-3">Leave blank if you&apos;re not sure — we&apos;ll use conservative estimates</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Squat (kg)</label>
                    <input type="number" value={squat1rm} onChange={(e) => setSquat1rm(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      placeholder="e.g. 100" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Bench Press (kg)</label>
                    <input type="number" value={bench1rm} onChange={(e) => setBench1rm(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      placeholder="e.g. 80" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Deadlift (kg)</label>
                    <input type="number" value={deadlift1rm} onChange={(e) => setDeadlift1rm(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      placeholder="e.g. 120" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Overhead Press (kg)</label>
                    <input type="number" value={ohp1rm} onChange={(e) => setOhp1rm(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      placeholder="e.g. 50" />
                  </div>
                </div>
              </div>
            )}
            <div>
              <Label>Do you do cardio?</Label>
              <div className="flex gap-3">
                {[{ value: true, label: 'Yes' }, { value: false, label: 'No' }].map((opt) => (
                  <button key={String(opt.value)} type="button" onClick={() => setDoesCardio(opt.value)}
                    className={`flex-1 py-3 px-5 rounded-xl border-2 font-semibold text-sm transition-all ${
                      doesCardio === opt.value
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            {doesCardio && (
              <>
                <div>
                  <Label>Preferred cardio types</Label>
                  <p className="text-sm text-gray-500 mb-3">Select all that apply</p>
                  <ChipGrid
                    items={CARDIO_TYPES.map(c => ({ value: c.name, label: c.name }))}
                    selected={cardioTypesPreferred}
                    onToggle={(val) => toggleArray(cardioTypesPreferred, setCardioTypesPreferred, val)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Sessions per week</Label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                        <button key={n} type="button" onClick={() => setCardioFrequency(n)}
                          className={`w-10 h-10 rounded-full border-2 font-bold text-sm transition-all ${
                            cardioFrequency === n
                              ? 'border-purple-500 bg-purple-50 text-purple-700'
                              : 'border-gray-200 text-gray-500 hover:border-gray-300'
                          }`}>
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>Typical duration (min)</Label>
                    <div className="flex flex-wrap gap-2">
                      {[15, 20, 30, 45, 60].map((d) => (
                        <button key={d} type="button" onClick={() => setCardioDuration(d)}
                          className={`py-2 px-4 rounded-xl border-2 font-semibold text-sm transition-all ${
                            cardioDuration === d
                              ? 'border-purple-500 bg-purple-50 text-purple-700'
                              : 'border-gray-200 text-gray-500 hover:border-gray-300'
                          }`}>
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )

      /* ── Step 6: Goals ─────────────────────────────── */
      case 6:
        return (
          <div className="space-y-6">
            <StepHeader
              icon={<Sparkles className="h-12 w-12 text-indigo-500" />}
              title={isManagedClient ? 'What success looks like for you' : 'Your Goals'}
              subtitle={isManagedClient
                ? 'Your coach will use this to understand your motivation, expectations, and what usually gets in the way.'
                : 'This helps us set the right pace and keep the plan aligned with what actually matters to you.'}
            />
            <div>
              <Label>What motivates you?</Label>
              <p className="text-sm text-gray-500 mb-3">Select all that apply so your coaching and check-ins feel more personal.</p>
              <ChipGrid
                items={MOTIVATIONS.map(m => ({ value: m, label: m }))}
                selected={motivation}
                onToggle={(val) => toggleArray(motivation, setMotivation, val)}
              />
            </div>
            <div>
              <Label>What do you want to look, feel, or perform like?</Label>
              <p className="text-sm text-gray-500 mb-2">This gives the AI a more human target than just calories and bodyweight.</p>
              <textarea value={desiredOutcome} onChange={(e) => setDesiredOutcome(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                rows={3} placeholder="e.g. feel leaner and more confident, perform better in the gym, have steadier energy through the day" />
            </div>
            <div>
              <Label>What has made past plans hard to stick to?</Label>
              <textarea value={pastDietingChallenges} onChange={(e) => setPastDietingChallenges(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                rows={3} placeholder="e.g. plans were too rigid, meals took too long, weekends always derailed me" />
            </div>
          </div>
        )

      /* ── Step 7: Schedule ──────────────────────────── */
      case 7:
        return (
          <div className="space-y-6">
            <StepHeader
              icon={<Calendar className="h-12 w-12 text-indigo-500" />}
              title="Your Schedule"
              subtitle="We&apos;ll time your meals around your training and working day so the plan is easy to stick to."
            />
            <div>
              <Label>What time do you wake up?</Label>
              <select value={wakeTime} onChange={(e) => setWakeTime(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 font-semibold text-sm text-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all bg-white">
                {TIME_OPTIONS.map((t) => (<option key={t} value={t}>{fmt12(t)}</option>))}
              </select>
            </div>
            <div>
              <Label>Preferred workout time</Label>
              <select value={workoutTime} onChange={(e) => setWorkoutTime(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 font-semibold text-sm text-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all bg-white">
                {TIME_OPTIONS.map((t) => (<option key={t} value={t}>{fmt12(t)}</option>))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Work start time</Label>
                <select value={workStartTime} onChange={(e) => setWorkStartTime(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 font-semibold text-sm text-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all bg-white">
                  {TIME_OPTIONS.map((t) => (<option key={t} value={t}>{fmt12(t)}</option>))}
                </select>
              </div>
              <div>
                <Label>Work end time</Label>
                <select value={workEndTime} onChange={(e) => setWorkEndTime(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 font-semibold text-sm text-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all bg-white">
                  {TIME_OPTIONS.map((t) => (<option key={t} value={t}>{fmt12(t)}</option>))}
                </select>
              </div>
            </div>
            <div>
              <Label>What time do you go to bed?</Label>
              <select value={sleepTime} onChange={(e) => setSleepTime(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 font-semibold text-sm text-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all bg-white">
                {TIME_OPTIONS.map((t) => (<option key={t} value={t}>{fmt12(t)}</option>))}
              </select>
            </div>
            <div>
              <Label>Training days per week</Label>
              <div className="flex gap-3">
                {[3, 4, 5, 6, 7].map((d) => (
                  <button key={d} type="button" onClick={() => setWorkoutDays(d)}
                    className={`w-12 h-12 rounded-full border-2 font-bold text-lg transition-all ${
                      workoutDays === d
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Meals per day</Label>
              <div className="flex gap-3">
                {[2, 3, 4, 5].map((m) => (
                  <button key={m} type="button" onClick={() => setMealsPerDay(m)}
                    className={`w-12 h-12 rounded-full border-2 font-bold text-lg transition-all ${
                      mealsPerDay === m
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>When do you usually eat?</Label>
              <p className="text-sm text-gray-500 mb-3">We&apos;ll build your meal plan around these times</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1">Breakfast</p>
                  <select value={breakfastTime} onChange={(e) => setBreakfastTime(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 font-semibold text-sm text-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all bg-white">
                    {TIME_OPTIONS.map((t) => (<option key={t} value={t}>{fmt12(t)}</option>))}
                  </select>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1">Lunch</p>
                  <select value={lunchTime} onChange={(e) => setLunchTime(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 font-semibold text-sm text-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all bg-white">
                    {TIME_OPTIONS.map((t) => (<option key={t} value={t}>{fmt12(t)}</option>))}
                  </select>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1">Dinner</p>
                  <select value={dinnerTime} onChange={(e) => setDinnerTime(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 font-semibold text-sm text-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all bg-white">
                    {TIME_OPTIONS.map((t) => (<option key={t} value={t}>{fmt12(t)}</option>))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )

      /* ── Step 8: Review ────────────────────────────── */
      case 8: {
        const targets = getNutritionTargets()
        return (
          <div className="space-y-6">
            <StepHeader
              icon={<Calculator className="h-12 w-12 text-purple-600" />}
              title="Your Profile Summary"
              subtitle={isManagedClient
                ? 'Review the intake your coach will use to assess your case and build your plan.'
                : 'Review the full intake your nutritionist and training logic will use.'}
            />

            {targets && (
              <>
                {/* Nutrition Targets */}
                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-6 border border-purple-100">
                  <h3 className="text-sm font-bold text-purple-700 uppercase tracking-wider mb-4">Daily Nutrition Targets</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-white/80 rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-purple-700">{targets.calories}</div>
                      <div className="text-xs text-gray-600 mt-1">kcal / day</div>
                    </div>
                    <div className="bg-white/80 rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-red-600">{targets.protein}g</div>
                      <div className="text-xs text-gray-600 mt-1">Protein</div>
                    </div>
                    <div className="bg-white/80 rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-yellow-600">{targets.carbs}g</div>
                      <div className="text-xs text-gray-600 mt-1">Carbs</div>
                    </div>
                    <div className="bg-white/80 rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">{targets.fat}g</div>
                      <div className="text-xs text-gray-600 mt-1">Fat</div>
                    </div>
                    <div className="bg-white/80 rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">{(targets.water / 1000).toFixed(1)}L</div>
                      <div className="text-xs text-gray-600 mt-1">Water</div>
                    </div>
                  </div>
                </div>

                {/* Key Details */}
                <div className="bg-white rounded-2xl p-6 border border-gray-200">
                  <h3 className="text-sm font-bold text-purple-700 uppercase tracking-wider mb-4">Your Profile</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <ReviewRow label="Goal" value={FITNESS_GOALS.find(g => g.value === goal)?.label ?? goal} />
                    {targetWeight && <ReviewRow label="Target weight" value={`${targetWeight} kg`} />}
                    {bodyFatPct && <ReviewRow label="Body fat" value={`${bodyFatPct}%`} />}
                    <ReviewRow label="Timeline" value={GOAL_TIMELINES.find(t => t.value === goalTimeline)?.label ?? goalTimeline} />
                    <ReviewRow label="Work" value={WORK_TYPES.find(w => w.value === workType)?.label ?? workType} />
                    <ReviewRow label="Activity" value={ACTIVITY_LEVELS.find(a => a.value === activityLevel)?.label ?? activityLevel} />
                    <ReviewRow label="Sleep" value={`${sleepHours}h — ${SLEEP_QUALITY_OPTIONS.find(s => s.value === sleepQuality)?.label ?? sleepQuality}`} />
                    {alcoholFrequency !== 'none' && <ReviewRow label="Alcohol" value={ALCOHOL_FREQUENCIES.find(a => a.value === alcoholFrequency)?.label ?? alcoholFrequency} />}
                    <ReviewRow label="Cooking" value={COOKING_SKILLS.find(c => c.value === cookingSkill)?.label ?? cookingSkill} />
                    <ReviewRow label="Adventurousness" value={`${foodAdventurousness}/10`} />
                    {motivation.length > 0 && <ReviewRow label="Motivation" value={motivation.join(', ')} />}
                    {dietaryRestrictions.length > 0 && (
                      <ReviewRow label="Diet" value={dietaryRestrictions.map(r => DIETARY_RESTRICTIONS.find(d => d.value === r)?.label ?? r).join(', ')} />
                    )}
                    {favouriteFoods.trim() && <ReviewRow label="Favourites" value={favouriteFoods} />}
                    {foodDislikes.trim() && <ReviewRow label="Dislikes" value={foodDislikes} />}
                    {currentSnacks.trim() && <ReviewRow label="Snacks" value={currentSnacks} />}
                    <ReviewRow label="Harder days" value={HARDER_DAYS_OPTIONS.find(d => d.value === harderDays)?.label ?? harderDays} />
                    <ReviewRow label="Eating out" value={EATING_OUT_FREQUENCIES.find(f => f.value === eatingOutFrequency)?.label ?? eatingOutFrequency} />
                    <ReviewRow label="Plan style" value={PLAN_PREFERENCES.find(p => p.value === planPreference)?.label ?? planPreference} />
                    {weeklyDerailers.trim() && <ReviewRow label="Derailers" value={weeklyDerailers} />}
                    {injuries.length > 0 && <ReviewRow label="Injuries" value={injuries.join(', ')} />}
                    <ReviewRow label="Experience" value={TRAINING_EXPERIENCE.find(t => t.value === experience)?.label ?? experience} />
                    {yearsTraining && <ReviewRow label="Years training" value={yearsTraining} />}
                    <ReviewRow label="Equipment" value={EQUIPMENT_ACCESS.find(e => e.value === equipmentAccess)?.label ?? equipmentAccess} />
                    <ReviewRow label="Session length" value={`${maxSessionMinutes} min`} />
                    {secondaryGoal !== 'none' && <ReviewRow label="Secondary goal" value={SECONDARY_TRAINING_GOALS.find(g => g.value === secondaryGoal)?.label ?? secondaryGoal} />}
                    {desiredOutcome.trim() && <ReviewRow label="Desired outcome" value={desiredOutcome} />}
                    {pastDietingChallenges.trim() && <ReviewRow label="Past challenges" value={pastDietingChallenges} />}
                    {(squat1rm || bench1rm || deadlift1rm || ohp1rm) && (
                      <ReviewRow label="1RMs" value={[
                        squat1rm && `SQ ${squat1rm}`,
                        bench1rm && `BP ${bench1rm}`,
                        deadlift1rm && `DL ${deadlift1rm}`,
                        ohp1rm && `OHP ${ohp1rm}`,
                      ].filter(Boolean).join(' / ') + ' kg'} />
                    )}
                    <ReviewRow label="Cardio" value={doesCardio ? `${cardioFrequency}x/week, ${cardioDuration} min — ${cardioTypesPreferred.join(', ') || 'any'}` : 'No'} />
                  </div>
                </div>

                {/* Schedule */}
                <div className="bg-white rounded-2xl p-6 border border-gray-200">
                  <h3 className="text-sm font-bold text-purple-700 uppercase tracking-wider mb-4">Schedule</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <ReviewRow label="Wake up" value={fmt12(wakeTime)} />
                    <ReviewRow label="Bedtime" value={fmt12(sleepTime)} />
                    <ReviewRow label="Workout" value={fmt12(workoutTime)} />
                    <ReviewRow label="Training" value={`${workoutDays}x / week`} />
                    <ReviewRow label="Meals" value={`${mealsPerDay} / day`} />
                    <ReviewRow label="Breakfast" value={fmt12(breakfastTime)} />
                    <ReviewRow label="Lunch" value={fmt12(lunchTime)} />
                    <ReviewRow label="Dinner" value={fmt12(dinnerTime)} />
                  </div>
                </div>

                {isManagedClient && coachCustomQuestions.length > 0 && (
                  <div className="bg-white rounded-2xl p-6 border border-gray-200">
                    <h3 className="text-sm font-bold text-purple-700 uppercase tracking-wider mb-4">Coach questions</h3>
                    <div className="grid grid-cols-1 gap-3">
                      {coachCustomQuestions.map((question) => {
                        const answer = coachQuestionAnswers[question.id]
                        const value = Array.isArray(answer) ? answer.join(', ') : String(answer ?? '').trim()
                        return value ? <ReviewRow key={question.id} label={question.label} value={value} /> : null
                      })}
                    </div>
                  </div>
                )}

                {/* AI Note */}
                <div className="flex gap-3 bg-purple-50 border border-purple-200 rounded-2xl p-5">
                  <Sparkles className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-purple-800 leading-relaxed">
                    {isManagedClient
                      ? 'Your coach will see this intake in their dashboard, including your goals, restrictions, schedule, and main obstacles, so they can review your case and decide the right next step.'
                      : 'Your personal AI coach will use everything you&apos;ve told us to create a meal plan and training structure that actually fit your life: favourite meals, snack habits, training level, schedule, recovery, and pace of progress. No bland template plans unless that&apos;s what you asked for.'}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  {!isManagedClient && (
                    <button
                      onClick={() => handleFinish('ai-generate')}
                      disabled={saving}
                      className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-4 rounded-xl text-base font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                    >
                      <Sparkles className="h-5 w-5" />
                      <span>{saving ? 'Saving...' : 'Generate AI Plans'}</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleFinish('dashboard')}
                    disabled={saving}
                    className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-base font-semibold transition-all disabled:opacity-50 ${
                      isManagedClient
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-lg'
                        : 'border-2 border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span>{saving ? 'Saving...' : isManagedClient ? 'Submit intake to coach' : 'Go to Dashboard'}</span>
                    <ArrowRight className="h-5 w-5" />
                  </button>
                </div>
              </>
            )}
          </div>
        )
      }
    }
  }

  return (
    <div className="max-w-2xl mx-auto pb-8">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-medium text-gray-600">Step {step + 1} of {steps.length}</span>
          <span className="text-sm font-medium text-gray-600">{Math.round(((step + 1) / steps.length) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-purple-600 to-indigo-600 h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>
        {/* Step dots */}
        <div className="flex justify-center gap-1.5 mt-3">
          {steps.map((s, i) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i <= step ? 'bg-purple-600 w-5' : 'bg-gray-300 w-1.5'
              }`}
            />
          ))}
        </div>
        <p className="text-center text-xs text-gray-500 mt-2">{steps[step]}</p>
      </div>

      {/* Card */}
      <div className="card p-6 md:p-8">
        <div key={step} className="animate-fade-in">
          {isTrainer ? renderTrainerStep() : renderStep()}
        </div>

        {/* Navigation (not shown on Review step which has its own buttons) */}
        {step < steps.length - 1 && (
          <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-100">
            <button
              onClick={() => setStep(step - 1)}
              disabled={step === 0}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl transition-all font-medium ${
                step === 0
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canContinue()}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all font-semibold ${
                canContinue()
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-lg'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <span>Continue</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Shared Sub-components ─────────────────────────── */

function StepHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="text-center mb-2">
      <div className="flex justify-center mb-4">{icon}</div>
      <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{title}</h2>
      <p className="text-gray-600">{subtitle}</p>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm font-semibold text-gray-700 mb-2">{children}</label>
}

function OptionCard({
  title, description, selected, onClick,
}: {
  title: string; description: string; selected: boolean; onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
        selected
          ? 'border-purple-500 bg-purple-50'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <h3 className={`font-semibold ${selected ? 'text-purple-700' : 'text-gray-900'}`}>{title}</h3>
      <p className="text-sm text-gray-600 mt-0.5">{description}</p>
    </div>
  )
}

function ChipGrid({
  items, selected, onToggle,
}: {
  items: { value: string; label: string }[]; selected: string[]; onToggle: (val: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => onToggle(item.value)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
            selected.includes(item.value)
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start py-2 px-3 bg-gray-50 rounded-lg">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-semibold text-gray-900 text-right ml-2">{value}</span>
    </div>
  )
}
