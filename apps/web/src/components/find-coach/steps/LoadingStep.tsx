'use client'

import { useEffect, useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { type CoachWizardAnswers } from '@/lib/findCoach'

const fallbackMessages = [
  'shortlist coaches who fit your goal',
  'prioritise the right coaching style',
  'spot coaches inside your budget range',
  'surface profiles that match your schedule',
]

const goalMessages: Record<string, string> = {
  'Fat loss': 'support sustainable fat loss with structure and accountability',
  'Muscle gain': 'build lean mass with the right training and nutrition guidance',
  'General fitness': 'make your routine feel steadier, stronger, and easier to stick with',
  'Sport-specific': 'support your performance outcome with more relevant coaching',
  'Lifestyle/wellness': 'help you feel better day to day without turning life upside down',
  'Body recomp': 'balance fat loss and muscle gain with a more tailored plan',
}

export default function LoadingStep({ answers }: { answers: CoachWizardAnswers }) {
  const messages = answers.goal ? [goalMessages[answers.goal] ?? fallbackMessages[0], ...fallbackMessages] : fallbackMessages
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const interval = window.setInterval(() => {
      setIndex((value) => (value + 1) % messages.length)
    }, 1400)

    return () => window.clearInterval(interval)
  }, [messages.length])

  return (
    <div className="flex h-full min-h-[420px] flex-col items-center justify-center text-center">
      <div className="inline-flex rounded-full bg-[var(--brand-100)] p-5 text-[var(--brand-900)]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
      <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-[rgba(237,248,255,0.72)] px-4 py-2 text-sm font-semibold text-[var(--brand-700)]">
        <Sparkles className="h-4 w-4" />
        Matching in progress
      </div>
      <h2 className="mt-5 max-w-xl font-display text-3xl font-bold text-[var(--foreground)] sm:text-4xl">
        Finding coaches who will {messages[index]}
      </h2>
      <p className="mt-4 max-w-lg text-base leading-7 text-[var(--muted)]">
        We’re turning your answers into a coach brief so the next step can rank profiles by fit instead of making you browse from scratch.
      </p>
    </div>
  )
}
