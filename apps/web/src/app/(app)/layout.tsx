'use client'

import Link from 'next/link'
import { Sparkles, X } from 'lucide-react'
import { useState } from 'react'
import Sidebar from '@/components/ui/Sidebar'
import { useUser } from '@/hooks/useUser'
import BrandLogo from '@/components/brand/BrandLogo'

function TrialBanner({ trialEndsAt }: { trialEndsAt: string }) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  const daysLeft = Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
  if (daysLeft === 0) return null

  return (
    <div className="border-b border-[rgba(230,57,70,0.24)] bg-[linear-gradient(90deg,#221d1f,#5a0f15)] px-4 py-3 text-sm text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div className="hidden lg:block">
          <BrandLogo href="/dashboard" compact light className="pointer-events-none" />
        </div>
        <div className="flex flex-1 items-center justify-center gap-2">
        <Sparkles className="h-4 w-4 flex-shrink-0" />
        <span>
          You&apos;re on a <strong>7-day Pro trial</strong> — {daysLeft} day{daysLeft !== 1 ? 's' : ''} left.{' '}
            <Link href="/pricing" className="font-semibold text-[var(--brand-400)] underline hover:text-white">
            Upgrade to keep access →
          </Link>
        </span>
      </div>
        <button onClick={() => setDismissed(true)} className="flex-shrink-0 rounded p-1 hover:bg-white/10">
        <X className="h-4 w-4" />
      </button>
      </div>
    </div>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, loading, signOut } = useUser()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center app-bg">
        <div className="flex flex-col items-center space-y-4">
          <div className="brand-mark">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--brand-500)] border-t-transparent" />
          </div>
          <p className="text-sm font-semibold text-[var(--muted)]">Loading your workspace...</p>
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
          <div className="app-workspace">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
