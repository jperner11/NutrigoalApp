'use client'

import { useState } from 'react'
import { useUser } from '@/hooks/useUser'
import { Mail, ArrowLeft } from 'lucide-react'
import { toast } from 'react-hot-toast'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { isTrainerRole } from '@treno/shared'
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
      <Link href="/clients" className="flex items-center space-x-2 text-[var(--muted)] hover:text-[var(--foreground)] mb-6">
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Clients</span>
      </Link>

      <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">Invite Client</h1>
      <p className="text-[var(--muted)] mb-8">
        Send a real invite email. The client must accept before they appear as active in your roster.
      </p>

      <form onSubmit={handleInvite} className="card p-6">
        <div className="mb-6">
          <label htmlFor="client-first-name" className="block text-sm font-medium text-[var(--muted)] mb-2">Client First Name</label>
          <input
            id="client-first-name"
            type="text"
            value={clientFirstName}
            onChange={(e) => setClientFirstName(e.target.value)}
            className="w-full px-4 py-3 border border-[var(--line-strong)] rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="Optional"
          />
        </div>
        <div className="mb-6">
          <label htmlFor="client-email" className="block text-sm font-medium text-[var(--muted)] mb-2">Client Email</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-[var(--muted-soft)]" />
            </div>
            <input
              id="client-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-[var(--line-strong)] rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50"
        >
          {isLoading ? 'Sending...' : 'Send Invitation'}
        </button>
      </form>

      {shareUrl && (
        <div className="card p-6 mt-6">
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">Share this link with your client</h3>
          <p className="text-sm text-[var(--muted)] mb-4">
            This client already has an account. Send them the link below so they can accept your invitation.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 px-4 py-2 border border-[var(--line-strong)] rounded-lg bg-[var(--background-elevated)] text-sm text-[var(--muted)]"
            />
            <button
              onClick={handleCopyLink}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
            >
              Copy
            </button>
          </div>
          <Link
            href="/clients"
            className="inline-block mt-4 text-sm text-purple-600 hover:text-purple-700"
          >
            ← Back to Clients
          </Link>
        </div>
      )}
    </div>
  )
}
