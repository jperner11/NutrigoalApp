'use client'

import { useState } from 'react'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { Mail, ArrowLeft } from 'lucide-react'
import { toast } from 'react-hot-toast'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function InviteClientPage() {
  const { profile } = useUser()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile || !email) return

    setIsLoading(true)
    const supabase = createClient()

    // Check if client already exists
    const { data: existing } = await supabase
      .from('nutritionist_clients')
      .select('id')
      .eq('nutritionist_id', profile.id)
      .eq('invited_email', email)
      .single()

    if (existing) {
      toast.error('This email has already been invited')
      setIsLoading(false)
      return
    }

    // Check client limit
    const { count } = await supabase
      .from('nutritionist_clients')
      .select('*', { count: 'exact', head: true })
      .eq('nutritionist_id', profile.id)
      .in('status', ['active', 'pending'])

    const { data: pkg } = await supabase
      .from('nutritionist_packages')
      .select('max_clients')
      .eq('nutritionist_id', profile.id)
      .single()

    const maxClients = pkg?.max_clients ?? 10
    if ((count ?? 0) >= maxClients) {
      toast.error(`Client limit reached (${maxClients}). Upgrade your package to add more.`)
      setIsLoading(false)
      return
    }

    // Check if user already exists in the system
    const { data: existingUser } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('email', email)
      .single()

    const { error } = await supabase.from('nutritionist_clients').insert({
      nutritionist_id: profile.id,
      client_id: existingUser?.id ?? null,
      status: existingUser ? 'active' : 'pending',
      invited_email: email,
    })

    if (error) {
      toast.error('Failed to invite client')
      setIsLoading(false)
      return
    }

    // If existing user, set their role to nutritionist_client and link nutritionist
    if (existingUser) {
      await supabase
        .from('user_profiles')
        .update({ role: 'nutritionist_client', nutritionist_id: profile.id })
        .eq('id', existingUser.id)
    }

    toast.success(`Invitation sent to ${email}`)
    router.push('/clients')
  }

  return (
    <div className="max-w-lg mx-auto">
      <Link href="/clients" className="flex items-center space-x-2 text-gray-900 hover:text-gray-900 mb-6">
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Clients</span>
      </Link>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">Invite Client</h1>
      <p className="text-gray-800 mb-8">
        Send an invitation to a client&apos;s email. If they already have an account, they&apos;ll be linked automatically.
      </p>

      <form onSubmit={handleInvite} className="card p-6">
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Client Email</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="client@example.com"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50"
        >
          {isLoading ? 'Sending...' : 'Send Invitation'}
        </button>
      </form>
    </div>
  )
}
