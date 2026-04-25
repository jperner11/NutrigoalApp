import MarketingNav from '@/components/marketing/MarketingNav'
import MarketingHero from '@/components/marketing/MarketingHero'
import MarketingTicker from '@/components/marketing/MarketingTicker'
import MarketingThreeLanes from '@/components/marketing/MarketingThreeLanes'
import MarketingForCoaches from '@/components/marketing/MarketingForCoaches'
import MarketingHowItWorks from '@/components/marketing/MarketingHowItWorks'
import MarketingPricing from '@/components/marketing/MarketingPricing'
import MarketingFAQ from '@/components/marketing/MarketingFAQ'
import PublicFooter from '@/components/marketing/PublicFooter'

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <MarketingNav />
      <MarketingHero />
      <MarketingTicker />
      <MarketingThreeLanes />
      <MarketingForCoaches />
      <MarketingHowItWorks />
      <MarketingPricing />
      <MarketingFAQ />
      <PublicFooter />
    </div>
  )
}
