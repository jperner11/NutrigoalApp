import { HeartPulse, ShieldCheck, Sparkles, Target, Trophy, Waves } from 'lucide-react'
import {
  type CoachWizardAnswers,
  WIZARD_GOALS,
} from '@/lib/findCoach'
import { ChoiceCard, StepHeading } from './shared'

const goalDescriptions: Record<(typeof WIZARD_GOALS)[number], string> = {
  'Fat loss': 'Build a sustainable plan around nutrition, training, and accountability.',
  'Muscle gain': 'Find a coach who can guide structure, progression, and recovery.',
  'General fitness': 'Improve consistency, confidence, and all-round health.',
  'Sport-specific': 'Work toward a performance outcome tied to a sport or event.',
  'Lifestyle/wellness': 'Feel better day to day with calmer, more realistic coaching.',
  'Body recomp': 'Balance fat loss and muscle gain with a more tailored approach.',
}

const goalIcons = {
  'Fat loss': <Target className="h-6 w-6" />,
  'Muscle gain': <Trophy className="h-6 w-6" />,
  'General fitness': <HeartPulse className="h-6 w-6" />,
  'Sport-specific': <ShieldCheck className="h-6 w-6" />,
  'Lifestyle/wellness': <Waves className="h-6 w-6" />,
  'Body recomp': <Sparkles className="h-6 w-6" />,
}

interface GoalStepProps {
  answers: CoachWizardAnswers
  updateAnswers: (patch: Partial<CoachWizardAnswers>) => void
}

export default function GoalStep({ answers, updateAnswers }: GoalStepProps) {
  return (
    <div>
      <StepHeading
        title="What’s your goal?"
        description="Start with the outcome that matters most right now. We’ll use it to bias the match toward coaches who coach in that direction."
      />

      <div className="grid gap-4 md:grid-cols-2">
        {WIZARD_GOALS.map((goal) => (
          <ChoiceCard
            key={goal}
            title={goal}
            description={goalDescriptions[goal]}
            selected={answers.goal === goal}
            icon={goalIcons[goal]}
            onClick={() => updateAnswers({ goal })}
          />
        ))}
      </div>

      <div className="mt-6">
        <label htmlFor="goal-context" className="mb-3 block text-sm font-semibold text-[var(--foreground)]">
          Tell us a bit more about what you’re aiming for
        </label>
        <textarea
          id="goal-context"
          value={answers.context_text}
          onChange={(event) => updateAnswers({ context_text: event.target.value })}
          rows={4}
          className="input-field min-h-[120px] resize-none"
          placeholder="Optional: I want to feel stronger, train three times a week, and stop starting over every month."
        />
      </div>
    </div>
  )
}
