'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft, Plus, Trash2, Send, CheckCircle, Clock, Calendar,
  Loader2, ChevronDown, ChevronRight,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import Link from 'next/link'
import type {
  FeedbackRequest, FeedbackQuestion, FeedbackResponse, FeedbackTemplate,
  FeedbackSchedule, FeedbackQuestionType, UserProfile, CheckInRecurrence,
} from '@/lib/supabase/types'
import { isTrainerRole } from '@nutrigoal/shared'

const QUESTION_TYPES: { value: FeedbackQuestionType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'rating', label: 'Rating (1-5)' },
  { value: 'rating_10', label: 'Rating (1-10)' },
  { value: 'yes_no', label: 'Yes / No' },
  { value: 'photo', label: 'Photo' },
]

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const RECURRENCE_OPTIONS: { value: CheckInRecurrence; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
]

export default function ClientFeedbackPage() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useUser()
  const router = useRouter()
  const [client, setClient] = useState<UserProfile | null>(null)
  const [requests, setRequests] = useState<FeedbackRequest[]>([])
  const [templates, setTemplates] = useState<FeedbackTemplate[]>([])
  const [schedule, setSchedule] = useState<(FeedbackSchedule & { template?: FeedbackTemplate }) | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  // Create form state
  const [title, setTitle] = useState('')
  const [questions, setQuestions] = useState<FeedbackQuestion[]>([
    { id: '1', question: 'How are you feeling this week?', type: 'text' },
    { id: '2', question: 'Energy level (1-5)', type: 'rating' },
    { id: '3', question: 'Following the meal plan?', type: 'yes_no' },
  ])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!profile) return
    if (!isTrainerRole(profile.role)) { router.push('/dashboard'); return }
    loadAll()
  }, [profile, id, router])

  async function loadAll() {
    if (!profile) return
    const supabase = createClient()
    const [clientRes, feedbackRes, templateRes, scheduleRes] = await Promise.all([
      supabase.from('user_profiles').select('*').eq('id', id).single(),
      supabase.from('feedback_requests').select('*').eq('nutritionist_id', profile.id).eq('client_id', id).order('created_at', { ascending: false }),
      supabase.from('feedback_templates').select('*').eq('trainer_id', profile.id).order('created_at', { ascending: false }),
      supabase.from('feedback_schedules').select('*, template:template_id(*)').eq('trainer_id', profile.id).eq('client_id', id).maybeSingle(),
    ])
    if (clientRes.data) setClient(clientRes.data as UserProfile)
    if (feedbackRes.data) setRequests(feedbackRes.data as FeedbackRequest[])
    if (templateRes.data) setTemplates(templateRes.data as FeedbackTemplate[])
    setSchedule(scheduleRes.data as (FeedbackSchedule & { template?: FeedbackTemplate }) | null)
    setLoading(false)
  }

  function addQuestion(type: FeedbackQuestionType) {
    setQuestions(prev => [...prev, { id: String(Date.now()), question: '', type }])
  }

  function updateQuestion(qId: string, question: string) {
    setQuestions(prev => prev.map(q => q.id === qId ? { ...q, question } : q))
  }

  function removeQuestion(qId: string) {
    if (questions.length <= 1) return
    setQuestions(prev => prev.filter(q => q.id !== qId))
  }

  function loadFromTemplate(templateId: string) {
    setSelectedTemplateId(templateId)
    const tmpl = templates.find(t => t.id === templateId)
    if (tmpl) {
      setTitle(tmpl.name)
      setQuestions((tmpl.questions as FeedbackQuestion[]).map(q => ({
        ...q,
        id: String(Date.now()) + Math.random().toString(36).slice(2, 6),
      })))
    }
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
      template_id: selectedTemplateId || null,
    })
    setSaving(false)
    if (error) { toast.error(error.message); return }

    toast.success('Check-in sent!')
    setShowCreate(false)
    setTitle('')
    setSelectedTemplateId('')
    setQuestions([{ id: '1', question: '', type: 'text' }])
    await loadAll()
  }

  if (loading) return <div className="text-gray-500">Loading...</div>

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
          <span>Send Check-in</span>
        </button>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Check-ins — {client?.full_name || 'Client'}</h1>

      {/* Schedule Card */}
      <ScheduleCard
        schedule={schedule}
        templates={templates}
        trainerId={profile!.id}
        clientId={id}
        onRefresh={loadAll}
      />

      {/* Create Form */}
      {showCreate && (
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Send a Check-in Now</h2>

          {templates.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Load from template</label>
              <select value={selectedTemplateId} onChange={e => loadFromTemplate(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                <option value="">— Build from scratch —</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({(t.questions as FeedbackQuestion[]).length} questions)</option>
                ))}
              </select>
            </div>
          )}

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
                  <select value={q.type} onChange={e => setQuestions(prev => prev.map(qq => qq.id === q.id ? { ...qq, type: e.target.value as FeedbackQuestionType } : qq))}
                    className="text-xs font-medium text-gray-500 px-2 py-0.5 bg-gray-100 rounded border-0">
                    {QUESTION_TYPES.map(qt => <option key={qt.value} value={qt.value}>{qt.label}</option>)}
                  </select>
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

          <div className="flex flex-wrap gap-2 mt-3 mb-6">
            {QUESTION_TYPES.map(qt => (
              <button key={qt.value} onClick={() => addQuestion(qt.value)}
                className="text-xs font-medium px-3 py-1.5 border border-gray-200 rounded-lg text-purple-600 hover:bg-purple-50">
                + {qt.label}
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={() => setShowCreate(false)}
              className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={handleSend} disabled={saving}
              className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              <span>{saving ? 'Sending...' : 'Send to Client'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Existing Requests */}
      {requests.length === 0 && !showCreate ? (
        <div className="card p-12 text-center">
          <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900 mb-1">No check-ins yet</h3>
          <p className="text-sm text-gray-500 mb-4">Send a check-in or set up a recurring schedule.</p>
          <button onClick={() => setShowCreate(true)}
            className="text-sm font-medium text-purple-600 hover:text-purple-700">Send Check-in</button>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(fb => (
            <FeedbackCard key={fb.id} request={fb} />
          ))}
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// SCHEDULE MANAGEMENT
// ────────────────────────────────────────────────────────────

function ScheduleCard({ schedule, templates, trainerId, clientId, onRefresh }: {
  schedule: (FeedbackSchedule & { template?: FeedbackTemplate }) | null
  templates: FeedbackTemplate[]
  trainerId: string
  clientId: string
  onRefresh: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [templateId, setTemplateId] = useState(schedule?.template_id ?? '')
  const [dayOfWeek, setDayOfWeek] = useState(schedule?.day_of_week ?? 0)
  const [recurrence, setRecurrence] = useState<CheckInRecurrence>(schedule?.recurrence as CheckInRecurrence ?? 'weekly')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setTemplateId(schedule?.template_id ?? '')
    setDayOfWeek(schedule?.day_of_week ?? 0)
    setRecurrence(schedule?.recurrence as CheckInRecurrence ?? 'weekly')
  }, [schedule])

  async function handleSave() {
    if (!templateId) { toast.error('Select a template'); return }
    setSaving(true)
    const supabase = createClient()

    if (schedule) {
      const { error } = await supabase.from('feedback_schedules').update({
        template_id: templateId,
        day_of_week: dayOfWeek,
        recurrence,
        is_active: true,
      }).eq('id', schedule.id)
      if (error) { toast.error(error.message); setSaving(false); return }
      toast.success('Schedule updated')
    } else {
      const { error } = await supabase.from('feedback_schedules').insert({
        trainer_id: trainerId,
        client_id: clientId,
        template_id: templateId,
        day_of_week: dayOfWeek,
        recurrence,
      })
      if (error) { toast.error(error.message); setSaving(false); return }
      toast.success('Schedule created')
    }
    setSaving(false)
    setEditing(false)
    onRefresh()
  }

  async function toggleActive() {
    if (!schedule) return
    const supabase = createClient()
    const { error } = await supabase.from('feedback_schedules').update({
      is_active: !schedule.is_active,
    }).eq('id', schedule.id)
    if (error) { toast.error(error.message); return }
    toast.success(schedule.is_active ? 'Schedule paused' : 'Schedule resumed')
    onRefresh()
  }

  async function handleDelete() {
    if (!schedule) return
    if (!confirm('Remove recurring schedule?')) return
    const supabase = createClient()
    const { error } = await supabase.from('feedback_schedules').delete().eq('id', schedule.id)
    if (error) { toast.error(error.message); return }
    toast.success('Schedule removed')
    onRefresh()
  }

  if (templates.length === 0) return null

  return (
    <div className="card p-5 mb-6 border-l-4 border-l-purple-400">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-purple-600" />
          <h3 className="font-semibold text-gray-900">Recurring Schedule</h3>
        </div>
        {!editing && (
          <button onClick={() => setEditing(true)}
            className="text-sm font-medium text-purple-600 hover:text-purple-700">
            {schedule ? 'Edit' : 'Set up'}
          </button>
        )}
      </div>

      {schedule && !editing ? (
        <div>
          <p className="text-sm text-gray-600">
            <span className="font-medium">{schedule.template?.name ?? 'Template'}</span>
            {' · '}
            {RECURRENCE_OPTIONS.find(r => r.value === schedule.recurrence)?.label ?? schedule.recurrence}
            {' on '}
            {DAYS[schedule.day_of_week]}s
          </p>
          <div className="flex items-center gap-3 mt-3">
            <button onClick={toggleActive}
              className={`text-xs font-medium px-3 py-1.5 rounded-full ${
                schedule.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}>
              {schedule.is_active ? 'Active' : 'Paused'}
            </button>
            <button onClick={() => setEditing(true)} className="text-xs text-gray-400 hover:text-gray-600">Edit</button>
            <button onClick={handleDelete} className="text-xs text-gray-400 hover:text-red-500">Remove</button>
          </div>
        </div>
      ) : editing ? (
        <div className="space-y-3 mt-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Template</label>
            <select value={templateId} onChange={e => setTemplateId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
              <option value="">Select template...</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Day</label>
              <select value={dayOfWeek} onChange={e => setDayOfWeek(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Frequency</label>
              <select value={recurrence} onChange={e => setRecurrence(e.target.value as CheckInRecurrence)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                {RECURRENCE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setEditing(false)}
              className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-2 rounded-lg text-sm font-semibold hover:shadow-lg transition-all disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {saving ? 'Saving...' : 'Save Schedule'}
            </button>
          </div>
          <p className="text-xs text-gray-400">
            Check-ins are sent automatically at 6:00 AM UTC on the selected day.
            <Link href="/check-ins" className="text-purple-500 hover:underline ml-1">Manage templates →</Link>
          </p>
        </div>
      ) : (
        <p className="text-sm text-gray-400">No recurring schedule. Click &ldquo;Set up&rdquo; to auto-send check-ins.</p>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// FEEDBACK CARD (with response viewer)
// ────────────────────────────────────────────────────────────

function FeedbackCard({ request }: { request: FeedbackRequest }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="card p-5">
      <button onClick={() => request.status === 'completed' && setExpanded(!expanded)}
        className="w-full text-left">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-900">{request.title}</h3>
          <div className="flex items-center gap-2">
            <span className={`flex items-center space-x-1 text-xs font-medium px-3 py-1 rounded-full ${
              request.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {request.status === 'completed' ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
              <span>{request.status === 'completed' ? 'Responded' : 'Pending'}</span>
            </span>
            {request.status === 'completed' && (
              expanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />
            )}
          </div>
        </div>
      </button>
      <p className="text-xs text-gray-400 mb-1">
        {new Date(request.created_at).toLocaleDateString()}
        {request.responded_at && ` · Responded ${new Date(request.responded_at).toLocaleDateString()}`}
      </p>

      {expanded && request.status === 'completed' && request.responses && (
        <div className="border-t border-gray-100 mt-3 pt-3 space-y-3">
          {request.questions.map((q: FeedbackQuestion, i: number) => {
            const resp = (request.responses as FeedbackResponse[])?.[i]
            return (
              <div key={q.id}>
                <p className="text-xs font-medium text-gray-500">{q.question}</p>
                {q.type === 'photo' && Array.isArray(resp?.answer) ? (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {(resp.answer as string[]).map((url, j) => (
                      <img key={j} src={url} alt={`Photo ${j + 1}`} className="h-20 w-20 rounded-lg object-cover border border-gray-200" />
                    ))}
                    {(resp.answer as string[]).length === 0 && <span className="text-sm text-gray-400">No photos</span>}
                  </div>
                ) : q.type === 'rating' || q.type === 'rating_10' ? (
                  <p className="text-sm text-gray-900 mt-0.5 font-semibold">{resp?.answer ?? '—'} / {q.type === 'rating' ? 5 : 10}</p>
                ) : (
                  <p className="text-sm text-gray-900 mt-0.5">{String(resp?.answer ?? '—')}</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
