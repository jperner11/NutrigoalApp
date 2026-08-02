'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/hooks/useUser'
import { Sparkles, Send, Lock } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { isManagedClientRole } from '@treno/shared'
import { apiFetch, ApiError } from '@/lib/apiClient'

export default function AISuggestPage() {
  const { profile } = useUser()
  const [prompt, setPrompt] = useState('')
  const [response, setResponse] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [loadingUsage, setLoadingUsage] = useState(true)

  const role = profile?.role ?? 'free'
  const isFree = role === 'free'
  const isClient = isManagedClientRole(role)
  const canUse = !isFree && !isClient

  useEffect(() => {
    if (profile) setLoadingUsage(false)
  }, [profile])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile || !prompt.trim() || !canUse) return

    setIsLoading(true)
    setResponse('')

    try {
      const data = await apiFetch<{ suggestion: string }>('/api/ai/suggest', {
        method: 'POST',
        body: {
          prompt: prompt.trim(),
          userId: profile.id,
          userProfile: {
            calories: profile.daily_calories,
            protein: profile.daily_protein,
            carbs: profile.daily_carbs,
            fat: profile.daily_fat,
            preferences: profile.dietary_preferences,
            allergies: profile.allergies,
            goal: profile.goal,
          },
        },
        context: { feature: 'ai-suggest', action: 'submit' },
      })
      setResponse(data.suggestion)
      toast.success('Suggestion generated!')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to get suggestion')
    } finally {
      setIsLoading(false)
    }
  }

  if (loadingUsage) return <div className="text-[var(--muted)]">Loading...</div>

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--foreground)]">AI Meal Suggestions</h1>
        <p className="text-[var(--muted)] mt-1">Get personalized meal ideas based on your nutrition targets.</p>
      </div>

      {/* Usage Counter */}
      <div className="card p-4 mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Sparkles className="h-5 w-5 text-[var(--acc-text)]" />
          <span className="text-sm text-[var(--muted)]">
            {isClient ? (
              <span>AI features are managed by your trainer</span>
            ) : isFree ? (
              <span>AI suggestions are a <span className="font-semibold">Pro</span> feature</span>
            ) : (
              <span>AI meal suggestions available</span>
            )}
          </span>
        </div>
        {isFree && !isClient && (
          <a
            href="/pricing"
            className="text-sm text-[var(--acc-text)] hover:underline font-medium"
          >
            Upgrade to Pro
          </a>
        )}
      </div>

      {/* Prompt Form */}
      <form onSubmit={handleSubmit} className="card p-6 mb-6">
        <label htmlFor="ai-suggest-prompt" className="block text-sm font-medium text-[var(--foreground)] mb-2">
          What kind of meal are you looking for?
        </label>
        <textarea
          id="ai-suggest-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., Quick high-protein breakfast ideas under 400 calories, or a dinner recipe with chicken and vegetables..."
          rows={3}
          className="input-field resize-none mb-4"
          disabled={!canUse}
        />
        <button
          type="submit"
          disabled={isLoading || !canUse || !prompt.trim()}
          className="btn btn-accent disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {!canUse ? (
            <>
              <Lock className="h-4 w-4" />
              <span>No suggestions remaining</span>
            </>
          ) : isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <span>Generating...</span>
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              <span>Get Suggestion</span>
            </>
          )}
        </button>
      </form>

      {/* Response */}
      {response && (
        <div className="card p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Sparkles className="h-5 w-5 text-[var(--acc-text)]" />
            <h3 className="font-semibold text-[var(--foreground)]">AI Suggestion</h3>
          </div>
          <div className="prose prose-sm max-w-none text-[var(--muted)] whitespace-pre-wrap">
            {response}
          </div>
        </div>
      )}
    </div>
  )
}
