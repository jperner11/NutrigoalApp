import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
  RefreshControl, Alert, ActivityIndicator, Modal, FlatList,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../src/contexts/AuthContext'
import { supabase } from '../../src/lib/supabase'
import { MEAL_TYPES } from '@nutrigoal/shared'
import type { DietPlan, FoodItem, MealType } from '@nutrigoal/shared'

const API_URL = process.env.EXPO_PUBLIC_API_URL || ''

interface MealEntry {
  meal_type: MealType
  meal_name: string
  foods: FoodItem[]
}

type Screen = 'list' | 'create' | 'log'

export default function DietScreen() {
  const { user, profile } = useAuth()
  const [screen, setScreen] = useState<Screen>('list')
  const [plans, setPlans] = useState<DietPlan[]>([])
  const [refreshing, setRefreshing] = useState(false)

  const fetchPlans = async () => {
    if (!user) return
    const { data } = await supabase.from('diet_plans').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    if (data) setPlans(data as DietPlan[])
  }

  useEffect(() => { fetchPlans() }, [user])
  const onRefresh = async () => { setRefreshing(true); await fetchPlans(); setRefreshing(false) }

  if (screen === 'create') return <CreateDietPlan user={user} profile={profile} onDone={() => { setScreen('list'); fetchPlans() }} onCancel={() => setScreen('list')} />
  if (screen === 'log') return <LogMeal user={user} onDone={() => { setScreen('list') }} onCancel={() => setScreen('list')} />

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Diet Plans</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={s.logBtn} onPress={() => setScreen('log')}>
            <Ionicons name="add-circle-outline" size={18} color="#16a34a" />
            <Text style={s.logBtnText}>Log Meal</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.addBtn} onPress={() => setScreen('create')}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {plans.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="restaurant-outline" size={48} color="#d1d5db" />
            <Text style={s.emptyText}>No diet plans yet</Text>
            <TouchableOpacity onPress={() => setScreen('create')}><Text style={s.emptyLink}>Create your first plan</Text></TouchableOpacity>
          </View>
        ) : plans.map((plan) => (
          <View key={plan.id} style={s.card}>
            <View style={s.cardRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>{plan.name}</Text>
                {plan.target_calories && <Text style={s.cardSub}>{plan.target_calories} kcal/day · P{plan.target_protein}g C{plan.target_carbs}g F{plan.target_fat}g</Text>}
              </View>
              {plan.is_active && <View style={s.activeBadge}><Text style={s.badgeText}>Active</Text></View>}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}

// ─── Create Diet Plan ───────────────────────────────────
function CreateDietPlan({ user, profile, onDone, onCancel }: any) {
  const [planName, setPlanName] = useState('')
  const [meals, setMeals] = useState<MealEntry[]>([
    { meal_type: 'breakfast', meal_name: 'Breakfast', foods: [] },
    { meal_type: 'lunch', meal_name: 'Lunch', foods: [] },
    { meal_type: 'dinner', meal_name: 'Dinner', foods: [] },
  ])
  const [saving, setSaving] = useState(false)
  const [showFoodSearch, setShowFoodSearch] = useState(false)
  const [searchMealIdx, setSearchMealIdx] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [loadingNutrition, setLoadingNutrition] = useState<number | null>(null)

  const searchFood = async () => {
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const res = await fetch(`${API_URL}/api/food/search?query=${encodeURIComponent(searchQuery)}&number=10`)
      if (res.ok) {
        const data = await res.json()
        setSearchResults(data.results || [])
      }
    } catch { Alert.alert('Error', 'Could not search foods') }
    setSearching(false)
  }

  const addFood = async (food: any) => {
    setLoadingNutrition(food.id)
    try {
      const res = await fetch(`${API_URL}/api/food/nutrition?id=${food.id}&amount=100&unit=g`)
      if (res.ok) {
        const data = await res.json()
        const foodItem: FoodItem = {
          spoonacular_id: food.id,
          name: food.name,
          amount: 100,
          unit: 'g',
          calories: Math.round(data.calories || 0),
          protein: Math.round(data.protein || 0),
          carbs: Math.round(data.carbs || 0),
          fat: Math.round(data.fat || 0),
        }
        const updated = [...meals]
        updated[searchMealIdx].foods.push(foodItem)
        setMeals(updated)
      }
    } catch { Alert.alert('Error', 'Could not load nutrition info') }
    setLoadingNutrition(null)
  }

  const removeFood = (mealIdx: number, foodIdx: number) => {
    const updated = [...meals]
    updated[mealIdx].foods.splice(foodIdx, 1)
    setMeals(updated)
  }

  const addMeal = () => {
    setMeals([...meals, { meal_type: 'snack', meal_name: 'Snack', foods: [] }])
  }

  const totalCals = meals.reduce((sum, m) => sum + m.foods.reduce((s, f) => s + f.calories, 0), 0)
  const totalProtein = meals.reduce((sum, m) => sum + m.foods.reduce((s, f) => s + f.protein, 0), 0)
  const totalCarbs = meals.reduce((sum, m) => sum + m.foods.reduce((s, f) => s + f.carbs, 0), 0)
  const totalFat = meals.reduce((sum, m) => sum + m.foods.reduce((s, f) => s + f.fat, 0), 0)

  const handleSave = async () => {
    if (!planName.trim()) { Alert.alert('Error', 'Enter a plan name'); return }
    if (meals.every(m => m.foods.length === 0)) { Alert.alert('Error', 'Add at least one food'); return }

    setSaving(true)
    await supabase.from('diet_plans').update({ is_active: false }).eq('user_id', user.id).eq('is_active', true)

    const { data: plan, error } = await supabase.from('diet_plans').insert({
      user_id: user.id, created_by: user.id, name: planName,
      target_calories: totalCals, target_protein: totalProtein, target_carbs: totalCarbs, target_fat: totalFat,
      is_active: true,
    }).select().single()

    if (error || !plan) { Alert.alert('Error', error?.message || 'Failed'); setSaving(false); return }

    const mealRows = meals.filter(m => m.foods.length > 0).map(m => ({
      diet_plan_id: plan.id, meal_type: m.meal_type, meal_name: m.meal_name, foods: m.foods,
      total_calories: m.foods.reduce((s, f) => s + f.calories, 0),
      total_protein: m.foods.reduce((s, f) => s + f.protein, 0),
      total_carbs: m.foods.reduce((s, f) => s + f.carbs, 0),
      total_fat: m.foods.reduce((s, f) => s + f.fat, 0),
    }))

    await supabase.from('diet_plan_meals').insert(mealRows)
    setSaving(false)
    onDone()
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.modalHeader}>
        <TouchableOpacity onPress={onCancel}><Text style={s.cancelText}>Cancel</Text></TouchableOpacity>
        <Text style={s.modalTitle}>New Diet Plan</Text>
        <View style={{ width: 60 }} />
      </View>
      <ScrollView contentContainerStyle={s.modalContent}>
        <Text style={s.label}>Plan Name</Text>
        <TextInput style={s.input} value={planName} onChangeText={setPlanName} placeholder="e.g. Cutting Plan" placeholderTextColor="#9ca3af" />

        {/* Macro Summary */}
        <View style={s.macroSummary}>
          <MacroBox label="Cals" value={totalCals} unit="" color="#16a34a" />
          <MacroBox label="Protein" value={totalProtein} unit="g" color="#3b82f6" />
          <MacroBox label="Carbs" value={totalCarbs} unit="g" color="#f59e0b" />
          <MacroBox label="Fat" value={totalFat} unit="g" color="#ef4444" />
        </View>

        {meals.map((meal, mi) => (
          <View key={mi} style={s.mealCard}>
            <View style={s.mealHeader}>
              <Text style={s.mealName}>{meal.meal_name}</Text>
              <Text style={s.mealCals}>{meal.foods.reduce((s, f) => s + f.calories, 0)} kcal</Text>
            </View>
            {meal.foods.map((food, fi) => (
              <View key={fi} style={s.foodRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.foodName}>{food.name}</Text>
                  <Text style={s.foodMacros}>{food.amount}{food.unit} · {food.calories}kcal · P{food.protein} C{food.carbs} F{food.fat}</Text>
                </View>
                <TouchableOpacity onPress={() => removeFood(mi, fi)}><Ionicons name="close-circle" size={20} color="#d1d5db" /></TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={s.addFoodBtn} onPress={() => { setSearchMealIdx(mi); setShowFoodSearch(true); setSearchQuery(''); setSearchResults([]) }}>
              <Ionicons name="search" size={18} color="#16a34a" />
              <Text style={s.addFoodText}>Search & Add Food</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={s.addMealBtn} onPress={addMeal}>
          <Ionicons name="add" size={18} color="#16a34a" />
          <Text style={s.addMealText}>Add Snack</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[s.saveBtn, saving && s.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Create Plan</Text>}
        </TouchableOpacity>
      </ScrollView>

      {/* Food Search Modal */}
      <Modal visible={showFoodSearch} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.container}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setShowFoodSearch(false)}><Text style={s.cancelText}>Done</Text></TouchableOpacity>
            <Text style={s.modalTitle}>Search Food</Text>
            <View style={{ width: 60 }} />
          </View>
          <View style={{ padding: 16 }}>
            <View style={s.searchRow}>
              <TextInput style={[s.input, { flex: 1 }]} value={searchQuery} onChangeText={setSearchQuery} placeholder="e.g. chicken breast, rice..." placeholderTextColor="#9ca3af" returnKeyType="search" onSubmitEditing={searchFood} />
              <TouchableOpacity style={s.searchBtn} onPress={searchFood}>
                {searching ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="search" size={20} color="#fff" />}
              </TouchableOpacity>
            </View>
          </View>
          <FlatList
            data={searchResults}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ padding: 16, paddingTop: 0 }}
            renderItem={({ item }) => (
              <TouchableOpacity style={s.foodSearchItem} onPress={() => addFood(item)} disabled={loadingNutrition === item.id}>
                <Text style={s.foodSearchName}>{item.name}</Text>
                {loadingNutrition === item.id ? <ActivityIndicator size="small" color="#16a34a" /> : <Ionicons name="add-circle" size={24} color="#16a34a" />}
              </TouchableOpacity>
            )}
            ListEmptyComponent={!searching ? <Text style={s.emptySearch}>Search for ingredients to add to your meal</Text> : null}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

// ─── Log Meal ───────────────────────────────────────────
function LogMeal({ user, onDone, onCancel }: any) {
  const [mealType, setMealType] = useState<MealType>('breakfast')
  const [foods, setFoods] = useState<FoodItem[]>([])
  const [saving, setSaving] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [loadingNutrition, setLoadingNutrition] = useState<number | null>(null)

  const searchFood = async () => {
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const res = await fetch(`${API_URL}/api/food/search?query=${encodeURIComponent(searchQuery)}&number=10`)
      if (res.ok) { const data = await res.json(); setSearchResults(data.results || []) }
    } catch {}
    setSearching(false)
  }

  const addFood = async (food: any) => {
    setLoadingNutrition(food.id)
    try {
      const res = await fetch(`${API_URL}/api/food/nutrition?id=${food.id}&amount=100&unit=g`)
      if (res.ok) {
        const data = await res.json()
        setFoods([...foods, {
          spoonacular_id: food.id, name: food.name, amount: 100, unit: 'g',
          calories: Math.round(data.calories || 0), protein: Math.round(data.protein || 0),
          carbs: Math.round(data.carbs || 0), fat: Math.round(data.fat || 0),
        }])
      }
    } catch {}
    setLoadingNutrition(null)
  }

  const handleSave = async () => {
    if (foods.length === 0) { Alert.alert('Error', 'Add at least one food'); return }
    setSaving(true)
    const today = new Date().toISOString().split('T')[0]
    await supabase.from('meal_logs').insert({
      user_id: user.id, date: today, meal_type: mealType, foods,
      total_calories: foods.reduce((s, f) => s + f.calories, 0),
      total_protein: foods.reduce((s, f) => s + f.protein, 0),
      total_carbs: foods.reduce((s, f) => s + f.carbs, 0),
      total_fat: foods.reduce((s, f) => s + f.fat, 0),
    })
    setSaving(false)
    onDone()
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.modalHeader}>
        <TouchableOpacity onPress={onCancel}><Text style={s.cancelText}>Cancel</Text></TouchableOpacity>
        <Text style={s.modalTitle}>Log Meal</Text>
        <View style={{ width: 60 }} />
      </View>
      <ScrollView contentContainerStyle={s.modalContent}>
        <Text style={s.label}>Meal Type</Text>
        <View style={s.typeRow}>
          {MEAL_TYPES.map(mt => (
            <TouchableOpacity key={mt.value} style={[s.typeChip, mealType === mt.value && s.typeChipActive]} onPress={() => setMealType(mt.value as MealType)}>
              <Text style={[s.typeChipText, mealType === mt.value && s.typeChipTextActive]}>{mt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {foods.map((f, i) => (
          <View key={i} style={s.foodRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.foodName}>{f.name}</Text>
              <Text style={s.foodMacros}>{f.calories}kcal · P{f.protein} C{f.carbs} F{f.fat}</Text>
            </View>
            <TouchableOpacity onPress={() => setFoods(foods.filter((_, idx) => idx !== i))}><Ionicons name="close-circle" size={20} color="#d1d5db" /></TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={s.addFoodBtn} onPress={() => { setShowSearch(true); setSearchQuery(''); setSearchResults([]) }}>
          <Ionicons name="search" size={18} color="#16a34a" />
          <Text style={s.addFoodText}>Search & Add Food</Text>
        </TouchableOpacity>

        {foods.length > 0 && (
          <View style={s.macroSummary}>
            <MacroBox label="Cals" value={foods.reduce((s, f) => s + f.calories, 0)} unit="" color="#16a34a" />
            <MacroBox label="P" value={foods.reduce((s, f) => s + f.protein, 0)} unit="g" color="#3b82f6" />
            <MacroBox label="C" value={foods.reduce((s, f) => s + f.carbs, 0)} unit="g" color="#f59e0b" />
            <MacroBox label="F" value={foods.reduce((s, f) => s + f.fat, 0)} unit="g" color="#ef4444" />
          </View>
        )}

        <TouchableOpacity style={[s.saveBtn, saving && s.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Log Meal</Text>}
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showSearch} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.container}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setShowSearch(false)}><Text style={s.cancelText}>Done</Text></TouchableOpacity>
            <Text style={s.modalTitle}>Search Food</Text>
            <View style={{ width: 60 }} />
          </View>
          <View style={{ padding: 16 }}>
            <View style={s.searchRow}>
              <TextInput style={[s.input, { flex: 1 }]} value={searchQuery} onChangeText={setSearchQuery} placeholder="e.g. chicken, rice..." placeholderTextColor="#9ca3af" returnKeyType="search" onSubmitEditing={searchFood} />
              <TouchableOpacity style={s.searchBtn} onPress={searchFood}>
                {searching ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="search" size={20} color="#fff" />}
              </TouchableOpacity>
            </View>
          </View>
          <FlatList data={searchResults} keyExtractor={(item) => String(item.id)} contentContainerStyle={{ padding: 16, paddingTop: 0 }}
            renderItem={({ item }) => (
              <TouchableOpacity style={s.foodSearchItem} onPress={() => addFood(item)} disabled={loadingNutrition === item.id}>
                <Text style={s.foodSearchName}>{item.name}</Text>
                {loadingNutrition === item.id ? <ActivityIndicator size="small" color="#16a34a" /> : <Ionicons name="add-circle" size={24} color="#16a34a" />}
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

function MacroBox({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <View style={s.macroBox}>
      <Text style={[s.macroValue, { color }]}>{value}{unit}</Text>
      <Text style={s.macroLabel}>{label}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827' },
  addBtn: { backgroundColor: '#16a34a', borderRadius: 20, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  logBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 2, borderColor: '#16a34a', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },
  logBtnText: { fontSize: 13, fontWeight: '600', color: '#16a34a' },
  content: { padding: 20, paddingTop: 0 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#6b7280' },
  emptyLink: { fontSize: 15, fontWeight: '600', color: '#16a34a', marginTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#374151' },
  cardSub: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  activeBadge: { backgroundColor: '#dcfce7', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: '600', color: '#16a34a' },
  // Modal
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  cancelText: { fontSize: 16, color: '#6b7280' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  modalContent: { padding: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: '#111827' },
  // Macros
  macroSummary: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginTop: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  macroBox: { alignItems: 'center' },
  macroValue: { fontSize: 18, fontWeight: '800' },
  macroLabel: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  // Meal card
  mealCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginTop: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  mealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  mealName: { fontSize: 16, fontWeight: '700', color: '#374151' },
  mealCals: { fontSize: 13, fontWeight: '600', color: '#16a34a' },
  foodRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  foodName: { fontSize: 14, fontWeight: '600', color: '#374151' },
  foodMacros: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  addFoodBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 12 },
  addFoodText: { fontSize: 14, fontWeight: '600', color: '#16a34a' },
  addMealBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14 },
  addMealText: { fontSize: 15, fontWeight: '600', color: '#16a34a' },
  // Type chips
  typeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  typeChip: { borderWidth: 2, borderColor: '#e5e7eb', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14 },
  typeChipActive: { borderColor: '#16a34a', backgroundColor: '#f0fdf4' },
  typeChipText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  typeChipTextActive: { color: '#16a34a' },
  // Search
  searchRow: { flexDirection: 'row', gap: 8 },
  searchBtn: { backgroundColor: '#16a34a', borderRadius: 12, width: 50, alignItems: 'center', justifyContent: 'center' },
  foodSearchItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  foodSearchName: { fontSize: 15, fontWeight: '600', color: '#374151', textTransform: 'capitalize' },
  emptySearch: { textAlign: 'center', color: '#9ca3af', marginTop: 40 },
  saveBtn: { backgroundColor: '#16a34a', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
