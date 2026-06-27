import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ensureTrainer, isValidQuestionType } from '@/lib/customIntake'

async function authorize() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  try {
    await ensureTrainer(profile?.role)
  } catch (e) {
    return { error: NextResponse.json({ error: e instanceof Error ? e.message : 'Forbidden' }, { status: 403 }) }
  }
  return { user, admin }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorize()
  if ('error' in auth) return auth.error
  const { user, admin } = auth
  const { id } = await params
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 })
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof body.label === 'string') {
    const label = body.label.trim()
    if (!label) return NextResponse.json({ error: 'Label cannot be empty.' }, { status: 400 })
    updates.label = label
  }
  if ('help_text' in body) {
    updates.help_text = typeof body.help_text === 'string' && body.help_text.trim() ? body.help_text.trim() : null
  }
  if ('type' in body) {
    if (!isValidQuestionType(body.type)) {
      return NextResponse.json({ error: 'Invalid question type.' }, { status: 400 })
    }
    updates.type = body.type
  }
  if ('options' in body) {
    if (!Array.isArray(body.options)) {
      return NextResponse.json({ error: 'Options must be an array.' }, { status: 400 })
    }
    updates.options = body.options.filter((o: unknown): o is string => typeof o === 'string' && o.trim().length > 0)
  }
  if ('required' in body) updates.required = !!body.required
  if ('is_active' in body) updates.is_active = !!body.is_active
  if ('sort_order' in body && typeof body.sort_order === 'number') updates.sort_order = body.sort_order

  const { data, error } = await admin
    .from('personal_trainer_custom_intake_questions')
    .update(updates)
    .eq('id', id)
    .eq('trainer_id', user.id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (!data) return NextResponse.json({ error: 'Question not found.' }, { status: 404 })
  return NextResponse.json({ question: data })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorize()
  if ('error' in auth) return auth.error
  const { user, admin } = auth
  const { id } = await params

  const { error } = await admin
    .from('personal_trainer_custom_intake_questions')
    .delete()
    .eq('id', id)
    .eq('trainer_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
