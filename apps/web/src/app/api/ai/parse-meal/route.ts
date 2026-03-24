import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ message: 'AI service not configured' }, { status: 503 })
  }

  try {
    const { text, mealType } = await request.json()

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ message: 'No meal description provided' }, { status: 400 })
    }

    const systemPrompt = `You parse freeform meal descriptions into structured food items with accurate nutritional data.

Rules:
- Parse the user's text into individual food items
- Use realistic portion sizes if not specified (e.g. "chicken" = ~150g chicken breast)
- Be accurate with macros: chicken breast 100g = 165cal, 31g protein, 0g carbs, 3.6g fat
- Common items: rice 100g cooked = 130cal/2.7g P/28g C/0.3g F, banana medium = 105cal/1.3g P/27g C/0.4g F
- If the user mentions a brand or specific dish, estimate as best you can
- Return 1-10 food items

Return ONLY valid JSON array:
[
  { "name": "grilled chicken breast", "amount": 150, "unit": "g", "calories": 248, "protein": 46.5, "carbs": 0, "fat": 5.4 },
  { "name": "white rice", "amount": 200, "unit": "g", "calories": 260, "protein": 5.4, "carbs": 56, "fat": 0.6 }
]`

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
          { role: 'user', content: `Parse this ${mealType || 'meal'}: "${text}"` },
        ],
        max_tokens: 800,
        temperature: 0.3,
      }),
    })

    if (!openaiResponse.ok) {
      return NextResponse.json({ message: 'AI service error' }, { status: 502 })
    }

    const aiData = await openaiResponse.json()
    const content = aiData.choices?.[0]?.message?.content?.trim() ?? '[]'

    let parsed
    try {
      const jsonStr = content.replace(/^```json?\n?/, '').replace(/\n?```$/, '')
      parsed = JSON.parse(jsonStr)
    } catch {
      return NextResponse.json({ message: 'Failed to parse AI response' }, { status: 502 })
    }

    if (!Array.isArray(parsed)) {
      return NextResponse.json({ message: 'Invalid response format' }, { status: 502 })
    }

    const foods = parsed.map((item: Record<string, unknown>) => ({
      name: String(item.name || 'food'),
      amount: Number(item.amount) || 100,
      unit: String(item.unit || 'g'),
      calories: Math.round(Number(item.calories) || 0),
      protein: Math.round((Number(item.protein) || 0) * 10) / 10,
      carbs: Math.round((Number(item.carbs) || 0) * 10) / 10,
      fat: Math.round((Number(item.fat) || 0) * 10) / 10,
    }))

    const totals = {
      calories: foods.reduce((s: number, f: { calories: number }) => s + f.calories, 0),
      protein: Math.round(foods.reduce((s: number, f: { protein: number }) => s + f.protein, 0) * 10) / 10,
      carbs: Math.round(foods.reduce((s: number, f: { carbs: number }) => s + f.carbs, 0) * 10) / 10,
      fat: Math.round(foods.reduce((s: number, f: { fat: number }) => s + f.fat, 0) * 10) / 10,
    }

    return NextResponse.json({ foods, totals })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ message }, { status: 500 })
  }
}
