'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { isManagedClientRole } from '@nutrigoal/shared'
import { ChatThread } from '@/components/messages/ChatThread'

interface TrainerInfo {
  id: string
  full_name: string | null
  email: string
}

export default function MyNutritionistMessagesPage() {
  const { profile } = useUser()
  const router = useRouter()
  const [trainer, setTrainer] = useState<TrainerInfo | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [resolved, setResolved] = useState(false)

  useEffect(() => {
    if (!profile) return
    if (!isManagedClientRole(profile.role)) {
      router.push('/dashboard')
      return
    }
    const trainerId = profile.personal_trainer_id ?? profile.nutritionist_id
    if (!trainerId) {
      setResolved(true)
      return
    }
    const supabase = createClient()
    let cancelled = false

    supabase
      .from('user_profiles')
      .select('id, full_name, email')
      .eq('id', trainerId)
      .single()
      .then(({ data }) => {
        if (!cancelled && data) setTrainer(data as TrainerInfo)
      })

    // Client cannot create a conversation (RLS: only coach can INSERT).
    // Just look for the existing one.
    supabase
      .from('conversations')
      .select('id')
      .eq('nutritionist_id', trainerId)
      .eq('client_id', profile.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        setConversationId(data?.id ?? null)
        setResolved(true)
      })

    return () => {
      cancelled = true
    }
  }, [profile, router])

  if (!profile) return null

  const missingMessage = !resolved
    ? 'Loading conversation...'
    : !trainer
      ? 'You are not linked to a coach yet.'
      : !conversationId
        ? 'Your coach has not started a conversation yet. They will open the thread from their side.'
        : null

  return (
    <ChatThread
      conversationId={conversationId}
      currentUserId={profile.id}
      role="client"
      peerName={trainer?.full_name || 'My coach'}
      peerEmail={trainer?.email || null}
      backHref="/my-nutritionist"
      missingConversationMessage={missingMessage}
    />
  )
}
