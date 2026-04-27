'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { UserCheck, MessageSquare, FileText, Utensils, Dumbbell } from 'lucide-react'
import Link from 'next/link'
import AppPageHeader from '@/components/ui/AppPageHeader'
import Portrait from '@/components/ui/Portrait'
import { isManagedClientRole } from '@nutrigoal/shared'

interface TrainerInfo {
  id: string
  full_name: string | null
  email: string
}

function getInitials(trainer: TrainerInfo) {
  const source = trainer.full_name?.trim() || trainer.email
  return source
    .split(/\s+|@/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export default function MyNutritionistPage() {
  const { profile } = useUser()
  const [trainer, setTrainer] = useState<TrainerInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasDietPlan, setHasDietPlan] = useState(false)
  const [hasTrainingPlan, setHasTrainingPlan] = useState(false)

  useEffect(() => {
    if (!profile) return

    const currentProfileId = profile.id
    const trainerId = profile.personal_trainer_id ?? profile.nutritionist_id
    if (!trainerId) {
      setLoading(false)
      return
    }

    const supabase = createClient()

    async function load() {
      const [{ data: trainerData }, { count: dietCount }, { count: trainingCount }] = await Promise.all([
        supabase.from('user_profiles').select('id, full_name, email').eq('id', trainerId).single(),
        supabase.from('diet_plans').select('*', { count: 'exact', head: true }).eq('user_id', currentProfileId).eq('is_active', true),
        supabase.from('training_plans').select('*', { count: 'exact', head: true }).eq('user_id', currentProfileId).eq('is_active', true),
      ])

      setTrainer(trainerData ?? null)
      setHasDietPlan((dietCount ?? 0) > 0)
      setHasTrainingPlan((trainingCount ?? 0) > 0)
      setLoading(false)
    }

    load()
  }, [profile])

  if (loading) {
    return (
      <div className="card p-8">
        <div
          className="mono"
          style={{ fontSize: 11, color: 'var(--fg-4)', letterSpacing: '0.14em' }}
        >
          LOADING
        </div>
        <div className="serif mt-2" style={{ fontSize: 24, color: 'var(--fg)' }}>
          Pulling your coach details.
        </div>
      </div>
    )
  }

  if (!trainer || !profile || !isManagedClientRole(profile.role)) {
    return (
      <div className="mx-auto max-w-[520px]">
        <AppPageHeader
          eyebrow="Managed client"
          title="My"
          accent="coach."
          subtitle="Your plans, messages, and feedback requests all run through this relationship."
        />

        <div className="card p-10 text-center">
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ background: 'var(--ink-3)', color: 'var(--acc)' }}
          >
            <UserCheck className="h-6 w-6" />
          </div>
          <div className="serif" style={{ fontSize: 26 }}>
            No coach{' '}
            <span className="italic-serif" style={{ color: 'var(--fg-3)' }}>
              linked yet.
            </span>
          </div>
          <p
            className="mx-auto mt-3 max-w-[420px]"
            style={{ fontSize: 14, color: 'var(--fg-2)', lineHeight: 1.6 }}
          >
            Your account isn&apos;t connected to a personal trainer right now.
            Browse the marketplace if you want to find one.
          </p>
          <Link href="/find-coach" className="btn btn-accent mt-6">
            Browse coaches →
          </Link>
        </div>
      </div>
    )
  }

  const initials = getInitials(trainer)
  const trainerName = trainer.full_name || 'Personal trainer'

  return (
    <div className="mx-auto max-w-[920px]">
      <AppPageHeader
        eyebrow="Managed client"
        title="My"
        accent="coach."
        subtitle="Your plans, messages, and feedback requests all run through this relationship."
      />

      {/* Coach card */}
      <div className="card p-6">
        <div className="grid gap-5" style={{ gridTemplateColumns: '120px 1fr' }}>
          <Portrait seed={1} label={initials} height={140} />
          <div className="min-w-0">
            <div className="serif" style={{ fontSize: 28, lineHeight: 1.15 }}>
              {trainerName}
            </div>
            <div
              className="mt-1 truncate"
              style={{ fontSize: 14, color: 'var(--fg-2)' }}
            >
              {trainer.email}
            </div>
            <div
              className="mono mt-3"
              style={{
                fontSize: 11,
                color: 'var(--ok)',
                letterSpacing: '0.1em',
              }}
            >
              ● Online · usually replies within a day
            </div>
            <p
              className="mt-4"
              style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.6 }}
            >
              Your trainer assigns nutrition and training plans, monitors
              progress, messages directly, and reviews your feedback check-ins.
            </p>
          </div>
        </div>
      </div>

      {/* Plan status grid */}
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Link href="/diet" className="card-2 p-5 transition hover:border-[var(--acc)]">
          <div className="row gap-2">
            <Utensils className="h-4 w-4" style={{ color: 'var(--acc)' }} />
            <div
              className="mono"
              style={{
                fontSize: 10,
                color: 'var(--fg-4)',
                letterSpacing: '0.12em',
              }}
            >
              DIET PLAN
            </div>
          </div>
          <div
            className="serif mt-2"
            style={{ fontSize: 18, lineHeight: 1.25 }}
          >
            {hasDietPlan ? 'Assigned & ready.' : (
              <>
                Awaiting{' '}
                <span className="italic-serif" style={{ color: 'var(--fg-3)' }}>
                  your trainer.
                </span>
              </>
            )}
          </div>
          <p
            className="mt-2"
            style={{ fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.5 }}
          >
            {hasDietPlan
              ? 'Open to follow your meal plan and log meals.'
              : 'Your trainer hasn’t assigned a diet plan yet.'}
          </p>
          <div
            className="mono mt-3"
            style={{
              fontSize: 10,
              color: 'var(--acc)',
              letterSpacing: '0.1em',
            }}
          >
            OPEN DIET →
          </div>
        </Link>

        <Link href="/training" className="card-2 p-5 transition hover:border-[var(--acc)]">
          <div className="row gap-2">
            <Dumbbell className="h-4 w-4" style={{ color: 'var(--acc)' }} />
            <div
              className="mono"
              style={{
                fontSize: 10,
                color: 'var(--fg-4)',
                letterSpacing: '0.12em',
              }}
            >
              TRAINING PLAN
            </div>
          </div>
          <div
            className="serif mt-2"
            style={{ fontSize: 18, lineHeight: 1.25 }}
          >
            {hasTrainingPlan ? 'Ready to train.' : (
              <>
                Awaiting{' '}
                <span className="italic-serif" style={{ color: 'var(--fg-3)' }}>
                  your trainer.
                </span>
              </>
            )}
          </div>
          <p
            className="mt-2"
            style={{ fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.5 }}
          >
            {hasTrainingPlan
              ? 'Open to follow your sessions and log workouts.'
              : 'Your trainer hasn’t published your programme yet.'}
          </p>
          <div
            className="mono mt-3"
            style={{
              fontSize: 10,
              color: 'var(--acc)',
              letterSpacing: '0.1em',
            }}
          >
            OPEN TRAINING →
          </div>
        </Link>
      </div>

      {/* Quick links */}
      <div className="mt-6">
        <div
          className="mono mb-3"
          style={{
            fontSize: 11,
            color: 'var(--fg-4)',
            letterSpacing: '0.14em',
          }}
        >
          <span style={{ color: 'var(--acc)', marginRight: 6 }}>✦</span>
          STAY IN TOUCH
        </div>
        <div className="col gap-3">
          <Link
            href="/my-nutritionist/messages"
            className="card-2 row gap-3 p-4 transition hover:border-[var(--acc)]"
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{ background: 'var(--ink-3)', color: 'var(--acc)' }}
            >
              <MessageSquare className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="serif" style={{ fontSize: 16, lineHeight: 1.2 }}>
                Messages
              </div>
              <div
                className="mt-0.5 truncate"
                style={{ fontSize: 12, color: 'var(--fg-3)' }}
              >
                Chat with {trainerName.split(' ')[0]} directly.
              </div>
            </div>
          </Link>

          <Link
            href="/my-nutritionist/feedback"
            className="card-2 row gap-3 p-4 transition hover:border-[var(--acc)]"
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{ background: 'var(--ink-3)', color: 'var(--acc)' }}
            >
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="serif" style={{ fontSize: 16, lineHeight: 1.2 }}>
                Feedback requests
              </div>
              <div
                className="mt-0.5 truncate"
                style={{ fontSize: 12, color: 'var(--fg-3)' }}
              >
                Respond to weekly check-ins and coaching prompts.
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
