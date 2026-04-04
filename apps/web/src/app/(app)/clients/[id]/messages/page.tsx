'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Send } from 'lucide-react'
import Link from 'next/link'
import type { Message, UserProfile } from '@/lib/supabase/types'
import { isTrainerRole } from '@nutrigoal/shared'

export default function ClientMessagesPage() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useUser()
  const router = useRouter()
  const [client, setClient] = useState<UserProfile | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })

  const getOrCreateConversation = useCallback(async () => {
    if (!profile) return null
    const supabase = createClient()

    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('nutritionist_id', profile.id)
      .eq('client_id', id)
      .single()

    if (existing) return existing.id

    const { data: created } = await supabase
      .from('conversations')
      .insert({ nutritionist_id: profile.id, client_id: id })
      .select('id')
      .single()

    return created?.id ?? null
  }, [profile, id])

  useEffect(() => {
    if (!profile) return
    if (!isTrainerRole(profile.role)) { router.push('/dashboard'); return }
    const supabase = createClient()

    // Load client info
    supabase.from('user_profiles').select('*').eq('id', id).single().then(({ data }) => {
      if (data) setClient(data as UserProfile)
    })

    // Load conversation + messages
    getOrCreateConversation().then(convId => {
      if (!convId) return
      setConversationId(convId)

      supabase.from('messages').select('*').eq('conversation_id', convId).order('created_at', { ascending: true })
        .then(({ data }) => {
          if (data) setMessages(data as Message[])
          setTimeout(scrollToBottom, 100)
        })

      // Mark as read
      supabase.from('messages').update({ read_at: new Date().toISOString() })
        .eq('conversation_id', convId).neq('sender_id', profile.id).is('read_at', null)

      // Realtime subscription
      const channel = supabase
        .channel(`messages:${convId}`)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'messages',
          filter: `conversation_id=eq.${convId}`,
        }, (payload) => {
          setMessages(prev => [...prev, payload.new as Message])
          setTimeout(scrollToBottom, 100)
        })
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    })
  }, [profile, id, getOrCreateConversation, router])

  const handleSend = async () => {
    if (!text.trim() || !conversationId || !profile) return
    setSending(true)
    const supabase = createClient()
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: profile.id,
      content: text.trim(),
    })
    await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversationId)
    setText('')
    setSending(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      {/* Header */}
      <div className="flex items-center space-x-4 pb-4 border-b border-gray-200">
        <Link href={`/clients/${id}`} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-gray-900">{client?.full_name || 'Messages'}</h1>
          <p className="text-xs text-gray-500">{client?.email}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-gray-400 text-sm mt-12">No messages yet. Start the conversation!</p>
        )}
        {messages.map(msg => {
          const isMe = msg.sender_id === profile?.id
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                isMe
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-br-sm'
                  : 'bg-white border border-gray-200 text-gray-900 rounded-bl-sm'
              }`}>
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                <p className={`text-xs mt-1 ${isMe ? 'text-purple-200' : 'text-gray-400'}`}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 pt-4 flex gap-3">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          className="flex-1 px-4 py-3 border border-gray-300 rounded-xl resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
        <button onClick={handleSend} disabled={sending || !text.trim()}
          className="px-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50">
          <Send className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
