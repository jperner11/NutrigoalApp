import { NextResponse } from 'next/server'
import { sanitizeNextPath } from '@/lib/authRedirect'
import {
  CHECKOUT_INTENT_QUERY_PARAM,
  parseCheckoutIntent,
} from '@/lib/checkoutIntent'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = sanitizeNextPath(searchParams.get('next'), '/dashboard')
  const checkoutIntent = parseCheckoutIntent(searchParams.get(CHECKOUT_INTENT_QUERY_PARAM))

  if (code) {
    const supabase = await createClient()
    const { error, data } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      const redirectUrl = new URL(next, origin)
      if (checkoutIntent) {
        redirectUrl.searchParams.set(CHECKOUT_INTENT_QUERY_PARAM, checkoutIntent)
      }
      return NextResponse.redirect(redirectUrl)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
