import { type CoachWizardAnswers, WIZARD_COACHING_STYLES } from '@/lib/findCoach'
import { ChoiceChip, StepHeading, toggleMultiValue } from './shared'

export default function CoachingStyleStep({
  answers,
  updateAnswers,
}: {
  answers: CoachWizardAnswers
  updateAnswers: (patch: Partial<CoachWizardAnswers>) => void
}) {
  const selectedCount = answers.coaching_style_prefs.filter((item) => item !== 'No preference').length

  return (
    <div>
      <StepHeading
        title="What coaching style works best?"
        description="Choose up to three. Some people want warmth and adaptability, others want a sharper, more structured push."
        hint={`${selectedCount}/3 selected`}
      />

      <div className="flex flex-wrap gap-3">
        {WIZARD_COACHING_STYLES.map((style) => (
          <ChoiceChip
            key={style}
            label={style}
            selected={answers.coaching_style_prefs.includes(style)}
            onClick={() =>
              updateAnswers({
                coaching_style_prefs: toggleMultiValue(answers.coaching_style_prefs, style, {
                  exclusiveValue: 'No preference',
                  maxSelections: 3,
                }),
              })
            }
          />
        ))}
      </div>
    </div>
  )
}
