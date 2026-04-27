'use client'

import { type ComponentType, useEffect, useMemo, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowLeft,
  ArrowRight,
  CalendarRange,
  ClipboardList,
  Compass,
  HeartHandshake,
  Languages,
  Loader2,
  MapPinned,
  PiggyBank,
  Sparkles,
  Target,
  UserRoundSearch,
  WandSparkles,
} from 'lucide-react'
import {
  clearWizardAnswers,
  normalizeCoachWizardAnswers,
  DEFAULT_COACH_WIZARD_ANSWERS,
  loadWizardAnswers,
  saveWizardAnswers,
  type MatchedCoachResult,
  type CoachWizardAnswers,
  WIZARD_GOALS,
} from '@/lib/findCoach'
import CoachResults from './CoachResults'
import WizardProgress from './WizardProgress'
import WizardShell from './WizardShell'
import GoalStep from './steps/GoalStep'
import TimelineStep from './steps/TimelineStep'
import ExperienceStep from './steps/ExperienceStep'
import SkillsStep from './steps/SkillsStep'
import FocusAreasStep from './steps/FocusAreasStep'
import CoachingStyleStep from './steps/CoachingStyleStep'
import LocationStep from './steps/LocationStep'
import LanguagesStep from './steps/LanguagesStep'
import ScheduleStep from './steps/ScheduleStep'
import BudgetStep from './steps/BudgetStep'
import SummaryStep from './steps/SummaryStep'
import LoadingStep from './steps/LoadingStep'

type WizardStepDefinition = {
  id: string
  title: string
  description: string
  badge: string
  icon: LucideIcon
  canContinue: (answers: CoachWizardAnswers) => boolean
  Component: ComponentType<{
    answers: CoachWizardAnswers
    updateAnswers: (patch: Partial<CoachWizardAnswers>) => void
    statusMessage?: string | null
  }>
}

const steps: WizardStepDefinition[] = [
  {
    id: 'goal',
    title: 'Match around the outcome you actually care about',
    description: 'A coach fit should start with your goal, not with endless filters and guesswork.',
    badge: 'Step 1 · Goal',
    icon: Target,
    canContinue: (answers) => Boolean(answers.goal),
    Component: GoalStep,
  },
  {
    id: 'timeline',
    title: 'A quick timeline changes the kind of coach that fits',
    description: 'Short-term accountability, one-off support, and long-game coaching each call for a different style of match.',
    badge: 'Step 2 · Timeline',
    icon: CalendarRange,
    canContinue: (answers) => Boolean(answers.timeline),
    Component: TimelineStep,
  },
  {
    id: 'experience',
    title: 'The right coach meets you at your current level',
    description: 'We use your training background to avoid over-scoring coaches whose usual client type is too far from where you are.',
    badge: 'Step 3 · Experience',
    icon: UserRoundSearch,
    canContinue: (answers) => Boolean(answers.experience_level),
    Component: ExperienceStep,
  },
  {
    id: 'skills',
    title: 'Support can mean accountability, planning, or deeper guidance',
    description: 'This step shapes whether the match favors training-led, nutrition-led, or more holistic support.',
    badge: 'Step 4 · Support',
    icon: HeartHandshake,
    canContinue: (answers) => answers.skills_needed.length > 0,
    Component: SkillsStep,
  },
  {
    id: 'focus',
    title: 'Focus areas help us sharpen the shortlist',
    description: 'Your future coach should feel relevant to how you want to train and what you want to improve.',
    badge: 'Step 5 · Focus',
    icon: Compass,
    canContinue: (answers) => answers.focus_areas.length > 0,
    Component: FocusAreasStep,
  },
  {
    id: 'style',
    title: 'A strong match is also about how coaching feels',
    description: 'People stay with coaching that feels clear, motivating, and emotionally workable for them.',
    badge: 'Step 6 · Style',
    icon: WandSparkles,
    canContinue: (answers) => answers.coaching_style_prefs.length > 0,
    Component: CoachingStyleStep,
  },
  {
    id: 'location',
    title: 'Location can matter even when coaching is remote',
    description: 'Timezone, culture, and local context can all influence how natural a coaching relationship feels.',
    badge: 'Step 7 · Location',
    icon: MapPinned,
    canContinue: (answers) => Boolean(answers.preferred_location),
    Component: LocationStep,
  },
  {
    id: 'languages',
    title: 'Language preference can make coaching easier to trust',
    description: 'The best fit is not just technically relevant. It also needs to feel natural to communicate with.',
    badge: 'Step 8 · Language',
    icon: Languages,
    canContinue: (answers) => answers.preferred_languages.length > 0,
    Component: LanguagesStep,
  },
  {
    id: 'schedule',
    title: 'Availability matters because consistency matters',
    description: 'We use this to bias toward coaches whose delivery style is more likely to fit your week.',
    badge: 'Step 9 · Schedule',
    icon: CalendarRange,
    canContinue: (answers) => answers.preferred_days.length > 0 && answers.preferred_times.length > 0,
    Component: ScheduleStep,
  },
  {
    id: 'budget',
    title: 'A realistic budget makes the results more useful',
    description: 'This helps keep the shortlist practical, not aspirational.',
    badge: 'Step 10 · Budget',
    icon: PiggyBank,
    canContinue: (answers) => {
      const min = answers.budget_min ?? 40
      const max = answers.budget_max ?? 160
      return min <= max && Boolean(answers.budget_period)
    },
    Component: BudgetStep,
  },
  {
    id: 'summary',
    title: 'One last look before we match',
    description: 'Review your brief, add any extra nuance, and then we’ll move into coach matching.',
    badge: 'Step 11 · Review',
    icon: ClipboardList,
    canContinue: () => true,
    Component: SummaryStep,
  },
]

