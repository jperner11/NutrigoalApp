import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { rateLimit, getClientIp } from '@/lib/rateLimit'
import { buildCoachingPrompt, type CoachingTool } from '@/lib/coachingPrompts'

const VALID_TOOLS: CoachingTool[] = ['plateau', 'weak-point', 'recovery', 'injury-prevention', 'tracking', 'recomp']

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const { success } = rateLimit(`ai-coaching:${ip}`, { limit: 5, windowMs: 60_000 })
  if (!success) {
    return NextResponse.json({ message: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ message: 'AI service not configured' }, { status: 503 })
  }

  try {
    const { toolType, userId, additionalInputs = {} } = await request.json()

    if (!toolType || !userId) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 })
    }

    if (!VALID_TOOLS.includes(toolType)) {
      return NextResponse.json({ message: 'Invalid tool type' }, { status: 400 })
    }

    // Fetch full profile server-side
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ message: 'Server configuration error' }, { status: 503 })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    // For recomp tool, fetch latest body fat from weight logs
    if (toolType === 'recomp') {
      const { data: latestWeight } = await supabase
        .from('weight_logs')
        .select('body_fat_pct')
        .eq('user_id', userId)
        .not('body_fat_pct', 'is', null)
        .order('date', { ascending: false })
        .limit(1)
        .single()

      if (latestWeight?.body_fat_pct) {
        additionalInputs.latestBodyFatPct = latestWeight.body_fat_pct
      }
    }

    const { systemPrompt, userPrompt } = buildCoachingPrompt(toolType, profile, additionalInputs)

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 4000,
        temperature: 0.7,
      }),
    })

    if (!openaiResponse.ok) {
      return NextResponse.json({ message: 'AI service error' }, { status: 502 })
    }

    const aiData = await openaiResponse.json()
    const response = aiData.choices?.[0]?.message?.content ?? 'No response generated.'
    const tokensUsed = aiData.usage?.total_tokens ?? 0

    // Log usage
    await supabase.from('ai_usage').insert({
      user_id: userId,
      type: 'coaching',
      prompt: `coaching:${toolType}`,
      response: response.substring(0, 500),
      tokens_used: tokensUsed,
    })

    return NextResponse.json({ response })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ message }, { status: 500 })
  }
}
