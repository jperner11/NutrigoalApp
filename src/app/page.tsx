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
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg p-2">
                <Target className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                NutriGoal
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/pricing" className="text-gray-900 hover:text-gray-900 transition-colors">
                Pricing
              </Link>
              <Link href="/login" className="text-gray-900 hover:text-gray-900 transition-colors">
                Sign In
              </Link>
              <Link
                href="/signup"
                className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-5 py-2.5 rounded-lg hover:shadow-lg hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all duration-300 flex items-center space-x-2"
              >
                <span>Get Started</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,80,255,0.3),rgba(255,255,255,0))]">
        {/* Secondary gradient layer */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_80%_60%,rgba(139,92,246,0.1),rgba(255,255,255,0))]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_40%_at_20%_80%,rgba(99,102,241,0.08),rgba(255,255,255,0))]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20">
          <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6">
              Your Complete{' '}
              <span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent bg-[length:200%] animate-[gradient_3s_linear_infinite]">
                Wellness
              </span>
              <br />
              Platform
            </h1>

            <p className="text-xl text-gray-800 mb-10 max-w-3xl mx-auto leading-relaxed">
              Diet planning, workout building, cardio tracking, and hydration monitoring&mdash;all in one place.
              For individuals pursuing their goals and nutritionists managing their clients.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Link
                href="/signup"
                className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-10 py-5 rounded-xl text-lg font-semibold hover:shadow-xl hover:shadow-[0_0_30px_rgba(139,92,246,0.3)] transition-all duration-300 flex items-center space-x-2 group"
              >
                <span>Start Free</span>
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/pricing"
                className="border-2 border-gray-300 text-gray-700 px-10 py-5 rounded-xl text-lg font-semibold hover:border-purple-300 hover:shadow-md hover:shadow-purple-100 transition-all duration-300"
              >
                View Plans
              </Link>
            </div>

            {/* Social Proof */}
            <div className="flex flex-col items-center gap-4 mb-12">
              <div className="flex -space-x-3">
                {[
                  { initials: 'JR', bg: 'bg-purple-500' },
                  { initials: 'AM', bg: 'bg-indigo-500' },
                  { initials: 'KT', bg: 'bg-violet-500' },
                  { initials: 'LS', bg: 'bg-fuchsia-500' },
                  { initials: 'DP', bg: 'bg-purple-600' },
                ].map((avatar, i) => (
                  <div
                    key={i}
                    className={`${avatar.bg} w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow-sm`}
                  >
                    {avatar.initials}
                  </div>
                ))}
                <div className="bg-gray-100 w-10 h-10 rounded-full flex items-center justify-center text-gray-500 text-xs font-bold border-2 border-white shadow-sm">
                  +
                </div>
              </div>
              <p className="text-sm text-gray-500 font-medium">
                Join <span className="text-purple-600 font-semibold">1,000+</span> users tracking their fitness journey
              </p>
            </div>

            <div className="text-sm text-gray-500">
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
            <p className="text-xl text-gray-800 max-w-2xl mx-auto">
              From nutrition to training, cardio to hydration&mdash;track every aspect of your wellness journey.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-gray-100">
              <div className="bg-orange-100 rounded-full p-3 w-fit mb-4">
                <Target className="h-7 w-7 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Diet Planning</h3>
              <p className="text-gray-800 text-sm">
                Create meal plans with real food data from Spoonacular. Track macros automatically.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-gray-100">
              <div className="bg-purple-100 rounded-full p-3 w-fit mb-4">
                <Dumbbell className="h-7 w-7 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Workout Builder</h3>
              <p className="text-gray-800 text-sm">
                Choose from a library of exercises. Build custom training plans with sets, reps, and rest.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-gray-100">
              <div className="bg-red-100 rounded-full p-3 w-fit mb-4">
                <HeartPulse className="h-7 w-7 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Cardio Tracking</h3>
              <p className="text-gray-800 text-sm">
                Log cardio sessions with heart rate. Calories burned calculated using proven formulas.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-gray-100">
              <div className="bg-cyan-100 rounded-full p-3 w-fit mb-4">
                <Droplets className="h-7 w-7 text-cyan-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Water Tracking</h3>
              <p className="text-gray-800 text-sm">
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
              <p className="text-lg text-gray-800 mb-8">
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
                    <div className="bg-purple-600 rounded-full p-0.5">
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
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-xl hover:shadow-[0_0_30px_rgba(139,92,246,0.3)] transition-all duration-300"
              >
                <span>Start as Nutritionist</span>
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 border border-purple-100">
              <div className="space-y-4">
                {['Sarah M.', 'David J.', 'Lisa K.'].map((name, i) => (
                  <div key={i} className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="bg-gray-200 rounded-full w-10 h-10 flex items-center justify-center">
                        <span className="text-sm font-bold text-gray-900">{name.split(' ').map(n => n[0]).join('')}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{name}</p>
                        <p className="text-xs text-gray-500">{['Cutting', 'Bulking', 'Maintenance'][i]}</p>
                      </div>
                    </div>
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">Active</span>
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
          <p className="text-lg text-gray-800 mb-8 max-w-2xl mx-auto">
            Get personalized meal ideas based on your macros, dietary preferences, and allergies.
            Powered by AI, tailored to your goals.
          </p>
          <div className="flex justify-center gap-8 text-sm text-gray-500">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">1</div>
              <div>Free suggestion</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">5/mo</div>
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
      <section className="py-24 relative overflow-hidden bg-[radial-gradient(ellipse_80%_60%_at_50%_120%,rgba(120,80,255,0.15),rgba(255,255,255,0))]">
        <div className="relative max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Ready to Transform Your Wellness?
          </h2>
          <p className="text-xl text-gray-800 mb-10">
            Join NutriGoal today&mdash;whether you&apos;re training solo or managing a roster of clients.
          </p>

          <Link
            href="/signup"
            className="inline-flex items-center space-x-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-12 py-6 rounded-xl text-xl font-semibold hover:shadow-xl hover:shadow-[0_0_30px_rgba(139,92,246,0.3)] transition-all duration-300 group"
          >
            <Zap className="h-6 w-6" />
            <span>Get Started Free</span>
            <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
          </Link>

          <p className="text-sm text-gray-500 mt-6">
            No credit card required &bull; Free plan available forever
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg p-2">
                <Target className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold">NutriGoal</span>
            </div>
            <p className="text-gray-400 mb-6">
              Your complete nutrition, training &amp; wellness platform
            </p>
            <div className="flex justify-center space-x-6 text-sm text-gray-500 mb-6">
              <Link href="/pricing" className="hover:text-gray-300 transition-colors">Pricing</Link>
              <Link href="/login" className="hover:text-gray-300 transition-colors">Sign In</Link>
              <Link href="/signup" className="hover:text-gray-300 transition-colors">Sign Up</Link>
            </div>
            <div className="border-t border-gray-800 pt-6">
              <p className="text-sm text-gray-500">
                &copy; 2025 NutriGoal. Built for better wellness.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
