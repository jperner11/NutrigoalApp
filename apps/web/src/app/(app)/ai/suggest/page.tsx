'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { Sparkles, Send, Lock } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { PRICING } from '@/lib/constants'

export default function AISuggestPage() {
  const { profile } = useUser()
  const [usageCount, setUsageCount] = useState(0)
  const [prompt, setPrompt] = useState('')
  const [response, setResponse] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [loadingUsage, setLoadingUsage] = useState(true)

  const tier = profile?.role ?? 'free'
  const limit = PRICING[tier].aiSuggestionsLimit
  const limitType = PRICING[tier].aiLimitType

  useEffect(() => {
    if (!profile) return

    async function loadUsage() {
      const supabase = createClient()

      if (limitType === 'lifetime') {
        const { count } = await supabase
          .from('ai_usage')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', profile!.id)

        setUsageCount(count ?? 0)
      } else {
        const startOfMonth = new Date()
        startOfMonth.setDate(1)
        startOfMonth.setHours(0, 0, 0, 0)

        const { count } = await supabase
          .from('ai_usage')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', profile!.id)
          .gte('created_at', startOfMonth.toISOString())

        setUsageCount(count ?? 0)
      }

      setLoadingUsage(false)
    }

    loadUsage()
  }, [profile, limitType])

  const remaining = Math.max(0, limit - usageCount)
  const canUse = remaining > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile || !prompt.trim() || !canUse) return

    setIsLoading(true)
    setResponse('')

    try {
      const res = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        toast.error(error.message ?? 'Failed to get suggestion')
        setIsLoading(false)
        return
      }

      const data = await res.json()
      setResponse(data.suggestion)
      setUsageCount(prev => prev + 1)
      toast.success('Suggestion generated!')
    } catch {
      toast.error('Failed to get suggestion')
    } finally {
      setIsLoading(false)
    }
  }

  if (loadingUsage) return <div className="text-gray-500">Loading...</div>

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">AI Meal Suggestions</h1>
        <p className="text-gray-900 mt-1">Get personalized meal ideas based on your nutrition targets.</p>
      </div>

      {/* Usage Counter */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Sparkles className="h-5 w-5 text-purple-600" />
          <span className="text-sm text-gray-700">
            <span className="font-semibold">{remaining}</span> suggestion{remaining !== 1 ? 's' : ''} remaining
            {limitType === 'monthly' && <span className="text-gray-400"> this month</span>}
            {limitType === 'lifetime' && <span className="text-gray-400"> total</span>}
          </span>
        </div>
        {!canUse && tier === 'free' && (
          <a
            href="/pricing"
            className="text-sm text-purple-600 hover:text-purple-800 font-medium"
          >
            Upgrade for more
          </a>
        )}
      </div>

      {/* Prompt Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          What kind of meal are you looking for?
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., Quick high-protein breakfast ideas under 400 calories, or a dinner recipe with chicken and vegetables..."
          rows={3}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none mb-4"
          disabled={!canUse}
        />
        <button
          type="submit"
          disabled={isLoading || !canUse || !prompt.trim()}
          className="flex items-center space-x-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-2.5 rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {!canUse ? (
            <>
              <Lock className="h-4 w-4" />
              <span>No suggestions remaining</span>
            </>
          ) : isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center space-x-2 mb-4">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <h3 className="font-semibold text-gray-900">AI Suggestion</h3>
          </div>
          <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
            {response}
          </div>
        </div>
      )}
    </div>
  )
}
