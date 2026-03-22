import Link from 'next/link'
import { ArrowRight, Target, Zap, Brain, Dumbbell, Users, Droplets, HeartPulse } from 'lucide-react'

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
              <Link href="/pricing" className="text-gray-600 hover:text-gray-900 transition-colors">
                Pricing
              </Link>
              <Link href="/login" className="text-gray-600 hover:text-gray-900 transition-colors">
                Sign In
              </Link>
              <Link
                href="/signup"
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
              Your Complete{' '}
              <span className="bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                Wellness
              </span>
              <br />
              Platform
            </h1>

            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              Diet planning, workout building, cardio tracking, and hydration monitoring&mdash;all in one place.
              For individuals pursuing their goals and nutritionists managing their clients.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <Link
                href="/signup"
                className="bg-gradient-to-r from-green-500 to-blue-500 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:shadow-xl transition-all duration-300 flex items-center space-x-2 group"
              >
                <span>Start Free</span>
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/pricing"
                className="border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-xl text-lg font-semibold hover:border-gray-400 hover:shadow-md transition-all duration-200"
              >
                View Plans
              </Link>
            </div>

            <div className="text-sm text-gray-500 mb-16">
              <p>For individuals &amp; nutritionists &bull; AI-powered suggestions &bull; Science-based calculations</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Everything You Need in One Platform
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              From nutrition to training, cardio to hydration&mdash;track every aspect of your wellness journey.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100">
              <div className="bg-orange-100 rounded-full p-3 w-fit mb-4">
                <Target className="h-7 w-7 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Diet Planning</h3>
              <p className="text-gray-600 text-sm">
                Create meal plans with real food data from Spoonacular. Track macros automatically.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100">
              <div className="bg-green-100 rounded-full p-3 w-fit mb-4">
                <Dumbbell className="h-7 w-7 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Workout Builder</h3>
              <p className="text-gray-600 text-sm">
                Choose from a library of exercises. Build custom training plans with sets, reps, and rest.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100">
              <div className="bg-red-100 rounded-full p-3 w-fit mb-4">
                <HeartPulse className="h-7 w-7 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Cardio Tracking</h3>
              <p className="text-gray-600 text-sm">
                Log cardio sessions with heart rate. Calories burned calculated using proven formulas.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100">
              <div className="bg-cyan-100 rounded-full p-3 w-fit mb-4">
                <Droplets className="h-7 w-7 text-cyan-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Water Tracking</h3>
              <p className="text-gray-600 text-sm">
                Monitor daily hydration with quick-add buttons and progress tracking.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* For Nutritionists */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center space-x-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Users className="h-4 w-4" />
                <span>For Nutritionists</span>
              </div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Manage Your Clients with Ease
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Create personalized diet plans, training programs, and cardio prescriptions for your clients.
                Monitor their progress and keep them on track&mdash;all from one dashboard.
              </p>
              <ul className="space-y-4 mb-8">
                {[
                  'Invite and manage up to 10+ clients',
                  'Create diet and training plans for each client',
                  'Monitor water intake, cardio, and workouts',
                  'AI-powered suggestions (20/month)',
                  'Client self-service logging',
                ].map((item, i) => (
                  <li key={i} className="flex items-center space-x-3">
                    <div className="bg-green-500 rounded-full p-0.5">
                      <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-xl transition-all duration-300"
              >
                <span>Start as Nutritionist</span>
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 border border-purple-100">
              <div className="space-y-4">
                {['Sarah M.', 'David J.', 'Lisa K.'].map((name, i) => (
                  <div key={i} className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="bg-gray-200 rounded-full w-10 h-10 flex items-center justify-center">
                        <span className="text-sm font-bold text-gray-600">{name.split(' ').map(n => n[0]).join('')}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{name}</p>
                        <p className="text-xs text-gray-500">{['Cutting', 'Bulking', 'Maintenance'][i]}</p>
                      </div>
                    </div>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Active</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Section */}
      <section className="py-20 bg-white/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <div className="bg-purple-100 rounded-full p-4 w-fit mx-auto mb-6">
            <Brain className="h-10 w-10 text-purple-600" />
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            AI-Powered Meal Suggestions
          </h2>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Get personalized meal ideas based on your macros, dietary preferences, and allergies.
            Powered by AI, tailored to your goals.
          </p>
          <div className="flex justify-center gap-8 text-sm text-gray-500">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">1</div>
              <div>Free suggestion</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">5/mo</div>
              <div>Pro plan</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">20/mo</div>
              <div>Nutritionist</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Ready to Transform Your Wellness?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join NutriGoal today&mdash;whether you&apos;re training solo or managing a roster of clients.
          </p>

          <Link
            href="/signup"
            className="inline-flex items-center space-x-3 bg-gradient-to-r from-green-500 to-blue-500 text-white px-10 py-5 rounded-xl text-xl font-semibold hover:shadow-xl transition-all duration-300 group"
          >
            <Zap className="h-6 w-6" />
            <span>Get Started Free</span>
            <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
          </Link>

          <p className="text-sm text-gray-500 mt-4">
            No credit card required &bull; Free plan available forever
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
              Your complete nutrition, training &amp; wellness platform
            </p>
            <div className="flex justify-center space-x-6 text-sm text-gray-500 mb-4">
              <Link href="/pricing" className="hover:text-gray-300">Pricing</Link>
              <Link href="/login" className="hover:text-gray-300">Sign In</Link>
              <Link href="/signup" className="hover:text-gray-300">Sign Up</Link>
            </div>
            <p className="text-sm text-gray-500">
              &copy; 2024 NutriGoal. Built for better wellness.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
