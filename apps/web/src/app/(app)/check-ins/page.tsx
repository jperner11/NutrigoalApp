'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import {
  CheckCircle, Clock, Camera, Loader2, Send, Plus, Trash2,
  ChevronDown, ChevronRight, Pencil, Copy, ToggleLeft, ToggleRight,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { isTrainerRole } from '@nutrigoal/shared'
import type {
  FeedbackRequest, FeedbackQuestion, FeedbackResponse,
  FeedbackTemplate, FeedbackQuestionType, UserProfile,
} from '@/lib/supabase/types'

export default function CheckInsPage() {
  const { profile } = useUser()

  if (!profile) return <div className="text-gray-500">Loading...</div>

  if (isTrainerRole(profile.role)) {
    return <CoachCheckInsPage profile={profile} />
  }

  return <ClientCheckInsPage profile={profile} />
}

// ────────────────────────────────────────────────────────────
// COACH VIEW
// ────────────────────────────────────────────────────────────

function CoachCheckInsPage({ profile }: { profile: UserProfile }) {
  const [tab, setTab] = useState<'overview' | 'templates'>('overview')
  const [templates, setTemplates] = useState<FeedbackTemplate[]>([])
  const [requests, setRequests] = useState<(FeedbackRequest & { client?: UserProfile })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAll()
  }, [profile.id])

  async function loadAll() {
    const supabase = createClient()
    const [tRes, rRes] = await Promise.all([
      supabase.from('feedback_templates').select('*').eq('trainer_id', profile.id).order('created_at', { ascending: false }),
      supabase.from('feedback_requests').select('*, client:client_id(id, full_name, email)').eq('nutritionist_id', profile.id).order('created_at', { ascending: false }).limit(50),
    ])
    if (tRes.data) setTemplates(tRes.data as FeedbackTemplate[])
    if (rRes.data) setRequests(rRes.data as (FeedbackRequest & { client?: UserProfile })[])
    setLoading(false)
  }

  if (loading) return <div className="text-gray-500">Loading check-ins...</div>

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Check-ins</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
        <button onClick={() => setTab('overview')}
          className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${tab === 'overview' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          Overview
        </button>
        <button onClick={() => setTab('templates')}
          className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${tab === 'templates' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          Templates ({templates.length})
        </button>
      </div>

      {tab === 'overview' ? (
        <CoachOverview requests={requests} />
      ) : (
        <TemplateManager templates={templates} trainerId={profile.id} onRefresh={loadAll} />
      )}
    </div>
  )
}

