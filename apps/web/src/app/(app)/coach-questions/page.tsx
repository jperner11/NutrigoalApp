'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { isTrainerRole } from '@treno/shared'
import { toast } from 'react-hot-toast'
import {
  Plus, Pencil, Trash2, Loader2, Check, X, ArrowUp, ArrowDown, ClipboardList,
} from 'lucide-react'
import { AppHeroPanel, AppSectionHeader, EmptyStateCard } from '@/components/ui/AppDesign'
import type { PersonalTrainerCustomIntakeQuestion } from '@/lib/supabase/types'

const QUESTION_TYPES: { value: PersonalTrainerCustomIntakeQuestion['type']; label: string }[] = [
  { value: 'short_text', label: 'Short text' },
  { value: 'long_text', label: 'Long text' },
  { value: 'single_select', label: 'Single select' },
  { value: 'multi_select', label: 'Multi select' },
  { value: 'yes_no', label: 'Yes / No' },
]

interface DraftQuestion {
  id?: string
  label: string
  help_text: string
  type: PersonalTrainerCustomIntakeQuestion['type']
  options: string[]
  required: boolean
  is_active: boolean
}

const EMPTY_DRAFT: DraftQuestion = {
  label: '',
  help_text: '',
  type: 'short_text',
  options: [],
  required: false,
  is_active: true,
}

