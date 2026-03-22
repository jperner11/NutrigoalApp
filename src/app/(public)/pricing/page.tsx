'use client'

import Link from 'next/link'
import { Target, Check, Zap, Crown, Users } from 'lucide-react'
import { PRICING } from '@/lib/constants'

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-2">
              <div className="bg-gradient-to-r from-green-500 to-blue-500 rounded-lg p-2">
                <Target className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                NutriGoal
              </span>
            </Link>
            <div className="flex items-center space-x-4">
              <Link href="/login" className="text-gray-600 hover:text-gray-900 transition-colors">
                Sign In
              </Link>
              <Link href="/signup" className="bg-gradient-to-r from-green-500 to-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:shadow-lg transition-all">
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
            <span className="bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              Pricing
            </span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Choose the plan that fits your needs. Upgrade or downgrade anytime.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid lg:grid-cols-3 gap-8 mb-16">
          {/* Free */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{PRICING.free.name}</h3>
              <div className="text-4xl font-bold text-gray-900 mb-2">$0</div>
              <p className="text-gray-600">Forever free</p>
            </div>
            <ul className="space-y-4 mb-8">
              {PRICING.free.features.map((feature, i) => (
                <li key={i} className="flex items-center space-x-3">
                  <div className="bg-gray-100 rounded-full p-1"><Check className="h-4 w-4 text-gray-600" /></div>
                  <span className="text-gray-700 text-sm">{feature}</span>
                </li>
              ))}
            </ul>
            <Link href="/signup" className="w-full border-2 border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:border-gray-400 transition-all text-center block">
              Get Started Free
            </Link>
          </div>

          {/* Pro */}
          <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-2xl p-8 shadow-lg border-2 border-blue-200 relative">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <div className="bg-gradient-to-r from-green-500 to-blue-500 text-white px-6 py-2 rounded-full text-sm font-semibold">
                Most Popular
              </div>
            </div>
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{PRICING.pro.name}</h3>
              <div className="flex items-center justify-center space-x-1 mb-2">
                <div className="text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                  ${PRICING.pro.price}
                </div>
                <span className="text-gray-600">/month</span>
              </div>
              <p className="text-gray-600">Full features for individuals</p>
            </div>
            <ul className="space-y-4 mb-8">
              {PRICING.pro.features.map((feature, i) => (
                <li key={i} className="flex items-center space-x-3">
                  <div className="bg-gradient-to-r from-green-500 to-blue-500 rounded-full p-1"><Check className="h-4 w-4 text-white" /></div>
                  <span className="text-gray-700 text-sm">{feature}</span>
                </li>
              ))}
            </ul>
            <Link href="/signup" className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white py-3 rounded-lg font-semibold hover:shadow-xl transition-all flex items-center justify-center space-x-2">
              <Zap className="h-5 w-5" />
              <span>Start Pro</span>
            </Link>
          </div>

          {/* Nutritionist */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 shadow-lg border-2 border-purple-200 relative">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-2 rounded-full text-sm font-semibold flex items-center space-x-1">
                <Users className="h-4 w-4" />
                <span>For Pros</span>
              </div>
            </div>
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{PRICING.nutritionist.name}</h3>
              <div className="flex items-center justify-center space-x-1 mb-2">
                <div className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  ${PRICING.nutritionist.price}
                </div>
                <span className="text-gray-600">/month</span>
              </div>
              <p className="text-gray-600">10 clients included</p>
            </div>
            <ul className="space-y-4 mb-8">
              {PRICING.nutritionist.features.map((feature, i) => (
                <li key={i} className="flex items-center space-x-3">
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-full p-1"><Check className="h-4 w-4 text-white" /></div>
                  <span className="text-gray-700 text-sm">{feature}</span>
                </li>
              ))}
            </ul>
            <Link href="/signup" className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-lg font-semibold hover:shadow-xl transition-all flex items-center justify-center space-x-2">
              <Crown className="h-5 w-5" />
              <span>Start Nutritionist</span>
            </Link>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">Common Questions</h2>
          <div className="space-y-4">
            {[
              { q: 'Can I switch plans?', a: 'Yes, you can upgrade or downgrade at any time. Changes take effect on your next billing cycle.' },
              { q: 'How do nutritionist client packages work?', a: 'The base plan includes 10 client slots. Need more? Add extra clients at $3.99/month each.' },
              { q: 'What happens to my data if I downgrade?', a: 'Your data is preserved. Some features may become read-only until you upgrade again.' },
              { q: 'How do AI suggestions work?', a: 'AI suggestions use OpenAI to generate personalized meal ideas based on your macros, preferences, and allergies. Free users get 1 lifetime suggestion, Pro gets 5/month, and Nutritionists get 20/month.' },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-2">{item.q}</h3>
                <p className="text-gray-600 text-sm">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
