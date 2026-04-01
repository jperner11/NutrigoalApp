import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, getClientIp } from '@/lib/rateLimit'

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const { success } = rateLimit(`ai-suggest:${ip}`, { limit: 10, windowMs: 60_000 })
  if (!success) {
    return NextResponse.json({ message: 'Too many requests. Please try again later.' }, { status: 429 })
  }

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

    // Free users cannot use AI suggestions
    if (profile.role === 'free') {
      return NextResponse.json(
        { message: 'AI suggestions require a Pro plan or higher. Upgrade to unlock.' },
        { status: 403 }
      )
    }

    // Call OpenAI
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ message: 'AI service not configured' }, { status: 503 })
    }

    const systemPrompt = `You are a certified clinical sports nutritionist consulting with a patient. You provide evidence-based, personalised meal suggestions that strictly respect the patient's nutritional targets, allergies, and dietary restrictions — no exceptions.

PATIENT DATA:
- Daily calorie target: ${userProfile?.calories ?? 'not set'} kcal
- Protein: ${userProfile?.protein ?? 'not set'}g
- Carbs: ${userProfile?.carbs ?? 'not set'}g
- Fat: ${userProfile?.fat ?? 'not set'}g
- Goal: ${userProfile?.goal ?? 'not set'}
- Dietary preferences: ${userProfile?.preferences?.join(', ') || 'none'}
- Allergies (MUST AVOID): ${userProfile?.allergies?.join(', ') || 'none'}

GUIDELINES:
- Always provide specific ingredients with weights in grams/ml (never cups, tablespoons, or "1 medium").
- Include approximate macros (calories, protein, carbs, fat) for each suggestion.
- Give simple, practical preparation instructions.
- If the patient has allergies or restrictions, NEVER suggest foods that violate them.
- Tailor suggestions to the patient's goal (bulking = calorie-dense, cutting = volume/satiety, maintenance = balanced).
- Be concise and actionable — you are a clinician, not a food blogger.`

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
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
