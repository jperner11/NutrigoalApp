'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import type { UserProfile } from '@/lib/supabase/types'
import { isTrainerRole } from '@nutrigoal/shared'
import { ChatThread } from '@/components/messages/ChatThread'

export default function ClientMessagesPage() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useUser()
  const router = useRouter()
  const [client, setClient] = useState<UserProfile | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)

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
      .then(({ data }) => {
        if (!cancelled && data) setClient(data as UserProfile)
      })

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

    resolveConversation().then((cid) => {
      if (!cancelled) setConversationId(cid)
    })

    return () => {
      cancelled = true
    }
  }, [profile, id, router])

  if (!profile) return null

  return (
    <ChatThread
      conversationId={conversationId}
      currentUserId={profile.id}
      role="coach"
      peerName={client?.full_name || null}
      peerEmail={client?.email || null}
      backHref={`/clients/${id}`}
    />
  )
}
