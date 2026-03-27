import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error, data } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Check if this user was invited by a nutritionist (pending invite)
      const userEmail = data.user.email
      if (userEmail) {
        const { data: pendingInvite } = await supabase
          .from('nutritionist_clients')
          .select('id, nutritionist_id')
          .eq('invited_email', userEmail)
          .eq('status', 'pending')
          .single()

        if (pendingInvite) {
          // Activate the invite
          await supabase
            .from('nutritionist_clients')
            .update({ client_id: data.user.id, status: 'active' })
            .eq('id', pendingInvite.id)

          // Set user role to nutritionist_client and link nutritionist
          await supabase
            .from('user_profiles')
            .update({
              role: 'nutritionist_client',
              nutritionist_id: pendingInvite.nutritionist_id,
            })
            .eq('id', data.user.id)
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
