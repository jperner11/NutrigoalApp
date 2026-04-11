import { useState } from 'react'
import { type CoachWizardAnswers, WIZARD_LANGUAGES } from '@/lib/findCoach'
import { ChoiceChip, StepHeading, toggleMultiValue } from './shared'

const extraLanguages = ['Italian', 'German', 'Hindi', 'Urdu', 'Polish', 'Turkish']

export default function LanguagesStep({
  answers,
  updateAnswers,
}: {
  answers: CoachWizardAnswers
  updateAnswers: (patch: Partial<CoachWizardAnswers>) => void
}) {
  const [showAll, setShowAll] = useState(false)
  const languages = showAll ? [...WIZARD_LANGUAGES, ...extraLanguages] : WIZARD_LANGUAGES

  return (
    <div>
      <StepHeading
        title="Any other languages you’d like your coach to speak?"
        description="This can help with clarity, comfort, and the overall feel of the coaching relationship."
      />

      <div className="flex flex-wrap gap-3">
        {languages.map((language) => (
          <ChoiceChip
            key={language}
            label={language}
            selected={answers.preferred_languages.includes(language)}
            onClick={() =>
              updateAnswers({
                preferred_languages: toggleMultiValue(answers.preferred_languages, language, { exclusiveValue: 'No preference' }),
              })
            }
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => setShowAll((value) => !value)}
        className="mt-5 text-sm font-semibold text-[var(--brand-700)] underline-offset-4 hover:underline"
      >
        {showAll ? 'Show fewer languages' : 'Show all'}
      </button>
    </div>
  )
}
