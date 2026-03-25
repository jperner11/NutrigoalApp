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
  TRAINING_STYLES, COMMON_INJURIES, COMMON_CONDITIONS, DIETARY_RESTRICTIONS,
  COMMON_FOOD_DISLIKES, COOKING_SKILLS, MEAL_PREP_PREFERENCES, WORK_TYPES,
  SLEEP_QUALITY_OPTIONS, STRESS_LEVELS, GOAL_TIMELINES, MOTIVATIONS,
  calculateNutritionTargets,
} from '@nutrigoal/shared'
import type { UserMetrics } from '@nutrigoal/shared'

const STEPS = ['Basics', 'Health', 'Fitness', 'Nutrition', 'Lifestyle', 'Goals', 'Schedule', 'Review']

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

  // Step 1: Health & Medical
  const [injuries, setInjuries] = useState<string[]>([])
  const [customInjury, setCustomInjury] = useState('')
  const [conditions, setConditions] = useState<string[]>([])
  const [medications, setMedications] = useState('')

  // Step 2: Fitness Background
  const [experience, setExperience] = useState('beginner')
  const [equipmentAccess, setEquipmentAccess] = useState('full_gym')
  const [trainingStyles, setTrainingStyles] = useState<string[]>(['hypertrophy'])

  // Step 3: Nutrition Background
  const [activityLevel, setActivityLevel] = useState<UserMetrics['activityLevel']>('moderately_active')
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([])
  const [allergies, setAllergies] = useState('')
  const [foodDislikes, setFoodDislikes] = useState<string[]>([])
  const [cookingSkill, setCookingSkill] = useState('intermediate')
  const [mealPrepPref, setMealPrepPref] = useState('daily')

  // Step 4: Lifestyle
  const [workType, setWorkType] = useState('desk')
  const [sleepQuality, setSleepQuality] = useState('average')
  const [stressLevel, setStressLevel] = useState('moderate')

  // Step 5: Goals
  const [goal, setGoal] = useState<UserMetrics['goal']>('maintenance')
  const [targetWeight, setTargetWeight] = useState('')
  const [goalTimeline, setGoalTimeline] = useState('steady')
  const [motivation, setMotivation] = useState<string[]>([])

  // Step 6: Schedule
  const [wakeTime, setWakeTime] = useState('07:00')
  const [workoutTime, setWorkoutTime] = useState('08:00')
  const [workoutDays, setWorkoutDays] = useState(4)
  const [mealsPerDay, setMealsPerDay] = useState(3)

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
      // Fitness
      training_experience: experience,
      equipment_access: equipmentAccess,
      training_style: trainingStyles,
      // Nutrition
      dietary_restrictions: dietaryRestrictions,
      allergies: allergies.split(',').map(a => a.trim()).filter(Boolean),
      food_dislikes: foodDislikes,
      cooking_skill: cookingSkill,
      meal_prep_preference: mealPrepPref,
      // Lifestyle
      work_type: workType,
      sleep_quality: sleepQuality,
      stress_level: stressLevel,
      // Goals
      target_weight_kg: targetWeight ? parseFloat(targetWeight) : null,
      goal_timeline: goalTimeline,
      motivation,
      // Schedule
      wake_time: wakeTime,
      workout_time: workoutTime,
      workout_days_per_week: workoutDays,
      meals_per_day: mealsPerDay,
      onboarding_completed: true,
    }).eq('id', user.id)

    setLoading(false)

    if (error) {
      Alert.alert('Error', error.message)
    } else {
      await refreshProfile()
      Alert.alert(
        'Welcome to NutriGoal!',
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
      {/* Progress */}
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
          </View>
        )}

        {/* ── Step 1: Health & Medical ──────────── */}
        {step === 1 && (
          <View style={st.stepContent}>
            <Text style={st.question}>Health & Medical</Text>
            <Text style={st.subtitle}>This helps us avoid exercises that could aggravate existing issues</Text>

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

        {/* ── Step 2: Fitness Background ────────── */}
        {step === 2 && (
          <View style={st.stepContent}>
            <Text style={st.question}>Fitness Background</Text>

            <Text style={st.label}>Training experience</Text>
            {TRAINING_EXPERIENCE.map((level) => (
              <TouchableOpacity key={level.value} style={[st.listOption, experience === level.value && st.listOptionActive]} onPress={() => setExperience(level.value)}>
                <Text style={[st.listOptionTitle, experience === level.value && st.listOptionTitleActive]}>{level.label}</Text>
                <Text style={st.listOptionDesc}>{level.description}</Text>
              </TouchableOpacity>
            ))}

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
          </View>
        )}

        {/* ── Step 3: Nutrition Background ──────── */}
        {step === 3 && (
          <View style={st.stepContent}>
            <Text style={st.question}>Nutrition Background</Text>

            <Text style={st.label}>How active are you?</Text>
            {ACTIVITY_LEVELS.map((level) => (
              <TouchableOpacity key={level.value} style={[st.listOption, activityLevel === level.value && st.listOptionActive]} onPress={() => setActivityLevel(level.value as UserMetrics['activityLevel'])}>
                <Text style={[st.listOptionTitle, activityLevel === level.value && st.listOptionTitleActive]}>{level.label}</Text>
                <Text style={st.listOptionDesc}>{level.description}</Text>
              </TouchableOpacity>
            ))}

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

            <Text style={st.label}>Foods you dislike</Text>
            <Text style={st.hint}>We'll avoid these in your meal plans</Text>
            <View style={st.chipGrid}>
              {COMMON_FOOD_DISLIKES.map((f) => (
                <TouchableOpacity key={f} style={[st.chip, foodDislikes.includes(f) && st.chipActive]} onPress={() => toggleArray(foodDislikes, setFoodDislikes, f)}>
                  <Text style={[st.chipText, foodDislikes.includes(f) && st.chipTextActive]}>{f}</Text>
                </TouchableOpacity>
              ))}
            </View>

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
          </View>
        )}

        {/* ── Step 4: Lifestyle ────────────────── */}
        {step === 4 && (
          <View style={st.stepContent}>
            <Text style={st.question}>Your Lifestyle</Text>
            <Text style={st.subtitle}>Helps us adjust calorie needs and recovery recommendations</Text>

            <Text style={st.label}>Work type</Text>
            {WORK_TYPES.map((w) => (
              <TouchableOpacity key={w.value} style={[st.listOption, workType === w.value && st.listOptionActive]} onPress={() => setWorkType(w.value)}>
                <Text style={[st.listOptionTitle, workType === w.value && st.listOptionTitleActive]}>{w.label}</Text>
                <Text style={st.listOptionDesc}>{w.description}</Text>
              </TouchableOpacity>
            ))}

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
          </View>
        )}

        {/* ── Step 5: Goals ────────────────────── */}
        {step === 5 && (
          <View style={st.stepContent}>
            <Text style={st.question}>Your Goals</Text>

            <Text style={st.label}>Primary goal</Text>
            {FITNESS_GOALS.map((g) => (
              <TouchableOpacity key={g.value} style={[st.listOption, goal === g.value && st.listOptionActive]} onPress={() => setGoal(g.value as UserMetrics['goal'])}>
                <Text style={[st.listOptionTitle, goal === g.value && st.listOptionTitleActive]}>{g.label}</Text>
                <Text style={st.listOptionDesc}>{g.description}</Text>
              </TouchableOpacity>
            ))}

            <Text style={st.label}>Target weight (optional)</Text>
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

        {/* ── Step 6: Schedule ─────────────────── */}
        {step === 6 && (
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
          </View>
        )}

        {/* ── Step 7: Review ───────────────────── */}
        {step === 7 && (
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
                    <ReviewRow label="Workout" value={fmt12(workoutTime)} />
                    <ReviewRow label="Training" value={`${workoutDays}× / week`} />
                    <ReviewRow label="Meals" value={`${mealsPerDay} / day`} />
                  </View>

                  <View style={st.reviewCard}>
                    <Text style={st.reviewSection}>Profile</Text>
                    <ReviewRow label="Experience" value={TRAINING_EXPERIENCE.find(t => t.value === experience)?.label ?? experience} />
                    <ReviewRow label="Equipment" value={EQUIPMENT_ACCESS.find(e => e.value === equipmentAccess)?.label ?? equipmentAccess} />
                    <ReviewRow label="Goal" value={FITNESS_GOALS.find(g => g.value === goal)?.label ?? goal} />
                    {targetWeight ? <ReviewRow label="Target weight" value={`${targetWeight} kg`} /> : null}
                    <ReviewRow label="Cooking" value={COOKING_SKILLS.find(c => c.value === cookingSkill)?.label ?? cookingSkill} />
                    {injuries.length > 0 && <ReviewRow label="Injuries" value={injuries.join(', ')} />}
                    {dietaryRestrictions.length > 0 && <ReviewRow label="Diet" value={dietaryRestrictions.map(r => DIETARY_RESTRICTIONS.find(d => d.value === r)?.label ?? r).join(', ')} />}
                    {foodDislikes.length > 0 && <ReviewRow label="Dislikes" value={foodDislikes.join(', ')} />}
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
  container: { flex: 1, backgroundColor: '#f8fafc' },
  progressRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingTop: 16 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#d1d5db' },
  dotActive: { backgroundColor: '#7c3aed', width: 20 },
  stepLabel: { textAlign: 'center', fontSize: 13, color: '#6b7280', marginTop: 8 },
  content: { padding: 24, paddingBottom: 40 },
  stepContent: { gap: 6 },
  question: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#6b7280', marginBottom: 8 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginTop: 14, marginBottom: 6 },
  hint: { fontSize: 12, color: '#9ca3af', marginBottom: 6, marginTop: -4 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: '#111827' },
  // Two-option row
  optionRow: { flexDirection: 'row', gap: 10 },
  optionBtn: { flex: 1, backgroundColor: '#fff', borderWidth: 2, borderColor: '#e5e7eb', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  optionActive: { borderColor: '#7c3aed', backgroundColor: '#f8fafc' },
  optionText: { fontSize: 16, fontWeight: '600', color: '#6b7280' },
  optionTextActive: { color: '#7c3aed' },
  // List options
  listOption: { backgroundColor: '#fff', borderWidth: 2, borderColor: '#e5e7eb', borderRadius: 12, padding: 14, marginBottom: 8 },
  listOptionActive: { borderColor: '#7c3aed', backgroundColor: '#f8fafc' },
  listOptionTitle: { fontSize: 15, fontWeight: '700', color: '#374151' },
  listOptionTitleActive: { color: '#7c3aed' },
  listOptionDesc: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  // Chip grid (multi-select)
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#fff', borderWidth: 2, borderColor: '#e5e7eb', borderRadius: 10, paddingVertical: 9, paddingHorizontal: 14 },
  chipWide: { width: '100%' as unknown as number },
  chipActive: { borderColor: '#7c3aed', backgroundColor: '#f8fafc' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  chipTextActive: { color: '#7c3aed' },
  chipDesc: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  // Time pickers
  timeScroll: { marginBottom: 4 },
  timeRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  timeBtn: { backgroundColor: '#fff', borderWidth: 2, borderColor: '#e5e7eb', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 },
  timeBtnActive: { borderColor: '#7c3aed', backgroundColor: '#f8fafc' },
  timeBtnText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  timeBtnTextActive: { color: '#7c3aed' },
  // Day pickers
  daysRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  dayBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#fff', borderWidth: 2, borderColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' },
  dayBtnActive: { borderColor: '#7c3aed', backgroundColor: '#f8fafc' },
  dayBtnText: { fontSize: 18, fontWeight: '700', color: '#6b7280' },
  dayBtnTextActive: { color: '#7c3aed' },
  // Review
  reviewCard: { backgroundColor: '#fff', borderRadius: 16, padding: 18, gap: 10, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  reviewSection: { fontSize: 14, fontWeight: '700', color: '#7c3aed', marginBottom: 2 },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between' },
  reviewLabel: { fontSize: 14, color: '#6b7280', flex: 1 },
  reviewValue: { fontSize: 14, fontWeight: '700', color: '#111827', flex: 1, textAlign: 'right' },
  aiNote: { flexDirection: 'row', backgroundColor: '#ede9fe', borderRadius: 12, padding: 14, gap: 10, marginTop: 8, alignItems: 'flex-start' },
  aiNoteText: { fontSize: 13, color: '#5b21b6', flex: 1, lineHeight: 18 },
  // Nav
  navRow: { flexDirection: 'row', paddingHorizontal: 24, paddingBottom: 32, gap: 12 },
  backBtn: { flex: 1, borderWidth: 2, borderColor: '#e5e7eb', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  backText: { fontSize: 16, fontWeight: '600', color: '#6b7280' },
  nextBtn: { flex: 2, backgroundColor: '#7c3aed', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  nextText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },
})
