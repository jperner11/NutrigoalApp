import { useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useAuth } from '../../src/contexts/AuthContext'
import { supabase } from '../../src/lib/supabase'

const API_URL = process.env.EXPO_PUBLIC_API_URL || ''

type Tab = 'meal' | 'training'

interface AIIngredient {
  name: string; amount: number; unit: string
  calories: number; protein: number; carbs: number; fat: number
}
interface AIMeal {
  meal_type: string; title: string; time: string; timing_note: string
  ingredients: AIIngredient[]; calories: number; protein: number; carbs: number; fat: number
}
interface AIExercise {
  name: string; body_part: string; equipment: string
  sets: number; reps: string; rest_seconds: number; notes?: string
}
interface AIDay { day_number: number; name: string; exercises: AIExercise[] }
interface AITrainingPlan { name: string; description: string; days: AIDay[] }

export default function AIGenerateScreen() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('meal')
  const [loading, setLoading] = useState(false)
  const [meals, setMeals] = useState<AIMeal[] | null>(null)
  const [trainingPlan, setTrainingPlan] = useState<AITrainingPlan | null>(null)
  const [saving, setSaving] = useState(false)

  const generateMealPlan = async () => {
    if (!profile) return
    setLoading(true)
    setMeals(null)
    try {
      const res = await fetch(`${API_URL}/api/ai/generate-meal-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calories: profile.daily_calories,
          protein: profile.daily_protein,
          carbs: profile.daily_carbs,
          fat: profile.daily_fat,
          goal: profile.goal,
          gender: profile.gender,
          weight_kg: profile.weight_kg,
          age: profile.age,
          mealsPerDay: profile.meals_per_day ?? 3,
          wakeTime: profile.wake_time ?? '07:00',
          workoutTime: profile.workout_time ?? '08:00',
          dietaryPreferences: profile.dietary_preferences ?? [],
          allergies: profile.allergies ?? [],
          dietaryRestrictions: profile.dietary_restrictions ?? [],
          foodDislikes: profile.food_dislikes ?? [],
          cookingSkill: profile.cooking_skill ?? 'intermediate',
          mealPrepPreference: profile.meal_prep_preference ?? 'daily',
          medicalConditions: profile.medical_conditions ?? [],
          medications: profile.medications ?? [],
          stressLevel: profile.stress_level ?? 'moderate',
          sleepQuality: profile.sleep_quality ?? 'average',
          targetWeight: profile.target_weight_kg,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to generate')
      setMeals(data.meals)
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to generate meal plan')
    }
    setLoading(false)
  }

  const generateTrainingPlan = async () => {
    if (!profile) return
    setLoading(true)
    setTrainingPlan(null)
    try {
      const res = await fetch(`${API_URL}/api/ai/generate-training-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: profile.goal,
          daysPerWeek: profile.workout_days_per_week ?? 4,
          gender: profile.gender,
          age: profile.age,
          weight_kg: profile.weight_kg,
          activityLevel: profile.activity_level,
          workoutTime: profile.workout_time ?? '08:00',
          trainingExperience: profile.training_experience ?? 'beginner',
          equipmentAccess: profile.equipment_access ?? 'full_gym',
          trainingStyles: profile.training_style ?? ['hypertrophy'],
          injuries: profile.injuries ?? [],
          medicalConditions: profile.medical_conditions ?? [],
          stressLevel: profile.stress_level ?? 'moderate',
          sleepQuality: profile.sleep_quality ?? 'average',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to generate')
      setTrainingPlan(data)
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to generate training plan')
    }
    setLoading(false)
  }

  const saveMealPlan = async () => {
    if (!user || !meals) return
    setSaving(true)
    try {
      const { data: plan, error: planErr } = await supabase.from('diet_plans').insert({
        user_id: user.id,
        created_by: user.id,
        name: `AI Meal Plan - ${new Date().toLocaleDateString()}`,
        target_calories: profile?.daily_calories,
        target_protein: profile?.daily_protein,
        target_carbs: profile?.daily_carbs,
        target_fat: profile?.daily_fat,
        is_active: true,
      }).select().single()

      if (planErr) throw planErr

      const mealRows = meals.map((m) => ({
        diet_plan_id: plan.id,
        meal_type: m.meal_type,
        meal_name: `${m.title} (${m.time})`,
        foods: m.ingredients.map(i => ({
          spoonacular_id: 0,
          name: i.name,
          amount: i.amount,
          unit: i.unit,
          calories: i.calories,
          protein: i.protein,
          carbs: i.carbs,
          fat: i.fat,
        })),
        total_calories: m.calories,
        total_protein: m.protein,
        total_carbs: m.carbs,
        total_fat: m.fat,
      }))

      const { error: mealsErr } = await supabase.from('diet_plan_meals').insert(mealRows)
      if (mealsErr) throw mealsErr

      // Deactivate other plans
      await supabase.from('diet_plans').update({ is_active: false }).eq('user_id', user.id).neq('id', plan.id)

      Alert.alert('Saved!', 'Your AI meal plan is now active.', [
        { text: 'OK', onPress: () => router.replace('/(tabs)/diet') },
      ])
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save')
    }
    setSaving(false)
  }

  const saveTrainingPlan = async () => {
    if (!user || !trainingPlan) return
    setSaving(true)
    try {
      const { data: plan, error: planErr } = await supabase.from('training_plans').insert({
        user_id: user.id,
        created_by: user.id,
        name: trainingPlan.name,
        description: trainingPlan.description,
        days_per_week: trainingPlan.days.length,
        is_active: true,
      }).select().single()

      if (planErr) throw planErr

      for (const day of trainingPlan.days) {
        const { data: dayData, error: dayErr } = await supabase.from('training_plan_days').insert({
          training_plan_id: plan.id,
          day_number: day.day_number,
          name: day.name,
        }).select().single()

        if (dayErr) throw dayErr

        // Find or create exercises
        for (let i = 0; i < day.exercises.length; i++) {
          const ex = day.exercises[i]
          // Try to find existing exercise
          let { data: existing } = await supabase.from('exercises').select('id').ilike('name', ex.name).limit(1)

          let exerciseId: string
          if (existing && existing.length > 0) {
            exerciseId = existing[0].id
          } else {
            const { data: created, error: createErr } = await supabase.from('exercises').insert({
              name: ex.name,
              body_part: ex.body_part,
              equipment: ex.equipment,
              is_compound: ['bench press', 'squat', 'deadlift', 'overhead press', 'row', 'pull-up', 'chin-up', 'dip'].some(c => ex.name.toLowerCase().includes(c)),
            }).select().single()
            if (createErr) throw createErr
            exerciseId = created.id
          }

          await supabase.from('training_plan_exercises').insert({
            plan_day_id: dayData.id,
            exercise_id: exerciseId,
            order_index: i,
            sets: ex.sets,
            reps: ex.reps,
            rest_seconds: ex.rest_seconds,
            notes: ex.notes || null,
          })
        }
      }

      // Deactivate other plans
      await supabase.from('training_plans').update({ is_active: false }).eq('user_id', user.id).neq('id', plan.id)

      Alert.alert('Saved!', 'Your AI training plan is now active.', [
        { text: 'OK', onPress: () => router.replace('/(tabs)/training') },
      ])
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save')
    }
    setSaving(false)
  }

  const formatTime12 = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
    return `${h12}:${(m || 0).toString().padStart(2, '0')} ${ampm}`
  }

  return (
    <SafeAreaView style={st.container}>
      <View style={st.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={st.title}>AI Generate</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tab Switcher */}
      <View style={st.tabRow}>
        <TouchableOpacity style={[st.tab, tab === 'meal' && st.tabActive]} onPress={() => setTab('meal')}>
          <Ionicons name="restaurant" size={18} color={tab === 'meal' ? '#16a34a' : '#9ca3af'} />
          <Text style={[st.tabText, tab === 'meal' && st.tabTextActive]}>Meal Plan</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[st.tab, tab === 'training' && st.tabActive]} onPress={() => setTab('training')}>
          <Ionicons name="barbell" size={18} color={tab === 'training' ? '#16a34a' : '#9ca3af'} />
          <Text style={[st.tabText, tab === 'training' && st.tabTextActive]}>Training Plan</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={st.content}>
        {tab === 'meal' && (
          <>
            {/* Info card */}
            <View style={st.infoCard}>
              <Ionicons name="sparkles" size={20} color="#16a34a" />
              <View style={{ flex: 1 }}>
                <Text style={st.infoTitle}>Smart Meal Planning</Text>
                <Text style={st.infoDesc}>
                  AI generates meals timed around your workout ({formatTime12(profile?.workout_time ?? '08:00')}) with
                  pre-workout fuel and post-workout recovery meals.
                </Text>
              </View>
            </View>

            {!meals && !loading && (
              <TouchableOpacity style={st.generateBtn} onPress={generateMealPlan}>
                <Ionicons name="sparkles" size={20} color="#fff" />
                <Text style={st.generateBtnText}>Generate Meal Plan</Text>
              </TouchableOpacity>
            )}

            {loading && (
              <View style={st.loadingBox}>
                <ActivityIndicator size="large" color="#16a34a" />
                <Text style={st.loadingText}>Creating your personalized meal plan...</Text>
              </View>
            )}

            {meals && (
              <>
                {meals.map((meal, i) => (
                  <View key={i} style={st.mealCard}>
                    <View style={st.mealHeader}>
                      <View style={st.mealTimeBox}>
                        <Ionicons name="time-outline" size={14} color="#16a34a" />
                        <Text style={st.mealTime}>{formatTime12(meal.time)}</Text>
                      </View>
                      <Text style={st.mealType}>{meal.meal_type}</Text>
                    </View>
                    <Text style={st.mealTitle}>{meal.title}</Text>
                    {meal.timing_note ? <Text style={st.timingNote}>{meal.timing_note}</Text> : null}

                    <View style={st.macroRow}>
                      <Text style={st.macroPill}>{meal.calories} kcal</Text>
                      <Text style={st.macroPill}>P {meal.protein}g</Text>
                      <Text style={st.macroPill}>C {meal.carbs}g</Text>
                      <Text style={st.macroPill}>F {meal.fat}g</Text>
                    </View>

                    {meal.ingredients.map((ing, j) => (
                      <View key={j} style={st.ingRow}>
                        <Text style={st.ingName}>{ing.name}</Text>
                        <Text style={st.ingAmount}>{ing.amount} {ing.unit}</Text>
                      </View>
                    ))}
                  </View>
                ))}

                {/* Totals */}
                <View style={st.totalsCard}>
                  <Text style={st.totalsTitle}>Daily Totals</Text>
                  <View style={st.totalsRow}>
                    <TotalItem label="Calories" value={meals.reduce((s, m) => s + m.calories, 0)} target={profile?.daily_calories} unit="kcal" />
                    <TotalItem label="Protein" value={Math.round(meals.reduce((s, m) => s + m.protein, 0))} target={profile?.daily_protein} unit="g" />
                    <TotalItem label="Carbs" value={Math.round(meals.reduce((s, m) => s + m.carbs, 0))} target={profile?.daily_carbs} unit="g" />
                    <TotalItem label="Fat" value={Math.round(meals.reduce((s, m) => s + m.fat, 0))} target={profile?.daily_fat} unit="g" />
                  </View>
                </View>

                <View style={st.actionRow}>
                  <TouchableOpacity style={st.regenBtn} onPress={generateMealPlan}>
                    <Ionicons name="refresh" size={18} color="#16a34a" />
                    <Text style={st.regenText}>Regenerate</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[st.saveBtn, saving && { opacity: 0.6 }]} onPress={saveMealPlan} disabled={saving}>
                    {saving ? <ActivityIndicator color="#fff" /> : (
                      <>
                        <Ionicons name="checkmark" size={18} color="#fff" />
                        <Text style={st.saveBtnText}>Save Plan</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </>
        )}

        {tab === 'training' && (
          <>
            <View style={st.infoCard}>
              <Ionicons name="sparkles" size={20} color="#16a34a" />
              <View style={{ flex: 1 }}>
                <Text style={st.infoTitle}>AI Training Program</Text>
                <Text style={st.infoDesc}>
                  Generates a {profile?.workout_days_per_week ?? 4}-day program tailored to your {profile?.goal === 'bulking' ? 'muscle building' : profile?.goal === 'cutting' ? 'fat loss' : 'maintenance'} goal.
                </Text>
              </View>
            </View>

            {!trainingPlan && !loading && (
              <TouchableOpacity style={st.generateBtn} onPress={generateTrainingPlan}>
                <Ionicons name="sparkles" size={20} color="#fff" />
                <Text style={st.generateBtnText}>Generate Training Plan</Text>
              </TouchableOpacity>
            )}

            {loading && (
              <View style={st.loadingBox}>
                <ActivityIndicator size="large" color="#16a34a" />
                <Text style={st.loadingText}>Designing your training program...</Text>
              </View>
            )}

            {trainingPlan && (
              <>
                <View style={st.planHeader}>
                  <Text style={st.planName}>{trainingPlan.name}</Text>
                  <Text style={st.planDesc}>{trainingPlan.description}</Text>
                </View>

                {trainingPlan.days.map((day) => (
                  <View key={day.day_number} style={st.dayCard}>
                    <Text style={st.dayTitle}>Day {day.day_number}: {day.name}</Text>
                    {day.exercises.map((ex, i) => (
                      <View key={i} style={st.exRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={st.exName}>{ex.name}</Text>
                          <Text style={st.exMeta}>{ex.body_part} · {ex.equipment}</Text>
                          {ex.notes && <Text style={st.exNotes}>{ex.notes}</Text>}
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={st.exSets}>{ex.sets} × {ex.reps}</Text>
                          <Text style={st.exRest}>{ex.rest_seconds}s rest</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ))}

                <View style={st.actionRow}>
                  <TouchableOpacity style={st.regenBtn} onPress={generateTrainingPlan}>
                    <Ionicons name="refresh" size={18} color="#16a34a" />
                    <Text style={st.regenText}>Regenerate</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[st.saveBtn, saving && { opacity: 0.6 }]} onPress={saveTrainingPlan} disabled={saving}>
                    {saving ? <ActivityIndicator color="#fff" /> : (
                      <>
                        <Ionicons name="checkmark" size={18} color="#fff" />
                        <Text style={st.saveBtnText}>Save Plan</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function TotalItem({ label, value, target, unit }: { label: string; value: number; target?: number | null; unit: string }) {
  return (
    <View style={st.totalItem}>
      <Text style={st.totalLabel}>{label}</Text>
      <Text style={st.totalValue}>{value}{unit}</Text>
      {target && <Text style={st.totalTarget}>Target: {target}{unit}</Text>}
    </View>
  )
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  title: { fontSize: 20, fontWeight: '800', color: '#111827' },
  tabRow: { flexDirection: 'row', marginHorizontal: 20, backgroundColor: '#fff', borderRadius: 12, padding: 4, marginBottom: 8 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
  tabActive: { backgroundColor: '#f0fdf4' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#9ca3af' },
  tabTextActive: { color: '#16a34a' },
  content: { padding: 20, paddingTop: 8, paddingBottom: 40 },
  infoCard: { flexDirection: 'row', backgroundColor: '#dcfce7', borderRadius: 12, padding: 16, gap: 12, marginBottom: 16, alignItems: 'flex-start' },
  infoTitle: { fontSize: 15, fontWeight: '700', color: '#166534' },
  infoDesc: { fontSize: 13, color: '#166534', marginTop: 2, lineHeight: 18 },
  generateBtn: { flexDirection: 'row', backgroundColor: '#16a34a', borderRadius: 12, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', gap: 8 },
  generateBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  loadingBox: { alignItems: 'center', paddingVertical: 40, gap: 16 },
  loadingText: { fontSize: 15, color: '#6b7280', fontWeight: '500' },
  // Meal plan styles
  mealCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  mealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  mealTimeBox: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  mealTime: { fontSize: 13, fontWeight: '600', color: '#16a34a' },
  mealType: { fontSize: 12, fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  mealTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 4 },
  timingNote: { fontSize: 12, color: '#16a34a', fontStyle: 'italic', marginBottom: 8 },
  macroRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  macroPill: { fontSize: 11, fontWeight: '600', color: '#374151', backgroundColor: '#f3f4f6', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  ingRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  ingName: { fontSize: 14, color: '#374151' },
  ingAmount: { fontSize: 14, color: '#6b7280' },
  totalsCard: { backgroundColor: '#dcfce7', borderRadius: 12, padding: 16, marginBottom: 12 },
  totalsTitle: { fontSize: 15, fontWeight: '700', color: '#166534', marginBottom: 8 },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalItem: { alignItems: 'center' },
  totalLabel: { fontSize: 11, color: '#166534' },
  totalValue: { fontSize: 16, fontWeight: '800', color: '#166534', marginTop: 2 },
  totalTarget: { fontSize: 10, color: '#16a34a', marginTop: 1 },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  regenBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 2, borderColor: '#16a34a', borderRadius: 12, paddingVertical: 14 },
  regenText: { fontSize: 15, fontWeight: '600', color: '#16a34a' },
  saveBtn: { flex: 2, flexDirection: 'row', backgroundColor: '#16a34a', borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', gap: 6 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  // Training plan styles
  planHeader: { marginBottom: 16 },
  planName: { fontSize: 20, fontWeight: '800', color: '#111827' },
  planDesc: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  dayCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  dayTitle: { fontSize: 16, fontWeight: '700', color: '#16a34a', marginBottom: 10 },
  exRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  exName: { fontSize: 14, fontWeight: '600', color: '#374151' },
  exMeta: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  exNotes: { fontSize: 12, color: '#6b7280', fontStyle: 'italic', marginTop: 2 },
  exSets: { fontSize: 14, fontWeight: '700', color: '#111827' },
  exRest: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
})
