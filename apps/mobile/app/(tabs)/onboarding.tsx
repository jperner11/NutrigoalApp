import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../src/contexts/AuthContext'
import { supabase } from '../../src/lib/supabase'
import {
  ACTIVITY_LEVELS, FITNESS_GOALS, TRAINING_EXPERIENCE, EQUIPMENT_ACCESS,
  TRAINING_STYLES, SECONDARY_TRAINING_GOALS, SESSION_DURATIONS, CARDIO_TYPES,
  COMMON_INJURIES, COMMON_CONDITIONS, DIETARY_RESTRICTIONS,
  COMMON_FOOD_DISLIKES, COOKING_SKILLS, MEAL_PREP_PREFERENCES, WORK_TYPES,
  SLEEP_QUALITY_OPTIONS, STRESS_LEVELS, GOAL_TIMELINES, MOTIVATIONS,
  ALCOHOL_FREQUENCIES, SNACK_MOTIVATIONS, SNACK_PREFERENCES,
  calculateNutritionTargets,
} from '@nutrigoal/shared'
import type { UserMetrics } from '@nutrigoal/shared'
import { BrandLogo } from '../../src/components/BrandLogo'
import { brandColors, brandShadow } from '../../src/theme/brand'

const STEPS = ['Stats', 'Lifestyle', 'Food', 'Snacks', 'Health', 'Training', 'Goals', 'Schedule', 'Review']

const TIME_OPTIONS = [
  '05:00', '05:30', '06:00', '06:30', '07:00', '07:30',
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
  '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00',
]