export default function CoachQuestionsPage() {
  const router = useRouter()
  const { profile, loading: userLoading } = useUser()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [questions, setQuestions] = useState<PersonalTrainerCustomIntakeQuestion[]>([])
  const [draft, setDraft] = useState<DraftQuestion | null>(null)

  const fetchQuestions = useCallback(async () => {
    const res = await fetch('/api/personal-trainer/custom-intake/questions')
    const json = await res.json()
    if (!res.ok) {
      toast.error(json.error || 'Failed to load questions')
      setLoading(false)
      return
    }
    setQuestions(json.questions ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    if (userLoading) return
    if (!profile) return
    if (!isTrainerRole(profile.role)) {
      router.push('/dashboard')
      return
    }
    fetchQuestions()
  }, [profile, userLoading, router, fetchQuestions])

  function startCreate() {
    setDraft({ ...EMPTY_DRAFT })
  }

  function startEdit(q: PersonalTrainerCustomIntakeQuestion) {
    setDraft({
      id: q.id,
      label: q.label,
      help_text: q.help_text ?? '',
      type: q.type,
      options: [...q.options],
      required: q.required,
      is_active: q.is_active,
    })
  }

  async function saveDraft() {
    if (!draft) return
    if (!draft.label.trim()) {
      toast.error('Label is required')
      return
    }
    if ((draft.type === 'single_select' || draft.type === 'multi_select') && draft.options.filter(Boolean).length === 0) {
      toast.error('At least one option is required')
      return
    }

    setSaving(true)
    const cleanedOptions = draft.options.map((o) => o.trim()).filter(Boolean)
    const payload = {
      label: draft.label.trim(),
      help_text: draft.help_text.trim() || null,
      type: draft.type,
      options: cleanedOptions,
      required: draft.required,
      is_active: draft.is_active,
    }

    const url = draft.id
      ? `/api/personal-trainer/custom-intake/questions/${draft.id}`
      : '/api/personal-trainer/custom-intake/questions'
    const method = draft.id ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) {
      toast.error(json.error || 'Failed to save')
      return
    }
    toast.success(draft.id ? 'Question updated' : 'Question added')
    setDraft(null)
    await fetchQuestions()
  }

  async function deleteQuestion(id: string) {
    if (!confirm('Delete this question? Existing client responses will also be removed.')) return
    const res = await fetch(`/api/personal-trainer/custom-intake/questions/${id}`, { method: 'DELETE' })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(json.error || 'Failed to delete')
      return
    }
    toast.success('Question deleted')
    await fetchQuestions()
  }

  async function toggleActive(q: PersonalTrainerCustomIntakeQuestion) {
    const res = await fetch(`/api/personal-trainer/custom-intake/questions/${q.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !q.is_active }),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      toast.error(json.error || 'Failed to update')
      return
    }
    await fetchQuestions()
  }

  async function move(q: PersonalTrainerCustomIntakeQuestion, dir: -1 | 1) {
    const sorted = [...questions].sort((a, b) => a.sort_order - b.sort_order)
    const idx = sorted.findIndex((x) => x.id === q.id)
    const swapIdx = idx + dir
    if (swapIdx < 0 || swapIdx >= sorted.length) return
    const a = sorted[idx]
    const b = sorted[swapIdx]
    await Promise.all([
      fetch(`/api/personal-trainer/custom-intake/questions/${a.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sort_order: b.sort_order }),
      }),
      fetch(`/api/personal-trainer/custom-intake/questions/${b.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sort_order: a.sort_order }),
      }),
    ])
    await fetchQuestions()
  }

  if (loading || userLoading) return <div className="text-[var(--fg-3)]">Loading questions...</div>

  return (
    <div className="mx-auto max-w-[1100px]">
      <AppHeroPanel
        eyebrow="Coach intake"
        title="Custom anamnesis"
        accent="questions."
        subtitle="Build a custom question set for every new client. Active questions appear in the client's onboarding flow."
      />

      <div className="mb-6 flex items-center justify-between">
        <AppSectionHeader index="01" eyebrow="QUESTIONS" title="Your" accent="library." />
        <button onClick={startCreate} className="btn btn-accent">
          <Plus className="h-4 w-4" />
          <span>New question</span>
        </button>
      </div>

      {questions.length === 0 && !draft ? (
        <EmptyStateCard title="No custom questions yet." body="Add the first question to start customising client intakes." />
      ) : (
        <div className="space-y-3">
          {questions
            .slice()
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((q, idx, arr) => (
              <div key={q.id} className="card flex items-start justify-between gap-3 p-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <ClipboardList className="h-4 w-4 text-violet-500" />
                    <span className="font-semibold text-[var(--fg)]">{q.label}</span>
                    <span className="app-status-pill text-xs">{QUESTION_TYPES.find((t) => t.value === q.type)?.label ?? q.type}</span>
                    {q.required && <span className="text-xs text-amber-500">required</span>}
                    {!q.is_active && <span className="text-xs text-[var(--fg-4)]">inactive</span>}
                  </div>
                  {q.help_text && <p className="mt-1 text-xs text-[var(--fg-3)]">{q.help_text}</p>}
                  {q.options.length > 0 && (
                    <p className="mt-1 text-xs text-[var(--fg-4)]">Options: {q.options.join(', ')}</p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => move(q, -1)} disabled={idx === 0} className="rounded-lg p-1.5 text-[var(--fg-4)] hover:bg-[var(--ink-3)] hover:text-[var(--fg-2)] disabled:opacity-30">
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button onClick={() => move(q, 1)} disabled={idx === arr.length - 1} className="rounded-lg p-1.5 text-[var(--fg-4)] hover:bg-[var(--ink-3)] hover:text-[var(--fg-2)] disabled:opacity-30">
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button onClick={() => toggleActive(q)} className="rounded-lg px-2 py-1 text-xs text-[var(--fg-3)] hover:bg-[var(--ink-3)] hover:text-[var(--fg-2)]">
                    {q.is_active ? 'Disable' : 'Enable'}
                  </button>
                  <button onClick={() => startEdit(q)} className="rounded-lg p-1.5 text-[var(--fg-4)] hover:bg-[var(--ink-3)] hover:text-[var(--fg-2)]">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => deleteQuestion(q.id)} className="rounded-lg p-1.5 text-red-400 hover:bg-[var(--ink-3)]">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}

      {draft && (
        <div className="card mt-6 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="app-mono-label">{draft.id ? 'Edit question' : 'New question'}</h2>
            <button onClick={() => setDraft(null)} className="rounded-lg p-1.5 text-[var(--fg-4)] hover:bg-[var(--ink-3)] hover:text-[var(--fg-2)]">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div>
            <label className="app-mono-label mb-1 block">Label</label>
            <input
              type="text"
              value={draft.label}
              onChange={(e) => setDraft({ ...draft, label: e.target.value })}
              className="input-field px-3 py-2 text-sm"
              placeholder="e.g. What time do you usually train?"
            />
          </div>

          <div>
            <label className="app-mono-label mb-1 block">Help text (optional)</label>
            <input
              type="text"
              value={draft.help_text}
              onChange={(e) => setDraft({ ...draft, help_text: e.target.value })}
              className="input-field px-3 py-2 text-sm"
              placeholder="Explain context to your client"
            />
          </div>

          <div>
            <label className="app-mono-label mb-1 block">Type</label>
            <select
              value={draft.type}
              onChange={(e) => setDraft({ ...draft, type: e.target.value as DraftQuestion['type'] })}
              className="input-field px-3 py-2 text-sm"
            >
              {QUESTION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {(draft.type === 'single_select' || draft.type === 'multi_select') && (
            <div>
              <label className="app-mono-label mb-1 block">Options</label>
              <div className="space-y-2">
                {draft.options.map((opt, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const next = [...draft.options]
                        next[idx] = e.target.value
                        setDraft({ ...draft, options: next })
                      }}
                      className="input-field px-3 py-2 text-sm flex-1"
                      placeholder={`Option ${idx + 1}`}
                    />
                    <button
                      onClick={() => setDraft({ ...draft, options: draft.options.filter((_, i) => i !== idx) })}
                      className="rounded-lg px-2 text-red-400 hover:bg-[var(--ink-3)]"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setDraft({ ...draft, options: [...draft.options, ''] })}
                  className="btn btn-secondary text-xs"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add option</span>
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-[var(--fg-2)]">
              <input
                type="checkbox"
                checked={draft.required}
                onChange={(e) => setDraft({ ...draft, required: e.target.checked })}
              />
              Required
            </label>
            <label className="flex items-center gap-2 text-sm text-[var(--fg-2)]">
              <input
                type="checkbox"
                checked={draft.is_active}
                onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })}
              />
              Active (shown to clients)
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setDraft(null)} className="btn btn-secondary">Cancel</button>
            <button onClick={saveDraft} disabled={saving} className="btn btn-accent disabled:opacity-50">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              {saving ? 'Saving...' : 'Save question'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
