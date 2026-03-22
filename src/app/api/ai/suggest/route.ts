import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PRICING } from '@/lib/constants'

export async function POST(request: Request) {
  try {
    const { prompt, userId, userProfile } = await request.json()

    if (!prompt || !userId) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get user profile to check role/limits
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    const tier = profile.role as keyof typeof PRICING
    const limit = PRICING[tier].aiSuggestionsLimit
    const limitType = PRICING[tier].aiLimitType

    // Check usage
    let usageCount: number

    if (limitType === 'lifetime') {
      const { count } = await supabase
        .from('ai_usage')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      usageCount = count ?? 0
    } else {
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const { count } = await supabase
        .from('ai_usage')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', startOfMonth.toISOString())

      usageCount = count ?? 0
    }

    if (usageCount >= limit) {
      return NextResponse.json(
        { message: `AI suggestion limit reached (${limit} ${limitType === 'lifetime' ? 'total' : 'per month'}). Upgrade your plan for more.` },
        { status: 429 }
      )
    }

    // Call OpenAI
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ message: 'AI service not configured' }, { status: 503 })
    }

    const systemPrompt = `You are a professional nutritionist assistant. Provide meal suggestions that match the user's nutritional targets and dietary requirements. Be concise and practical.

User's daily targets:
- Calories: ${userProfile?.calories ?? 'not set'}
- Protein: ${userProfile?.protein ?? 'not set'}g
- Carbs: ${userProfile?.carbs ?? 'not set'}g
- Fat: ${userProfile?.fat ?? 'not set'}g
- Goal: ${userProfile?.goal ?? 'not set'}
- Dietary preferences: ${userProfile?.preferences?.join(', ') || 'none'}
- Allergies: ${userProfile?.allergies?.join(', ') || 'none'}

Provide a specific meal suggestion with ingredients, approximate macros, and simple preparation instructions.`

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        max_tokens: 800,
        temperature: 0.7,
      }),
    })

    if (!openaiResponse.ok) {
      return NextResponse.json({ message: 'AI service error' }, { status: 502 })
    }

    const aiData = await openaiResponse.json()
    const suggestion = aiData.choices?.[0]?.message?.content ?? 'No suggestion generated.'
    const tokensUsed = aiData.usage?.total_tokens ?? 0

    // Log usage
    await supabase.from('ai_usage').insert({
      user_id: userId,
      type: 'meal_suggestion',
      prompt,
      response: suggestion,
      tokens_used: tokensUsed,
    })

    return NextResponse.json({ suggestion })
  } catch {
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