function fmt12(t: string) {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${m.toString().padStart(2, '0')} ${ampm}`
}

export default function OnboardingScreen() {
  const { user, refreshProfile } = useAuth()
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)

  // Step 0: Basics
  const [fullName, setFullName] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [bodyFatPct, setBodyFatPct] = useState('')

  // Step 1: Lifestyle
  const [activityLevel, setActivityLevel] = useState<UserMetrics['activityLevel']>('moderately_active')
  const [workType, setWorkType] = useState('desk')
  const [sleepHours, setSleepHours] = useState('7')
  const [sleepQuality, setSleepQuality] = useState('average')
  const [stressLevel, setStressLevel] = useState('moderate')
  const [alcoholFrequency, setAlcoholFrequency] = useState('none')
  const [alcoholDetails, setAlcoholDetails] = useState('')

  // Step 2: Food preferences
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([])
  const [allergies, setAllergies] = useState('')
  const [favouriteFoods, setFavouriteFoods] = useState('')
  const [foodDislikes, setFoodDislikes] = useState<string[]>([])
  const [cookingSkill, setCookingSkill] = useState('intermediate')
  const [mealPrepPref, setMealPrepPref] = useState('daily')
  const [foodAdventurousness, setFoodAdventurousness] = useState(5)

  // Step 3: Snack habits
  const [currentSnacks, setCurrentSnacks] = useState('')
  const [snackMotivation, setSnackMotivation] = useState('hunger')
  const [snackPreference, setSnackPreference] = useState('both')
  const [lateNightSnacking, setLateNightSnacking] = useState(false)

  // Step 4: Health & Medical
  const [injuries, setInjuries] = useState<string[]>([])
  const [customInjury, setCustomInjury] = useState('')
  const [conditions, setConditions] = useState<string[]>([])
  const [medications, setMedications] = useState('')

  // Step 5: Training Background
  const [yearsTraining, setYearsTraining] = useState('')
  const [experience, setExperience] = useState('beginner')
  const [equipmentAccess, setEquipmentAccess] = useState('full_gym')
  const [trainingStyles, setTrainingStyles] = useState<string[]>(['hypertrophy'])
  const [secondaryGoal, setSecondaryGoal] = useState('none')
  const [maxSessionMinutes, setMaxSessionMinutes] = useState(60)
  const [squat1rm, setSquat1rm] = useState('')
  const [bench1rm, setBench1rm] = useState('')
  const [deadlift1rm, setDeadlift1rm] = useState('')
  const [ohp1rm, setOhp1rm] = useState('')
  const [doesCardio, setDoesCardio] = useState(false)
  const [cardioTypesPreferred, setCardioTypesPreferred] = useState<string[]>([])
  const [cardioFrequency, setCardioFrequency] = useState(2)
  const [cardioDuration, setCardioDuration] = useState(30)

  // Step 6: Goals
  const [goal, setGoal] = useState<UserMetrics['goal']>('maintenance')
  const [targetWeight, setTargetWeight] = useState('')
  const [goalTimeline, setGoalTimeline] = useState('steady')
  const [motivation, setMotivation] = useState<string[]>([])

  // Step 7: Schedule
  const [wakeTime, setWakeTime] = useState('07:00')
  const [sleepTime, setSleepTime] = useState('23:00')
  const [workoutTime, setWorkoutTime] = useState('08:00')
  const [workStartTime, setWorkStartTime] = useState('09:00')
  const [workEndTime, setWorkEndTime] = useState('17:00')
  const [workoutDays, setWorkoutDays] = useState(4)
  const [mealsPerDay, setMealsPerDay] = useState(3)
  const [breakfastTime, setBreakfastTime] = useState('08:00')
  const [lunchTime, setLunchTime] = useState('12:30')
  const [dinnerTime, setDinnerTime] = useState('19:00')

  const toggleArray = (arr: string[], setArr: (a: string[]) => void, val: string) => {
    setArr(arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val])
  }

  const canContinue = () => {
    switch (step) {
      case 0: return fullName.trim().length > 0 && age && height && weight
      default: return true
    }
  }

  const handleFinish = async () => {
    if (!user) return
    setLoading(true)

    const metrics: UserMetrics = {
      age: parseInt(age), height: parseInt(height), weight: parseInt(weight),
      gender, activityLevel, goal,
    }
    const targets = calculateNutritionTargets(metrics)

    const allInjuries = [...injuries]
    if (customInjury.trim()) allInjuries.push(customInjury.trim())

    const { error } = await supabase.from('user_profiles').update({
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
      body_fat_pct: bodyFatPct ? parseFloat(bodyFatPct) : null,
      // Fitness
      years_training: yearsTraining ? parseFloat(yearsTraining) : null,
      training_experience: experience,
      equipment_access: equipmentAccess,
      training_style: trainingStyles,
      secondary_training_goal: secondaryGoal,
      max_session_minutes: maxSessionMinutes,
      squat_1rm: squat1rm ? parseFloat(squat1rm) : null,
      bench_1rm: bench1rm ? parseFloat(bench1rm) : null,
      deadlift_1rm: deadlift1rm ? parseFloat(deadlift1rm) : null,
      ohp_1rm: ohp1rm ? parseFloat(ohp1rm) : null,
      does_cardio: doesCardio,
      cardio_types_preferred: doesCardio ? cardioTypesPreferred : [],
      cardio_frequency_per_week: doesCardio ? cardioFrequency : null,
      cardio_duration_minutes: doesCardio ? cardioDuration : null,
      // Nutrition
      dietary_restrictions: dietaryRestrictions,
      allergies: allergies.split(',').map(a => a.trim()).filter(Boolean),
      food_dislikes: foodDislikes,
      favourite_foods: favouriteFoods.split(',').map(f => f.trim()).filter(Boolean),
      cooking_skill: cookingSkill,
      meal_prep_preference: mealPrepPref,
      food_adventurousness: foodAdventurousness,
      // Lifestyle
      work_type: workType,
      sleep_hours: sleepHours ? parseFloat(sleepHours) : null,
      sleep_quality: sleepQuality,
      stress_level: stressLevel,
      alcohol_frequency: alcoholFrequency,
      alcohol_details: alcoholDetails.trim() || null,
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
      sleep_time: sleepTime,
      workout_time: workoutTime,
      work_start_time: workStartTime,
      work_end_time: workEndTime,
      workout_days_per_week: workoutDays,
      meals_per_day: mealsPerDay,
      breakfast_time: breakfastTime,
      lunch_time: lunchTime,
      dinner_time: dinnerTime,
      onboarding_completed: true,
    }).eq('id', user.id)

    setLoading(false)

    if (error) {
      Alert.alert('Error', error.message)
    } else {
      await refreshProfile()
      Alert.alert(
        'Welcome to mealandmotion',
        'Would you like AI to generate a personalized meal plan and training program based on your profile?',
        [
          { text: 'Later', style: 'cancel', onPress: () => router.replace('/(tabs)') },
          { text: 'Yes, Generate!', onPress: () => router.replace('/(tabs)/ai-generate') },
        ]
      )
    }
  }

  return (
    <SafeAreaView style={st.container}>
      <View style={st.hero}>
        <View style={st.heroGlow} />
        <BrandLogo light />
        <Text style={st.heroTitle}>Build your performance profile.</Text>
        <Text style={st.heroSubtitle}>
          We&apos;ll turn this into nutrition targets, training structure, and better AI recommendations.
        </Text>
      </View>

      <View style={st.progressRow}>
        {STEPS.map((s, i) => (
          <View key={s} style={[st.dot, i <= step && st.dotActive]} />
        ))}
      </View>
      <Text style={st.stepLabel}>{STEPS[step]} ({step + 1}/{STEPS.length})</Text>

      <ScrollView contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>

        {/* ── Step 0: Basics ────────────────────── */}
        {step === 0 && (
          <View style={st.stepContent}>
            <Text style={st.question}>Let's get to know you</Text>
            <Text style={st.subtitle}>These basics give your nutritionist logic a strong starting point before we tailor everything else around your lifestyle.</Text>

            <Text style={st.label}>Full Name</Text>
            <TextInput style={st.input} placeholder="Your name" placeholderTextColor="#9ca3af" value={fullName} onChangeText={setFullName} />

            <Text style={st.label}>Gender</Text>
            <View style={st.optionRow}>
              {(['male', 'female'] as const).map((g) => (
                <TouchableOpacity key={g} style={[st.optionBtn, gender === g && st.optionActive]} onPress={() => setGender(g)}>
                  <Text style={[st.optionText, gender === g && st.optionTextActive]}>{g === 'male' ? 'Male' : 'Female'}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={st.label}>Age</Text>
            <TextInput style={st.input} placeholder="Years" placeholderTextColor="#9ca3af" value={age} onChangeText={setAge} keyboardType="numeric" />

            <Text style={st.label}>Height (cm)</Text>
            <TextInput style={st.input} placeholder="cm" placeholderTextColor="#9ca3af" value={height} onChangeText={setHeight} keyboardType="numeric" />

            <Text style={st.label}>Weight (kg)</Text>
            <TextInput style={st.input} placeholder="kg" placeholderTextColor="#9ca3af" value={weight} onChangeText={setWeight} keyboardType="numeric" />

            <Text style={st.label}>Body fat % (optional)</Text>
            <Text style={st.hint}>Helpful if you know it. Leave blank if you don't.</Text>
            <TextInput style={st.input} placeholder="e.g. 18" placeholderTextColor="#9ca3af" value={bodyFatPct} onChangeText={setBodyFatPct} keyboardType="numeric" />
          </View>
        )}

        {/* ── Step 1: Lifestyle ──────────── */}
        {step === 1 && (
          <View style={st.stepContent}>
            <Text style={st.question}>Your Lifestyle</Text>
            <Text style={st.subtitle}>This helps us set accurate calorie targets based on your real life, not a generic calculator.</Text>

            <Text style={st.label}>Work type</Text>
            {WORK_TYPES.map((w) => (
              <TouchableOpacity key={w.value} style={[st.listOption, workType === w.value && st.listOptionActive]} onPress={() => setWorkType(w.value)}>
                <Text style={[st.listOptionTitle, workType === w.value && st.listOptionTitleActive]}>{w.label}</Text>
                <Text style={st.listOptionDesc}>{w.description}</Text>
              </TouchableOpacity>
            ))}

            <Text style={st.label}>Overall activity level</Text>
            <Text style={st.hint}>Think about your job and your training together</Text>
            {ACTIVITY_LEVELS.map((level) => (
              <TouchableOpacity key={level.value} style={[st.listOption, activityLevel === level.value && st.listOptionActive]} onPress={() => setActivityLevel(level.value as UserMetrics['activityLevel'])}>
                <Text style={[st.listOptionTitle, activityLevel === level.value && st.listOptionTitleActive]}>{level.label}</Text>
                <Text style={st.listOptionDesc}>{level.description}</Text>
              </TouchableOpacity>
            ))}

            <Text style={st.label}>Hours of sleep per night</Text>
            <TextInput style={st.input} placeholder="e.g. 7" placeholderTextColor="#9ca3af" value={sleepHours} onChangeText={setSleepHours} keyboardType="numeric" />

            <Text style={st.label}>Sleep quality</Text>
            <View style={st.optionRow}>
              {SLEEP_QUALITY_OPTIONS.map((s) => (
                <TouchableOpacity key={s.value} style={[st.optionBtn, sleepQuality === s.value && st.optionActive]} onPress={() => setSleepQuality(s.value)}>
                  <Text style={[st.optionText, sleepQuality === s.value && st.optionTextActive]}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={st.label}>Stress level</Text>
            <View style={st.optionRow}>
              {STRESS_LEVELS.map((s) => (
                <TouchableOpacity key={s.value} style={[st.optionBtn, stressLevel === s.value && st.optionActive]} onPress={() => setStressLevel(s.value)}>
                  <Text style={[st.optionText, stressLevel === s.value && st.optionTextActive]}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={st.label}>Alcohol</Text>
            {ALCOHOL_FREQUENCIES.map((a) => (
              <TouchableOpacity key={a.value} style={[st.listOption, alcoholFrequency === a.value && st.listOptionActive]} onPress={() => setAlcoholFrequency(a.value)}>
                <Text style={[st.listOptionTitle, alcoholFrequency === a.value && st.listOptionTitleActive]}>{a.label}</Text>
                <Text style={st.listOptionDesc}>{a.description}</Text>
              </TouchableOpacity>
            ))}
            {alcoholFrequency !== 'none' && (
              <TextInput style={st.input} placeholder="e.g. a few beers at weekends, wine with dinner" placeholderTextColor="#9ca3af" value={alcoholDetails} onChangeText={setAlcoholDetails} />
            )}
          </View>
        )}

        {/* ── Step 2: Food Preferences ────────── */}
        {step === 2 && (
          <View style={st.stepContent}>
            <Text style={st.question}>Food Preferences</Text>
            <Text style={st.subtitle}>We want enough detail to make your meal plan feel like it was built by a real nutritionist, not a generic bot.</Text>

            <Text style={st.label}>Top 5 favourite meals or dishes</Text>
            <TextInput
              style={[st.input, st.textarea]}
              multiline
              placeholder="e.g. tacos, pasta carbonara, chicken stir-fry, salmon with rice, burrito bowls"
              placeholderTextColor="#9ca3af"
              value={favouriteFoods}
              onChangeText={setFavouriteFoods}
            />

            <Text style={st.label}>Foods you dislike</Text>
            <Text style={st.hint}>We'll avoid these in your meal plans</Text>
            <View style={st.chipGrid}>
              {COMMON_FOOD_DISLIKES.map((f) => (
                <TouchableOpacity key={f} style={[st.chip, foodDislikes.includes(f) && st.chipActive]} onPress={() => toggleArray(foodDislikes, setFoodDislikes, f)}>
                  <Text style={[st.chipText, foodDislikes.includes(f) && st.chipTextActive]}>{f}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={st.label}>Dietary restrictions</Text>
            <View style={st.chipGrid}>
              {DIETARY_RESTRICTIONS.map((r) => (
                <TouchableOpacity key={r.value} style={[st.chip, dietaryRestrictions.includes(r.value) && st.chipActive]} onPress={() => toggleArray(dietaryRestrictions, setDietaryRestrictions, r.value)}>
                  <Text style={[st.chipText, dietaryRestrictions.includes(r.value) && st.chipTextActive]}>{r.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={st.label}>Food allergies (optional)</Text>
            <TextInput style={st.input} placeholder="e.g. peanuts, shellfish" placeholderTextColor="#9ca3af" value={allergies} onChangeText={setAllergies} />

            <Text style={st.label}>Cooking skill</Text>
            <View style={st.chipGrid}>
              {COOKING_SKILLS.map((c) => (
                <TouchableOpacity key={c.value} style={[st.chip, st.chipWide, cookingSkill === c.value && st.chipActive]} onPress={() => setCookingSkill(c.value)}>
                  <Text style={[st.chipText, cookingSkill === c.value && st.chipTextActive]}>{c.label}</Text>
                  <Text style={st.chipDesc}>{c.description}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={st.label}>Meal preparation</Text>
            <View style={st.chipGrid}>
              {MEAL_PREP_PREFERENCES.map((m) => (
                <TouchableOpacity key={m.value} style={[st.chip, st.chipWide, mealPrepPref === m.value && st.chipActive]} onPress={() => setMealPrepPref(m.value)}>
                  <Text style={[st.chipText, mealPrepPref === m.value && st.chipTextActive]}>{m.label}</Text>
                  <Text style={st.chipDesc}>{m.description}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={st.label}>How adventurous are you with food?</Text>
            <Text style={st.hint}>1 = keep it familiar, 10 = happy to try almost anything</Text>
            <View style={st.chipGrid}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <TouchableOpacity key={n} style={[st.numberChip, foodAdventurousness === n && st.numberChipActive]} onPress={() => setFoodAdventurousness(n)}>
                  <Text style={[st.numberChipText, foodAdventurousness === n && st.numberChipTextActive]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ── Step 3: Snack habits ────────────────── */}
        {step === 3 && (
          <View style={st.stepContent}>
            <Text style={st.question}>Snack Habits</Text>
            <Text style={st.subtitle}>Understanding your snack pattern helps us build better swaps and more realistic plans.</Text>

            <Text style={st.label}>What do you currently snack on?</Text>
            <TextInput
              style={[st.input, st.textarea]}
              multiline
              placeholder="e.g. crisps, chocolate, biscuits, protein bars, fruit, yogurt"
              placeholderTextColor="#9ca3af"
              value={currentSnacks}
              onChangeText={setCurrentSnacks}
            />

            <Text style={st.label}>Why do you usually snack?</Text>
            {SNACK_MOTIVATIONS.map((s) => (
              <TouchableOpacity key={s.value} style={[st.listOption, snackMotivation === s.value && st.listOptionActive]} onPress={() => setSnackMotivation(s.value)}>
                <Text style={[st.listOptionTitle, snackMotivation === s.value && st.listOptionTitleActive]}>{s.label}</Text>
                <Text style={st.listOptionDesc}>{s.description}</Text>
              </TouchableOpacity>
            ))}

            <Text style={st.label}>Sweet or savoury?</Text>
            <View style={st.optionRow}>
              {SNACK_PREFERENCES.map((s) => (
                <TouchableOpacity key={s.value} style={[st.optionBtn, snackPreference === s.value && st.optionActive]} onPress={() => setSnackPreference(s.value)}>
                  <Text style={[st.optionText, snackPreference === s.value && st.optionTextActive]}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={st.label}>Late-night snacking</Text>
            <View style={st.optionRow}>
              {[{ label: 'Yes', value: true }, { label: 'No', value: false }].map((option) => (
                <TouchableOpacity key={option.label} style={[st.optionBtn, lateNightSnacking === option.value && st.optionActive]} onPress={() => setLateNightSnacking(option.value)}>
                  <Text style={[st.optionText, lateNightSnacking === option.value && st.optionTextActive]}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ── Step 4: Health ────────────────────── */}
        {step === 4 && (
          <View style={st.stepContent}>
            <Text style={st.question}>Health & Medical</Text>
            <Text style={st.subtitle}>This helps us avoid exercises or nutrition choices that could cause problems.</Text>

            <Text style={st.label}>Any injuries or physical limitations?</Text>
            <Text style={st.hint}>Select all that apply (or skip)</Text>
            <View style={st.chipGrid}>
              {COMMON_INJURIES.map((inj) => (
                <TouchableOpacity key={inj} style={[st.chip, injuries.includes(inj) && st.chipActive]} onPress={() => toggleArray(injuries, setInjuries, inj)}>
                  <Text style={[st.chipText, injuries.includes(inj) && st.chipTextActive]}>{inj}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={st.input} placeholder="Other injury (optional)" placeholderTextColor="#9ca3af" value={customInjury} onChangeText={setCustomInjury} />

            <Text style={st.label}>Medical conditions?</Text>
            <Text style={st.hint}>Select any that apply</Text>
            <View style={st.chipGrid}>
              {COMMON_CONDITIONS.map((cond) => (
                <TouchableOpacity key={cond} style={[st.chip, conditions.includes(cond) && st.chipActive]} onPress={() => toggleArray(conditions, setConditions, cond)}>
                  <Text style={[st.chipText, conditions.includes(cond) && st.chipTextActive]}>{cond}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={st.label}>Current medications (optional)</Text>
            <TextInput style={st.input} placeholder="e.g. Metformin, Levothyroxine" placeholderTextColor="#9ca3af" value={medications} onChangeText={setMedications} />
          </View>
        )}

        {/* ── Step 5: Training ────────────────────── */}
        {step === 5 && (
          <View style={st.stepContent}>
            <Text style={st.question}>Training Background</Text>
            <Text style={st.subtitle}>This shapes your programme structure, progression, and exercise selection.</Text>

            <Text style={st.label}>Training experience</Text>
            {TRAINING_EXPERIENCE.map((level) => (
              <TouchableOpacity key={level.value} style={[st.listOption, experience === level.value && st.listOptionActive]} onPress={() => setExperience(level.value)}>
                <Text style={[st.listOptionTitle, experience === level.value && st.listOptionTitleActive]}>{level.label}</Text>
                <Text style={st.listOptionDesc}>{level.description}</Text>
              </TouchableOpacity>
            ))}

            <Text style={st.label}>Years training (optional)</Text>
            <TextInput style={st.input} placeholder="e.g. 3" placeholderTextColor="#9ca3af" value={yearsTraining} onChangeText={setYearsTraining} keyboardType="numeric" />

            <Text style={st.label}>Equipment access</Text>
            {EQUIPMENT_ACCESS.map((eq) => (
              <TouchableOpacity key={eq.value} style={[st.listOption, equipmentAccess === eq.value && st.listOptionActive]} onPress={() => setEquipmentAccess(eq.value)}>
                <Text style={[st.listOptionTitle, equipmentAccess === eq.value && st.listOptionTitleActive]}>{eq.label}</Text>
                <Text style={st.listOptionDesc}>{eq.description}</Text>
              </TouchableOpacity>
            ))}

            <Text style={st.label}>Preferred training style</Text>
            <Text style={st.hint}>Select one or more</Text>
            <View style={st.chipGrid}>
              {TRAINING_STYLES.map((s) => (
                <TouchableOpacity key={s.value} style={[st.chip, trainingStyles.includes(s.value) && st.chipActive]} onPress={() => toggleArray(trainingStyles, setTrainingStyles, s.value)}>
                  <Text style={[st.chipText, trainingStyles.includes(s.value) && st.chipTextActive]}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={st.label}>Secondary goal</Text>
            {SECONDARY_TRAINING_GOALS.map((g) => (
              <TouchableOpacity key={g.value} style={[st.listOption, secondaryGoal === g.value && st.listOptionActive]} onPress={() => setSecondaryGoal(g.value)}>
                <Text style={[st.listOptionTitle, secondaryGoal === g.value && st.listOptionTitleActive]}>{g.label}</Text>
                <Text style={st.listOptionDesc}>{g.description}</Text>
              </TouchableOpacity>
            ))}

            <Text style={st.label}>How long can you train per session?</Text>
            <View style={st.chipGrid}>
              {SESSION_DURATIONS.map((duration) => (
                <TouchableOpacity key={duration.value} style={[st.chip, maxSessionMinutes === duration.value && st.chipActive]} onPress={() => setMaxSessionMinutes(duration.value)}>
                  <Text style={[st.chipText, maxSessionMinutes === duration.value && st.chipTextActive]}>{duration.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={st.label}>Estimated 1-rep maxes (optional)</Text>
            <TextInput style={st.input} placeholder="Squat (kg)" placeholderTextColor="#9ca3af" value={squat1rm} onChangeText={setSquat1rm} keyboardType="numeric" />
            <TextInput style={st.input} placeholder="Bench press (kg)" placeholderTextColor="#9ca3af" value={bench1rm} onChangeText={setBench1rm} keyboardType="numeric" />
            <TextInput style={st.input} placeholder="Deadlift (kg)" placeholderTextColor="#9ca3af" value={deadlift1rm} onChangeText={setDeadlift1rm} keyboardType="numeric" />
            <TextInput style={st.input} placeholder="Overhead press (kg)" placeholderTextColor="#9ca3af" value={ohp1rm} onChangeText={setOhp1rm} keyboardType="numeric" />

            <Text style={st.label}>Do you do cardio?</Text>
            <View style={st.optionRow}>
              {[{ label: 'Yes', value: true }, { label: 'No', value: false }].map((option) => (
                <TouchableOpacity key={option.label} style={[st.optionBtn, doesCardio === option.value && st.optionActive]} onPress={() => setDoesCardio(option.value)}>
                  <Text style={[st.optionText, doesCardio === option.value && st.optionTextActive]}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {doesCardio && (
              <>
                <Text style={st.label}>Preferred cardio types</Text>
                <View style={st.chipGrid}>
                  {CARDIO_TYPES.map((cardio) => (
                    <TouchableOpacity key={cardio.name} style={[st.chip, cardioTypesPreferred.includes(cardio.name) && st.chipActive]} onPress={() => toggleArray(cardioTypesPreferred, setCardioTypesPreferred, cardio.name)}>
                      <Text style={[st.chipText, cardioTypesPreferred.includes(cardio.name) && st.chipTextActive]}>{cardio.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={st.label}>Cardio sessions per week</Text>
                <View style={st.daysRow}>
                  {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                    <TouchableOpacity key={d} style={[st.dayBtn, cardioFrequency === d && st.dayBtnActive]} onPress={() => setCardioFrequency(d)}>
                      <Text style={[st.dayBtnText, cardioFrequency === d && st.dayBtnTextActive]}>{d}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={st.label}>Typical cardio duration</Text>
                <View style={st.chipGrid}>
                  {[15, 20, 30, 45, 60].map((d) => (
                    <TouchableOpacity key={d} style={[st.chip, cardioDuration === d && st.chipActive]} onPress={() => setCardioDuration(d)}>
                      <Text style={[st.chipText, cardioDuration === d && st.chipTextActive]}>{d} min</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </View>
        )}

        {/* ── Step 6: Goals ────────────────────── */}
        {step === 6 && (
          <View style={st.stepContent}>
            <Text style={st.question}>Your Goals</Text>
            <Text style={st.subtitle}>This helps us shape the pace of your cut, surplus, or performance phase in a realistic way.</Text>

            <Text style={st.label}>Primary goal</Text>
            {FITNESS_GOALS.map((g) => (
              <TouchableOpacity key={g.value} style={[st.listOption, goal === g.value && st.listOptionActive]} onPress={() => setGoal(g.value as UserMetrics['goal'])}>
                <Text style={[st.listOptionTitle, goal === g.value && st.listOptionTitleActive]}>{g.label}</Text>
                <Text style={st.listOptionDesc}>{g.description}</Text>
              </TouchableOpacity>
            ))}

            <Text style={st.label}>Target weight (optional)</Text>
            <Text style={st.hint}>Leave this blank if you're aiming more for a look, feel, or performance outcome than a specific number.</Text>
            <TextInput style={st.input} placeholder="kg" placeholderTextColor="#9ca3af" value={targetWeight} onChangeText={setTargetWeight} keyboardType="numeric" />

            <Text style={st.label}>Timeline</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.timeScroll}>
              <View style={st.timeRow}>
                {GOAL_TIMELINES.map((t) => (
                  <TouchableOpacity key={t.value} style={[st.timeBtn, goalTimeline === t.value && st.timeBtnActive]} onPress={() => setGoalTimeline(t.value)}>
                    <Text style={[st.timeBtnText, goalTimeline === t.value && st.timeBtnTextActive]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={st.label}>What motivates you?</Text>
            <Text style={st.hint}>Select all that apply</Text>
            <View style={st.chipGrid}>
              {MOTIVATIONS.map((m) => (
                <TouchableOpacity key={m} style={[st.chip, motivation.includes(m) && st.chipActive]} onPress={() => toggleArray(motivation, setMotivation, m)}>
                  <Text style={[st.chipText, motivation.includes(m) && st.chipTextActive]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ── Step 7: Schedule ─────────────────── */}
        {step === 7 && (
          <View style={st.stepContent}>
            <Text style={st.question}>Your Schedule</Text>
            <Text style={st.subtitle}>We'll time your meals around your workout for optimal results</Text>

            <Text style={st.label}>What time do you wake up?</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.timeScroll}>
              <View style={st.timeRow}>
                {TIME_OPTIONS.filter(t => t >= '05:00' && t <= '10:00').map((t) => (
                  <TouchableOpacity key={t} style={[st.timeBtn, wakeTime === t && st.timeBtnActive]} onPress={() => setWakeTime(t)}>
                    <Text style={[st.timeBtnText, wakeTime === t && st.timeBtnTextActive]}>{fmt12(t)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={st.label}>Preferred workout time</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.timeScroll}>
              <View style={st.timeRow}>
                {TIME_OPTIONS.map((t) => (
                  <TouchableOpacity key={t} style={[st.timeBtn, workoutTime === t && st.timeBtnActive]} onPress={() => setWorkoutTime(t)}>
                    <Text style={[st.timeBtnText, workoutTime === t && st.timeBtnTextActive]}>{fmt12(t)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={st.label}>What time do you go to bed?</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.timeScroll}>
              <View style={st.timeRow}>
                {TIME_OPTIONS.filter(t => t >= '20:00' && t <= '23:00').map((t) => (
                  <TouchableOpacity key={t} style={[st.timeBtn, sleepTime === t && st.timeBtnActive]} onPress={() => setSleepTime(t)}>
                    <Text style={[st.timeBtnText, sleepTime === t && st.timeBtnTextActive]}>{fmt12(t)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={st.label}>Work start time</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.timeScroll}>
              <View style={st.timeRow}>
                {TIME_OPTIONS.map((t) => (
                  <TouchableOpacity key={t} style={[st.timeBtn, workStartTime === t && st.timeBtnActive]} onPress={() => setWorkStartTime(t)}>
                    <Text style={[st.timeBtnText, workStartTime === t && st.timeBtnTextActive]}>{fmt12(t)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={st.label}>Work end time</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.timeScroll}>
              <View style={st.timeRow}>
                {TIME_OPTIONS.map((t) => (
                  <TouchableOpacity key={t} style={[st.timeBtn, workEndTime === t && st.timeBtnActive]} onPress={() => setWorkEndTime(t)}>
                    <Text style={[st.timeBtnText, workEndTime === t && st.timeBtnTextActive]}>{fmt12(t)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={st.label}>Training days per week</Text>
            <View style={st.daysRow}>
              {[2, 3, 4, 5, 6, 7].map((d) => (
                <TouchableOpacity key={d} style={[st.dayBtn, workoutDays === d && st.dayBtnActive]} onPress={() => setWorkoutDays(d)}>
                  <Text style={[st.dayBtnText, workoutDays === d && st.dayBtnTextActive]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={st.label}>Meals per day</Text>
            <View style={st.daysRow}>
              {[2, 3, 4, 5].map((m) => (
                <TouchableOpacity key={m} style={[st.dayBtn, mealsPerDay === m && st.dayBtnActive]} onPress={() => setMealsPerDay(m)}>
                  <Text style={[st.dayBtnText, mealsPerDay === m && st.dayBtnTextActive]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={st.label}>Meal anchors</Text>
            <Text style={st.hint}>We'll build the plan around these main meal times</Text>
            <Text style={st.label}>Breakfast</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.timeScroll}>
              <View style={st.timeRow}>
                {TIME_OPTIONS.map((t) => (
                  <TouchableOpacity key={t} style={[st.timeBtn, breakfastTime === t && st.timeBtnActive]} onPress={() => setBreakfastTime(t)}>
                    <Text style={[st.timeBtnText, breakfastTime === t && st.timeBtnTextActive]}>{fmt12(t)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <Text style={st.label}>Lunch</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.timeScroll}>
              <View style={st.timeRow}>
                {TIME_OPTIONS.map((t) => (
                  <TouchableOpacity key={t} style={[st.timeBtn, lunchTime === t && st.timeBtnActive]} onPress={() => setLunchTime(t)}>
                    <Text style={[st.timeBtnText, lunchTime === t && st.timeBtnTextActive]}>{fmt12(t)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <Text style={st.label}>Dinner</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.timeScroll}>
              <View style={st.timeRow}>
                {TIME_OPTIONS.map((t) => (
                  <TouchableOpacity key={t} style={[st.timeBtn, dinnerTime === t && st.timeBtnActive]} onPress={() => setDinnerTime(t)}>
                    <Text style={[st.timeBtnText, dinnerTime === t && st.timeBtnTextActive]}>{fmt12(t)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* ── Step 8: Review ───────────────────── */}
        {step === 8 && (
          <View style={st.stepContent}>
            <Text style={st.question}>Your Profile Summary</Text>
            {age && height && weight && (() => {
              const targets = calculateNutritionTargets({
                age: parseInt(age), height: parseInt(height), weight: parseInt(weight), gender, activityLevel, goal,
              })
              return (
                <>
                  <View style={st.reviewCard}>
                    <Text style={st.reviewSection}>Nutrition Targets</Text>
                    <ReviewRow label="Calories" value={`${targets.calories} kcal/day`} />
                    <ReviewRow label="Protein" value={`${targets.protein}g`} />
                    <ReviewRow label="Carbs" value={`${targets.carbs}g`} />
                    <ReviewRow label="Fat" value={`${targets.fat}g`} />
                    <ReviewRow label="Water" value={`${(targets.water / 1000).toFixed(1)}L`} />
                  </View>

                  <View style={st.reviewCard}>
                    <Text style={st.reviewSection}>Schedule</Text>
                    <ReviewRow label="Wake up" value={fmt12(wakeTime)} />
                    <ReviewRow label="Sleep" value={fmt12(sleepTime)} />
                    <ReviewRow label="Workout" value={fmt12(workoutTime)} />
                    <ReviewRow label="Work" value={`${fmt12(workStartTime)} - ${fmt12(workEndTime)}`} />
                    <ReviewRow label="Training" value={`${workoutDays}× / week`} />
                    <ReviewRow label="Meals" value={`${mealsPerDay} / day`} />
                    <ReviewRow label="Breakfast" value={fmt12(breakfastTime)} />
                    <ReviewRow label="Lunch" value={fmt12(lunchTime)} />
                    <ReviewRow label="Dinner" value={fmt12(dinnerTime)} />
                  </View>

                  <View style={st.reviewCard}>
                    <Text style={st.reviewSection}>Profile</Text>
                    {bodyFatPct ? <ReviewRow label="Body fat" value={`${bodyFatPct}%`} /> : null}
                    <ReviewRow label="Work type" value={WORK_TYPES.find(w => w.value === workType)?.label ?? workType} />
                    <ReviewRow label="Sleep" value={`${sleepHours || '?'}h · ${SLEEP_QUALITY_OPTIONS.find(s => s.value === sleepQuality)?.label ?? sleepQuality}`} />
                    <ReviewRow label="Stress" value={STRESS_LEVELS.find(s => s.value === stressLevel)?.label ?? stressLevel} />
                    {alcoholFrequency !== 'none' ? <ReviewRow label="Alcohol" value={ALCOHOL_FREQUENCIES.find(a => a.value === alcoholFrequency)?.label ?? alcoholFrequency} /> : null}
                    <ReviewRow label="Experience" value={TRAINING_EXPERIENCE.find(t => t.value === experience)?.label ?? experience} />
                    {yearsTraining ? <ReviewRow label="Years training" value={yearsTraining} /> : null}
                    <ReviewRow label="Equipment" value={EQUIPMENT_ACCESS.find(e => e.value === equipmentAccess)?.label ?? equipmentAccess} />
                    <ReviewRow label="Goal" value={FITNESS_GOALS.find(g => g.value === goal)?.label ?? goal} />
                    {targetWeight ? <ReviewRow label="Target weight" value={`${targetWeight} kg`} /> : null}
                    <ReviewRow label="Timeline" value={GOAL_TIMELINES.find(t => t.value === goalTimeline)?.label ?? goalTimeline} />
                    <ReviewRow label="Cooking" value={COOKING_SKILLS.find(c => c.value === cookingSkill)?.label ?? cookingSkill} />
                    {favouriteFoods ? <ReviewRow label="Favourite meals" value={favouriteFoods} /> : null}
                    {injuries.length > 0 && <ReviewRow label="Injuries" value={injuries.join(', ')} />}
                    {dietaryRestrictions.length > 0 && <ReviewRow label="Diet" value={dietaryRestrictions.map(r => DIETARY_RESTRICTIONS.find(d => d.value === r)?.label ?? r).join(', ')} />}
                    {foodDislikes.length > 0 && <ReviewRow label="Dislikes" value={foodDislikes.join(', ')} />}
                    {currentSnacks ? <ReviewRow label="Snacks" value={currentSnacks} /> : null}
                    {secondaryGoal !== 'none' ? <ReviewRow label="Secondary goal" value={SECONDARY_TRAINING_GOALS.find(g => g.value === secondaryGoal)?.label ?? secondaryGoal} /> : null}
                    <ReviewRow label="Session length" value={`${maxSessionMinutes} min`} />
                  </View>
                </>
              )
            })()}

            <View style={st.aiNote}>
              <Ionicons name="sparkles" size={18} color="#16a34a" />
              <Text style={st.aiNoteText}>
                After setup, AI will use all of this to generate a personalized meal plan and training program — timed around your schedule, avoiding your injuries and food dislikes.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Navigation */}
      <View style={st.navRow}>
        {step > 0 && (
          <TouchableOpacity style={st.backBtn} onPress={() => setStep(step - 1)}>
            <Text style={st.backText}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[st.nextBtn, !canContinue() && st.btnDisabled]}
          onPress={() => {
            if (step < STEPS.length - 1) setStep(step + 1)
            else handleFinish()
          }}
          disabled={!canContinue() || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={st.nextText}>{step === STEPS.length - 1 ? 'Get Started' : 'Continue'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={st.reviewRow}>
      <Text style={st.reviewLabel}>{label}</Text>
      <Text style={st.reviewValue}>{value}</Text>
    </View>
  )
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: brandColors.background },
  hero: {
    marginHorizontal: 18,
    marginTop: 10,
    borderRadius: 28,
    padding: 20,
    backgroundColor: brandColors.brand900,
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    top: -26,
    right: -18,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(77, 196, 255, 0.2)',
  },
  heroTitle: {
    marginTop: 20,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -1,
  },
  heroSubtitle: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 14,
    lineHeight: 20,
  },
  progressRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingTop: 18 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(127, 147, 167, 0.34)' },
  dotActive: { backgroundColor: brandColors.brand500, width: 20 },
  stepLabel: { textAlign: 'center', fontSize: 13, color: brandColors.textMuted, marginTop: 8 },
  content: { padding: 24, paddingBottom: 40 },
  stepContent: { gap: 6 },
  question: { fontSize: 24, fontWeight: '800', color: brandColors.foreground, marginBottom: 4, letterSpacing: -0.6 },
  subtitle: { fontSize: 14, color: brandColors.textMuted, marginBottom: 8 },
  label: { fontSize: 14, fontWeight: '700', color: brandColors.foregroundSoft, marginTop: 14, marginBottom: 6 },
  hint: { fontSize: 12, color: brandColors.textSubtle, marginBottom: 6, marginTop: -4 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderWidth: 1,
    borderColor: brandColors.lineStrong,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: brandColors.foreground,
  },
  textarea: {
    minHeight: 92,
    textAlignVertical: 'top',
  },
  // Two-option row
  optionRow: { flexDirection: 'row', gap: 10 },
  optionBtn: { flex: 1, backgroundColor: 'rgba(255,255,255,0.88)', borderWidth: 1, borderColor: brandColors.line, borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  optionActive: { borderColor: 'rgba(29, 168, 240, 0.4)', backgroundColor: brandColors.brand100 },
  optionText: { fontSize: 16, fontWeight: '600', color: brandColors.textMuted },
  optionTextActive: { color: brandColors.brand500 },
  // List options
  listOption: { backgroundColor: 'rgba(255,255,255,0.9)', borderWidth: 1, borderColor: brandColors.line, borderRadius: 18, padding: 14, marginBottom: 8 },
  listOptionActive: { borderColor: 'rgba(29, 168, 240, 0.42)', backgroundColor: brandColors.brand100, ...brandShadow },
  listOptionTitle: { fontSize: 15, fontWeight: '700', color: brandColors.foregroundSoft },
  listOptionTitleActive: { color: brandColors.brand500 },
  listOptionDesc: { fontSize: 12, color: brandColors.textMuted, marginTop: 2 },
  // Chip grid (multi-select)
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: 'rgba(255,255,255,0.88)', borderWidth: 1, borderColor: brandColors.line, borderRadius: 14, paddingVertical: 9, paddingHorizontal: 14 },
  chipWide: { width: '100%' as unknown as number },
  chipActive: { borderColor: 'rgba(29, 168, 240, 0.42)', backgroundColor: brandColors.brand100 },
  chipText: { fontSize: 13, fontWeight: '600', color: brandColors.textMuted },
  chipTextActive: { color: brandColors.brand500 },
  chipDesc: { fontSize: 11, color: brandColors.textSubtle, marginTop: 2 },
  numberChip: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.88)', borderWidth: 1, borderColor: brandColors.line, alignItems: 'center', justifyContent: 'center' },
  numberChipActive: { borderColor: 'rgba(29, 168, 240, 0.42)', backgroundColor: brandColors.brand100 },
  numberChipText: { fontSize: 15, fontWeight: '700', color: brandColors.textMuted },
  numberChipTextActive: { color: brandColors.brand500 },
  // Time pickers
  timeScroll: { marginBottom: 4 },
  timeRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  timeBtn: { backgroundColor: 'rgba(255,255,255,0.88)', borderWidth: 1, borderColor: brandColors.line, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14 },
  timeBtnActive: { borderColor: 'rgba(29, 168, 240, 0.42)', backgroundColor: brandColors.brand100 },
  timeBtnText: { fontSize: 14, fontWeight: '600', color: brandColors.textMuted },
  timeBtnTextActive: { color: brandColors.brand500 },
  // Day pickers
  daysRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  dayBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.88)', borderWidth: 1, borderColor: brandColors.line, alignItems: 'center', justifyContent: 'center' },
  dayBtnActive: { borderColor: 'rgba(29, 168, 240, 0.42)', backgroundColor: brandColors.brand100 },
  dayBtnText: { fontSize: 18, fontWeight: '700', color: brandColors.textMuted },
  dayBtnTextActive: { color: brandColors.brand500 },
  // Review
  reviewCard: { backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 22, borderWidth: 1, borderColor: brandColors.line, padding: 18, gap: 10, marginBottom: 12, ...brandShadow },
  reviewSection: { fontSize: 14, fontWeight: '700', color: brandColors.brand500, marginBottom: 2 },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between' },
  reviewLabel: { fontSize: 14, color: brandColors.textMuted, flex: 1 },
  reviewValue: { fontSize: 14, fontWeight: '700', color: brandColors.foreground, flex: 1, textAlign: 'right' },
  aiNote: { flexDirection: 'row', backgroundColor: brandColors.brand100, borderRadius: 18, padding: 14, gap: 10, marginTop: 8, alignItems: 'flex-start', borderWidth: 1, borderColor: 'rgba(77, 196, 255, 0.2)' },
  aiNoteText: { fontSize: 13, color: '#0f4262', flex: 1, lineHeight: 18 },
  // Nav
  navRow: { flexDirection: 'row', paddingHorizontal: 24, paddingBottom: 32, gap: 12 },
  backBtn: { flex: 1, borderWidth: 1, borderColor: brandColors.lineStrong, borderRadius: 16, paddingVertical: 16, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.84)' },
  backText: { fontSize: 16, fontWeight: '600', color: brandColors.textMuted },
  nextBtn: { flex: 2, backgroundColor: brandColors.brand900, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  nextText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },
})
