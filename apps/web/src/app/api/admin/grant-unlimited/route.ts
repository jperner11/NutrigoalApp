import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  // Verify admin secret
  const authHeader = request.headers.get('Authorization')
  const adminSecret = process.env.ADMIN_SECRET
  if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let email: string
  try {
    const body = await request.json()
    email = body.email
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'email is required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Look up user by email in auth.users via admin API
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
  if (listError) {
    return NextResponse.json({ error: 'Failed to look up users' }, { status: 500 })
  }

  const authUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase())
  if (!authUser) {
    return NextResponse.json({ error: `No user found with email: ${email}` }, { status: 404 })
  }

  const { error: updateError } = await supabase
    .from('user_profiles')
    .update({ role: 'unlimited' })
    .eq('id', authUser.id)

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update user role' }, { status: 500 })
  }

  return NextResponse.json({ success: true, userId: authUser.id, email: authUser.email })
}
