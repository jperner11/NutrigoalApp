'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Send } from 'lucide-react'
import Link from 'next/link'
import type { Message } from '@/lib/supabase/types'
import AppPageHeader from '@/components/ui/AppPageHeader'

type Role = 'coach' | 'client'

interface ChatThreadProps {
  conversationId: string | null
  currentUserId: string
  role: Role
  peerName: string | null
  peerEmail: string | null
  backHref: string
  // If true, the page is still resolving the conversation (e.g. client side waiting
  // for the coach to start the thread). We render an empty-state message.
  missingConversationMessage?: string | null
}

export function ChatThread({
  conversationId,
  currentUserId,
  role,
  peerName,
  peerEmail,
  backHref,
  missingConversationMessage,
}: ChatThreadProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    if (!conversationId) return
    const supabase = createClient()
    let cancelled = false

    supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (cancelled || !data) return
        setMessages(data as Message[])
        setTimeout(scrollToBottom, 50)
      })

    // Mark peer messages as read (fire-and-forget, ignore errors)
    supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .neq('sender_id', currentUserId)
      .is('read_at', null)
      .then(() => {})

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const incoming = payload.new as Message
          setMessages((prev) =>
            prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]
          )
          setTimeout(scrollToBottom, 50)
        }
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [conversationId, currentUserId, scrollToBottom])

  const handleSend = async () => {
    const trimmed = text.trim()
    if (!trimmed || !conversationId || sending) return
    setSending(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        content: trimmed,
      })
      .select()
      .single()

    if (!error && data) {
      const inserted = data as Message
      setMessages((prev) =>
        prev.some((m) => m.id === inserted.id) ? prev : [...prev, inserted]
      )
      setText('')
      setTimeout(scrollToBottom, 50)
      supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId)
        .then(() => {})
    }

    setSending(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-80px)] max-w-[920px] flex-col">
      <AppPageHeader
        eyebrow={role === 'coach' ? 'Client messages' : 'Managed client'}
        title="Messages"
        accent="thread."
        subtitle={peerName ? `Chat with ${peerName}.` : 'Your direct coaching conversation.'}
        chip={peerEmail ? <span className="chip">{peerEmail}</span> : undefined}
        actions={
          <Link href={backHref} className="btn btn-ghost">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        }
      />

      <div className="card flex min-h-0 flex-1 flex-col overflow-hidden p-0">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 md:p-6">
          {!conversationId && missingConversationMessage && (
            <div className="card-2 mx-auto mt-8 max-w-[520px] p-6 text-center">
              <div
                className="mono"
                style={{ fontSize: 11, color: 'var(--fg-4)', letterSpacing: '0.14em' }}
              >
                THREAD STATUS
              </div>
              <p className="mt-2 text-sm leading-6" style={{ color: 'var(--fg-2)' }}>
                {missingConversationMessage}
              </p>
            </div>
          )}
          {conversationId && messages.length === 0 && (
            <div className="card-2 mx-auto mt-8 max-w-[520px] p-6 text-center">
              <div className="serif" style={{ fontSize: 22, color: 'var(--fg)' }}>
                No messages{' '}
                <span className="italic-serif" style={{ color: 'var(--fg-3)' }}>
                  yet.
                </span>
              </div>
              <p className="mt-2 text-sm leading-6" style={{ color: 'var(--fg-2)' }}>
                Start the conversation when you are ready.
              </p>
            </div>
          )}
          {messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="max-w-[min(78%,640px)] rounded-2xl px-4 py-3"
                  style={{
                    background: isMe ? 'var(--acc)' : 'var(--ink-2)',
                    border: isMe ? '1px solid var(--acc)' : '1px solid var(--line)',
                    color: isMe ? 'var(--ink-1)' : 'var(--fg)',
                    borderBottomRightRadius: isMe ? 4 : 18,
                    borderBottomLeftRadius: isMe ? 18 : 4,
                  }}
                >
                  <p className="whitespace-pre-wrap text-sm leading-6">{msg.content}</p>
                  <p
                    className="mono mt-2"
                    style={{
                      fontSize: 10,
                      color: isMe ? 'rgba(255,255,255,0.72)' : 'var(--fg-4)',
                      letterSpacing: '0.08em',
                    }}
                  >
                    {new Date(msg.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>

        <div className="flex gap-3 border-t p-4" style={{ borderColor: 'var(--line)' }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={conversationId ? 'Type a message...' : 'Waiting for conversation...'}
            rows={1}
            disabled={!conversationId}
            className="min-h-[48px] flex-1 resize-none rounded-xl border bg-[var(--ink-2)] px-4 py-3 text-sm text-[var(--fg)] outline-none transition focus:border-[var(--acc)] disabled:opacity-60"
            style={{ borderColor: 'var(--line-2)' }}
          />
          <button
            onClick={handleSend}
            disabled={sending || !text.trim() || !conversationId}
            className="btn btn-accent self-end px-4 disabled:opacity-50"
            aria-label="Send message"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
