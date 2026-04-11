export interface CoachWizardAnswers {
  goal: string | null
  timeline: string | null
  experience_level: string | null
  context_text: string
  skills_needed: string[]
  focus_areas: string[]
  coaching_style_prefs: string[]
  preferred_location: string | null
  preferred_languages: string[]
  preferred_days: string[]
  preferred_times: string[]
  budget_min: number | null
  budget_max: number | null
  budget_period: 'one_time' | 'weekly' | 'monthly' | null
  additional_notes: string
}

export interface CoachMatchOffer {
  id: string
  title: string
  description: string | null
  price: number
  billing_period: string
  cta_label: string
  is_active?: boolean
  sort_order?: number
}

export interface CoachMatchProfile {
  coach_id: string
  slug: string
  is_public?: boolean
  headline: string | null
  bio: string | null
  location_label: string | null
  consultation_url: string | null
  price_from: number | null
  price_to: number | null
  currency: string
  accepting_new_clients: boolean
  coach: {
    id: string
    full_name: string | null
    email: string
    avatar_url: string | null
    role?: string
    coach_specialties: string[]
    coach_formats: string[]
    coach_services: string[]
    coach_style: string | null
    coach_check_in_frequency: string | null
    coach_ideal_client: string | null
  }
  offers: CoachMatchOffer[]
}

export interface MatchedCoachResult extends CoachMatchProfile {
  score: number
  reasons: string[]
}

export const WIZARD_GOALS = [
  'Fat loss',
  'Muscle gain',
  'General fitness',
  'Sport-specific',
  'Lifestyle/wellness',
  'Body recomp',
] as const

export const WIZARD_SKILLS = [
  'Nutrition guidance',
  'Training plans',
  'Accountability',
  'Body composition',
  'Strength',
  'Flexibility',
  'Habit building',
  'No preference',
] as const

export const WIZARD_FOCUS_AREAS = [
  'Weight training',
  'Cardio',
  'HIIT',
  'Meal planning',
  'Macro tracking',
  'Intuitive eating',
  'Mobility',
  'Sport performance',
  'No preference',
] as const

export const WIZARD_COACHING_STYLES = [
  'Adaptable',
  'Approachable',
  'Encouraging',
  'Structured',
  'Goal-focused',
  'Patient',
  'No preference',
] as const

export const WIZARD_TIMELINES = [
  '1-4 weeks',
  '1-3 months',
  '3-6 months',
  'As long as it takes',
  'I just need one session',
] as const

export const WIZARD_EXPERIENCE = [
  'Complete beginner',
  'Some experience',
  'Intermediate',
  'Advanced',
] as const

export const WIZARD_COUNTRIES = [
  'United Kingdom',
  'United States',
  'Ireland',
  'Australia',
  'Any country',
] as const

export const WIZARD_LANGUAGES = [
  'English',
  'Spanish',
  'Portuguese',
  'Arabic',
  'French',
  'No preference',
] as const

export const WIZARD_DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const

export const WIZARD_TIMES = [
  'Early morning',
  'Morning',
  'Midday',
  'Afternoon',
  'Evening',
  'Late evening',
] as const

export const DEFAULT_COACH_WIZARD_ANSWERS: CoachWizardAnswers = {
  goal: null,
  timeline: null,
  experience_level: null,
  context_text: '',
  skills_needed: [],
  focus_areas: [],
  coaching_style_prefs: [],
  preferred_location: null,
  preferred_languages: [],
  preferred_days: [],
  preferred_times: [],
  budget_min: 40,
  budget_max: 160,
  budget_period: 'monthly',
  additional_notes: '',
}

const COACH_WIZARD_STORAGE_KEY = 'nutrigoal.find-coach.answers'
const COACH_WIZARD_LEAD_STORAGE_KEY = 'nutrigoal.find-coach.lead-preferences'

