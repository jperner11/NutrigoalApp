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
  budget_min: null,
  budget_max: null,
  budget_period: 'monthly',
  additional_notes: '',
}

const COACH_WIZARD_STORAGE_KEY = 'nutrigoal.find-coach.answers'

export function saveWizardAnswers(answers: CoachWizardAnswers) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(COACH_WIZARD_STORAGE_KEY, JSON.stringify(answers))
}

export function loadWizardAnswers(): CoachWizardAnswers | null {
  if (typeof window === 'undefined') return null

  const raw = window.localStorage.getItem(COACH_WIZARD_STORAGE_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<CoachWizardAnswers>
    return {
      ...DEFAULT_COACH_WIZARD_ANSWERS,
      ...parsed,
      skills_needed: Array.isArray(parsed.skills_needed) ? parsed.skills_needed : [],
      focus_areas: Array.isArray(parsed.focus_areas) ? parsed.focus_areas : [],
      coaching_style_prefs: Array.isArray(parsed.coaching_style_prefs) ? parsed.coaching_style_prefs : [],
      preferred_languages: Array.isArray(parsed.preferred_languages) ? parsed.preferred_languages : [],
      preferred_days: Array.isArray(parsed.preferred_days) ? parsed.preferred_days : [],
      preferred_times: Array.isArray(parsed.preferred_times) ? parsed.preferred_times : [],
      context_text: typeof parsed.context_text === 'string' ? parsed.context_text : '',
      additional_notes: typeof parsed.additional_notes === 'string' ? parsed.additional_notes : '',
    }
  } catch {
    return null
  }
}

export function clearWizardAnswers() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(COACH_WIZARD_STORAGE_KEY)
}
