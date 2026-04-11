import { type CoachMatchProfile, type CoachWizardAnswers } from '@/lib/findCoach'

interface DimensionScore {
  label: string
  weight: number
  available: boolean
  score: number
  reason: string | null
}

const goalKeywordMap: Record<string, string[]> = {
  'Fat loss': ['fat loss', 'weight loss', 'body composition', 'lifestyle nutrition', 'nutrition', 'accountability'],
  'Muscle gain': ['muscle gain', 'hypertrophy', 'strength', 'build muscle', 'strength training'],
  'General fitness': ['general fitness', 'fitness', 'online coaching', 'habit', 'wellness'],
  'Sport-specific': ['sport', 'performance', 'athlete', 'conditioning', 'sport performance'],
  'Lifestyle/wellness': ['wellness', 'lifestyle', 'habit', 'nutrition', 'general fitness'],
  'Body recomp': ['body composition', 'fat loss', 'muscle gain', 'strength', 'nutrition'],
}

const focusKeywordMap: Record<string, string[]> = {
  'Weight training': ['strength', 'weight training', 'hypertrophy', 'training'],
  Cardio: ['cardio', 'conditioning', 'endurance'],
  HIIT: ['hiit', 'conditioning', 'fitness'],
  'Meal planning': ['meal planning', 'nutrition', 'guidance'],
  'Macro tracking': ['macros', 'nutrition', 'body composition'],
  'Intuitive eating': ['intuitive eating', 'lifestyle', 'wellness'],
  Mobility: ['mobility', 'flexibility', 'movement'],
  'Sport performance': ['sport performance', 'athlete', 'performance'],
}

const styleMap: Record<string, string[]> = {
  Adaptable: ['flexible', 'balanced'],
  Approachable: ['balanced', 'flexible'],
  Encouraging: ['balanced'],
  Structured: ['structured'],
  'Goal-focused': ['structured', 'balanced'],
  Patient: ['flexible', 'balanced'],
}

const experienceKeywords: Record<string, string[]> = {
  'Complete beginner': ['beginner', 'starting out', 'new to training', 'new to the gym'],
  'Some experience': ['beginner', 'consistency', 'returning', 'getting back'],
  Intermediate: ['intermediate', 'progression', 'plateau', 'structured'],
  Advanced: ['advanced', 'athlete', 'competition', 'performance'],
}

function normalize(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase()
}

function includesKeyword(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword))
}

function scoreOverlap(selected: string[], candidate: string[]) {
  const normalizedSelected = selected.map(normalize).filter(Boolean)
  const normalizedCandidate = candidate.map(normalize).filter(Boolean)
  if (normalizedSelected.length === 0 || normalizedCandidate.length === 0) return 0

  const matches = normalizedSelected.filter((item) =>
    normalizedCandidate.some((candidateItem) => candidateItem.includes(item) || item.includes(candidateItem))
  )

  return matches.length / normalizedSelected.length
}

function buildReason(prefix: string, items: string[]) {
  if (items.length === 0) return null
  return `${prefix} ${items.slice(0, 2).join(' and ')}.`
}

