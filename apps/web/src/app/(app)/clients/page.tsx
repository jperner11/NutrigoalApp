'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { Users, Plus, Mail, UserCheck, Clock } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface ClientRow {
  id: string
  status: string
  invited_email: string | null
  created_at: string
  client: {
    id: string
    full_name: string | null
    email: string
  } | null
}

export default function ClientsPage() {
  const { profile } = useUser()
  const router = useRouter()
  const [clients, setClients] = useState<ClientRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return

    if (profile.role !== 'nutritionist') {
      router.push('/dashboard')
      return
    }

    const supabase = createClient()

    async function loadClients() {
      const { data } = await supabase
        .from('nutritionist_clients')
        .select('id, status, invited_email, created_at, client:client_id(id, full_name, email)')
        .eq('nutritionist_id', profile!.id)
        .order('created_at', { ascending: false })

      setClients((data as unknown as ClientRow[]) ?? [])
      setLoading(false)
    }

    loadClients()
  }, [profile, router])

  if (loading) return <div className="text-gray-500">Loading clients...</div>

  const activeClients = clients.filter(c => c.status === 'active')
  const pendingClients = clients.filter(c => c.status === 'pending')

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Clients</h1>
          <p className="text-gray-900 mt-1">
            {activeClients.length} active · {pendingClients.length} pending
          </p>
        </div>
        <Link
          href="/clients/invite"
          className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:shadow-lg transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>Invite Client</span>
        </Link>
      </div>

      {clients.length === 0 ? (
        <div className="card p-12 text-center">
          <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No clients yet</h3>
          <p className="text-gray-500 mb-6">Invite your first client to start managing their nutrition and training.</p>
          <Link
            href="/clients/invite"
            className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all"
          >
            <Mail className="h-5 w-5" />
            <span>Invite Client</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {clients.map((row) => (
            <Link
              key={row.id}
              href={row.client ? `/clients/${row.client.id}` : '#'}
              className="card p-5 flex items-center justify-between hover:shadow-md transition-shadow block"
            >
              <div className="flex items-center space-x-4">
                <div className={`rounded-full p-2 ${row.status === 'active' ? 'bg-purple-100' : 'bg-yellow-100'}`}>
                  {row.status === 'active' ? (
                    <UserCheck className="h-5 w-5 text-purple-600" />
                  ) : (
                    <Clock className="h-5 w-5 text-yellow-600" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {row.client?.full_name ?? row.invited_email ?? 'Unknown'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {row.client?.email ?? row.invited_email}
                  </p>
                </div>
              </div>
              <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                row.status === 'active'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}>
                {row.status}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
