'use client'

import { useState } from 'react'
import {
  ArrowRight, ArrowLeft, User, Utensils,
  Calculator, Heart, Dumbbell, Briefcase, Calendar, Sparkles,
  Cookie,
} from 'lucide-react'
import {
  ACTIVITY_LEVELS, FITNESS_GOALS, TRAINING_EXPERIENCE, EQUIPMENT_ACCESS,
  TRAINING_STYLES, COMMON_INJURIES, COMMON_CONDITIONS, DIETARY_RESTRICTIONS,
  COMMON_FOOD_DISLIKES, COOKING_SKILLS, MEAL_PREP_PREFERENCES, WORK_TYPES,
  SLEEP_QUALITY_OPTIONS, STRESS_LEVELS, GOAL_TIMELINES, MOTIVATIONS,
  ALCOHOL_FREQUENCIES, SNACK_MOTIVATIONS, SNACK_PREFERENCES,
  calculateNutritionTargets,
} from '@nutrigoal/shared'
import type { UserMetrics } from '@nutrigoal/shared'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'

const STEPS = ['My Stats', 'Lifestyle', 'Food Preferences', 'Snack Habits', 'Health', 'Training', 'Schedule', 'Review']
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2).toString().padStart(2, '0')
  const m = i % 2 === 0 ? '00' : '30'
  return `${h}:${m}`
})

