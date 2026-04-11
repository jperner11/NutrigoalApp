import { useState } from 'react'
import { type CoachWizardAnswers, WIZARD_COUNTRIES } from '@/lib/findCoach'
import { ChoiceChip, StepHeading } from './shared'

const extraCountries = ['Canada', 'Germany', 'Netherlands', 'South Africa', 'United Arab Emirates']

export default function LocationStep({
  answers,
  updateAnswers,
}: {
  answers: CoachWizardAnswers
  updateAnswers: (patch: Partial<CoachWizardAnswers>) => void
}) {
  const [showAll, setShowAll] = useState(false)
  const countries = showAll ? [...WIZARD_COUNTRIES, ...extraCountries] : WIZARD_COUNTRIES

  return (
    <div>
      <StepHeading
        title="Where would you like your coach to be based?"
        description="Location can matter for timezone overlap, cultural fit, pricing, and whether you want someone local or fully remote."
      />

      <div className="flex flex-wrap gap-3">
        {countries.map((country) => (
          <ChoiceChip
            key={country}
            label={country}
            selected={answers.preferred_location === country}
            onClick={() => updateAnswers({ preferred_location: country })}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => setShowAll((value) => !value)}
        className="mt-5 text-sm font-semibold text-[var(--brand-700)] underline-offset-4 hover:underline"
      >
        {showAll ? 'Show fewer countries' : 'Show all'}
      </button>
    </div>
  )
}
