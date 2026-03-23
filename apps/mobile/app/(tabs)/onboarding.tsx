import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../../src/contexts/AuthContext'
import { supabase } from '../../src/lib/supabase'
import {
  ACTIVITY_LEVELS,
  FITNESS_GOALS,
  calculateNutritionTargets,
} from '@nutrigoal/shared'
import type { UserMetrics } from '@nutrigoal/shared'

const STEPS = ['Basics', 'Body', 'Activity', 'Goal', 'Review']

export default function OnboardingScreen() {
  const { user, refreshProfile } = useAuth()
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)

  const [fullName, setFullName] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [activityLevel, setActivityLevel] = useState<UserMetrics['activityLevel']>('moderately_active')
  const [goal, setGoal] = useState<UserMetrics['goal']>('maintenance')

  const canContinue = () => {
    switch (step) {
      case 0: return fullName.trim().length > 0
      case 1: return age && height && weight
      case 2: return true
      case 3: return true
      default: return true
    }
  }

  const handleFinish = async () => {
    if (!user) return
    setLoading(true)

    const metrics: UserMetrics = {
      age: parseInt(age),
      height: parseInt(height),
      weight: parseInt(weight),
      gender,
      activityLevel,
      goal,
    }
    const targets = calculateNutritionTargets(metrics)

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
        onboarding_completed: true,
      })
      .eq('id', user.id)

    setLoading(false)

    if (error) {
      Alert.alert('Error', error.message)
    } else {
      await refreshProfile()
      router.replace('/(tabs)')
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress */}
      <View style={styles.progressRow}>
        {STEPS.map((s, i) => (
          <View key={s} style={[styles.dot, i <= step && styles.dotActive]} />
        ))}
      </View>
      <Text style={styles.stepLabel}>{STEPS[step]}</Text>

      <ScrollView contentContainerStyle={styles.content}>
        {step === 0 && (
          <View style={styles.stepContent}>
            <Text style={styles.question}>What's your name?</Text>
            <TextInput
              style={styles.input}
              placeholder="Full name"
              placeholderTextColor="#9ca3af"
              value={fullName}
              onChangeText={setFullName}
            />
          </View>
        )}

        {step === 1 && (
          <View style={styles.stepContent}>
            <Text style={styles.question}>Your body metrics</Text>

            <Text style={styles.label}>Gender</Text>
            <View style={styles.optionRow}>
              {(['male', 'female'] as const).map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.optionBtn, gender === g && styles.optionActive]}
                  onPress={() => setGender(g)}
                >
                  <Text style={[styles.optionText, gender === g && styles.optionTextActive]}>
                    {g === 'male' ? 'Male' : 'Female'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Age</Text>
            <TextInput style={styles.input} placeholder="Years" placeholderTextColor="#9ca3af" value={age} onChangeText={setAge} keyboardType="numeric" />

            <Text style={styles.label}>Height (cm)</Text>
            <TextInput style={styles.input} placeholder="cm" placeholderTextColor="#9ca3af" value={height} onChangeText={setHeight} keyboardType="numeric" />

            <Text style={styles.label}>Weight (kg)</Text>
            <TextInput style={styles.input} placeholder="kg" placeholderTextColor="#9ca3af" value={weight} onChangeText={setWeight} keyboardType="numeric" />
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepContent}>
            <Text style={styles.question}>How active are you?</Text>
            {ACTIVITY_LEVELS.map((level) => (
              <TouchableOpacity
                key={level.value}
                style={[styles.listOption, activityLevel === level.value && styles.listOptionActive]}
                onPress={() => setActivityLevel(level.value as UserMetrics['activityLevel'])}
              >
                <Text style={[styles.listOptionTitle, activityLevel === level.value && styles.listOptionTitleActive]}>{level.label}</Text>
                <Text style={styles.listOptionDesc}>{level.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {step === 3 && (
          <View style={styles.stepContent}>
            <Text style={styles.question}>What's your goal?</Text>
            {FITNESS_GOALS.map((g) => (
              <TouchableOpacity
                key={g.value}
                style={[styles.listOption, goal === g.value && styles.listOptionActive]}
                onPress={() => setGoal(g.value as UserMetrics['goal'])}
              >
                <Text style={[styles.listOptionTitle, goal === g.value && styles.listOptionTitleActive]}>{g.label}</Text>
                <Text style={styles.listOptionDesc}>{g.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {step === 4 && (
          <View style={styles.stepContent}>
            <Text style={styles.question}>Your personalized targets</Text>
            {age && height && weight && (() => {
              const targets = calculateNutritionTargets({
                age: parseInt(age), height: parseInt(height), weight: parseInt(weight), gender, activityLevel, goal,
              })
              return (
                <View style={styles.reviewCard}>
                  <ReviewRow label="Calories" value={`${targets.calories} kcal/day`} />
                  <ReviewRow label="Protein" value={`${targets.protein}g`} />
                  <ReviewRow label="Carbs" value={`${targets.carbs}g`} />
                  <ReviewRow label="Fat" value={`${targets.fat}g`} />
                  <ReviewRow label="Water" value={`${(targets.water / 1000).toFixed(1)}L`} />
                </View>
              )
            })()}
          </View>
        )}
      </ScrollView>

      {/* Navigation */}
      <View style={styles.navRow}>
        {step > 0 && (
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep(step - 1)}>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.nextBtn, !canContinue() && styles.btnDisabled]}
          onPress={() => {
            if (step < STEPS.length - 1) setStep(step + 1)
            else handleFinish()
          }}
          disabled={!canContinue() || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.nextText}>{step === STEPS.length - 1 ? 'Get Started' : 'Continue'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.reviewRow}>
      <Text style={styles.reviewLabel}>{label}</Text>
      <Text style={styles.reviewValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  progressRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingTop: 16 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#d1d5db' },
  dotActive: { backgroundColor: '#16a34a', width: 24 },
  stepLabel: { textAlign: 'center', fontSize: 13, color: '#6b7280', marginTop: 8 },
  content: { padding: 24 },
  stepContent: { gap: 8 },
  question: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginTop: 8 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: '#111827' },
  optionRow: { flexDirection: 'row', gap: 12 },
  optionBtn: { flex: 1, backgroundColor: '#fff', borderWidth: 2, borderColor: '#e5e7eb', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  optionActive: { borderColor: '#16a34a', backgroundColor: '#f0fdf4' },
  optionText: { fontSize: 16, fontWeight: '600', color: '#6b7280' },
  optionTextActive: { color: '#16a34a' },
  listOption: { backgroundColor: '#fff', borderWidth: 2, borderColor: '#e5e7eb', borderRadius: 12, padding: 16, marginBottom: 8 },
  listOptionActive: { borderColor: '#16a34a', backgroundColor: '#f0fdf4' },
  listOptionTitle: { fontSize: 16, fontWeight: '700', color: '#374151' },
  listOptionTitleActive: { color: '#16a34a' },
  listOptionDesc: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  reviewCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, gap: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between' },
  reviewLabel: { fontSize: 15, color: '#6b7280' },
  reviewValue: { fontSize: 15, fontWeight: '700', color: '#111827' },
  navRow: { flexDirection: 'row', paddingHorizontal: 24, paddingBottom: 32, gap: 12 },
  backBtn: { flex: 1, borderWidth: 2, borderColor: '#e5e7eb', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  backText: { fontSize: 16, fontWeight: '600', color: '#6b7280' },
  nextBtn: { flex: 2, backgroundColor: '#16a34a', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  nextText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },
})