function CoachOverview({ requests }: { requests: (FeedbackRequest & { client?: UserProfile })[] }) {
  const pending = requests.filter(r => r.status === 'pending')
  const completed = requests.filter(r => r.status === 'completed')

  return (
    <div>
      {pending.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-amber-600 mb-3">
            Awaiting response ({pending.length})
          </h2>
          <div className="space-y-3">
            {pending.map(req => (
              <CheckInCard key={req.id} request={req} />
            ))}
          </div>
        </div>
      )}

      {pending.length === 0 && completed.length === 0 && (
        <div className="card p-12 text-center">
          <CheckCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900 mb-1">No check-ins yet</h3>
          <p className="text-sm text-gray-500">Create a template, then schedule it for your clients.</p>
        </div>
      )}

      {completed.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-green-600 mb-3">
            Completed ({completed.length})
          </h2>
          <div className="space-y-3">
            {completed.map(req => (
              <CheckInCard key={req.id} request={req} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CheckInCard({ request }: { request: FeedbackRequest & { client?: UserProfile } }) {
  const [expanded, setExpanded] = useState(false)
  const clientName = request.client?.full_name || request.client?.email || 'Client'

  return (
    <div className="card p-5">
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">{request.title}</h3>
            <p className="text-xs text-gray-500 mt-1">
              {clientName} · {new Date(request.created_at).toLocaleDateString()}
              {request.responded_at && ` · Responded ${new Date(request.responded_at).toLocaleDateString()}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full ${
              request.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {request.status === 'completed' ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
              {request.status === 'completed' ? 'Done' : 'Pending'}
            </span>
            {request.status === 'completed' && (
              expanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />
            )}
          </div>
        </div>
      </button>

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

// ────────────────────────────────────────────────────────────
// TEMPLATE MANAGER
// ────────────────────────────────────────────────────────────

const QUESTION_TYPES: { value: FeedbackQuestionType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'rating', label: 'Rating (1-5)' },
  { value: 'rating_10', label: 'Rating (1-10)' },
  { value: 'yes_no', label: 'Yes / No' },
  { value: 'photo', label: 'Photo Upload' },
]

function TemplateManager({ templates, trainerId, onRefresh }: {
  templates: FeedbackTemplate[]
  trainerId: string
  onRefresh: () => void
}) {
  const [editing, setEditing] = useState<FeedbackTemplate | null>(null)
  const [creating, setCreating] = useState(false)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">Reusable question sets for scheduled check-ins.</p>
        <button onClick={() => { setCreating(true); setEditing(null) }}
          className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:shadow-lg transition-all">
          <Plus className="h-4 w-4" />
          New Template
        </button>
      </div>

      {(creating || editing) && (
        <TemplateForm
          template={editing}
          trainerId={trainerId}
          onSaved={() => { setCreating(false); setEditing(null); onRefresh() }}
          onCancel={() => { setCreating(false); setEditing(null) }}
        />
      )}

      {templates.length === 0 && !creating ? (
        <div className="card p-12 text-center">
          <h3 className="font-semibold text-gray-900 mb-1">No templates yet</h3>
          <p className="text-sm text-gray-500">Create your first template to start scheduling recurring check-ins.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map(t => (
            <div key={t.id} className="card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{t.name}</h3>
                    {t.is_default && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Default</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {t.questions.length} question{t.questions.length === 1 ? '' : 's'}
                    {' · '}
                    {(t.questions as FeedbackQuestion[]).map(q => {
                      const qt = QUESTION_TYPES.find(x => x.value === q.type)
                      return qt?.label ?? q.type
                    }).join(', ')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setEditing(t); setCreating(false) }}
                    className="p-2 text-gray-400 hover:text-purple-600 rounded-lg hover:bg-purple-50">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={async () => {
                    const supabase = createClient()
                    const newQuestions = (t.questions as FeedbackQuestion[]).map(q => ({ ...q, id: String(Date.now()) + Math.random().toString(36).slice(2, 6) }))
                    await supabase.from('feedback_templates').insert({
                      trainer_id: trainerId,
                      name: `${t.name} (copy)`,
                      questions: newQuestions,
                    })
                    toast.success('Template duplicated')
                    onRefresh()
                  }}
                    className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50">
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TemplateForm({ template, trainerId, onSaved, onCancel }: {
  template: FeedbackTemplate | null
  trainerId: string
  onSaved: () => void
  onCancel: () => void
}) {
  const [name, setName] = useState(template?.name ?? '')
  const [questions, setQuestions] = useState<FeedbackQuestion[]>(
    template?.questions?.length
      ? (template.questions as FeedbackQuestion[])
      : [{ id: genId(), question: '', type: 'text' }]
  )
  const [isDefault, setIsDefault] = useState(template?.is_default ?? false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  function addQuestion(type: FeedbackQuestionType) {
    setQuestions(prev => [...prev, { id: genId(), question: '', type }])
  }

  function updateQuestion(qId: string, field: 'question' | 'type', value: string) {
    setQuestions(prev => prev.map(q => q.id === qId ? { ...q, [field]: value } : q))
  }

  function removeQuestion(qId: string) {
    if (questions.length <= 1) return
    setQuestions(prev => prev.filter(q => q.id !== qId))
  }

  function moveQuestion(idx: number, dir: -1 | 1) {
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= questions.length) return
    const copy = [...questions]
    ;[copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]]
    setQuestions(copy)
  }

  async function handleSave() {
    if (!name.trim()) { toast.error('Template needs a name'); return }
    const validQs = questions.filter(q => q.question.trim())
    if (validQs.length === 0) { toast.error('Add at least one question'); return }

    setSaving(true)
    const supabase = createClient()

    if (template) {
      const { error } = await supabase.from('feedback_templates').update({
        name: name.trim(),
        questions: validQs,
        is_default: isDefault,
        updated_at: new Date().toISOString(),
      }).eq('id', template.id)
      if (error) { toast.error(error.message); setSaving(false); return }
      toast.success('Template updated')
    } else {
      const { error } = await supabase.from('feedback_templates').insert({
        trainer_id: trainerId,
        name: name.trim(),
        questions: validQs,
        is_default: isDefault,
      })
      if (error) { toast.error(error.message); setSaving(false); return }
      toast.success('Template created')
    }
    setSaving(false)
    onSaved()
  }

  async function handleDelete() {
    if (!template) return
    if (!confirm('Delete this template? Scheduled check-ins using it will stop.')) return
    setDeleting(true)
    const supabase = createClient()
    const { error } = await supabase.from('feedback_templates').delete().eq('id', template.id)
    if (error) { toast.error(error.message); setDeleting(false); return }
    toast.success('Template deleted')
    setDeleting(false)
    onSaved()
  }

  return (
    <div className="card p-6 mb-6 ring-2 ring-purple-200">
      <h2 className="text-lg font-bold text-gray-900 mb-4">
        {template ? 'Edit Template' : 'New Template'}
      </h2>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          placeholder="e.g. Weekly Check-in" />
      </div>

      <div className="flex items-center gap-3 mb-4">
        <button type="button" onClick={() => setIsDefault(!isDefault)} className="flex items-center gap-2 text-sm text-gray-600">
          {isDefault ? <ToggleRight className="h-5 w-5 text-purple-600" /> : <ToggleLeft className="h-5 w-5 text-gray-400" />}
          Default template
        </button>
        <span className="text-xs text-gray-400">Used when scheduling new clients</span>
      </div>

      <label className="block text-sm font-medium text-gray-700 mb-2">Questions</label>
      <div className="space-y-3 mb-4">
        {questions.map((q, idx) => (
          <div key={q.id} className="flex items-start gap-2 bg-gray-50 rounded-xl p-3">
            <div className="flex flex-col gap-1 mt-1">
              <button onClick={() => moveQuestion(idx, -1)} disabled={idx === 0}
                className="text-gray-300 hover:text-gray-600 disabled:opacity-30 text-xs">▲</button>
              <button onClick={() => moveQuestion(idx, 1)} disabled={idx === questions.length - 1}
                className="text-gray-300 hover:text-gray-600 disabled:opacity-30 text-xs">▼</button>
            </div>
            <div className="flex-1">
              <select value={q.type} onChange={e => updateQuestion(q.id, 'type', e.target.value)}
                className="text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-lg px-2 py-1 mb-2">
                {QUESTION_TYPES.map(qt => (
                  <option key={qt.value} value={qt.value}>{qt.label}</option>
                ))}
              </select>
              <input type="text" value={q.question} onChange={e => updateQuestion(q.id, 'question', e.target.value)}
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
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {QUESTION_TYPES.map(qt => (
          <button key={qt.value} onClick={() => addQuestion(qt.value)}
            className="text-xs font-medium px-3 py-1.5 border border-gray-200 rounded-lg text-purple-600 hover:bg-purple-50">
            + {qt.label}
          </button>
        ))}
      </div>

      <div className="flex gap-3 border-t border-gray-100 pt-4">
        <button onClick={onCancel}
          className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
          Cancel
        </button>
        {template && (
          <button onClick={handleDelete} disabled={deleting}
            className="px-4 py-2 border border-red-200 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        )}
        <button onClick={handleSave} disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-2 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {saving ? 'Saving...' : template ? 'Save Changes' : 'Create Template'}
        </button>
      </div>
    </div>
  )
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

// ────────────────────────────────────────────────────────────
// CLIENT VIEW (existing functionality preserved)
// ────────────────────────────────────────────────────────────

function ClientCheckInsPage({ profile }: { profile: UserProfile }) {
  const [requests, setRequests] = useState<FeedbackRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, string | number | boolean | string[]>>({})
  const [submitting, setSubmitting] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null)

  useEffect(() => {
    loadCheckIns()
  }, [profile.id])

  async function loadCheckIns() {
    const supabase = createClient()
    const { data } = await supabase
      .from('feedback_requests')
      .select('*')
      .eq('client_id', profile.id)
      .order('created_at', { ascending: false })
    if (data) setRequests(data as FeedbackRequest[])
    setLoading(false)
  }

  function openCheckIn(req: FeedbackRequest) {
    setActiveId(req.id)
    if (req.status === 'completed' && req.responses) {
      const existing: Record<string, string | number | boolean | string[]> = {}
      req.responses.forEach((r: FeedbackResponse) => {
        existing[r.question_id] = r.answer
      })
      setAnswers(existing)
    } else {
      setAnswers({})
    }
  }

  async function handlePhotoUpload(questionId: string, file: File) {
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Photo must be under 10MB')
      return
    }
    setUploadingPhoto(questionId)
    const supabase = createClient()
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${profile.id}/checkin-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('progress-photos').upload(path, file, { upsert: false })
    if (error) {
      toast.error('Failed to upload photo')
      setUploadingPhoto(null)
      return
    }
    const { data: urlData } = supabase.storage.from('progress-photos').getPublicUrl(path)
    const current = (answers[questionId] as string[]) ?? []
    setAnswers(prev => ({ ...prev, [questionId]: [...current, urlData.publicUrl] }))
    setUploadingPhoto(null)
  }

  async function handleSubmit() {
    if (!activeId) return
    const req = requests.find(r => r.id === activeId)
    if (!req) return

    const requiredUnanswered = req.questions.some(q => {
      const a = answers[q.id]
      if (q.type === 'photo') return false
      return a === undefined || a === ''
    })
    if (requiredUnanswered) {
      toast.error('Please answer all questions')
      return
    }

    setSubmitting(true)
    const responses: FeedbackResponse[] = req.questions.map(q => ({
      question_id: q.id,
      answer: answers[q.id] ?? (q.type === 'photo' ? [] : ''),
    }))

    const supabase = createClient()
    const { error } = await supabase
      .from('feedback_requests')
      .update({
        responses,
        status: 'completed',
        responded_at: new Date().toISOString(),
      })
      .eq('id', activeId)
      .eq('client_id', profile.id)

    if (error) {
      toast.error('Failed to submit: ' + error.message)
      setSubmitting(false)
      return
    }

    toast.success('Check-in submitted!')
    setActiveId(null)
    setAnswers({})
    await loadCheckIns()
    setSubmitting(false)
  }

  const pending = requests.filter(r => r.status === 'pending')
  const completed = requests.filter(r => r.status === 'completed')

  if (loading) return <div className="text-gray-500">Loading check-ins...</div>

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Check-ins</h1>

      {activeId ? (
        <ActiveCheckIn
          request={requests.find(r => r.id === activeId)!}
          answers={answers}
          setAnswers={setAnswers}
          onPhotoUpload={handlePhotoUpload}
          uploadingPhoto={uploadingPhoto}
          onSubmit={handleSubmit}
          onCancel={() => { setActiveId(null); setAnswers({}) }}
          submitting={submitting}
        />
      ) : (
        <>
          {pending.length > 0 && (
            <div className="mb-8">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-amber-600 mb-3">
                Waiting for your response ({pending.length})
              </h2>
              <div className="space-y-3">
                {pending.map(req => (
                  <button key={req.id} onClick={() => openCheckIn(req)}
                    className="w-full text-left card p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">{req.title}</h3>
                        <p className="text-xs text-gray-500 mt-1">
                          {req.questions.length} question{req.questions.length === 1 ? '' : 's'} · Sent {new Date(req.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full bg-amber-100 text-amber-700">
                        <Clock className="h-3 w-3" />
                        Pending
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {pending.length === 0 && completed.length === 0 && (
            <div className="card p-12 text-center">
              <CheckCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-1">No check-ins yet</h3>
              <p className="text-sm text-gray-500">Your coach will send check-ins here for you to complete.</p>
            </div>
          )}

          {completed.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-green-600 mb-3">
                Completed ({completed.length})
              </h2>
              <div className="space-y-3">
                {completed.map(req => (
                  <button key={req.id} onClick={() => openCheckIn(req)}
                    className="w-full text-left card p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">{req.title}</h3>
                        <p className="text-xs text-gray-500 mt-1">
                          Responded {req.responded_at ? new Date(req.responded_at).toLocaleDateString() : ''}
                        </p>
                      </div>
                      <span className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full bg-green-100 text-green-700">
                        <CheckCircle className="h-3 w-3" />
                        Done
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// ACTIVE CHECK-IN (client response form)
// ────────────────────────────────────────────────────────────

function ActiveCheckIn({
  request, answers, setAnswers, onPhotoUpload, uploadingPhoto, onSubmit, onCancel, submitting,
}: {
  request: FeedbackRequest
  answers: Record<string, string | number | boolean | string[]>
  setAnswers: React.Dispatch<React.SetStateAction<Record<string, string | number | boolean | string[]>>>
  onPhotoUpload: (questionId: string, file: File) => void
  uploadingPhoto: string | null
  onSubmit: () => void
  onCancel: () => void
  submitting: boolean
}) {
  const isCompleted = request.status === 'completed'

  return (
    <div>
      <button onClick={onCancel} className="text-sm text-gray-500 hover:text-gray-700 mb-4">
        ← Back to check-ins
      </button>
      <div className="card p-6 md:p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-1">{request.title}</h2>
        <p className="text-sm text-gray-500 mb-6">
          {isCompleted ? 'Submitted' : 'From your coach'} · {new Date(request.created_at).toLocaleDateString()}
        </p>

        <div className="space-y-6">
          {request.questions.map((q: FeedbackQuestion) => (
            <div key={q.id} className="rounded-xl border border-gray-200 p-5">
              <label className="block text-sm font-semibold text-gray-700 mb-3">{q.question}</label>

              {q.type === 'text' && (
                <textarea
                  value={String(answers[q.id] ?? '')}
                  onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  rows={3}
                  placeholder="Your answer..."
                  disabled={isCompleted}
                />
              )}

              {q.type === 'rating' && (
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} type="button" onClick={() => !isCompleted && setAnswers(prev => ({ ...prev, [q.id]: n }))}
                      disabled={isCompleted}
                      className={`h-12 w-12 rounded-xl border-2 font-bold transition-all ${
                        answers[q.id] === n
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}>
                      {n}
                    </button>
                  ))}
                </div>
              )}

              {q.type === 'rating_10' && (
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                    <button key={n} type="button" onClick={() => !isCompleted && setAnswers(prev => ({ ...prev, [q.id]: n }))}
                      disabled={isCompleted}
                      className={`h-10 w-10 rounded-lg border-2 text-sm font-bold transition-all ${
                        answers[q.id] === n
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}>
                      {n}
                    </button>
                  ))}
                </div>
              )}

              {q.type === 'yes_no' && (
                <div className="grid grid-cols-2 gap-3">
                  {['Yes', 'No'].map(opt => (
                    <button key={opt} type="button" onClick={() => !isCompleted && setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                      disabled={isCompleted}
                      className={`py-3 rounded-xl border-2 font-semibold transition-all ${
                        answers[q.id] === opt
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}>
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {q.type === 'photo' && (
                <div>
                  <div className="flex flex-wrap gap-3 mb-3">
                    {((answers[q.id] as string[]) ?? []).map((url, i) => (
                      <img key={i} src={url} alt={`Photo ${i + 1}`}
                        className="h-24 w-24 rounded-xl object-cover border border-gray-200" />
                    ))}
                  </div>
                  {!isCompleted && (
                    <label className="inline-flex items-center gap-2 cursor-pointer px-4 py-2.5 rounded-xl border-2 border-dashed border-gray-300 text-sm font-medium text-gray-600 hover:border-purple-400 hover:text-purple-600 transition-colors">
                      {uploadingPhoto === q.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4" />
                      )}
                      {uploadingPhoto === q.id ? 'Uploading...' : 'Add photo'}
                      <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) onPhotoUpload(q.id, f) }} />
                    </label>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {!isCompleted && (
          <div className="flex gap-3 mt-8 pt-6 border-t border-gray-100">
            <button onClick={onCancel}
              className="px-6 py-3 border border-gray-300 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
              Save for later
            </button>
            <button onClick={onSubmit} disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50">
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              <span>{submitting ? 'Submitting...' : 'Submit check-in'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
