import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAssignedTrainerForClient } from '@/lib/customIntake'

/**
 * GET /api/personal-trainer/custom-intake/responses
 * Returns the active questions belonging to the authenticated user's coach
 * and the user's existing responses for each.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const trainerId = await getAssignedTrainerForClient(user.id)
  if (!trainerId) {
    return NextResponse.json({ trainerId: null, questions: [], responses: [] })
  }

  const admin = createAdminClient()
  const [questionsRes, responsesRes] = await Promise.all([
    admin
      .from('personal_trainer_custom_intake_questions')
      .select('*')
      .eq('trainer_id', trainerId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    admin
      .from('personal_trainer_custom_intake_responses')
      .select('*')
      .eq('client_id', user.id)
      .eq('trainer_id', trainerId),
  ])

  if (questionsRes.error) return NextResponse.json({ error: questionsRes.error.message }, { status: 400 })
  if (responsesRes.error) return NextResponse.json({ error: responsesRes.error.message }, { status: 400 })

  return NextResponse.json({
    trainerId,
    questions: questionsRes.data ?? [],
    responses: responsesRes.data ?? [],
  })
}

/**
 * POST /api/personal-trainer/custom-intake/responses
 * Body: { question_id, response_text?, response_json? }
 * Upserts a single response for the calling client.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const questionId = typeof body?.question_id === 'string' ? body.question_id : null
  if (!questionId) return NextResponse.json({ error: 'question_id is required.' }, { status: 400 })

  const admin = createAdminClient()
  const { data: question } = await admin
    .from('personal_trainer_custom_intake_questions')
    .select('id, trainer_id, type, is_active, options, required')
    .eq('id', questionId)
    .single()

  if (!question) return NextResponse.json({ error: 'Question not found.' }, { status: 404 })
  if (!question.is_active) {
    return NextResponse.json({ error: 'Question is not currently active.' }, { status: 400 })
  }

  const trainerId = await getAssignedTrainerForClient(user.id)
  if (!trainerId || trainerId !== question.trainer_id) {
    return NextResponse.json({ error: 'You are not assigned to this coach.' }, { status: 403 })
  }

  let response_text: string | null = null
  let response_json: string[] | boolean | null = null

  if (question.type === 'short_text' || question.type === 'long_text') {
    response_text = typeof body.response_text === 'string' ? body.response_text : null
  } else if (question.type === 'single_select') {
    if (typeof body.response_text !== 'string' || !body.response_text) {
      return NextResponse.json({ error: 'A choice is required.' }, { status: 400 })
    }
    if ((question.options ?? []).length > 0 && !question.options.includes(body.response_text)) {
      return NextResponse.json({ error: 'Choice is not a valid option.' }, { status: 400 })
    }
    response_text = body.response_text
  } else if (question.type === 'multi_select') {
    if (!Array.isArray(body.response_json)) {
      return NextResponse.json({ error: 'response_json must be an array of strings.' }, { status: 400 })
    }
    const cleaned = body.response_json.filter(
      (v: unknown): v is string => typeof v === 'string' && (question.options?.includes(v) ?? false),
    )
    response_json = cleaned
  } else if (question.type === 'yes_no') {
    if (typeof body.response_json !== 'boolean') {
      return NextResponse.json({ error: 'response_json must be a boolean.' }, { status: 400 })
    }
    response_json = body.response_json
  }

  const { data: existing } = await admin
    .from('personal_trainer_custom_intake_responses')
    .select('id')
    .eq('question_id', questionId)
    .eq('client_id', user.id)
    .maybeSingle()

  const now = new Date().toISOString()

  if (existing) {
    const { data, error } = await admin
      .from('personal_trainer_custom_intake_responses')
      .update({ response_text, response_json, updated_at: now })
      .eq('id', existing.id)
      .select('*')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ response: data })
  }

  const { data, error } = await admin
    .from('personal_trainer_custom_intake_responses')
    .insert({
      question_id: questionId,
      trainer_id: trainerId,
      client_id: user.id,
      response_text,
      response_json,
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ response: data })
}
