'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageSquare, Send, X, ChevronDown, Sparkles, Loader2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { apiFetch, ApiError } from '@/lib/apiClient'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface MealForContext {
  id: string
  label: string
  meal_type: string
  meal_name: string
  time: string
  calories: number
  protein: number
  carbs: number
  fat: number
  ingredients: { name: string; amount: number; unit: string; calories: number; protein: number; carbs: number; fat: number }[]
}

interface PlanChatProps {
  planId: string
  meals: MealForContext[]
  targets: { calories: number | null; protein: number | null; carbs: number | null; fat: number | null }
  userProfile: {
    goal?: string
    allergies?: string[]
    foodDislikes?: string[]
  }
  dayOfWeek?: number | null
  onMealsUpdated: () => void
}

export default function PlanChat({ planId, meals, targets, userProfile, dayOfWeek, onMealsUpdated }: PlanChatProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (isOpen) inputRef.current?.focus()
  }, [isOpen])

  const VALID_MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack']

  async function handleSend() {
    const text = input.trim()
    if (!text || isLoading) return

    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setIsLoading(true)

    try {
      const data = await apiFetch<{ message?: string; meals?: Record<string, unknown>[] }>('/api/ai/modify-meal-plan', {
        method: 'POST',
        body: { userMessage: text, currentMeals: meals, targets, userProfile },
        context: { feature: 'plan-chat', action: 'modify-meal-plan' },
      })

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.message || 'Plan updated successfully.',
      }])

      if (data.meals && data.meals.length > 0) {
        await saveMealsToDb(data.meals)
        onMealsUpdated()
      }
    } catch (err) {
      const fallback = err instanceof ApiError ? err.message : 'Failed to connect to AI. Please try again.'
      setMessages(prev => [...prev, { role: 'assistant', content: fallback }])
    } finally {
      setIsLoading(false)
    }
  }

  async function saveMealsToDb(updatedMeals: Record<string, unknown>[]) {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()

    // Delete existing meals for this day only (or all if no day specified)
    if (dayOfWeek !== null && dayOfWeek !== undefined) {
      await supabase.from('diet_plan_meals').delete().eq('diet_plan_id', planId).eq('day_of_week', dayOfWeek)
    } else {
      await supabase.from('diet_plan_meals').delete().eq('diet_plan_id', planId)
    }

    const inserts = updatedMeals.map(meal => {
      const ingredients = (meal.ingredients as Record<string, unknown>[]) ?? []
      return {
        diet_plan_id: planId,
        day_of_week: dayOfWeek ?? null,
        meal_type: VALID_MEAL_TYPES.includes(meal.meal_type as string) ? meal.meal_type : 'snack',
        meal_name: (meal.title as string) || 'Meal',
        foods: {
          _meta: {
            label: (meal.label as string) || '',
            time: (meal.time as string) || '12:00',
            timing_note: (meal.timing_note as string) || '',
            notes: (meal.notes as string) || '',
          },
          items: ingredients.map((ing: Record<string, unknown>) => ({
            source: 'ai_parsed' as const,
            name: ing.name,
            amount: ing.amount,
            unit: ing.unit || 'g',
            calories: ing.calories,
            protein: ing.protein,
            carbs: ing.carbs,
            fat: ing.fat,
            alternatives: Array.isArray(ing.alternatives) ? ing.alternatives : [],
          })),
        },
        total_calories: Math.round(Number(meal.calories) || 0),
        total_protein: Math.round((Number(meal.protein) || 0) * 10) / 10,
        total_carbs: Math.round((Number(meal.carbs) || 0) * 10) / 10,
        total_fat: Math.round((Number(meal.fat) || 0) * 10) / 10,
      }
    })

    const { error } = await supabase.from('diet_plan_meals').insert(inserts)
    if (error) {
      toast.error('Failed to save modified meals')
    }
  }

  return (
    <>
      {/* Floating toggle button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 p-4 rounded-full shadow-lg hover:shadow-xl transition-all z-40 group"
          style={{
            background: 'linear-gradient(135deg, var(--brand-500), var(--brand-400))',
            color: '#0a0a0a',
            border: '1px solid var(--brand-200)',
          }}
        >
          <MessageSquare className="h-6 w-6" />
          <span
            className="absolute -top-10 right-0 text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap"
            style={{ background: 'var(--panel-strong)', color: 'var(--fg)', border: '1px solid var(--line)' }}
          >
            Modify plan with AI
          </span>
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div className="card fixed bottom-6 right-6 w-[400px] max-h-[550px] flex flex-col z-50 overflow-hidden">
          {/* Header */}
          <div
            className="px-5 py-3.5 flex items-center justify-between flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--brand-500), var(--brand-400))' }}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" style={{ color: '#0a0a0a' }} />
              <h3 className="font-semibold text-sm" style={{ color: '#0a0a0a' }}>AI Plan Assistant</h3>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Minimize chat"
                className="p-1 rounded transition-colors hover:bg-black/10"
                style={{ color: 'rgba(10, 10, 10, 0.7)' }}
              >
                <ChevronDown className="h-5 w-5" />
              </button>
              <button
                onClick={() => { setIsOpen(false); setMessages([]) }}
                aria-label="Close chat"
                className="p-1 rounded transition-colors hover:bg-black/10"
                style={{ color: 'rgba(10, 10, 10, 0.7)' }}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-[200px] max-h-[380px]">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <Sparkles className="h-8 w-8 mx-auto mb-3" style={{ color: 'var(--acc-text)' }} />
                <p className="text-sm font-medium" style={{ color: 'var(--fg-3)' }}>Ask me to modify your meal plan</p>
                <div className="mt-3 space-y-1.5">
                  {[
                    'Change lunch to salmon and potatoes',
                    'Move dinner earlier to 18:00',
                    'Make breakfast higher in protein',
                    'Replace oats with something else',
                  ].map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => { setInput(suggestion); inputRef.current?.focus() }}
                      className="block w-full text-left text-xs px-3 py-2 rounded-lg transition-colors hover:bg-[var(--ink-3)]"
                      style={{ color: 'var(--fg-2)', background: 'var(--ink-2)' }}
                    >
                      &ldquo;{suggestion}&rdquo;
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm"
                  style={
                    msg.role === 'user'
                      ? { background: 'linear-gradient(135deg, var(--brand-500), var(--brand-400))', color: '#0a0a0a', borderBottomRightRadius: 6 }
                      : { background: 'var(--ink-2)', color: 'var(--fg)', borderBottomLeftRadius: 6 }
                  }
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div
                  className="px-4 py-3 rounded-2xl flex items-center gap-2 text-sm"
                  style={{ background: 'var(--ink-2)', color: 'var(--fg-3)', borderBottomLeftRadius: 6 }}
                >
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating your plan...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 flex-shrink-0" style={{ borderTop: '1px solid var(--line)' }}>
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                placeholder="e.g. Swap lunch for a chicken wrap..."
                rows={1}
                aria-label="Message the AI plan assistant"
                className="flex-1 px-3.5 py-2.5 rounded-xl text-sm resize-none max-h-20 focus:outline-none"
                style={{ border: '1px solid var(--line-2)', background: 'var(--ink-2)', color: 'var(--fg)' }}
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                aria-label="Send message"
                className="p-2.5 rounded-xl hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, var(--brand-500), var(--brand-400))', color: '#0a0a0a' }}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
