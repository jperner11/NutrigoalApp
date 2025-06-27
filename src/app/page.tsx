import Link from 'next/link'
import { ArrowRight, Target, Zap, Brain, Heart } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="bg-gradient-to-r from-green-500 to-blue-500 rounded-lg p-2">
                <Target className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                NutriGoal
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                href="/login" 
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Sign In
              </Link>
              <Link 
                href="/onboarding" 
                className="bg-gradient-to-r from-green-500 to-blue-500 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all duration-200 flex items-center space-x-2"
              >
                <span>Get Started</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6">
              Your{' '}
              <span className="bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                Personalized
              </span>
              <br />
              Nutrition Journey
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              Built for everyday people who want to eat smart, feel better, and stay on track. 
              Get AI-powered meal plans tailored to your goals—whether you're building muscle, 
              losing weight, or maintaining your ideal lifestyle.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <Link 
                href="/onboarding"
                className="bg-gradient-to-r from-green-500 to-blue-500 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:shadow-xl transition-all duration-300 flex items-center space-x-2 group"
              >
                <span>Start Your Journey</span>
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              
              <button className="border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-xl text-lg font-semibold hover:border-gray-400 hover:shadow-md transition-all duration-200">
                Watch Demo
              </button>
            </div>

            {/* Trust Indicators */}
            <div className="text-sm text-gray-500 mb-16">
              <p>🔒 Your data is secure • 🎯 Science-based calculations • 🤖 AI-powered recommendations</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Reach Your Goals
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              From calculating your daily needs to generating personalized meal plans—we've got you covered.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow border border-gray-100">
              <div className="bg-green-100 rounded-full p-3 w-fit mb-4">
                <Target className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-3">Smart Goal Calculator</h3>
              <p className="text-gray-600 leading-relaxed">
                Get your personalized daily calorie and macro targets based on your age, activity level, 
                and fitness goals using scientifically-proven formulas.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow border border-gray-100">
              <div className="bg-blue-100 rounded-full p-3 w-fit mb-4">
                <Brain className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-3">AI Meal Planning</h3>
              <p className="text-gray-600 leading-relaxed">
                Receive personalized meal plans that respect your dietary preferences, allergies, 
                and nutritional goals—powered by advanced AI technology.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow border border-gray-100">
              <div className="bg-purple-100 rounded-full p-3 w-fit mb-4">
                <Heart className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-3">Holistic Wellness</h3>
              <p className="text-gray-600 leading-relaxed">
                Track your hydration, monitor your progress, and get gentle reminders to stay on track 
                with your health and nutrition goals.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Ready to Transform Your Nutrition?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join thousands of people who've made nutrition simple and effective with NutriGoal.
          </p>
          
          <Link 
            href="/onboarding"
            className="inline-flex items-center space-x-3 bg-gradient-to-r from-green-500 to-blue-500 text-white px-10 py-5 rounded-xl text-xl font-semibold hover:shadow-xl transition-all duration-300 group"
          >
            <Zap className="h-6 w-6" />
            <span>Start Free Today</span>
            <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
          </Link>
          
          <p className="text-sm text-gray-500 mt-4">
            No credit card required • 7-day free trial of premium features
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="bg-gradient-to-r from-green-500 to-blue-500 rounded-lg p-2">
                <Target className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold">NutriGoal</span>
            </div>
            <p className="text-gray-400 mb-4">
              Your personalized diet and hydration planner
            </p>
            <p className="text-sm text-gray-500">
              © 2024 NutriGoal. Built with ❤️ for better nutrition.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
