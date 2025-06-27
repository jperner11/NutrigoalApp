'use client'

import React from 'react'
import Link from 'next/link'
import { Target, Check, Zap, Calendar, Brain, Utensils, ShoppingCart, TrendingUp, Crown } from 'lucide-react'

const features = {
  free: [
    'Basic goal calculator',
    '1-day meal plan',
    'Daily calorie & water tracking',
    'Basic progress overview',
    'Email support'
  ],
  premium: [
    'Advanced goal calculator',
    '7-day & 30-day meal plans',
    'AI nutrition assistant',
    'Smart grocery lists',
    'Meal alternatives & swaps',
    'Advanced progress analytics',
    'Habit & hydration reminders',
    'Priority support',
    'Export meal plans & recipes',
    'Unlimited plan regeneration'
  ]
}

export default function PremiumPage() {
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
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900 transition-colors">
                Dashboard
              </Link>
              <Link href="/login" className="text-gray-600 hover:text-gray-900 transition-colors">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-full p-4 w-fit mx-auto mb-6">
            <Crown className="h-12 w-12 text-white" />
          </div>
          
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Unlock Your Full{' '}
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Nutrition Potential
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            Take your nutrition journey to the next level with AI-powered meal planning, 
            advanced analytics, and personalized recommendations that adapt to your lifestyle.
          </p>

          <div className="bg-gradient-to-r from-green-500 to-blue-500 text-white px-6 py-3 rounded-full text-lg font-semibold inline-block mb-8">
            🎉 7-Day Free Trial • No Credit Card Required
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid lg:grid-cols-2 gap-8 mb-16">
          {/* Free Plan */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Free Plan</h3>
              <div className="text-4xl font-bold text-gray-900 mb-2">$0</div>
              <p className="text-gray-600">Perfect for getting started</p>
            </div>

            <ul className="space-y-4 mb-8">
              {features.free.map((feature, index) => (
                <li key={index} className="flex items-center space-x-3">
                  <div className="bg-gray-100 rounded-full p-1">
                    <Check className="h-4 w-4 text-gray-600" />
                  </div>
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/onboarding"
              className="w-full border-2 border-gray-300 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:border-gray-400 hover:shadow-md transition-all duration-200 text-center block"
            >
              Get Started Free
            </Link>
          </div>

          {/* Premium Plan */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 shadow-lg border-2 border-purple-200 relative">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-2 rounded-full text-sm font-semibold">
                Most Popular
              </div>
            </div>

            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Premium Plan</h3>
              <div className="flex items-center justify-center space-x-2 mb-2">
                <span className="text-lg text-gray-500 line-through">$19.99</span>
                <div className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  $12.99
                </div>
                <span className="text-gray-600">/month</span>
              </div>
              <p className="text-gray-600">Complete nutrition solution</p>
            </div>

            <ul className="space-y-4 mb-8">
              {features.premium.map((feature, index) => (
                <li key={index} className="flex items-center space-x-3">
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-full p-1">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>

            <button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-6 rounded-lg font-semibold hover:shadow-xl transition-all duration-300 flex items-center justify-center space-x-2">
              <Zap className="h-5 w-5" />
              <span>Start 7-Day Free Trial</span>
            </button>
            
            <p className="text-center text-sm text-gray-500 mt-4">
              Cancel anytime • No hidden fees
            </p>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Why Upgrade to Premium?
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full p-4 w-fit mx-auto mb-4">
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">7-Day Meal Plans</h3>
              <p className="text-gray-600 text-sm">
                Get complete weekly meal plans with grocery lists and prep instructions
              </p>
            </div>

            <div className="text-center">
              <div className="bg-purple-100 rounded-full p-4 w-fit mx-auto mb-4">
                <Brain className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Assistant</h3>
              <p className="text-gray-600 text-sm">
                Chat with your personal nutrition AI for instant meal suggestions and advice
              </p>
            </div>

            <div className="text-center">
              <div className="bg-green-100 rounded-full p-4 w-fit mx-auto mb-4">
                <ShoppingCart className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Smart Grocery Lists</h3>
              <p className="text-gray-600 text-sm">
                Automatically generated shopping lists organized by store section
              </p>
            </div>

            <div className="text-center">
              <div className="bg-orange-100 rounded-full p-4 w-fit mx-auto mb-4">
                <TrendingUp className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Advanced Analytics</h3>
              <p className="text-gray-600 text-sm">
                Detailed progress tracking with insights and personalized recommendations
              </p>
            </div>
          </div>
        </div>

        {/* Testimonials */}
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-200 mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">
            What Our Premium Users Say
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-gray-200 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <span className="text-xl font-bold text-gray-600">SM</span>
              </div>
              <p className="text-gray-600 italic mb-4">
                "The 7-day meal plans have completely transformed how I approach nutrition. 
                I save so much time planning and shopping!"
              </p>
              <p className="font-semibold text-gray-900">Sarah M.</p>
              <p className="text-sm text-gray-500">Lost 15lbs in 3 months</p>
            </div>

            <div className="text-center">
              <div className="bg-gray-200 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <span className="text-xl font-bold text-gray-600">DJ</span>
              </div>
              <p className="text-gray-600 italic mb-4">
                "The AI assistant is like having a personal nutritionist. It answers all my 
                questions and helps me make better food choices."
              </p>
              <p className="font-semibold text-gray-900">David J.</p>
              <p className="text-sm text-gray-500">Gained 8lbs of muscle</p>
            </div>

            <div className="text-center">
              <div className="bg-gray-200 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <span className="text-xl font-bold text-gray-600">LK</span>
              </div>
              <p className="text-gray-600 italic mb-4">
                "The progress analytics keep me motivated. Seeing my improvements over time 
                makes it so much easier to stay consistent."
              </p>
              <p className="font-semibold text-gray-900">Lisa K.</p>
              <p className="text-sm text-gray-500">Maintaining for 6 months</p>
            </div>
          </div>
        </div>

        {/* Final CTA */}
        <div className="text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Ready to Transform Your Nutrition?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join thousands of people achieving their health goals with NutriGoal Premium
          </p>
          
          <button className="inline-flex items-center space-x-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-10 py-5 rounded-xl text-xl font-semibold hover:shadow-xl transition-all duration-300">
            <Zap className="h-6 w-6" />
            <span>Start Your Free Trial</span>
          </button>
          
          <p className="text-sm text-gray-500 mt-4">
            7-day free trial • No credit card required • Cancel anytime
          </p>
        </div>
      </div>
    </div>
  )
} 