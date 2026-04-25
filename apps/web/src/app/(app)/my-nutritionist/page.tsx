'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { UserCheck, MessageSquare, FileText, Utensils, Dumbbell } from 'lucide-react'
import Link from 'next/link'
import AppPageHeader from '@/components/ui/AppPageHeader'
import { isManagedClientRole } from '@nutrigoal/shared'

interface TrainerInfo {
  id: string
  full_name: string | null
  email: string
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

  if (loading) return <div className="text-gray-500">Loading...</div>

  if (!trainer || !profile || !isManagedClientRole(profile.role)) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <UserCheck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">No trainer linked</h2>
        <p className="text-gray-500">Your account is not currently connected to a personal trainer.</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <AppPageHeader
        eyebrow="Managed client"
        title="My"
        accent="coach."
        subtitle="Your plans, messages, and feedback requests all run through this relationship."
      />

      <div className="card p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white text-xl font-bold">
            {(trainer.full_name || trainer.email)[0].toUpperCase()}
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{trainer.full_name || 'Personal Trainer'}</h2>
            <p className="text-sm text-gray-500">{trainer.email}</p>
          </div>
        </div>
        <p className="text-sm text-gray-600 leading-6">
          Your trainer can assign nutrition and training plans, monitor progress, message you directly, and review your feedback check-ins.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-5">
          <div className="flex items-center gap-2">
            <Utensils className="h-4 w-4 text-sky-600" />
            <h3 className="font-semibold text-gray-900">Diet plan</h3>
          </div>
          <p className="mt-3 text-sm text-gray-600">
            {hasDietPlan ? 'Assigned and ready to follow.' : 'Your trainer has not assigned a diet plan yet.'}
          </p>
          <Link href="/diet" className="mt-4 inline-flex text-sm font-semibold text-sky-700 hover:text-sky-900">
            Open diet
          </Link>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-4 w-4 text-sky-600" />
            <h3 className="font-semibold text-gray-900">Training plan</h3>
          </div>
          <p className="mt-3 text-sm text-gray-600">
            {hasTrainingPlan ? 'Assigned and ready to train.' : 'Waiting for your trainer to publish your training programme.'}
          </p>
          <Link href="/training" className="mt-4 inline-flex text-sm font-semibold text-sky-700 hover:text-sky-900">
            Open training
          </Link>
        </div>
      </div>

      <div className="space-y-3">
        <Link
          href="/my-nutritionist/messages"
          className="flex items-center gap-3 card p-4 hover:border-sky-300 hover:bg-sky-50/50 transition-all"
        >
          <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center">
            <MessageSquare className="h-5 w-5 text-sky-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">Messages</p>
            <p className="text-xs text-gray-500">Chat with your trainer</p>
          </div>
        </Link>

        <Link
          href="/my-nutritionist/feedback"
          className="flex items-center gap-3 card p-4 hover:border-sky-300 hover:bg-sky-50/50 transition-all"
        >
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <FileText className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">Feedback requests</p>
            <p className="text-xs text-gray-500">Respond to weekly check-ins and coaching prompts</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
