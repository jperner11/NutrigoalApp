import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ensureTrainer, isValidQuestionType } from '@/lib/customIntake'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  try {
    await ensureTrainer(profile?.role)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await admin
    .from('personal_trainer_custom_intake_questions')
    .select('*')
    .eq('trainer_id', user.id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ questions: data ?? [] })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  try {
    await ensureTrainer(profile?.role)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const label = typeof body?.label === 'string' ? body.label.trim() : ''
  const type = body?.type
  if (!label) return NextResponse.json({ error: 'Question label is required.' }, { status: 400 })
  if (!isValidQuestionType(type)) {
    return NextResponse.json({ error: 'Invalid question type.' }, { status: 400 })
  }

  const help_text = typeof body?.help_text === 'string' && body.help_text.trim()
    ? body.help_text.trim()
    : null
  const options = Array.isArray(body?.options)
    ? body.options.filter((o: unknown): o is string => typeof o === 'string' && o.trim().length > 0)
    : []
  const required = !!body?.required
  const is_active = body?.is_active === false ? false : true

  if ((type === 'single_select' || type === 'multi_select') && options.length === 0) {
    return NextResponse.json({ error: 'Select questions require at least one option.' }, { status: 400 })
  }

  // Determine next sort order if not provided.
  let sort_order = typeof body?.sort_order === 'number' ? body.sort_order : null
  if (sort_order === null) {
    const { data: maxRow } = await admin
      .from('personal_trainer_custom_intake_questions')
      .select('sort_order')
      .eq('trainer_id', user.id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle()
    sort_order = (maxRow?.sort_order ?? -1) + 1
  }

  const { data, error } = await admin
    .from('personal_trainer_custom_intake_questions')
    .insert({
      trainer_id: user.id,
      label,
      help_text,
      type,
      options,
      required,
      is_active,
      sort_order,
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ question: data })
}
