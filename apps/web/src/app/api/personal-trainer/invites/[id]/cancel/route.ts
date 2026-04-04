import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ensureTrainerAccess } from '@/lib/personalTrainerInvites'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  await ensureTrainerAccess(user.id, profile?.role)

  const { data: invite } = await admin
    .from('personal_trainer_invites')
    .update({
      status: 'revoked',
      revoked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('personal_trainer_id', user.id)
    .eq('status', 'pending')
    .select('id')
    .single()

  if (!invite) {
    return NextResponse.json({ error: 'Pending invite not found.' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