function fmt12(t: string) {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${m.toString().padStart(2, '0')} ${ampm}`
}

export default function OnboardingPage() {
  const { profile } = useUser()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)

  // ── Step 0: My Stats ──
  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [age, setAge] = useState(profile?.age?.toString() ?? '')
  const [gender, setGender] = useState<'male' | 'female'>((profile?.gender as 'male' | 'female') ?? 'male')
  const [height, setHeight] = useState(profile?.height_cm?.toString() ?? '')
  const [weight, setWeight] = useState(profile?.weight_kg?.toString() ?? '')
  const [goal, setGoal] = useState<UserMetrics['goal']>(
    (profile?.goal as UserMetrics['goal']) ?? 'cutting'
  )
  const [targetWeight, setTargetWeight] = useState(profile?.target_weight_kg?.toString() ?? '')
  const [goalTimeline, setGoalTimeline] = useState(profile?.goal_timeline ?? 'steady')

  // ── Step 1: My Lifestyle ──
  const [workType, setWorkType] = useState(profile?.work_type ?? 'desk')
  const [activityLevel, setActivityLevel] = useState<UserMetrics['activityLevel']>(
    (profile?.activity_level as UserMetrics['activityLevel']) ?? 'moderately_active'
  )
  const [sleepHours, setSleepHours] = useState(profile?.sleep_hours?.toString() ?? '7')
  const [sleepQuality, setSleepQuality] = useState(profile?.sleep_quality ?? 'average')
  const [stressLevel, setStressLevel] = useState(profile?.stress_level ?? 'moderate')
  const [alcoholFrequency, setAlcoholFrequency] = useState(profile?.alcohol_frequency ?? 'none')
  const [alcoholDetails, setAlcoholDetails] = useState(profile?.alcohol_details ?? '')

  // ── Step 2: My Food Preferences ──
  const [favouriteFoods, setFavouriteFoods] = useState(profile?.favourite_foods?.join(', ') ?? '')
  const [foodDislikes, setFoodDislikes] = useState(profile?.food_dislikes?.join(', ') ?? '')
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>(profile?.dietary_restrictions ?? [])
  const [allergies, setAllergies] = useState(profile?.allergies?.join(', ') ?? '')
  const [cookingSkill, setCookingSkill] = useState(profile?.cooking_skill ?? 'intermediate')
  const [mealPrepPref, setMealPrepPref] = useState(profile?.meal_prep_preference ?? 'daily')
  const [foodAdventurousness, setFoodAdventurousness] = useState(profile?.food_adventurousness ?? 5)

  // ── Step 3: My Snack Habits ──
  const [currentSnacks, setCurrentSnacks] = useState(profile?.current_snacks?.join(', ') ?? '')
  const [snackMotivation, setSnackMotivation] = useState(profile?.snack_motivation ?? 'hunger')
  const [snackPreference, setSnackPreference] = useState(profile?.snack_preference ?? 'both')
  const [lateNightSnacking, setLateNightSnacking] = useState(profile?.late_night_snacking ?? false)

  // ── Step 4: Health & Medical ──
  const [injuries, setInjuries] = useState<string[]>(profile?.injuries ?? [])
  const [customInjury, setCustomInjury] = useState('')
  const [conditions, setConditions] = useState<string[]>(profile?.medical_conditions ?? [])
  const [medications, setMedications] = useState(profile?.medications?.join(', ') ?? '')

  // ── Step 5: Training Background ──
  const [experience, setExperience] = useState(profile?.training_experience ?? 'beginner')
  const [equipmentAccess, setEquipmentAccess] = useState(profile?.equipment_access ?? 'full_gym')
  const [trainingStyles, setTrainingStyles] = useState<string[]>(profile?.training_style ?? ['hypertrophy'])

  // ── Step 6: Schedule ──
  const [wakeTime, setWakeTime] = useState(profile?.wake_time ?? '07:00')
  const [workoutTime, setWorkoutTime] = useState(profile?.workout_time ?? '08:00')
  const [workStartTime, setWorkStartTime] = useState(profile?.work_start_time ?? '09:00')
  const [workEndTime, setWorkEndTime] = useState(profile?.work_end_time ?? '17:00')
  const [workoutDays, setWorkoutDays] = useState(profile?.workout_days_per_week ?? 4)
  const [mealsPerDay, setMealsPerDay] = useState(profile?.meals_per_day ?? 3)
  const [motivation, setMotivation] = useState<string[]>(profile?.motivation ?? [])

  const toggleArray = (arr: string[], setArr: (a: string[]) => void, val: string) => {
    setArr(arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val])
  }

  const canContinue = () => {
    switch (step) {
      case 0: return fullName.trim().length > 0 && age && height && weight
      default: return true
    }
  }

  const getNutritionTargets = () => {
    if (!age || !height || !weight) return null
    const metrics: UserMetrics = {
      age: parseInt(age),
      height: parseInt(height),
      weight: parseInt(weight),
      gender,
      activityLevel,
      goal,
    }
    return calculateNutritionTargets(metrics)
  }

  const handleFinish = async (navigateTo: 'dashboard' | 'ai-generate') => {
    if (!profile) return
    setSaving(true)

    const targets = getNutritionTargets()
    if (!targets) {
      toast.error('Missing required fields')
      setSaving(false)
      return
    }

    const allInjuries = [...injuries]
    if (customInjury.trim()) allInjuries.push(customInjury.trim())

    const supabase = createClient()
    const { error } = await supabase
      .from('user_profiles')
      .update({
        full_name: fullName,
        age: parseInt(age),
        height_cm: parseInt(height),
        weight_kg: parseInt(weight),
        gender,
        activity_level: activityLevel,
        goal,
        daily_calories: targets.calories,
        daily_protein: targets.protein,
        daily_carbs: targets.carbs,
        daily_fat: targets.fat,
        daily_water_ml: targets.water,
        // Health
        injuries: allInjuries,
        medical_conditions: conditions,
        medications: medications.split(',').map(m => m.trim()).filter(Boolean),
        // Fitness
        training_experience: experience,
        equipment_access: equipmentAccess,
        training_style: trainingStyles,
        // Nutrition
        dietary_restrictions: dietaryRestrictions,
        allergies: allergies.split(',').map(a => a.trim()).filter(Boolean),
        food_dislikes: foodDislikes.split(',').map(s => s.trim()).filter(Boolean),
        favourite_foods: favouriteFoods.split(',').map(s => s.trim()).filter(Boolean),
        cooking_skill: cookingSkill,
        meal_prep_preference: mealPrepPref,
        food_adventurousness: foodAdventurousness,
        // Lifestyle
        work_type: workType,
        sleep_quality: sleepQuality,
        sleep_hours: sleepHours ? parseFloat(sleepHours) : null,
        stress_level: stressLevel,
        alcohol_frequency: alcoholFrequency,
        alcohol_details: alcoholDetails.trim() || null,
        // Snack habits
        current_snacks: currentSnacks.split(',').map(s => s.trim()).filter(Boolean),
        snack_motivation: snackMotivation,
        snack_preference: snackPreference,
        late_night_snacking: lateNightSnacking,
        // Goals
        target_weight_kg: targetWeight ? parseFloat(targetWeight) : null,
        goal_timeline: goalTimeline,
        motivation,
        // Schedule
        wake_time: wakeTime,
        workout_time: workoutTime,
        work_start_time: workStartTime,
        work_end_time: workEndTime,
        workout_days_per_week: workoutDays,
        meals_per_day: mealsPerDay,
        onboarding_completed: true,
      })
      .eq('id', profile.id)

    if (error) {
      toast.error('Failed to save profile: ' + error.message)
      setSaving(false)
      return
    }

    toast.success('Profile setup complete!')
    window.location.href = navigateTo === 'ai-generate' ? '/generate-plans' : '/dashboard'
  }

  const renderStep = () => {
    switch (step) {
      /* ── Step 0: My Stats ──────────────────────────── */
      case 0:
        return (
          <div className="space-y-6">
            <StepHeader
              icon={<User className="h-12 w-12 text-purple-600" />}
              title="Let's Get to Know You"
              subtitle="Your stats help us calculate your personalized nutrition targets"
            />
            <div>
              <Label>Full Name</Label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                placeholder="Your name"
              />
            </div>
            <div>
              <Label>Biological Sex</Label>
              <div className="grid grid-cols-2 gap-3">
                {(['male', 'female'] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    className={`py-3 px-4 rounded-xl border-2 font-semibold transition-all ${
                      gender === g
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    {g === 'male' ? 'Male' : 'Female'}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label>Age</Label>
                <input type="number" value={age} onChange={(e) => setAge(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all" placeholder="Years" />
              </div>
              <div>
                <Label>Height (cm)</Label>
                <input type="number" value={height} onChange={(e) => setHeight(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all" placeholder="175" />
              </div>
              <div>
                <Label>Weight (kg)</Label>
                <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all" placeholder="70" />
              </div>
            </div>

            <div>
              <Label>What&apos;s your primary goal?</Label>
              <div className="space-y-2">
                {FITNESS_GOALS.map((g) => (
                  <OptionCard key={g.value} title={g.label} description={g.description}
                    selected={goal === g.value} onClick={() => setGoal(g.value as UserMetrics['goal'])} />
                ))}
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Goal weight (optional)</Label>
                <input type="number" value={targetWeight} onChange={(e) => setTargetWeight(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="kg — or leave blank if you're not sure" />
              </div>
              <div>
                <Label>How quickly?</Label>
                <div className="flex flex-wrap gap-2">
                  {GOAL_TIMELINES.map((t) => (
                    <button key={t.value} type="button" onClick={() => setGoalTimeline(t.value)}
                      className={`py-2.5 px-4 rounded-xl border-2 font-semibold text-sm transition-all ${
                        goalTimeline === t.value
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )

      /* ── Step 1: My Lifestyle ──────────────────────── */
      case 1:
        return (
          <div className="space-y-6">
            <StepHeader
              icon={<Briefcase className="h-12 w-12 text-indigo-500" />}
              title="Your Lifestyle"
              subtitle="This helps us set accurate calorie targets based on your real daily activity"
            />
            <div>
              <Label>What&apos;s your job like?</Label>
              <div className="space-y-2">
                {WORK_TYPES.map((w) => (
                  <OptionCard key={w.value} title={w.label} description={w.description}
                    selected={workType === w.value} onClick={() => setWorkType(w.value)} />
                ))}
              </div>
            </div>
            <div>
              <Label>Overall activity level (job + exercise combined)</Label>
              <p className="text-sm text-gray-500 mb-2">Based on your job type AND how often you exercise</p>
              <div className="space-y-2">
                {ACTIVITY_LEVELS.map((level) => (
                  <OptionCard key={level.value} title={level.label} description={level.description}
                    selected={activityLevel === level.value}
                    onClick={() => setActivityLevel(level.value as UserMetrics['activityLevel'])} />
                ))}
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Hours of sleep per night</Label>
                <input type="number" step="0.5" min="3" max="12" value={sleepHours}
                  onChange={(e) => setSleepHours(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="7" />
              </div>
              <div>
                <Label>Sleep quality</Label>
                <div className="flex flex-wrap gap-3">
                  {SLEEP_QUALITY_OPTIONS.map((s) => (
                    <button key={s.value} type="button" onClick={() => setSleepQuality(s.value)}
                      className={`flex-1 min-w-[90px] py-3 px-3 rounded-xl border-2 font-semibold text-sm transition-all ${
                        sleepQuality === s.value
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <Label>Stress level</Label>
              <div className="flex flex-wrap gap-3">
                {STRESS_LEVELS.map((s) => (
                  <button key={s.value} type="button" onClick={() => setStressLevel(s.value)}
                    className={`flex-1 min-w-[100px] py-3 px-4 rounded-xl border-2 font-semibold text-sm transition-all ${
                      stressLevel === s.value
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Do you drink alcohol?</Label>
              <div className="space-y-2">
                {ALCOHOL_FREQUENCIES.map((a) => (
                  <OptionCard key={a.value} title={a.label} description={a.description}
                    selected={alcoholFrequency === a.value} onClick={() => setAlcoholFrequency(a.value)} />
                ))}
              </div>
              {alcoholFrequency !== 'none' && (
                <input type="text" value={alcoholDetails}
                  onChange={(e) => setAlcoholDetails(e.target.value)}
                  className="w-full mt-3 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="e.g. 2-3 beers on weekends, glass of wine with dinner" />
              )}
            </div>
          </div>
        )

      /* ── Step 2: My Food Preferences ───────────────── */
      case 2:
        return (
          <div className="space-y-6">
            <StepHeader
              icon={<Utensils className="h-12 w-12 text-orange-500" />}
              title="Your Food Preferences"
              subtitle="Tell us what you love eating — we'll build your plan around it"
            />
            <div>
              <Label>Top 5 favourite meals or dishes (any cuisine)</Label>
              <p className="text-sm text-gray-500 mb-2">Think meals, not just ingredients &mdash; e.g. &quot;chicken stir-fry&quot;, &quot;pasta carbonara&quot;, &quot;salmon with rice&quot;</p>
              <textarea value={favouriteFoods} onChange={(e) => setFavouriteFoods(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                rows={3} placeholder="e.g. chicken stir-fry, spaghetti bolognese, salmon with rice, tacos, Greek salad" />
            </div>
            <div>
              <Label>Foods you absolutely hate and would never eat</Label>
              <textarea value={foodDislikes} onChange={(e) => setFoodDislikes(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                rows={2} placeholder="e.g. tofu, liver, sardines, coconut" />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {COMMON_FOOD_DISLIKES.map(f => (
                  <button key={f} type="button"
                    onClick={() => setFoodDislikes(prev => {
                      const items = prev.split(',').map(s => s.trim()).filter(Boolean)
                      if (items.some(i => i.toLowerCase() === f.toLowerCase())) return prev
                      return prev ? `${prev}, ${f}` : f
                    })}
                    className="text-xs px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full hover:bg-red-100 hover:text-red-700 transition-colors">
                    + {f}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Dietary restrictions or allergies</Label>
              <ChipGrid
                items={DIETARY_RESTRICTIONS.map(r => ({ value: r.value, label: r.label }))}
                selected={dietaryRestrictions}
                onToggle={(val) => toggleArray(dietaryRestrictions, setDietaryRestrictions, val)}
              />
              <input type="text" value={allergies} onChange={(e) => setAllergies(e.target.value)}
                className="w-full mt-3 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                placeholder="Any specific allergies? e.g. peanuts, shellfish, gluten" />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Cooking style</Label>
                <div className="space-y-2">
                  {COOKING_SKILLS.map((c) => (
                    <OptionCard key={c.value} title={c.label} description={c.description}
                      selected={cookingSkill === c.value} onClick={() => setCookingSkill(c.value)} />
                  ))}
                </div>
              </div>
              <div>
                <Label>Meal prep preference</Label>
                <div className="space-y-2">
                  {MEAL_PREP_PREFERENCES.map((m) => (
                    <OptionCard key={m.value} title={m.label} description={m.description}
                      selected={mealPrepPref === m.value} onClick={() => setMealPrepPref(m.value)} />
                  ))}
                </div>
              </div>
            </div>
            <div>
              <Label>How adventurous are you with food? (1 = stick to what I know, 10 = try anything)</Label>
              <div className="flex items-center gap-4 mt-2">
                <span className="text-sm text-gray-500">1</span>
                <input type="range" min={1} max={10} value={foodAdventurousness}
                  onChange={(e) => setFoodAdventurousness(parseInt(e.target.value))}
                  className="flex-1 accent-purple-600" />
                <span className="text-sm text-gray-500">10</span>
                <span className="text-lg font-bold text-purple-600 w-8 text-center">{foodAdventurousness}</span>
              </div>
            </div>
          </div>
        )

      /* ── Step 3: My Snack Habits ───────────────────── */
      case 3:
        return (
          <div className="space-y-6">
            <StepHeader
              icon={<Cookie className="h-12 w-12 text-amber-500" />}
              title="Your Snack Habits"
              subtitle="No judgment here — understanding your snack patterns helps us build smarter swaps"
            />
            <div>
              <Label>What snacks do you currently reach for?</Label>
              <textarea value={currentSnacks} onChange={(e) => setCurrentSnacks(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                rows={3} placeholder="e.g. crisps, chocolate, biscuits, protein bars, fruit, yogurt, nuts" />
            </div>
            <div>
              <Label>Why do you tend to snack?</Label>
              <div className="space-y-2">
                {SNACK_MOTIVATIONS.map((s) => (
                  <OptionCard key={s.value} title={s.label} description={s.description}
                    selected={snackMotivation === s.value} onClick={() => setSnackMotivation(s.value)} />
                ))}
              </div>
            </div>
            <div>
              <Label>Do you prefer sweet or savoury snacks?</Label>
              <div className="flex flex-wrap gap-3">
                {SNACK_PREFERENCES.map((s) => (
                  <button key={s.value} type="button" onClick={() => setSnackPreference(s.value)}
                    className={`flex-1 min-w-[100px] py-3 px-4 rounded-xl border-2 font-semibold text-sm transition-all ${
                      snackPreference === s.value
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Do you snack late at night?</Label>
              <div className="grid grid-cols-2 gap-3">
                {[{ val: true, label: 'Yes, often' }, { val: false, label: 'Not really' }].map(({ val, label }) => (
                  <button key={label} type="button" onClick={() => setLateNightSnacking(val)}
                    className={`py-3 px-4 rounded-xl border-2 font-semibold transition-all ${
                      lateNightSnacking === val
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )

      /* ── Step 4: Health & Medical ──────────────────── */
      case 4:
        return (
          <div className="space-y-6">
            <StepHeader
              icon={<Heart className="h-12 w-12 text-red-500" />}
              title="Health & Medical"
              subtitle="This helps us avoid exercises and foods that could cause issues"
            />
            <div>
              <Label>Any injuries or physical limitations?</Label>
              <p className="text-sm text-gray-500 mb-3">Select all that apply (or skip)</p>
              <ChipGrid
                items={COMMON_INJURIES.map(i => ({ value: i, label: i }))}
                selected={injuries}
                onToggle={(val) => toggleArray(injuries, setInjuries, val)}
              />
              <input type="text" value={customInjury} onChange={(e) => setCustomInjury(e.target.value)}
                className="w-full mt-3 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                placeholder="Other injury (optional)" />
            </div>
            <div>
              <Label>Medical conditions?</Label>
              <p className="text-sm text-gray-500 mb-3">Select any that apply</p>
              <ChipGrid
                items={COMMON_CONDITIONS.map(c => ({ value: c, label: c }))}
                selected={conditions}
                onToggle={(val) => toggleArray(conditions, setConditions, val)}
              />
            </div>
            <div>
              <Label>Current medications (optional)</Label>
              <input type="text" value={medications} onChange={(e) => setMedications(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                placeholder="e.g. Metformin, Levothyroxine" />
            </div>
          </div>
        )

      /* ── Step 5: Training Background ──────────────── */
      case 5:
        return (
          <div className="space-y-6">
            <StepHeader
              icon={<Dumbbell className="h-12 w-12 text-purple-600" />}
              title="Training Background"
              subtitle="Tell us about your training experience"
            />
            <div>
              <Label>Training experience</Label>
              <div className="space-y-2">
                {TRAINING_EXPERIENCE.map((level) => (
                  <OptionCard key={level.value} title={level.label} description={level.description}
                    selected={experience === level.value} onClick={() => setExperience(level.value)} />
                ))}
              </div>
            </div>
            <div>
              <Label>Equipment access</Label>
              <div className="space-y-2">
                {EQUIPMENT_ACCESS.map((eq) => (
                  <OptionCard key={eq.value} title={eq.label} description={eq.description}
                    selected={equipmentAccess === eq.value} onClick={() => setEquipmentAccess(eq.value)} />
                ))}
              </div>
            </div>
            <div>
              <Label>Preferred training style</Label>
              <p className="text-sm text-gray-500 mb-3">Select one or more</p>
              <ChipGrid
                items={TRAINING_STYLES.map(s => ({ value: s.value, label: s.label }))}
                selected={trainingStyles}
                onToggle={(val) => toggleArray(trainingStyles, setTrainingStyles, val)}
              />
            </div>
          </div>
        )

      /* ── Step 6: Schedule ──────────────────────────── */
      case 6:
        return (
          <div className="space-y-6">
            <StepHeader
              icon={<Calendar className="h-12 w-12 text-indigo-500" />}
              title="Your Schedule"
              subtitle="We'll time your meals around your workout for optimal results"
            />
            <div>
              <Label>What time do you wake up?</Label>
              <select value={wakeTime} onChange={(e) => setWakeTime(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 font-semibold text-sm text-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all bg-white">
                {TIME_OPTIONS.map((t) => (<option key={t} value={t}>{fmt12(t)}</option>))}
              </select>
            </div>
            <div>
              <Label>Preferred workout time</Label>
              <select value={workoutTime} onChange={(e) => setWorkoutTime(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 font-semibold text-sm text-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all bg-white">
                {TIME_OPTIONS.map((t) => (<option key={t} value={t}>{fmt12(t)}</option>))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Work start time</Label>
                <select value={workStartTime} onChange={(e) => setWorkStartTime(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 font-semibold text-sm text-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all bg-white">
                  {TIME_OPTIONS.map((t) => (<option key={t} value={t}>{fmt12(t)}</option>))}
                </select>
              </div>
              <div>
                <Label>Work end time</Label>
                <select value={workEndTime} onChange={(e) => setWorkEndTime(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 font-semibold text-sm text-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all bg-white">
                  {TIME_OPTIONS.map((t) => (<option key={t} value={t}>{fmt12(t)}</option>))}
                </select>
              </div>
            </div>
            <div>
              <Label>Training days per week</Label>
              <div className="flex gap-3">
                {[3, 4, 5, 6, 7].map((d) => (
                  <button key={d} type="button" onClick={() => setWorkoutDays(d)}
                    className={`w-12 h-12 rounded-full border-2 font-bold text-lg transition-all ${
                      workoutDays === d
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Meals per day</Label>
              <div className="flex gap-3">
                {[3, 4, 5, 6, 7].map((m) => (
                  <button key={m} type="button" onClick={() => setMealsPerDay(m)}
                    className={`w-12 h-12 rounded-full border-2 font-bold text-lg transition-all ${
                      mealsPerDay === m
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>What motivates you?</Label>
              <p className="text-sm text-gray-500 mb-3">Select all that apply</p>
              <ChipGrid
                items={MOTIVATIONS.map(m => ({ value: m, label: m }))}
                selected={motivation}
                onToggle={(val) => toggleArray(motivation, setMotivation, val)}
              />
            </div>
          </div>
        )

      /* ── Step 7: Review ────────────────────────────── */
      case 7: {
        const targets = getNutritionTargets()
        return (
          <div className="space-y-6">
            <StepHeader
              icon={<Calculator className="h-12 w-12 text-purple-600" />}
              title="Your Profile Summary"
              subtitle="Review your personalized nutrition targets"
            />

            {targets && (
              <>
                {/* Nutrition Targets */}
                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-6 border border-purple-100">
                  <h3 className="text-sm font-bold text-purple-700 uppercase tracking-wider mb-4">Daily Nutrition Targets</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-white/80 rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-purple-700">{targets.calories}</div>
                      <div className="text-xs text-gray-600 mt-1">kcal / day</div>
                    </div>
                    <div className="bg-white/80 rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-red-600">{targets.protein}g</div>
                      <div className="text-xs text-gray-600 mt-1">Protein</div>
                    </div>
                    <div className="bg-white/80 rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-yellow-600">{targets.carbs}g</div>
                      <div className="text-xs text-gray-600 mt-1">Carbs</div>
                    </div>
                    <div className="bg-white/80 rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">{targets.fat}g</div>
                      <div className="text-xs text-gray-600 mt-1">Fat</div>
                    </div>
                    <div className="bg-white/80 rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">{(targets.water / 1000).toFixed(1)}L</div>
                      <div className="text-xs text-gray-600 mt-1">Water</div>
                    </div>
                  </div>
                </div>

                {/* Key Details */}
                <div className="bg-white rounded-2xl p-6 border border-gray-200">
                  <h3 className="text-sm font-bold text-purple-700 uppercase tracking-wider mb-4">Your Profile</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <ReviewRow label="Goal" value={FITNESS_GOALS.find(g => g.value === goal)?.label ?? goal} />
                    {targetWeight && <ReviewRow label="Target weight" value={`${targetWeight} kg`} />}
                    <ReviewRow label="Timeline" value={GOAL_TIMELINES.find(t => t.value === goalTimeline)?.label ?? goalTimeline} />
                    <ReviewRow label="Work" value={WORK_TYPES.find(w => w.value === workType)?.label ?? workType} />
                    <ReviewRow label="Activity" value={ACTIVITY_LEVELS.find(a => a.value === activityLevel)?.label ?? activityLevel} />
                    <ReviewRow label="Sleep" value={`${sleepHours}h — ${SLEEP_QUALITY_OPTIONS.find(s => s.value === sleepQuality)?.label ?? sleepQuality}`} />
                    {alcoholFrequency !== 'none' && <ReviewRow label="Alcohol" value={ALCOHOL_FREQUENCIES.find(a => a.value === alcoholFrequency)?.label ?? alcoholFrequency} />}
                    <ReviewRow label="Cooking" value={COOKING_SKILLS.find(c => c.value === cookingSkill)?.label ?? cookingSkill} />
                    <ReviewRow label="Adventurousness" value={`${foodAdventurousness}/10`} />
                    {dietaryRestrictions.length > 0 && (
                      <ReviewRow label="Diet" value={dietaryRestrictions.map(r => DIETARY_RESTRICTIONS.find(d => d.value === r)?.label ?? r).join(', ')} />
                    )}
                    {favouriteFoods.trim() && <ReviewRow label="Favourites" value={favouriteFoods} />}
                    {foodDislikes.trim() && <ReviewRow label="Dislikes" value={foodDislikes} />}
                    {currentSnacks.trim() && <ReviewRow label="Snacks" value={currentSnacks} />}
                    {injuries.length > 0 && <ReviewRow label="Injuries" value={injuries.join(', ')} />}
                  </div>
                </div>

                {/* Schedule */}
                <div className="bg-white rounded-2xl p-6 border border-gray-200">
                  <h3 className="text-sm font-bold text-purple-700 uppercase tracking-wider mb-4">Schedule</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <ReviewRow label="Wake up" value={fmt12(wakeTime)} />
                    <ReviewRow label="Workout" value={fmt12(workoutTime)} />
                    <ReviewRow label="Training" value={`${workoutDays}x / week`} />
                    <ReviewRow label="Meals" value={`${mealsPerDay} / day`} />
                  </div>
                </div>

                {/* AI Note */}
                <div className="flex gap-3 bg-purple-50 border border-purple-200 rounded-2xl p-5">
                  <Sparkles className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-purple-800 leading-relaxed">
                    Your personal AI nutritionist will use everything you&apos;ve told us to create a meal plan
                    built around your favourite foods, lifestyle and goals &mdash; no bland chicken and broccoli
                    unless you asked for it!
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    onClick={() => handleFinish('ai-generate')}
                    disabled={saving}
                    className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-4 rounded-xl text-base font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    <Sparkles className="h-5 w-5" />
                    <span>{saving ? 'Saving...' : 'Generate AI Plans'}</span>
                  </button>
                  <button
                    onClick={() => handleFinish('dashboard')}
                    disabled={saving}
                    className="flex-1 flex items-center justify-center gap-2 border-2 border-gray-200 text-gray-700 px-6 py-4 rounded-xl text-base font-semibold hover:bg-gray-50 transition-all disabled:opacity-50"
                  >
                    <span>{saving ? 'Saving...' : 'Go to Dashboard'}</span>
                    <ArrowRight className="h-5 w-5" />
                  </button>
                </div>
              </>
            )}
          </div>
        )
      }
    }
  }

  return (
    <div className="max-w-2xl mx-auto pb-8">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-medium text-gray-600">Step {step + 1} of {STEPS.length}</span>
          <span className="text-sm font-medium text-gray-600">{Math.round(((step + 1) / STEPS.length) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-purple-600 to-indigo-600 h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
        {/* Step dots */}
        <div className="flex justify-center gap-1.5 mt-3">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i <= step ? 'bg-purple-600 w-5' : 'bg-gray-300 w-1.5'
              }`}
            />
          ))}
        </div>
        <p className="text-center text-xs text-gray-500 mt-2">{STEPS[step]}</p>
      </div>

      {/* Card */}
      <div className="card p-6 md:p-8">
        <div key={step} className="animate-fade-in">
          {renderStep()}
        </div>

        {/* Navigation (not shown on Review step which has its own buttons) */}
        {step < 7 && (
          <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-100">
            <button
              onClick={() => setStep(step - 1)}
              disabled={step === 0}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl transition-all font-medium ${
                step === 0
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canContinue()}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all font-semibold ${
                canContinue()
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-lg'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <span>Continue</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Shared Sub-components ─────────────────────────── */

function StepHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="text-center mb-2">
      <div className="flex justify-center mb-4">{icon}</div>
      <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{title}</h2>
      <p className="text-gray-600">{subtitle}</p>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm font-semibold text-gray-700 mb-2">{children}</label>
}

function OptionCard({
  title, description, selected, onClick,
}: {
  title: string; description: string; selected: boolean; onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
        selected
          ? 'border-purple-500 bg-purple-50'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <h3 className={`font-semibold ${selected ? 'text-purple-700' : 'text-gray-900'}`}>{title}</h3>
      <p className="text-sm text-gray-600 mt-0.5">{description}</p>
    </div>
  )
}

function ChipGrid({
  items, selected, onToggle,
}: {
  items: { value: string; label: string }[]; selected: string[]; onToggle: (val: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => onToggle(item.value)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
            selected.includes(item.value)
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start py-2 px-3 bg-gray-50 rounded-lg">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-semibold text-gray-900 text-right ml-2">{value}</span>
    </div>
  )
}
