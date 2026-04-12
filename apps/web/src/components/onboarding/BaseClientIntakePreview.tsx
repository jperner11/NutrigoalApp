'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Info } from 'lucide-react'

// Single source of truth for what the platform already collects from every
// client during base onboarding. Keep this in sync with CLIENT_STEPS in
// apps/web/src/app/(app)/onboarding/page.tsx. Used by coach onboarding +
// coach settings so trainers can see what's already asked and avoid
// duplicating built-in fields in their custom intake.
const BASE_INTAKE_CATEGORIES: Array<{ title: string; items: string[] }> = [
  {
    title: 'Stats & goals',
    items: [
      'Full name, age, gender',
      'Height, weight, body fat %',
      'Primary goal (fat loss / muscle gain / maintenance)',
      'Target weight, goal timeline',
      'Desired outcome (free text)',
      'Past dieting challenges (free text)',
    ],
  },
  {
    title: 'Lifestyle',
    items: [
      'Work type (desk / active / physical / shift)',
      'Activity level',
      'Sleep hours and sleep quality',
      'Stress level',
      'Alcohol frequency and details',
    ],
  },
  {
    title: 'Food preferences',
    items: [
      'Dietary restrictions',
      'Allergies',
      'Food dislikes',
      'Favourite foods',
      'Cooking skill',
      'Meal prep preference',
      'Food adventurousness',
    ],
  },
  {
    title: 'Snack habits',
    items: [
      'Snack frequency and motivations',
      'Snack preferences',
      'Eating out frequency',
      'Harder days behaviour',
    ],
  },
  {
    title: 'Health',
    items: ['Injuries (common list + free text)', 'Medical conditions', 'Medications'],
  },
  {
    title: 'Training',
    items: [
      'Years training, experience level',
      'Equipment access',
      'Training style(s) and secondary goal',
      'Max session minutes',
      'Current 1RMs (squat, bench, deadlift, OHP) if known',
      'Cardio: does/does not, types, frequency, duration',
    ],
  },
  {
    title: 'Schedule',
    items: ['Preferred training days', 'Typical wake/sleep and training window'],
  },
]

interface BaseClientIntakePreviewProps {
  defaultOpen?: boolean
  className?: string
}

export function BaseClientIntakePreview({
  defaultOpen = false,
  className = '',
}: BaseClientIntakePreviewProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div
      className={`rounded-2xl border border-indigo-200 bg-indigo-50/60 ${className}`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start gap-3 px-5 py-4 text-left"
      >
        <Info className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-indigo-900">
            We already ask your clients these questions
          </p>
          <p className="text-xs text-indigo-700 mt-0.5">
            {open
              ? 'Hide the full list.'
              : 'Expand to see what the base intake already covers so you don\u2019t duplicate it.'}
          </p>
        </div>
        {open ? (
          <ChevronDown className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
        ) : (
          <ChevronRight className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
        )}
      </button>

      {open && (
        <div className="px-5 pb-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          {BASE_INTAKE_CATEGORIES.map((cat) => (
            <div
              key={cat.title}
              className="bg-white/80 rounded-xl border border-indigo-100 p-4"
            >
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700 mb-2">
                {cat.title}
              </h4>
              <ul className="space-y-1">
                {cat.items.map((item) => (
                  <li key={item} className="text-xs text-gray-700 leading-snug">
                    • {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
