'use client'

import React, { useState } from 'react'
import { ArrowRight, ArrowLeft, Target, User, Activity, Calculator } from 'lucide-react'
import { calculateNutritionTargets, getActivityLevelName, getGoalName } from '@/lib/nutrition'
import type { UserMetrics } from '@/lib/nutrition'
import Link from 'next/link'

interface FormData extends UserMetrics {
  email: string
  dietaryPreferences: string[]
  allergies: string[]
}

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<FormData>({
    email: '',
    age: 0,
    height: 0,
    weight: 0,
    gender: 'male',
    activityLevel: 'moderately_active',
    goal: 'maintenance',
    dietaryPreferences: [],
    allergies: []
  })
  const [nutritionTargets, setNutritionTargets] = useState<{calories: number, protein: number, fat: number, carbs: number, water: number} | null>(null)

  const totalSteps = 5

  const handleNext = () => {
    if (step === 4) {
      // Calculate nutrition targets before going to results
      const targets = calculateNutritionTargets(formData)
      setNutritionTargets(targets)
    }
    setStep(step + 1)
  }

  const handleBack = () => setStep(step - 1)

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <User className="h-16 w-16 text-blue-500 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Let&apos;s Get to Know You</h2>
              <p className="text-gray-600">We&apos;ll use this information to calculate your personalized nutrition goals</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="your.email@example.com"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Age</label>
                  <input
                    type="number"
                    value={formData.age || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, age: parseInt(e.target.value) }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="25"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value as 'male' | 'female' }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Height (cm)</label>
                  <input
                    type="number"
                    value={formData.height || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, height: parseInt(e.target.value) }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="175"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Weight (kg)</label>
                  <input
                    type="number"
                    value={formData.weight || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, weight: parseInt(e.target.value) }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="70"
                  />
                </div>
              </div>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <Activity className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Your Activity Level</h2>
              <p className="text-gray-600">How active are you in a typical week?</p>
            </div>

            <div className="space-y-3">
              {[
                { value: 'sedentary', label: 'Sedentary', desc: 'Little to no exercise, desk job' },
                { value: 'lightly_active', label: 'Lightly Active', desc: 'Light exercise 1-3 days per week' },
                { value: 'moderately_active', label: 'Moderately Active', desc: 'Moderate exercise 3-5 days per week' },
                { value: 'very_active', label: 'Very Active', desc: 'Hard exercise 6-7 days per week' },
                { value: 'extremely_active', label: 'Extremely Active', desc: 'Very hard exercise, physical job' }
              ].map((option) => (
                <div
                  key={option.value}
                  onClick={() => setFormData(prev => ({ ...prev, activityLevel: option.value as 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extremely_active' }))}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    formData.activityLevel === option.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{option.label}</h3>
                      <p className="text-sm text-gray-600">{option.desc}</p>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      formData.activityLevel === option.value
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300'
                    }`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <Target className="h-16 w-16 text-purple-500 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Your Fitness Goal</h2>
              <p className="text-gray-600">What do you want to achieve?</p>
            </div>

            <div className="space-y-3">
              {[
                { value: 'cutting', label: 'Lose Weight', desc: 'Reduce body fat and get leaner', color: 'red' },
                { value: 'maintenance', label: 'Maintain Weight', desc: 'Stay at current weight and improve health', color: 'blue' },
                { value: 'bulking', label: 'Build Muscle', desc: 'Gain muscle mass and strength', color: 'green' }
              ].map((option) => (
                <div
                  key={option.value}
                  onClick={() => setFormData(prev => ({ ...prev, goal: option.value as 'bulking' | 'cutting' | 'maintenance' }))}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    formData.goal === option.value
                      ? `border-${option.color}-500 bg-${option.color}-50`
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{option.label}</h3>
                      <p className="text-sm text-gray-600">{option.desc}</p>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      formData.goal === option.value
                        ? `border-${option.color}-500 bg-${option.color}-500`
                        : 'border-gray-300'
                    }`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <Calculator className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Your Personalized Plan</h2>
              <p className="text-gray-600">Here are your daily nutrition targets based on your goals</p>
            </div>

            {nutritionTargets && (
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl">
                    <h3 className="text-lg font-semibold text-blue-900 mb-2">Daily Calories</h3>
                    <div className="text-3xl font-bold text-blue-700">{nutritionTargets.calories}</div>
                    <p className="text-sm text-blue-600">calories per day</p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl">
                    <h3 className="text-lg font-semibold text-purple-900 mb-2">Daily Water</h3>
                    <div className="text-3xl font-bold text-purple-700">{nutritionTargets.water}ml</div>
                    <p className="text-sm text-purple-600">water per day</p>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Macronutrient Breakdown</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{nutritionTargets.protein}g</div>
                      <div className="text-sm text-gray-600">Protein</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">{nutritionTargets.carbs}g</div>
                      <div className="text-sm text-gray-600">Carbs</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{nutritionTargets.fat}g</div>
                      <div className="text-sm text-gray-600">Fat</div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-6 rounded-xl">
                  <h3 className="font-semibold text-gray-900 mb-3">Your Profile Summary</h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p><strong>Goal:</strong> {getGoalName(formData.goal)}</p>
                    <p><strong>Activity Level:</strong> {getActivityLevelName(formData.activityLevel)}</p>
                    <p><strong>Dietary Preferences:</strong> {formData.dietaryPreferences.join(', ') || 'None specified'}</p>
                    {formData.allergies.length > 0 && (
                      <p><strong>Allergies:</strong> {formData.allergies.join(', ')}</p>
                    )}
                  </div>
                </div>

                <div className="text-center space-y-4">
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center space-x-2 bg-gradient-to-r from-green-500 to-blue-500 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:shadow-xl transition-all duration-300"
                  >
                    <span>Get My Meal Plan</span>
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                  <p className="text-sm text-gray-500">
                    Start your 7-day free trial • No credit card required
                  </p>
                </div>
              </div>
            )}
          </div>
        )

      default:
        return null
    }
  }

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.email && formData.age > 0 && formData.height > 0 && formData.weight > 0
      case 2:
        return formData.activityLevel
      case 3:
        return formData.goal
      case 4:
        return true // Optional fields
      default:
        return false
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center space-x-2 mb-6">
            <div className="bg-gradient-to-r from-green-500 to-blue-500 rounded-lg p-2">
              <Target className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              NutriGoal
            </span>
          </Link>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">Step {step} of {totalSteps}</span>
            <span className="text-sm text-gray-600">{Math.round((step / totalSteps) * 100)}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {renderStepContent()}

          {/* Navigation */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={handleBack}
              disabled={step === 1}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition-all ${
                step === 1
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>

            {step < totalSteps ? (
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition-all ${
                  canProceed()
                    ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white hover:shadow-lg'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <span>Next</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
} 