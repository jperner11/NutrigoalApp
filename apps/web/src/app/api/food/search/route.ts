import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query')
  const number = searchParams.get('number') ?? '10'

  if (!query) {
    return NextResponse.json({ message: 'Query parameter required' }, { status: 400 })
  }

  const apiKey = process.env.SPOONACULAR_API_KEY
  if (!apiKey) {
    return NextResponse.json({ message: 'Food search service not configured' }, { status: 503 })
  }

  try {
    const response = await fetch(
      `https://api.spoonacular.com/food/ingredients/search?query=${encodeURIComponent(query)}&number=${number}&apiKey=${apiKey}`,
    )

    if (!response.ok) {
      return NextResponse.json({ message: 'Food search failed' }, { status: 502 })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
