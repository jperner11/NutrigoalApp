import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ensureTrainer, ensureCoachOwnsClient } from '@/lib/customIntake'

/**
 * GET /api/personal-trainer/custom-intake/clients/[id]
 * Coach reads custom intake questions + that client's responses.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: clientId } = await params
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

  const owns = await ensureCoachOwnsClient(user.id, clientId)
  if (!owns) {
    return NextResponse.json({ error: 'Client is not assigned to you.' }, { status: 403 })
  }

  const [questionsRes, responsesRes] = await Promise.all([
    admin
      .from('personal_trainer_custom_intake_questions')
      .select('*')
      .eq('trainer_id', user.id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    admin
      .from('personal_trainer_custom_intake_responses')
      .select('*')
      .eq('trainer_id', user.id)
      .eq('client_id', clientId),
  ])

  if (questionsRes.error) return NextResponse.json({ error: questionsRes.error.message }, { status: 400 })
  if (responsesRes.error) return NextResponse.json({ error: responsesRes.error.message }, { status: 400 })

  return NextResponse.json({
    questions: questionsRes.data ?? [],
    responses: responsesRes.data ?? [],
  })
}
