import MarketingNav from '@/components/marketing/MarketingNav'
import MarketingHowItWorks from '@/components/marketing/MarketingHowItWorks'
import PublicFooter from '@/components/marketing/PublicFooter'

export const metadata = {
  title: 'How it works · Meal & Motion',
  description:
    'Four steps, honest ones. How Meal & Motion works for clients and for coaches.',
}

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <MarketingNav />
      <MarketingHowItWorks />
      <PublicFooter />
    </div>
  )
}
