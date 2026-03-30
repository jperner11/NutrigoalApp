'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageSquare, Send, X, ChevronDown, Sparkles, Loader2 } from 'lucide-react'
import { toast } from 'react-hot-toast'

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
      const res = await fetch('/api/ai/modify-meal-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage: text,
          currentMeals: meals,
          targets,
          userProfile,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        setMessages(prev => [...prev, { role: 'assistant', content: err.message || 'Something went wrong. Try again.' }])
        setIsLoading(false)
        return
      }

      const data = await res.json()

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.message || 'Plan updated successfully.',
      }])

      // Save modified meals to DB
      if (data.meals && data.meals.length > 0) {
        await saveMealsToDb(data.meals)
        onMealsUpdated()
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Failed to connect to AI. Please try again.' }])
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
            spoonacular_id: 0,
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
          className="fixed bottom-6 right-6 bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all z-40 group"
        >
          <MessageSquare className="h-6 w-6" />
          <span className="absolute -top-10 right-0 bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Modify plan with AI
          </span>
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-[400px] max-h-[550px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col z-50 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-3.5 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-white" />
              <h3 className="text-white font-semibold text-sm">AI Plan Assistant</h3>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setIsOpen(false)} className="text-white/70 hover:text-white p-1 transition-colors">
                <ChevronDown className="h-5 w-5" />
              </button>
              <button onClick={() => { setIsOpen(false); setMessages([]) }} className="text-white/70 hover:text-white p-1 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-[200px] max-h-[380px]">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <Sparkles className="h-8 w-8 text-purple-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500 font-medium">Ask me to modify your meal plan</p>
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
                      className="block w-full text-left text-xs text-purple-600 bg-purple-50 hover:bg-purple-100 px-3 py-2 rounded-lg transition-colors"
                    >
                      &ldquo;{suggestion}&rdquo;
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-br-md'
                    : 'bg-gray-100 text-gray-800 rounded-bl-md'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-500 px-4 py-3 rounded-2xl rounded-bl-md flex items-center gap-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating your plan...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-100 px-4 py-3 flex-shrink-0">
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
                className="flex-1 px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent max-h-20"
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-2.5 rounded-xl hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
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
