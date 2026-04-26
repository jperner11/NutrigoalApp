'use client'

import Link from 'next/link'
import {
  Moon,
  Shield,
  Activity,
  ArrowRight,
  Brain,
} from 'lucide-react'
import AppPageHeader from '@/components/ui/AppPageHeader'

const TOOLS = [
  {
    slug: 'recovery',
    title: 'Recovery Protocol',
    description: 'Complete recovery system — sleep, mobility, stress management, deload strategy, and supplements.',
    icon: Moon,
    kicker: 'SLEEP · MOBILITY · DELOADS',
  },
  {
    slug: 'injury-prevention',
    title: 'Injury Prevention',
    description: 'Prehab routines, warm-up protocols, and a framework for training around niggles.',
    icon: Shield,
    kicker: 'PREHAB · WARM-UPS · MODIFICATIONS',
  },
  {
    slug: 'recomp',
    title: 'Body Recomposition',
    description: '16-week blueprint to build muscle and lose fat simultaneously — training, nutrition, and tracking.',
    icon: Activity,
    kicker: 'TRAINING · NUTRITION · TRACKING',
  },
]

export default function AICoachingHub() {
  return (
    <div className="mx-auto max-w-[980px]">
      <AppPageHeader
        eyebrow="AI coaching"
        title="Coaching"
        accent="tools."
        subtitle="Expert-level analysis powered by your profile data, built for recovery, injury prevention, and body recomposition."
        chip={<span className="chip">Profile-aware</span>}
      />

      <div className="card mb-5 p-6">
        <div className="row flex-wrap justify-between gap-5">
          <div className="max-w-[620px]">
            <div
              className="mono"
              style={{ fontSize: 11, color: 'var(--fg-4)', letterSpacing: '0.14em' }}
            >
              ON-DEMAND COACH
            </div>
            <h2 className="serif mt-2" style={{ fontSize: 30, lineHeight: 1.08, color: 'var(--fg)' }}>
              Pick a lens,{' '}
              <span className="italic-serif" style={{ color: 'var(--fg-3)' }}>
                get the blueprint.
              </span>
            </h2>
            <p className="mt-3 max-w-[560px] text-sm leading-6" style={{ color: 'var(--fg-2)' }}>
              Each tool reads your profile context and returns a practical coaching report you can act on this week.
            </p>
          </div>
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl"
            style={{ background: 'var(--ink-3)', color: 'var(--acc)' }}
          >
            <Brain className="h-7 w-7" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {TOOLS.map((tool) => {
          const Icon = tool.icon
          return (
            <Link
              key={tool.slug}
              href={`/ai/coaching/${tool.slug}`}
              className="card-2 group p-5 transition hover:border-[var(--acc)]"
            >
              <div className="flex h-full flex-col justify-between gap-6">
                <div>
                  <div className="row justify-between gap-4">
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-xl"
                      style={{ background: 'var(--ink-3)', color: 'var(--acc)' }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" style={{ color: 'var(--acc)' }} />
                  </div>
                  <div
                    className="mono mt-5"
                    style={{ fontSize: 10, color: 'var(--fg-4)', letterSpacing: '0.12em' }}
                  >
                    {tool.kicker}
                  </div>
                  <h3 className="serif mt-2" style={{ fontSize: 20, lineHeight: 1.18, color: 'var(--fg)' }}>
                    {tool.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6" style={{ color: 'var(--fg-2)' }}>
                    {tool.description}
                  </p>
                </div>
                <div
                  className="mono"
                  style={{ fontSize: 10, color: 'var(--acc)', letterSpacing: '0.1em' }}
                >
                  OPEN TOOL →
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
