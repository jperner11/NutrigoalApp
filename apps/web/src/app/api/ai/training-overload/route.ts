import { NextResponse } from 'next/server'
import { calculateSuggestion } from '@nutrigoal/shared'
import type { WorkoutSetLog } from '@nutrigoal/shared'

interface TrainingOverloadExerciseInput {
  exercise_id: string
  exercise_name: string
  target_reps: string
  is_compound: boolean
  last_sets: WorkoutSetLog[]
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY

  try {
    const { exercises } = (await request.json()) as { exercises?: TrainingOverloadExerciseInput[] }

    if (!Array.isArray(exercises) || exercises.length === 0) {
      return NextResponse.json({ message: 'Missing exercises' }, { status: 400 })
    }

    const fallbackSuggestions = exercises.map((exercise) => {
      const fallback = calculateSuggestion(
        exercise.last_sets ?? [],
        exercise.target_reps,
        exercise.is_compound,
      )

      return {
        exercise_id: exercise.exercise_id,
        suggestedWeight: fallback?.suggestedWeight ?? null,
        reason: fallback?.reason ?? null,
      }
    })

    if (!apiKey) {
      return NextResponse.json({ suggestions: fallbackSuggestions })
    }

    const exerciseSummary = exercises.map((exercise) => {
      const sets = (exercise.last_sets ?? [])
        .map((set) => `${set.weight_kg}kg x ${set.reps}`)
        .join(', ')

      return `- ${exercise.exercise_name} (${exercise.is_compound ? 'compound' : 'isolation'}) target ${exercise.target_reps}: ${sets || 'no prior sets'}`
    }).join('\n')

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You are a careful strength coach. Suggest the next working weight in kg for each exercise using conservative progressive overload. If the athlete hit the top of the rep range across all work sets, increase weight slightly. Otherwise keep weight the same and encourage more reps or cleaner execution. Return only JSON in the shape {"suggestions":[{"exercise_id":"...","suggestedWeight":number|null,"reason":"..."}]}.',
          },
          {
            role: 'user',
            content: `Review these exercises and return the next suggested working weight.\n${exerciseSummary}`,
          },
        ],
      }),
    })

    if (!response.ok) {
      return NextResponse.json({ suggestions: fallbackSuggestions })
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content?.trim() ?? '{}'
    const parsed = JSON.parse(content) as {
      suggestions?: { exercise_id: string; suggestedWeight: number | null; reason: string | null }[]
    }

    const suggestionMap = new Map((parsed.suggestions ?? []).map((suggestion) => [suggestion.exercise_id, suggestion]))

    const merged = fallbackSuggestions.map((fallback) => {
      const ai = suggestionMap.get(fallback.exercise_id)
      return {
        exercise_id: fallback.exercise_id,
        suggestedWeight: typeof ai?.suggestedWeight === 'number' ? ai.suggestedWeight : fallback.suggestedWeight,
        reason: ai?.reason?.trim() || fallback.reason,
      }
    })

    return NextResponse.json({ suggestions: merged })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ message }, { status: 500 })
  }
}