export function normalizeCoachWizardAnswers(
  answers?: Partial<CoachWizardAnswers> | null
): CoachWizardAnswers {
  const parsed = answers ?? {}

  return {
    ...DEFAULT_COACH_WIZARD_ANSWERS,
    ...parsed,
    goal: typeof parsed.goal === 'string' ? parsed.goal : null,
    timeline: typeof parsed.timeline === 'string' ? parsed.timeline : null,
    experience_level: typeof parsed.experience_level === 'string' ? parsed.experience_level : null,
    preferred_location: typeof parsed.preferred_location === 'string' ? parsed.preferred_location : null,
    skills_needed: Array.isArray(parsed.skills_needed) ? parsed.skills_needed : [],
    focus_areas: Array.isArray(parsed.focus_areas) ? parsed.focus_areas : [],
    coaching_style_prefs: Array.isArray(parsed.coaching_style_prefs) ? parsed.coaching_style_prefs : [],
    preferred_languages: Array.isArray(parsed.preferred_languages) ? parsed.preferred_languages : [],
    preferred_days: Array.isArray(parsed.preferred_days) ? parsed.preferred_days : [],
    preferred_times: Array.isArray(parsed.preferred_times) ? parsed.preferred_times : [],
    budget_min: typeof parsed.budget_min === 'number' ? parsed.budget_min : DEFAULT_COACH_WIZARD_ANSWERS.budget_min,
    budget_max: typeof parsed.budget_max === 'number' ? parsed.budget_max : DEFAULT_COACH_WIZARD_ANSWERS.budget_max,
    budget_period: parsed.budget_period === 'one_time' || parsed.budget_period === 'weekly' || parsed.budget_period === 'monthly'
      ? parsed.budget_period
      : DEFAULT_COACH_WIZARD_ANSWERS.budget_period,
    context_text: typeof parsed.context_text === 'string' ? parsed.context_text : '',
    additional_notes: typeof parsed.additional_notes === 'string' ? parsed.additional_notes : '',
  }
}

export function buildWizardBudgetLabel(answers: CoachWizardAnswers) {
  const formatter = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  })

  return `${formatter.format(answers.budget_min ?? DEFAULT_COACH_WIZARD_ANSWERS.budget_min ?? 40)}-${formatter.format(
    answers.budget_max ?? DEFAULT_COACH_WIZARD_ANSWERS.budget_max ?? 160
  )}/${answers.budget_period === 'one_time' ? 'session' : answers.budget_period === 'weekly' ? 'week' : 'month'}`
}

export function buildWizardGoalSummary(answers: CoachWizardAnswers) {
  const detail = answers.context_text.trim()
  if (detail) return detail

  const focus = answers.focus_areas.filter((item) => item !== 'No preference').slice(0, 2)
  if (answers.goal && focus.length > 0) {
    return `${answers.goal} with a focus on ${focus.join(' and ')}`
  }

  return answers.goal ?? ''
}

export function saveWizardAnswers(answers: CoachWizardAnswers) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(COACH_WIZARD_STORAGE_KEY, JSON.stringify(answers))
}

export function loadWizardAnswers(): CoachWizardAnswers | null {
  if (typeof window === 'undefined') return null

  const raw = window.localStorage.getItem(COACH_WIZARD_STORAGE_KEY)
  if (!raw) return null

  try {
    return normalizeCoachWizardAnswers(JSON.parse(raw) as Partial<CoachWizardAnswers>)
  } catch {
    return null
  }
}

export function clearWizardAnswers() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(COACH_WIZARD_STORAGE_KEY)
}

export function saveLeadWizardPreferences(answers: CoachWizardAnswers) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(COACH_WIZARD_LEAD_STORAGE_KEY, JSON.stringify(answers))
}

export function loadLeadWizardPreferences(): CoachWizardAnswers | null {
  if (typeof window === 'undefined') return null

  const raw = window.localStorage.getItem(COACH_WIZARD_LEAD_STORAGE_KEY)
  if (!raw) return null

  try {
    return normalizeCoachWizardAnswers(JSON.parse(raw) as Partial<CoachWizardAnswers>)
  } catch {
    return null
  }
}

export function clearLeadWizardPreferences() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(COACH_WIZARD_LEAD_STORAGE_KEY)
}