export default function CoachWizard({ initialGoal = null }: { initialGoal?: string | null }) {
  const [answers, setAnswers] = useState<CoachWizardAnswers>(DEFAULT_COACH_WIZARD_ANSWERS)
  const [stepIndex, setStepIndex] = useState(0)
  const [phase, setPhase] = useState<'questions' | 'loading' | 'results'>('questions')
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [matches, setMatches] = useState<MatchedCoachResult[]>([])

  useEffect(() => {
    const storedAnswers = loadWizardAnswers()
    const normalizedQueryGoal = WIZARD_GOALS.find((goal) => goal === initialGoal) ?? null

    if (!storedAnswers && !normalizedQueryGoal) return

    setAnswers(normalizeCoachWizardAnswers({
      ...storedAnswers,
      goal: storedAnswers?.goal ?? normalizedQueryGoal,
    }))
  }, [initialGoal])

  useEffect(() => {
    saveWizardAnswers(answers)
  }, [answers])

  const currentStep = steps[stepIndex]
  const isLastStep = stepIndex === steps.length - 1

  const updateAnswers = (patch: Partial<CoachWizardAnswers>) => {
    setAnswers((current) => ({
      ...current,
      ...patch,
    }))
  }

  const asideHighlights = useMemo(() => {
    const lines = [
      answers.goal ? `Goal: ${answers.goal}` : 'Start with your goal so results feel intentional.',
      answers.skills_needed.length > 0 ? `Support: ${answers.skills_needed.slice(0, 2).join(' · ')}` : 'Tell us what kind of support you actually want.',
      answers.preferred_location ? `Location: ${answers.preferred_location}` : 'Set location and language preferences if they matter to you.',
      answers.budget_period ? `Budget: ${(answers.budget_min ?? 40)}-${answers.budget_max ?? 160} ${answers.budget_period.replace('_', ' ')}` : 'Budget helps keep the shortlist realistic.',
    ]

    return lines
  }, [answers])

  function encodeAnswers(value: CoachWizardAnswers) {
    const json = JSON.stringify(value)
    const bytes = new TextEncoder().encode(json)
    let binary = ''
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte)
    })

    return window.btoa(binary)
  }

  async function handleSubmit() {
    setPhase('loading')
    setStatusMessage(null)
    setMatches([])

    const response = await fetch(`/api/coach-match?q=${encodeURIComponent(encodeAnswers(answers))}`)
    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      setPhase('questions')
      setStatusMessage(payload?.error ?? 'We could not match coaches right now. Please try again.')
      return
    }

    setMatches((payload?.matches as MatchedCoachResult[]) ?? [])
    setPhase('results')
  }

  function handleContinue() {
    if (!currentStep.canContinue(answers)) return

    if (isLastStep) {
      void handleSubmit()
      return
    }

    setStatusMessage(null)
    setStepIndex((index) => Math.min(index + 1, steps.length - 1))
  }

  function handleBack() {
    if (phase === 'loading') return
    if (phase === 'results') {
      setPhase('questions')
      return
    }
    setStatusMessage(null)
    setStepIndex((index) => Math.max(index - 1, 0))
  }

  const resultsMode = phase === 'results'
  const activeStep = resultsMode
    ? {
      badge: 'Results',
      title: 'Here are the coaches most likely to fit',
      description: 'These matches are ranked from your answers, so you can start with the most relevant profiles instead of browsing blind.',
      icon: Sparkles,
    }
    : currentStep

  const Icon = activeStep.icon
  const isCurrentStepComplete = currentStep.canContinue(answers)

  return (
    <WizardShell
      stepLabel={activeStep.badge}
      title={activeStep.title}
      description={activeStep.description}
      aside={
        <div>
          <div className="inline-flex rounded-full bg-white/12 p-4 text-sky-50">
            <Icon className="h-7 w-7" />
          </div>
          <div className="mt-6 text-sm font-semibold uppercase tracking-[0.16em] text-sky-100/70">
            Your match brief
          </div>
          <div className="mt-4 space-y-3">
            {asideHighlights.map((item) => (
              <div key={item} className="rounded-[20px] border border-white/10 bg-white/8 px-4 py-3 text-sm leading-6 text-sky-50/88">
                {item}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              clearWizardAnswers()
              setAnswers(DEFAULT_COACH_WIZARD_ANSWERS)
              setStepIndex(0)
              setMatches([])
              setPhase('questions')
              setStatusMessage(null)
            }}
            className="mt-6 text-sm font-semibold text-sky-100/88 underline-offset-4 hover:underline"
          >
            Reset answers
          </button>
        </div>
      }
      progress={<WizardProgress currentStep={resultsMode ? steps.length : Math.min(stepIndex + 1, steps.length)} totalSteps={steps.length} />}
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={handleBack}
            disabled={(stepIndex === 0 && phase === 'questions') || phase === 'loading'}
            className="btn-secondary inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowLeft className="h-4 w-4" />
            {resultsMode ? 'Edit answers' : 'Back'}
          </button>
          {resultsMode ? (
            <button
              type="button"
              onClick={() => {
                clearWizardAnswers()
                setAnswers(DEFAULT_COACH_WIZARD_ANSWERS)
                setStepIndex(0)
                setMatches([])
                setPhase('questions')
              }}
              className="btn-primary inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold"
            >
              Start over
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleContinue}
              disabled={!isCurrentStepComplete || phase === 'loading'}
              className="btn-primary inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            >
              {phase === 'loading' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Matching
                </>
              ) : (
                <>
                  {isLastStep ? 'Find coaches' : 'Continue'}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          )}
        </div>
      }
    >
      {phase === 'loading' ? (
        <LoadingStep answers={answers} />
      ) : phase === 'results' ? (
        <CoachResults answers={answers} matches={matches} />
      ) : (
        <currentStep.Component answers={answers} updateAnswers={updateAnswers} statusMessage={statusMessage} />
      )}

      <div className="mt-8 flex items-center gap-3 rounded-[22px] border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--muted)]">
        <Sparkles className="h-4 w-4 text-[var(--brand-500)]" />
        <span>This route is public by design, so people can discover a coach before creating an account.</span>
      </div>
    </WizardShell>
  )
}
