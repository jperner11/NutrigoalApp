'use client'

import Sidebar from '@/components/ui/Sidebar'
import { useUser } from '@/hooks/useUser'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, loading, signOut } = useUser()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar
        userRole={profile?.role ?? 'free'}
        userName={profile?.full_name ?? profile?.email ?? 'User'}
        onSignOut={signOut}
      />
      <main className="ml-64 min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
