'use client'

import { useState } from 'react'
import { ArrowRight, ArrowLeft, Target, User, Activity, Calculator, Utensils } from 'lucide-react'
import { calculateNutritionTargets, getActivityLevelName, getGoalName } from '@/lib/nutrition'
import type { UserMetrics } from '@/lib/nutrition'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { ACTIVITY_LEVELS, FITNESS_GOALS } from '@/lib/constants'

export default function OnboardingPage() {
  const { profile } = useUser()
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    full_name: profile?.full_name ?? '',
    age: profile?.age ?? 0,
    height: profile?.height_cm ?? 0,
    weight: profile?.weight_kg ?? 0,
    gender: (profile?.gender ?? 'male') as 'male' | 'female',
    activityLevel: (profile?.activity_level ?? 'moderately_active') as UserMetrics['activityLevel'],
    goal: (profile?.goal ?? 'maintenance') as UserMetrics['goal'],
    dietaryPreferences: profile?.dietary_preferences ?? [] as string[],
    allergies: profile?.allergies ?? [] as string[],
  })
  const [nutritionTargets, setNutritionTargets] = useState<ReturnType<typeof calculateNutritionTargets> | null>(null)

  const totalSteps = 5

  const handleNext = () => {
    if (step === 4) {
      const targets = calculateNutritionTargets({
        age: formData.age,
        height: formData.height,
        weight: formData.weight,
        gender: formData.gender,
        activityLevel: formData.activityLevel,
        goal: formData.goal,
      })
      setNutritionTargets(targets)
    }
    setStep(step + 1)
  }

  const handleSave = async () => {
    if (!profile || !nutritionTargets) return
    setSaving(true)

    const supabase = createClient()
    const { error } = await supabase
      .from('user_profiles')
      .update({
        full_name: formData.full_name || null,
        age: formData.age,
        height_cm: formData.height,
        weight_kg: formData.weight,
        gender: formData.gender,
        activity_level: formData.activityLevel,
        goal: formData.goal,
        dietary_preferences: formData.dietaryPreferences,
        allergies: formData.allergies,
        daily_calories: nutritionTargets.calories,
        daily_protein: nutritionTargets.protein,
        daily_carbs: nutritionTargets.carbs,
        daily_fat: nutritionTargets.fat,
        daily_water_ml: nutritionTargets.water,
        onboarding_completed: true,
      })
      .eq('id', profile.id)

    if (error) {
      toast.error('Failed to save profile')
      setSaving(false)
      return
    }

    toast.success('Profile setup complete!')
    router.push('/dashboard')
  }

  const dietaryOptions = ['Vegetarian', 'Vegan', 'Keto', 'Paleo', 'Mediterranean', 'Gluten-Free', 'Dairy-Free', 'Low-Carb', 'Halal', 'Kosher']
  const allergyOptions = ['Nuts', 'Dairy', 'Eggs', 'Soy', 'Wheat', 'Fish', 'Shellfish', 'Sesame']

  const togglePreference = (pref: string) => {
    setFormData(prev => ({
      ...prev,
      dietaryPreferences: prev.dietaryPreferences.includes(pref)
        ? prev.dietaryPreferences.filter(p => p !== pref)
        : [...prev.dietaryPreferences, pref]
    }))
  }

  const toggleAllergy = (allergy: string) => {
    setFormData(prev => ({
      ...prev,
      allergies: prev.allergies.includes(allergy)
        ? prev.allergies.filter(a => a !== allergy)
        : [...prev.allergies, allergy]
    }))
  }

  const canProceed = () => {
    switch (step) {
      case 1: return formData.age > 0 && formData.height > 0 && formData.weight > 0
      case 2: return formData.activityLevel
      case 3: return formData.goal
      case 4: return true
      default: return false
    }
  }

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <User className="h-16 w-16 text-blue-500 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Let&apos;s Get to Know You</h2>
              <p className="text-gray-600">We&apos;ll use this to calculate your personalized nutrition goals</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
              <input type="text" value={formData.full_name} onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="John Doe" />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Age</label>
                <input type="number" value={formData.age || ''} onChange={(e) => setFormData(prev => ({ ...prev, age: parseInt(e.target.value) || 0 }))} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="25" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                <select value={formData.gender} onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value as 'male' | 'female' }))} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Height (cm)</label>
                <input type="number" value={formData.height || ''} onChange={(e) => setFormData(prev => ({ ...prev, height: parseInt(e.target.value) || 0 }))} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="175" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Weight (kg)</label>
                <input type="number" value={formData.weight || ''} onChange={(e) => setFormData(prev => ({ ...prev, weight: parseInt(e.target.value) || 0 }))} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="70" />
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
              {ACTIVITY_LEVELS.map((option) => (
                <div key={option.value} onClick={() => setFormData(prev => ({ ...prev, activityLevel: option.value as UserMetrics['activityLevel'] }))} className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${formData.activityLevel === option.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <h3 className="font-semibold text-gray-900">{option.label}</h3>
                  <p className="text-sm text-gray-600">{option.description}</p>
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
              {FITNESS_GOALS.map((option) => (
                <div key={option.value} onClick={() => setFormData(prev => ({ ...prev, goal: option.value as UserMetrics['goal'] }))} className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${formData.goal === option.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <h3 className="font-semibold text-gray-900">{option.label}</h3>
                  <p className="text-sm text-gray-600">{option.description}</p>
                </div>
              ))}
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <Utensils className="h-16 w-16 text-orange-500 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Dietary Preferences</h2>
              <p className="text-gray-600">Select any that apply (optional)</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-700 mb-3">Dietary Preferences</h3>
              <div className="flex flex-wrap gap-2">
                {dietaryOptions.map((pref) => (
                  <button key={pref} type="button" onClick={() => togglePreference(pref)} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${formData.dietaryPreferences.includes(pref) ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                    {pref}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-medium text-gray-700 mb-3">Allergies</h3>
              <div className="flex flex-wrap gap-2">
                {allergyOptions.map((allergy) => (
                  <button key={allergy} type="button" onClick={() => toggleAllergy(allergy)} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${formData.allergies.includes(allergy) ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                    {allergy}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <Calculator className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Your Personalized Plan</h2>
              <p className="text-gray-600">Here are your daily nutrition targets</p>
            </div>
            {nutritionTargets && (
              <>
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
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div><div className="text-2xl font-bold text-red-600">{nutritionTargets.protein}g</div><div className="text-sm text-gray-600">Protein</div></div>
                    <div><div className="text-2xl font-bold text-yellow-600">{nutritionTargets.carbs}g</div><div className="text-sm text-gray-600">Carbs</div></div>
                    <div><div className="text-2xl font-bold text-green-600">{nutritionTargets.fat}g</div><div className="text-sm text-gray-600">Fat</div></div>
                  </div>
                </div>
                <div className="bg-gray-50 p-6 rounded-xl">
                  <h3 className="font-semibold text-gray-900 mb-3">Profile Summary</h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p><strong>Goal:</strong> {getGoalName(formData.goal)}</p>
                    <p><strong>Activity Level:</strong> {getActivityLevelName(formData.activityLevel)}</p>
                    {formData.dietaryPreferences.length > 0 && <p><strong>Dietary:</strong> {formData.dietaryPreferences.join(', ')}</p>}
                    {formData.allergies.length > 0 && <p><strong>Allergies:</strong> {formData.allergies.join(', ')}</p>}
                  </div>
                </div>
                <div className="text-center">
                  <button onClick={handleSave} disabled={saving} className="inline-flex items-center space-x-2 bg-gradient-to-r from-green-500 to-blue-500 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:shadow-xl transition-all disabled:opacity-50">
                    <span>{saving ? 'Saving...' : 'Complete Setup'}</span>
                    <ArrowRight className="h-5 w-5" />
                  </button>
                </div>
              </>
            )}
          </div>
        )
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">Step {step} of {totalSteps}</span>
          <span className="text-sm text-gray-600">{Math.round((step / totalSteps) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-300" style={{ width: `${(step / totalSteps) * 100}%` }} />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-8">
        {renderStep()}

        {step < 5 && (
          <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
            <button onClick={() => setStep(step - 1)} disabled={step === 1} className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition-all ${step === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`}>
              <ArrowLeft className="h-4 w-4" /><span>Back</span>
            </button>
            <button onClick={handleNext} disabled={!canProceed()} className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition-all ${canProceed() ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white hover:shadow-lg' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
              <span>Next</span><ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
