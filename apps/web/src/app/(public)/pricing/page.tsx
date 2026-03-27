'use client'

import Link from 'next/link'
import { Target, Check, Zap, Crown, Users, Sparkles } from 'lucide-react'
import { PRICING } from '@/lib/constants'

const tiers = [
  {
    key: 'free' as const,
    subtitle: 'Forever free',
    highlight: false,
    badge: null,
    gradientFrom: 'from-gray-100',
    checkClass: 'bg-gray-100 text-gray-900',
    btnClass: 'border-2 border-gray-300 text-gray-700 hover:border-gray-400',
    btnIcon: null,
    btnLabel: 'Get Started Free',
  },
  {
    key: 'pro' as const,
    subtitle: 'For committed athletes',
    highlight: true,
    badge: 'Most Popular',
    gradientFrom: 'from-indigo-50 to-purple-50',
    checkClass: 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white',
    btnClass: 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-xl',
    btnIcon: <Zap className="h-5 w-5" />,
    btnLabel: 'Start Pro',
  },
  {
    key: 'unlimited' as const,
    subtitle: 'No limits',
    highlight: false,
    badge: 'Best Value',
    gradientFrom: 'from-emerald-50 to-cyan-50',
    checkClass: 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white',
    btnClass: 'bg-gradient-to-r from-emerald-500 to-cyan-600 text-white hover:shadow-xl',
    btnIcon: <Sparkles className="h-5 w-5" />,
    btnLabel: 'Go Unlimited',
  },
  {
    key: 'nutritionist' as const,
    subtitle: '10 clients included',
    highlight: false,
    badge: 'For Professionals',
    gradientFrom: 'from-purple-50 to-pink-50',
    checkClass: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
    btnClass: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-xl',
    btnIcon: <Crown className="h-5 w-5" />,
    btnLabel: 'Start Nutritionist',
  },
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-slate-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-2">
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg p-2">
                <Target className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                NutriGoal
              </span>
            </Link>
            <div className="flex items-center space-x-4">
              <Link href="/login" className="text-gray-900 hover:text-gray-900 transition-colors">
                Sign In
              </Link>
              <Link href="/signup" className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:shadow-lg transition-all">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Simple, Transparent{' '}
            <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Pricing
            </span>
          </h1>
          <p className="text-xl text-gray-800 max-w-2xl mx-auto">
            Start free, upgrade when you&apos;re ready. No hidden fees.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid lg:grid-cols-4 gap-6 mb-16">
          {tiers.map((tier) => {
            const plan = PRICING[tier.key]
            return (
              <div
                key={tier.key}
                className={`bg-gradient-to-br ${tier.gradientFrom} rounded-2xl p-7 shadow-sm border ${
                  tier.highlight ? 'border-2 border-indigo-200 shadow-lg' : 'border-gray-200'
                } relative`}
              >
                {tier.badge && (
                  <div className="absolute -top-3.5 left-1/2 transform -translate-x-1/2">
                    <div className={`${tier.highlight ? 'bg-gradient-to-r from-purple-600 to-indigo-600' : 'bg-gray-700'} text-white px-4 py-1.5 rounded-full text-xs font-semibold flex items-center space-x-1`}>
                      {tier.key === 'nutritionist' && <Users className="h-3 w-3" />}
                      <span>{tier.badge}</span>
                    </div>
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{plan.name}</h3>
                  <div className="flex items-center justify-center space-x-1 mb-1">
                    <div className={`text-3xl font-bold ${tier.highlight ? 'bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent' : 'text-gray-900'}`}>
                      ${plan.price}
                    </div>
                    {plan.price > 0 && <span className="text-gray-600 text-sm">/mo</span>}
                  </div>
                  <p className="text-gray-600 text-sm">{tier.subtitle}</p>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature: string, i: number) => (
                    <li key={i} className="flex items-start space-x-2.5">
                      <div className={`${tier.checkClass} rounded-full p-0.5 mt-0.5 flex-shrink-0`}>
                        <Check className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-gray-700 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/signup"
                  className={`w-full ${tier.btnClass} py-3 rounded-lg font-semibold transition-all flex items-center justify-center space-x-2 text-center block`}
                >
                  {tier.btnIcon}
                  <span>{tier.btnLabel}</span>
                </Link>
              </div>
            )
          })}
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">Common Questions</h2>
          <div className="space-y-4">
            {[
              { q: 'Can I switch plans?', a: 'Yes, you can upgrade or downgrade at any time. Changes take effect on your next billing cycle.' },
              { q: 'What does the free plan include?', a: 'You get a full AI-generated meal plan and training plan at signup. You can view 1 meal and 1 training day of your choice. Water tracking and weight logging are fully available.' },
              { q: 'How does plan regeneration work?', a: 'Pro users can regenerate their meal and training plans once per week (rolling 7-day window). Unlimited users can regenerate anytime.' },
              { q: 'How do nutritionist client packages work?', a: 'The base plan includes 10 client slots. Need more? Add extra clients at $3.99/month each.' },
              { q: 'What happens to my data if I downgrade?', a: 'Your data is preserved. Some features may become read-only until you upgrade again.' },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-2">{item.q}</h3>
                <p className="text-gray-800 text-sm">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
