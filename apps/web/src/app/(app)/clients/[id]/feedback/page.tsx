'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Plus, Trash2, Send, CheckCircle, Clock } from 'lucide-react'
import { toast } from 'react-hot-toast'
import Link from 'next/link'
import type { FeedbackRequest, FeedbackQuestion, FeedbackResponse, UserProfile } from '@/lib/supabase/types'

export default function ClientFeedbackPage() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useUser()
  const [client, setClient] = useState<UserProfile | null>(null)
  const [requests, setRequests] = useState<FeedbackRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  // Create form state
  const [title, setTitle] = useState('')
  const [questions, setQuestions] = useState<FeedbackQuestion[]>([
    { id: '1', question: 'How are you feeling this week?', type: 'text' },
    { id: '2', question: 'Energy level (1-5)', type: 'rating' },
    { id: '3', question: 'Following the meal plan?', type: 'yes_no' },
  ])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!profile) return
    const supabase = createClient()

    supabase.from('user_profiles').select('*').eq('id', id).single().then(({ data }) => {
      if (data) setClient(data as UserProfile)
    })

    loadFeedback()
  }, [profile, id])

  async function loadFeedback() {
    if (!profile) return
    const supabase = createClient()
    const { data } = await supabase.from('feedback_requests').select('*')
      .eq('nutritionist_id', profile.id).eq('client_id', id)
      .order('created_at', { ascending: false })
    if (data) setRequests(data as FeedbackRequest[])
    setLoading(false)
  }

  function addQuestion(type: 'text' | 'rating' | 'yes_no') {
    setQuestions(prev => [...prev, { id: String(Date.now()), question: '', type }])
  }

  function updateQuestion(qId: string, question: string) {
    setQuestions(prev => prev.map(q => q.id === qId ? { ...q, question } : q))
  }

  function removeQuestion(qId: string) {
    if (questions.length <= 1) return
    setQuestions(prev => prev.filter(q => q.id !== qId))
  }

  async function handleSend() {
    if (!title.trim()) { toast.error('Add a title'); return }
    const validQs = questions.filter(q => q.question.trim())
    if (validQs.length === 0) { toast.error('Add at least one question'); return }

    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('feedback_requests').insert({
      nutritionist_id: profile!.id,
      client_id: id,
      title: title.trim(),
      questions: validQs,
    })
    setSaving(false)
    if (error) { toast.error(error.message); return }

    toast.success('Feedback request sent!')
    setShowCreate(false)
    setTitle('')
    setQuestions([{ id: '1', question: '', type: 'text' }])
    await loadFeedback()
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Link href={`/clients/${id}`} className="flex items-center space-x-2 text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to {client?.full_name || 'Client'}</span>
        </Link>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:shadow-lg transition-all">
          <Plus className="h-4 w-4" />
          <span>New Request</span>
        </button>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Feedback Requests</h1>

      {/* Create Form */}
      {showCreate && (
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">New Feedback Request</h2>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="e.g. Weekly Check-in" />
          </div>

          <label className="block text-sm font-medium text-gray-700 mb-2">Questions</label>
          {questions.map((q) => (
            <div key={q.id} className="flex items-start gap-3 mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-gray-500 px-2 py-0.5 bg-gray-100 rounded">
                    {q.type === 'text' ? 'Text' : q.type === 'rating' ? 'Rating (1-5)' : 'Yes/No'}
                  </span>
                </div>
                <input type="text" value={q.question} onChange={e => updateQuestion(q.id, e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  placeholder="Type your question..." />
              </div>
              {questions.length > 1 && (
                <button onClick={() => removeQuestion(q.id)} className="mt-6 text-gray-300 hover:text-red-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}

          <div className="flex gap-2 mt-3 mb-6">
            <button onClick={() => addQuestion('text')} className="text-xs font-medium px-3 py-1.5 border border-gray-200 rounded-lg text-purple-600 hover:bg-purple-50">+ Text</button>
            <button onClick={() => addQuestion('rating')} className="text-xs font-medium px-3 py-1.5 border border-gray-200 rounded-lg text-purple-600 hover:bg-purple-50">+ Rating</button>
            <button onClick={() => addQuestion('yes_no')} className="text-xs font-medium px-3 py-1.5 border border-gray-200 rounded-lg text-purple-600 hover:bg-purple-50">+ Yes/No</button>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setShowCreate(false)}
              className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={handleSend} disabled={saving}
              className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all disabled:opacity-50">
              <Send className="h-4 w-4" />
              <span>{saving ? 'Sending...' : 'Send to Client'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Existing Requests */}
      {loading ? (
        <div className="text-gray-500">Loading feedback...</div>
      ) : requests.length === 0 && !showCreate ? (
        <div className="card p-12 text-center">
          <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900 mb-1">No feedback requests</h3>
          <p className="text-sm text-gray-500 mb-4">Send your first feedback request to this client.</p>
          <button onClick={() => setShowCreate(true)}
            className="text-sm font-medium text-purple-600 hover:text-purple-700">Create Request</button>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(fb => (
            <div key={fb.id} className="card p-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">{fb.title}</h3>
                <span className={`flex items-center space-x-1 text-xs font-medium px-3 py-1 rounded-full ${
                  fb.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {fb.status === 'completed' ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                  <span>{fb.status === 'completed' ? 'Responded' : 'Pending'}</span>
                </span>
              </div>
              <p className="text-xs text-gray-400 mb-3">{new Date(fb.created_at).toLocaleDateString()}</p>

              {fb.status === 'completed' && fb.responses && (
                <div className="border-t border-gray-100 pt-3 space-y-3">
                  {fb.questions.map((q: FeedbackQuestion, i: number) => {
                    const resp = (fb.responses as FeedbackResponse[])?.[i]
                    return (
                      <div key={q.id}>
                        <p className="text-xs font-medium text-gray-500">{q.question}</p>
                        <p className="text-sm text-gray-900 mt-0.5">{resp?.answer ?? '—'}</p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