export function scoreCoach(answers: CoachWizardAnswers, coach: CoachMatchProfile) {
  const coachSpecialties = coach.coach.coach_specialties ?? []
  const coachServices = coach.coach.coach_services ?? []
  const coachFormats = coach.coach.coach_formats ?? []
  const coachStyle = normalize(coach.coach.coach_style)
  const idealClient = normalize(coach.coach.coach_ideal_client)
  const location = normalize(coach.location_label)
  const goalKeywords = answers.goal ? goalKeywordMap[answers.goal] ?? [answers.goal] : []
  const preferredSkills = answers.skills_needed.filter((item) => item !== 'No preference')
  const preferredFocus = answers.focus_areas.filter((item) => item !== 'No preference')
  const preferredStyles = answers.coaching_style_prefs.filter((item) => item !== 'No preference')

  const dimensions: DimensionScore[] = [
    {
      label: 'Goal alignment',
      weight: 25,
      available: goalKeywords.length > 0 && coachSpecialties.length > 0,
      score: goalKeywords.length > 0 && coachSpecialties.length > 0
        ? Number(
          includesKeyword(coachSpecialties.map(normalize).join(' '), goalKeywords) ||
              includesKeyword(`${coach.headline ?? ''} ${coach.bio ?? ''}`.toLowerCase(), goalKeywords)
            ? 1
            : 0
        )
        : 0,
      reason: goalKeywords.length > 0 && coachSpecialties.length > 0 && includesKeyword(coachSpecialties.map(normalize).join(' '), goalKeywords)
        ? `Specializes in ${coachSpecialties.slice(0, 2).join(' and ')}.`
        : null,
    },
    {
      label: 'Skills match',
      weight: 20,
      available: preferredSkills.length > 0 && coachServices.length > 0,
      score: scoreOverlap(preferredSkills, coachServices),
      reason: buildReason(
        'Offers',
        preferredSkills.filter((item) =>
          coachServices.some((service) => normalize(service).includes(normalize(item)) || normalize(item).includes(normalize(service)))
        )
      ),
    },
    {
      label: 'Focus areas',
      weight: 15,
      available: preferredFocus.length > 0 && (coachSpecialties.length > 0 || coachServices.length > 0),
      score: preferredFocus.length > 0
        ? Math.max(
          scoreOverlap(
            preferredFocus.flatMap((item) => focusKeywordMap[item] ?? [item]),
            coachSpecialties
          ),
          scoreOverlap(preferredFocus, coachServices)
        )
        : 0,
      reason: buildReason('Lines up with your focus on', preferredFocus.filter((item) => {
        const keywords = focusKeywordMap[item] ?? [item]
        const haystack = `${coachSpecialties.join(' ')} ${coachServices.join(' ')}`.toLowerCase()
        return includesKeyword(haystack, keywords.map(normalize))
      })),
    },
    {
      label: 'Coaching style',
      weight: 15,
      available: preferredStyles.length > 0 && Boolean(coachStyle),
      score: preferredStyles.length > 0 && coachStyle
        ? preferredStyles.some((item) => (styleMap[item] ?? []).includes(coachStyle)) ? 1 : 0
        : 0,
      reason: preferredStyles.length > 0 && coachStyle && preferredStyles.some((item) => (styleMap[item] ?? []).includes(coachStyle))
        ? `Coaching style is ${coachStyle}, which fits what you asked for.`
        : null,
    },
    {
      label: 'Budget fit',
      weight: 10,
      available: (coach.price_from != null || coach.price_to != null) && answers.budget_min != null && answers.budget_max != null,
      score: (() => {
        const coachMin = coach.price_from ?? coach.price_to ?? 0
        const coachMax = coach.price_to ?? coach.price_from ?? coachMin
        const requestedMin = answers.budget_min ?? 0
        const requestedMax = answers.budget_max ?? requestedMin
        const overlap = Math.max(0, Math.min(coachMax, requestedMax) - Math.max(coachMin, requestedMin))
        const range = Math.max(coachMax - coachMin, requestedMax - requestedMin, 1)
        return overlap > 0 || (coachMin >= requestedMin && coachMin <= requestedMax) ? Math.min(1, (overlap || range) / range) : 0
      })(),
      reason: (coach.price_from != null || coach.price_to != null)
        ? 'Pricing looks compatible with your target budget.'
        : null,
    },
    {
      label: 'Experience fit',
      weight: 10,
      available: Boolean(answers.experience_level) && Boolean(idealClient),
      score: answers.experience_level && idealClient
        ? Number(includesKeyword(idealClient, experienceKeywords[answers.experience_level] ?? [answers.experience_level.toLowerCase()]))
        : 0,
      reason: answers.experience_level && idealClient && includesKeyword(idealClient, experienceKeywords[answers.experience_level] ?? [])
        ? 'Ideal client profile sounds close to your current experience level.'
        : null,
    },
    {
      label: 'Location',
      weight: 5,
      available: Boolean(answers.preferred_location) && answers.preferred_location !== 'Any country' && Boolean(location),
      score: answers.preferred_location && answers.preferred_location !== 'Any country' && location
        ? Number(location.includes(normalize(answers.preferred_location)))
        : 0,
      reason: answers.preferred_location && answers.preferred_location !== 'Any country' && location.includes(normalize(answers.preferred_location))
        ? `Based in ${coach.location_label}.`
        : null,
    },
    {
      label: 'Availability',
      weight: 5,
      available: coachFormats.length > 0,
      score: coachFormats.some((format) => ['online', 'hybrid'].includes(normalize(format))) ? 1 : 0,
      reason: coachFormats.some((format) => ['online', 'hybrid'].includes(normalize(format)))
        ? 'Offers online or hybrid coaching.'
        : null,
    },
  ]

  const availableWeight = dimensions.filter((dimension) => dimension.available).reduce((sum, dimension) => sum + dimension.weight, 0)
  const weightedScore = dimensions
    .filter((dimension) => dimension.available)
    .reduce((sum, dimension) => sum + (dimension.score * dimension.weight), 0)
  const score = availableWeight > 0 ? (weightedScore / availableWeight) * 100 : 0

  const reasons = dimensions
    .filter((dimension) => dimension.available && dimension.reason && dimension.score > 0)
    .sort((left, right) => (right.score * right.weight) - (left.score * left.weight))
    .slice(0, 3)
    .map((dimension) => dimension.reason as string)

  return {
    score: Number(score.toFixed(1)),
    reasons,
  }
}
