import { type CoachWizardAnswers } from '@/lib/findCoach'
import { StepHeading } from './shared'

function SummaryGroup({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null

  return (
    <div>
      <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-soft)]">{label}</div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span key={`${label}-${item}`} className="rounded-full bg-[var(--brand-100)] px-3 py-2 text-sm font-semibold text-[var(--brand-400)]">
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function SummaryStep({
  answers,
  updateAnswers,
  statusMessage,
}: {
  answers: CoachWizardAnswers
  updateAnswers: (patch: Partial<CoachWizardAnswers>) => void
  statusMessage?: string | null
}) {
  const summaryBlocks = [
    ['Goal', answers.goal ? [answers.goal] : []],
    ['Timeline', answers.timeline ? [answers.timeline] : []],
    ['Experience', answers.experience_level ? [answers.experience_level] : []],
    ['Skills', answers.skills_needed],
    ['Focus areas', answers.focus_areas],
    ['Style', answers.coaching_style_prefs],
    ['Location', answers.preferred_location ? [answers.preferred_location] : []],
    ['Languages', answers.preferred_languages],
    ['Days', answers.preferred_days],
    ['Times', answers.preferred_times],
  ] as const

  return (
    <div>
      <StepHeading
        title="Review your match brief"
        description="This is the preference set we’ll use for matching. Add any extra context that would help a coach understand what a good fit really looks like."
      />

      <div className="space-y-5 rounded-[28px] border border-[var(--line)] bg-[var(--panel)] p-6">
        {summaryBlocks.map(([label, items]) => (
          <SummaryGroup key={label} label={label} items={[...items]} />
        ))}

        <SummaryGroup
          label="Budget"
          items={[
            `${new Intl.NumberFormat('en-GB', {
              style: 'currency',
              currency: 'GBP',
              maximumFractionDigits: 0,
            }).format(answers.budget_min ?? 40)} - ${
              new Intl.NumberFormat('en-GB', {
                style: 'currency',
                currency: 'GBP',
                maximumFractionDigits: 0,
              }).format(answers.budget_max ?? 160)
            } ${answers.budget_period?.replace('_', ' ') ?? 'monthly'}`,
          ]}
        />

        {answers.context_text ? (
          <div className="rounded-[22px] bg-[var(--surface-strong)] p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-soft)]">Goal context</div>
            <p className="mt-3 text-sm leading-7 text-[var(--foreground)]">{answers.context_text}</p>
          </div>
        ) : null}
      </div>

      <div className="mt-6">
        <label htmlFor="additional-notes" className="mb-3 block text-sm font-semibold text-[var(--foreground)]">
          Anything else a good coach should know?
        </label>
        <textarea
          id="additional-notes"
          value={answers.additional_notes}
          onChange={(event) => updateAnswers({ additional_notes: event.target.value })}
          rows={5}
          className="input-field min-h-[140px] resize-none"
          placeholder="Optional: I travel often, I want a calm coaching style, or I need something sustainable around a busy schedule."
        />
      </div>

      {statusMessage ? (
        <div className="mt-5 rounded-[22px] border border-[rgba(230,57,70,0.24)] bg-[var(--brand-100)] px-5 py-4 text-sm leading-6 text-[var(--foreground)]">
          {statusMessage}
        </div>
      ) : null}
    </div>
  )
}
