'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Send } from 'lucide-react'
import Link from 'next/link'
import type { Message } from '@/lib/supabase/types'

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

  const myBubble =
    role === 'coach'
      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-br-sm'
      : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-br-sm'
  const myMeta = role === 'coach' ? 'text-purple-200' : 'text-emerald-200'

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      <div className="flex items-center space-x-4 pb-4 border-b border-gray-200">
        <Link href={backHref} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-gray-900">{peerName || 'Messages'}</h1>
          {peerEmail && <p className="text-xs text-gray-500">{peerEmail}</p>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 space-y-3">
        {!conversationId && missingConversationMessage && (
          <p className="text-center text-gray-400 text-sm mt-12">{missingConversationMessage}</p>
        )}
        {conversationId && messages.length === 0 && (
          <p className="text-center text-gray-400 text-sm mt-12">
            No messages yet. Start the conversation!
          </p>
        )}
        {messages.map((msg) => {
          const isMe = msg.sender_id === currentUserId
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                  isMe
                    ? myBubble
                    : 'bg-white border border-gray-200 text-gray-900 rounded-bl-sm'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                <p className={`text-xs mt-1 ${isMe ? myMeta : 'text-gray-400'}`}>
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

      <div className="border-t border-gray-200 pt-4 flex gap-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={conversationId ? 'Type a message...' : 'Waiting for conversation...'}
          rows={1}
          disabled={!conversationId}
          className="flex-1 px-4 py-3 border border-gray-300 rounded-xl resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
        />
        <button
          onClick={handleSend}
          disabled={sending || !text.trim() || !conversationId}
          className="px-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
