import type { ReactNode } from 'react'
import MarketingNav from '@/components/marketing/MarketingNav'
import PublicFooter from '@/components/marketing/PublicFooter'

export default function FindCoachLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <MarketingNav />
      <main>{children}</main>
      <PublicFooter />
    </div>
  )
}
