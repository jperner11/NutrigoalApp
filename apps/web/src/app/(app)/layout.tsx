'use client'

import Link from 'next/link'
import { Sparkles, X } from 'lucide-react'
import { useState } from 'react'
import Sidebar from '@/components/ui/Sidebar'
import { useUser } from '@/hooks/useUser'

function TrialBanner({ trialEndsAt }: { trialEndsAt: string }) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  const daysLeft = Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
  if (daysLeft === 0) return null

  return (
    <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2.5 flex items-center justify-between gap-4 text-sm">
      <div className="flex items-center gap-2 flex-1 justify-center">
        <Sparkles className="h-4 w-4 flex-shrink-0" />
        <span>
          You&apos;re on a <strong>7-day Pro trial</strong> — {daysLeft} day{daysLeft !== 1 ? 's' : ''} left.{' '}
          <Link href="/pricing" className="underline font-semibold hover:text-purple-200">
            Upgrade to keep access →
          </Link>
        </span>
      </div>
      <button onClick={() => setDismissed(true)} className="flex-shrink-0 p-1 hover:bg-white/20 rounded">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, loading, signOut } = useUser()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center app-bg">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  const showTrial = profile?.trial_ends_at && new Date(profile.trial_ends_at) > new Date()

  return (
    <div className="min-h-screen app-bg">
      <Sidebar
        userRole={profile?.role ?? 'free'}
        userName={profile?.full_name ?? profile?.email ?? 'User'}
        onSignOut={signOut}
      />
      <div className="md:ml-64">
        {showTrial && <TrialBanner trialEndsAt={profile!.trial_ends_at!} />}
        <main className="min-h-screen pt-16 md:pt-0">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
