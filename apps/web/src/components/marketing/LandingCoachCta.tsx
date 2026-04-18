'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { WIZARD_GOALS } from '@/lib/findCoach'

export default function LandingCoachCta() {
  const [goal, setGoal] = useState<(typeof WIZARD_GOALS)[number]>('Fat loss')
  const href = useMemo(() => `/find-coach?goal=${encodeURIComponent(goal)}`, [goal])

  return (
    <div className="rounded-[28px] border border-[var(--line)] bg-[rgba(255,255,255,0.82)] p-4 shadow-[0_18px_36px_rgba(13,27,42,0.06)] sm:p-5">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-soft)]">
        Find a coach
      </div>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <label htmlFor="landing-goal" className="mb-2 block text-sm font-semibold text-[var(--foreground)]">
            I want help with
          </label>
          <select
            id="landing-goal"
            value={goal}
            onChange={(event) => setGoal(event.target.value as (typeof WIZARD_GOALS)[number])}
            className="input-field py-3"
          >
            {WIZARD_GOALS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:self-end">
          <Link
            href={href}
            className="btn-accent inline-flex h-[54px] items-center justify-center gap-2 rounded-2xl px-6 text-sm font-semibold"
          >
            Find matches
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
