'use client'

import { Plus, Trash2 } from 'lucide-react'
import type { CustomIntakeQuestionType } from '@nutrigoal/shared'

export interface DraftCustomQuestion {
  // Stable local id — either the real DB id (for existing rows) or a temp
  // client-generated id (for new rows). We detect "new" with startsWith('tmp-').
  localId: string
  label: string
  help_text: string
  type: CustomIntakeQuestionType
  options: string[]
  required: boolean
}

const QUESTION_TYPE_OPTIONS: Array<{ value: CustomIntakeQuestionType; label: string }> = [
  { value: 'short_text', label: 'Short text' },
  { value: 'long_text', label: 'Long text' },
  { value: 'single_select', label: 'Single choice' },
  { value: 'multi_select', label: 'Multiple choice' },
  { value: 'yes_no', label: 'Yes / No' },
]

const SUGGESTED_TEMPLATES: Array<Pick<DraftCustomQuestion, 'label' | 'type' | 'options' | 'required' | 'help_text'>> = [
  {
    label: 'What does your typical training week look like right now?',
    type: 'long_text',
    options: [],
    required: false,
    help_text: 'Days per week, session length, anything you enjoy or avoid.',
  },
  {
    label: 'How do you prefer to receive feedback from your coach?',
    type: 'single_select',
    options: ['Direct and blunt', 'Encouraging', 'Data-focused', 'Mix of all'],
    required: false,
    help_text: '',
  },
  {
    label: 'Are you currently using any supplements?',
    type: 'yes_no',
    options: [],
    required: false,
    help_text: 'Your coach may ask for details in a follow-up.',
  },
  {
    label: 'Which days can you commit to training?',
    type: 'multi_select',
    options: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    required: true,
    help_text: '',
  },
]

function makeTempId(): string {
  return `tmp-${Math.random().toString(36).slice(2, 10)}`
}

export function createDraftCustomQuestion(
  overrides: Partial<DraftCustomQuestion> = {}
): DraftCustomQuestion {
  return {
    localId: overrides.localId ?? makeTempId(),
    label: overrides.label ?? '',
    help_text: overrides.help_text ?? '',
    type: overrides.type ?? 'short_text',
    options: overrides.options ?? [],
    required: overrides.required ?? false,
  }
}

interface Props {
  value: DraftCustomQuestion[]
  onChange: (next: DraftCustomQuestion[]) => void
}

export function TrainerCustomQuestionsEditor({ value, onChange }: Props) {
  const update = (localId: string, patch: Partial<DraftCustomQuestion>) => {
    onChange(value.map((q) => (q.localId === localId ? { ...q, ...patch } : q)))
  }
  const remove = (localId: string) => {
    onChange(value.filter((q) => q.localId !== localId))
  }
  const add = (seed: Partial<DraftCustomQuestion> = {}) => {
    onChange([...value, createDraftCustomQuestion(seed)])
  }

  return (
    <div className="space-y-4">
      {value.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center">
          <p className="text-sm text-gray-600 font-medium">No custom questions yet.</p>
          <p className="text-xs text-gray-500 mt-1">
            Add your own or start from a suggested template below.
          </p>
        </div>
      )}

      {value.map((q, i) => {
        const needsOptions = q.type === 'single_select' || q.type === 'multi_select'
        return (
          <div key={q.localId} className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Question {i + 1}
              </span>
              <button
                type="button"
                onClick={() => remove(q.localId)}
                className="text-gray-400 hover:text-red-600 transition-colors"
                aria-label="Remove question"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Question</label>
              <input
                type="text"
                value={q.label}
                onChange={(e) => update(q.localId, { label: e.target.value })}
                placeholder="e.g. What motivates you most right now?"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Help text (optional)</label>
              <input
                type="text"
                value={q.help_text}
                onChange={(e) => update(q.localId, { help_text: e.target.value })}
                placeholder="Context for your client"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Answer type</label>
                <select
                  value={q.type}
                  onChange={(e) => {
                    const nextType = e.target.value as CustomIntakeQuestionType
                    update(q.localId, {
                      type: nextType,
                      options:
                        nextType === 'single_select' || nextType === 'multi_select'
                          ? q.options
                          : [],
                    })
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  {QUESTION_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm text-gray-700 select-none">
                  <input
                    type="checkbox"
                    checked={q.required}
                    onChange={(e) => update(q.localId, { required: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  Required
                </label>
              </div>
            </div>

            {needsOptions && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Options (one per line)
                </label>
                <textarea
                  rows={3}
                  value={q.options.join('\n')}
                  onChange={(e) =>
                    update(q.localId, {
                      options: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  placeholder={'Option A\nOption B\nOption C'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                />
              </div>
            )}
          </div>
        )
      })}

      <button
        type="button"
        onClick={() => add()}
        className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-purple-300 bg-purple-50/50 text-purple-700 py-3 text-sm font-semibold hover:bg-purple-50 transition-all"
      >
        <Plus className="h-4 w-4" />
        Add a question
      </button>

      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
          Suggested templates
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {SUGGESTED_TEMPLATES.map((tpl) => (
            <button
              key={tpl.label}
              type="button"
              onClick={() => add(tpl)}
              className="text-left rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 hover:border-purple-300 hover:bg-purple-50/50 transition-all"
            >
              + {tpl.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
