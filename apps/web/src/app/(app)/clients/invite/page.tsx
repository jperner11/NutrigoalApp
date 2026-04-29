'use client'

import { useState } from 'react'
import { useUser } from '@/hooks/useUser'
import { Mail, ArrowLeft } from 'lucide-react'
import { toast } from 'react-hot-toast'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { isTrainerRole } from '@nutrigoal/shared'
import { apiFetch, ApiError } from '@/lib/apiClient'

type InviteResponse = {
  invite?: { share_url?: string; delivery_method?: string }
  message?: string
}

export default function InviteClientPage() {
  const { profile } = useUser()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [clientFirstName, setClientFirstName] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const [shareUrl, setShareUrl] = useState<string | null>(null)

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile || !email) return

    setIsLoading(true)
    try {
      const payload = await apiFetch<InviteResponse>('/api/personal-trainer/invites', {
        method: 'POST',
        body: {
          email: email.trim().toLowerCase(),
          clientFirstName: clientFirstName.trim(),
        },
        context: { feature: 'clients', action: 'create-invite' },
      })

      if (payload?.invite?.share_url && payload?.invite?.delivery_method === 'magiclink') {
        setShareUrl(payload.invite.share_url)
        toast.success('Invite created! Share the link below with your client.')
      } else {
        toast.success(payload?.message ?? `Invite sent to ${email}`)
        router.push('/clients')
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to invite client')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyLink = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl)
      toast.success('Link copied!')
    }
  }

  if (profile && !isTrainerRole(profile.role)) {
    return null
  }

  return (
    <div className="max-w-lg mx-auto">
      <Link href="/clients" className="flex items-center space-x-2 text-gray-900 hover:text-gray-900 mb-6">
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Clients</span>
      </Link>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">Invite Client</h1>
      <p className="text-gray-800 mb-8">
        Send a real invite email. The client must accept before they appear as active in your roster.
      </p>

      <form onSubmit={handleInvite} className="card p-6">
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Client First Name</label>
          <input
            type="text"
            value={clientFirstName}
            onChange={(e) => setClientFirstName(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            placeholder="Optional"
          />
        </div>
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

        <div className="mb-6 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm leading-6 text-slate-700">
          We&apos;ll send a secure invite link. Existing members receive a join request and new clients will be asked to create their account before accepting.
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-sky-500 to-blue-600 text-white py-3 rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50"
        >
          {isLoading ? 'Sending...' : 'Send Invitation'}
        </button>
      </form>

      {shareUrl && (
        <div className="card p-6 mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Share this link with your client</h3>
          <p className="text-sm text-gray-600 mb-4">
            This client already has an account. Send them the link below so they can accept your invitation.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-700"
            />
            <button
              onClick={handleCopyLink}
              className="px-4 py-2 bg-sky-500 text-white rounded-lg text-sm font-medium hover:bg-sky-600 transition-colors"
            >
              Copy
            </button>
          </div>
          <Link
            href="/clients"
            className="inline-block mt-4 text-sm text-sky-600 hover:text-sky-700"
          >
            ← Back to Clients
          </Link>
        </div>
      )}
    </div>
  )
}
