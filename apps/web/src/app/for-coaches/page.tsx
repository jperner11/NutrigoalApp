import MarketingNav from '@/components/marketing/MarketingNav'
import MarketingForCoaches from '@/components/marketing/MarketingForCoaches'
import PublicFooter from '@/components/marketing/PublicFooter'

export const metadata = {
  title: 'For coaches · Meal & Motion',
  description:
    'Run your coaching business — intake, plans, check-ins, payments — from one room. Marketplace is opt-in.',
}

export default function ForCoachesPage() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <MarketingNav />
      <MarketingForCoaches />
      <PublicFooter />
    </div>
  )
}
