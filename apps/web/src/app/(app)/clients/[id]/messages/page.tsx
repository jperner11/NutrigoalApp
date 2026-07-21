'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import * as Sentry from '@sentry/nextjs'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import type { UserProfile } from '@/lib/supabase/types'
import { isTrainerRole } from '@treno/shared'
import { ChatThread } from '@/components/messages/ChatThread'

export default function ClientMessagesPage() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useUser()
  const router = useRouter()
  const [client, setClient] = useState<UserProfile | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [resolved, setResolved] = useState(false)

  useEffect(() => {
    if (!profile) return
    if (!isTrainerRole(profile.role)) {
      router.push('/dashboard')
      return
    }
    const supabase = createClient()
    let cancelled = false

    supabase
      .from('user_profiles')
      .select('*')
      .eq('id', id)
      .single()
      .then(
        ({ data }) => {
          if (!cancelled && data) setClient(data as UserProfile)
        },
        (err) => {
          Sentry.captureException(err, { tags: { kind: 'page', page: 'clients/[id]/messages', op: 'loadClient' } })
        }
      )

    async function resolveConversation() {
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('nutritionist_id', profile!.id)
        .eq('client_id', id)
        .maybeSingle()

      if (existing?.id) return existing.id

      const { data: created, error } = await supabase
        .from('conversations')
        .insert({ nutritionist_id: profile!.id, client_id: id })
        .select('id')
        .single()

      if (error) {
        // Race: another tab created it first — re-fetch.
        const { data: retry } = await supabase
          .from('conversations')
          .select('id')
          .eq('nutritionist_id', profile!.id)
          .eq('client_id', id)
          .maybeSingle()
        return retry?.id ?? null
      }
      return created?.id ?? null
    }

    resolveConversation().then(
      (cid) => {
        if (!cancelled) {
          setConversationId(cid)
          setResolved(true)
        }
      },
      (err) => {
        if (!cancelled) setResolved(true)
        Sentry.captureException(err, { tags: { kind: 'page', page: 'clients/[id]/messages', op: 'resolveConversation' } })
      }
    )

    return () => {
      cancelled = true
    }
  }, [profile, id, router])

  if (!profile) return null

  const missingMessage = !resolved
    ? 'Loading conversation...'
    : !conversationId
      ? 'Unable to start this conversation. Please refresh and try again.'
      : null

  return (
    <ChatThread
      conversationId={conversationId}
      currentUserId={profile.id}
      role="coach"
      peerName={client?.full_name || null}
      peerEmail={client?.email || null}
      backHref={`/clients/${id}`}
      missingConversationMessage={missingMessage}
    />
  )
}
