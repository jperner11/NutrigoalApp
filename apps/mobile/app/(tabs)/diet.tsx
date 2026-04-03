import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
  RefreshControl, Alert, ActivityIndicator, Modal, FlatList,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../src/contexts/AuthContext'
import { supabase } from '../../src/lib/supabase'
import {
  MEAL_TYPES, COMMON_SUPPLEMENTS, SUPPLEMENT_FREQUENCIES, SUPPLEMENT_TIMES,
} from '@nutrigoal/shared'
import type {
  DietPlan, FoodItem, MealType, UserSupplement, SupplementFrequency, SupplementTime,
} from '@nutrigoal/shared'
import { brandColors, brandShadow } from '../../src/theme/brand'

const API_URL = process.env.EXPO_PUBLIC_API_URL || ''

interface MealEntry {
  meal_type: MealType
  meal_name: string
  foods: FoodItem[]
}

type Screen = 'list' | 'create' | 'log' | 'supplements'

export default function DietScreen() {
  const { user, profile } = useAuth()
  const [screen, setScreen] = useState<Screen>('list')
  const [plans, setPlans] = useState<DietPlan[]>([])
  const [supplements, setSupplements] = useState<UserSupplement[]>([])
  const [todayLogs, setTodayLogs] = useState<string[]>([]) // supplement_ids taken today
  const [refreshing, setRefreshing] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  const fetchPlans = async () => {
    if (!user) return
    const { data } = await supabase.from('diet_plans').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    if (data) setPlans(data as DietPlan[])
  }

  const fetchSupplements = async () => {
    if (!user) return
    const [supRes, logRes] = await Promise.all([
      supabase.from('user_supplements').select('*').eq('user_id', user.id).eq('is_active', true).order('created_at'),
      supabase.from('supplement_logs').select('supplement_id').eq('user_id', user.id).eq('date', today),
    ])
    if (supRes.data) setSupplements(supRes.data as UserSupplement[])
    if (logRes.data) setTodayLogs(logRes.data.map((l: any) => l.supplement_id))
  }

  const toggleSupplementTaken = async (supplementId: string) => {
    if (!user) return
    if (todayLogs.includes(supplementId)) {
      await supabase.from('supplement_logs').delete().eq('supplement_id', supplementId).eq('date', today)
      setTodayLogs(todayLogs.filter(id => id !== supplementId))
    } else {
      await supabase.from('supplement_logs').insert({ user_id: user.id, supplement_id: supplementId, date: today })
      setTodayLogs([...todayLogs, supplementId])
    }
  }

  useEffect(() => { fetchPlans(); fetchSupplements() }, [user])
  const onRefresh = async () => { setRefreshing(true); await Promise.all([fetchPlans(), fetchSupplements()]); setRefreshing(false) }

  if (screen === 'create') return <CreateDietPlan user={user} profile={profile} onDone={() => { setScreen('list'); fetchPlans() }} onCancel={() => setScreen('list')} />
  if (screen === 'log') return <LogMeal user={user} onDone={() => { setScreen('list') }} onCancel={() => setScreen('list')} />
  if (screen === 'supplements') return <ManageSupplements user={user} onDone={() => { setScreen('list'); fetchSupplements() }} onCancel={() => setScreen('list')} />

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Diet Plans</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={s.logBtn} onPress={() => setScreen('log')}>
            <Ionicons name="add-circle-outline" size={18} color={brandColors.brand500} />
            <Text style={s.logBtnText}>Log Meal</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.addBtn} onPress={() => setScreen('create')}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brandColors.brand500} />}>
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
              {plan.created_by !== user?.id && <View style={s.ptBadge}><Text style={s.ptBadgeText}>From PT</Text></View>}
              {plan.is_active && <View style={s.activeBadge}><Text style={s.badgeText}>Active</Text></View>}
            </View>
          </View>
        ))}

        {/* ─── Supplements Section ─── */}
        <View style={s.supHeader}>
          <Text style={s.supTitle}>Supplements & Pharma</Text>
          <TouchableOpacity onPress={() => setScreen('supplements')}>
            <Text style={s.supManage}>{supplements.length > 0 ? 'Manage' : '+ Add'}</Text>
          </TouchableOpacity>
        </View>

        {supplements.length === 0 ? (
          <TouchableOpacity style={s.supEmptyCard} onPress={() => setScreen('supplements')}>
            <Ionicons name="medical-outline" size={24} color="#d1d5db" />
            <Text style={s.supEmptyText}>Track your vitamins & supplements</Text>
          </TouchableOpacity>
        ) : (
          supplements.map((sup) => {
            const taken = todayLogs.includes(sup.id)
            return (
              <TouchableOpacity key={sup.id} style={s.supCard} onPress={() => toggleSupplementTaken(sup.id)}>
                <View style={[s.supCheck, taken && s.supCheckDone]}>
                  {taken && <Ionicons name="checkmark" size={16} color="#fff" />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.supName, taken && s.supNameDone]}>{sup.name}</Text>
                  <Text style={s.supDosage}>
                    {sup.dosage ? `${sup.dosage} · ` : ''}{SUPPLEMENT_FREQUENCIES.find(f => f.value === sup.frequency)?.label ?? sup.frequency}
                    {' · '}{SUPPLEMENT_TIMES.find(t => t.value === sup.time_of_day)?.label ?? sup.time_of_day}
                  </Text>
                </View>
              </TouchableOpacity>
            )
          })
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

// ─── Manage Supplements ─────────────────────────────────
function ManageSupplements({ user, onDone, onCancel }: any) {
  const [supplements, setSupplements] = useState<UserSupplement[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [dosage, setDosage] = useState('')
  const [frequency, setFrequency] = useState<SupplementFrequency>('daily')
  const [timeOfDay, setTimeOfDay] = useState<SupplementTime>('morning')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchSupplements = async () => {
    if (!user) return
    const { data } = await supabase.from('user_supplements').select('*').eq('user_id', user.id).order('created_at')
    if (data) setSupplements(data as UserSupplement[])
  }

  useEffect(() => { fetchSupplements() }, [])

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Error', 'Enter a supplement name'); return }
    setSaving(true)
    const { error } = await supabase.from('user_supplements').insert({
      user_id: user.id,
      name: name.trim(),
      dosage: dosage.trim() || null,
      frequency,
      time_of_day: timeOfDay,
      notes: notes.trim() || null,
    })
    setSaving(false)
    if (error) { Alert.alert('Error', error.message); return }
    setName(''); setDosage(''); setNotes('')
    setShowAdd(false)
    await fetchSupplements()
  }

  const handleDelete = (sup: UserSupplement) => {
    Alert.alert('Remove Supplement', `Remove ${sup.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        await supabase.from('user_supplements').delete().eq('id', sup.id)
        await fetchSupplements()
      }},
    ])
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.modalHeader}>
        <TouchableOpacity onPress={() => { onCancel(); onDone() }}><Text style={s.cancelText}>Done</Text></TouchableOpacity>
        <Text style={s.modalTitle}>Supplements</Text>
        <TouchableOpacity onPress={() => setShowAdd(true)}>
          <Ionicons name="add-circle" size={28} color={brandColors.brand500} />
          
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.modalContent}>
        {supplements.length === 0 && !showAdd && (
          <View style={s.empty}>
            <Ionicons name="medical-outline" size={48} color="#d1d5db" />
            <Text style={s.emptyText}>No supplements added</Text>
            <TouchableOpacity onPress={() => setShowAdd(true)}>
              <Text style={s.emptyLink}>Add your first supplement</Text>
            </TouchableOpacity>
          </View>
        )}

        {supplements.map((sup) => (
          <View key={sup.id} style={s.supMgmtCard}>
            <View style={{ flex: 1 }}>
              <Text style={s.supMgmtName}>{sup.name}</Text>
              <Text style={s.supMgmtInfo}>
                {sup.dosage ? `${sup.dosage} · ` : ''}
                {SUPPLEMENT_FREQUENCIES.find(f => f.value === sup.frequency)?.label}
                {' · '}{SUPPLEMENT_TIMES.find(t => t.value === sup.time_of_day)?.label}
              </Text>
              {sup.notes && <Text style={s.supMgmtNotes}>{sup.notes}</Text>}
            </View>
            <TouchableOpacity onPress={() => handleDelete(sup)}>
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>
        ))}

        {showAdd && (
          <View style={s.addSupCard}>
            <Text style={s.addSupTitle}>Add Supplement</Text>

            <Text style={s.label}>Name</Text>
            <View style={s.chipGrid}>
              {COMMON_SUPPLEMENTS.map((cs) => (
                <TouchableOpacity key={cs} style={[s.supChip, name === cs && s.supChipActive]} onPress={() => setName(cs)}>
                  <Text style={[s.supChipText, name === cs && s.supChipTextActive]}>{cs}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={[s.input, { marginTop: 8 }]} value={name} onChangeText={setName} placeholder="Or type custom name" placeholderTextColor="#9ca3af" />

            <Text style={s.label}>Dosage (optional)</Text>
            <TextInput style={s.input} value={dosage} onChangeText={setDosage} placeholder="e.g. 1000mg, 2 capsules" placeholderTextColor="#9ca3af" />

            <Text style={s.label}>Frequency</Text>
            <View style={s.chipGrid}>
              {SUPPLEMENT_FREQUENCIES.map((f) => (
                <TouchableOpacity key={f.value} style={[s.supChip, frequency === f.value && s.supChipActive]} onPress={() => setFrequency(f.value as SupplementFrequency)}>
                  <Text style={[s.supChipText, frequency === f.value && s.supChipTextActive]}>{f.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>Time of day</Text>
            <View style={s.chipGrid}>
              {SUPPLEMENT_TIMES.map((t) => (
                <TouchableOpacity key={t.value} style={[s.supChip, timeOfDay === t.value && s.supChipActive]} onPress={() => setTimeOfDay(t.value as SupplementTime)}>
                  <Text style={[s.supChipText, timeOfDay === t.value && s.supChipTextActive]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>Notes (optional)</Text>
            <TextInput style={s.input} value={notes} onChangeText={setNotes} placeholder="e.g. Take with food" placeholderTextColor="#9ca3af" />

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
              <TouchableOpacity style={s.supCancelBtn} onPress={() => setShowAdd(false)}>
                <Text style={s.supCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.saveBtn, saving && s.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Add</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}
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
          <MacroBox label="Cals" value={totalCals} unit="" color={brandColors.brand500} />
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
              <Ionicons name="search" size={18} color={brandColors.brand500} />
              <Text style={s.addFoodText}>Search & Add Food</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={s.addMealBtn} onPress={addMeal}>
          <Ionicons name="add" size={18} color={brandColors.brand500} />
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
                {loadingNutrition === item.id ? <ActivityIndicator size="small" color={brandColors.brand500} /> : <Ionicons name="add-circle" size={24} color={brandColors.brand500} />}
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
  const [freeformText, setFreeformText] = useState('')
  const [parsing, setParsing] = useState(false)

  const parseFreeform = async () => {
    if (!freeformText.trim()) return
    setParsing(true)
    try {
      const res = await fetch(`${API_URL}/api/ai/parse-meal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: freeformText, mealType }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to parse')
      const parsed: FoodItem[] = data.foods.map((f: any) => ({
        spoonacular_id: 0, name: f.name, amount: f.amount, unit: f.unit,
        calories: f.calories, protein: f.protein, carbs: f.carbs, fat: f.fat,
      }))
      setFoods([...foods, ...parsed])
      setFreeformText('')
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to parse meal')
    }
    setParsing(false)
  }

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

        {/* Freeform AI Input */}
        <View style={s.freeformCard}>
          <View style={s.freeformHeader}>
            <Ionicons name="sparkles" size={16} color={brandColors.brand500} />
            <Text style={s.freeformTitle}>Quick Log with AI</Text>
          </View>
          <Text style={s.freeformHint}>Describe what you ate naturally</Text>
          <View style={s.searchRow}>
            <TextInput
              style={[s.input, { flex: 1 }]}
              value={freeformText}
              onChangeText={setFreeformText}
              placeholder='e.g. "chicken breast with rice and salad"'
              placeholderTextColor="#9ca3af"
              returnKeyType="send"
              onSubmitEditing={parseFreeform}
            />
            <TouchableOpacity style={s.searchBtn} onPress={parseFreeform} disabled={parsing}>
              {parsing ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="sparkles" size={20} color="#fff" />}
            </TouchableOpacity>
          </View>
        </View>

        {foods.map((f, i) => (
          <View key={i} style={s.foodRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.foodName}>{f.name}</Text>
              <Text style={s.foodMacros}>{f.amount}{f.unit} · {f.calories}kcal · P{f.protein} C{f.carbs} F{f.fat}</Text>
            </View>
            <TouchableOpacity onPress={() => setFoods(foods.filter((_, idx) => idx !== i))}><Ionicons name="close-circle" size={20} color="#d1d5db" /></TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={s.addFoodBtn} onPress={() => { setShowSearch(true); setSearchQuery(''); setSearchResults([]) }}>
          <Ionicons name="search" size={18} color="#6b7280" />
          <Text style={[s.addFoodText, { color: brandColors.textMuted }]}>Or search database</Text>
        </TouchableOpacity>

        {foods.length > 0 && (
          <View style={s.macroSummary}>
            <MacroBox label="Cals" value={foods.reduce((s, f) => s + f.calories, 0)} unit="" color={brandColors.brand500} />
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
                {loadingNutrition === item.id ? <ActivityIndicator size="small" color={brandColors.brand500} /> : <Ionicons name="add-circle" size={24} color={brandColors.brand500} />}
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
  container: { flex: 1, backgroundColor: brandColors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', color: brandColors.foreground, letterSpacing: -0.6 },
  addBtn: { backgroundColor: brandColors.brand900, borderRadius: 20, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  logBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: 'rgba(29, 168, 240, 0.36)', backgroundColor: 'rgba(255,255,255,0.84)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },
  logBtnText: { fontSize: 13, fontWeight: '600', color: brandColors.brand500 },
  content: { padding: 20, paddingTop: 0 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyText: { fontSize: 18, fontWeight: '600', color: brandColors.textMuted },
  emptyLink: { fontSize: 15, fontWeight: '600', color: brandColors.brand500, marginTop: 4 },
  card: { backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 18, borderWidth: 1, borderColor: brandColors.line, padding: 16, marginBottom: 10, ...brandShadow },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: brandColors.foregroundSoft },
  cardSub: { fontSize: 13, color: brandColors.textMuted, marginTop: 4 },
  activeBadge: { backgroundColor: brandColors.brand100, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: '600', color: brandColors.brand500 },
  ptBadge: { backgroundColor: brandColors.brand100, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, marginRight: 6 },
  ptBadgeText: { fontSize: 11, fontWeight: '600', color: brandColors.brand500 },
  // Modal
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: brandColors.line },
  cancelText: { fontSize: 16, color: brandColors.textMuted },
  modalTitle: { fontSize: 18, fontWeight: '700', color: brandColors.foreground },
  modalContent: { padding: 20 },
  label: { fontSize: 14, fontWeight: '600', color: brandColors.foregroundSoft, marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: 'rgba(255,255,255,0.92)', borderWidth: 1, borderColor: brandColors.lineStrong, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: brandColors.foreground },
  // Macros
  macroSummary: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 18, borderWidth: 1, borderColor: brandColors.line, padding: 16, marginTop: 16, ...brandShadow },
  macroBox: { alignItems: 'center' },
  macroValue: { fontSize: 18, fontWeight: '800' },
  macroLabel: { fontSize: 11, color: brandColors.textMuted, marginTop: 2 },
  // Meal card
  mealCard: { backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 18, borderWidth: 1, borderColor: brandColors.line, padding: 16, marginTop: 16, ...brandShadow },
  mealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  mealName: { fontSize: 16, fontWeight: '700', color: brandColors.foregroundSoft },
  mealCals: { fontSize: 13, fontWeight: '600', color: brandColors.brand500 },
  foodRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: brandColors.line },
  foodName: { fontSize: 14, fontWeight: '600', color: brandColors.foregroundSoft },
  foodMacros: { fontSize: 12, color: brandColors.textSubtle, marginTop: 2 },
  addFoodBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 12 },
  addFoodText: { fontSize: 14, fontWeight: '600', color: brandColors.brand500 },
  addMealBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14 },
  addMealText: { fontSize: 15, fontWeight: '600', color: brandColors.brand500 },
  // Type chips
  typeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  typeChip: { borderWidth: 1, borderColor: brandColors.line, backgroundColor: 'rgba(255,255,255,0.84)', borderRadius: 14, paddingVertical: 8, paddingHorizontal: 14 },
  typeChipActive: { borderColor: 'rgba(29, 168, 240, 0.4)', backgroundColor: brandColors.brand100 },
  typeChipText: { fontSize: 14, fontWeight: '600', color: brandColors.textMuted },
  typeChipTextActive: { color: brandColors.brand500 },
  // Search
  searchRow: { flexDirection: 'row', gap: 8 },
  searchBtn: { backgroundColor: brandColors.brand900, borderRadius: 16, width: 50, alignItems: 'center', justifyContent: 'center' },
  foodSearchItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: brandColors.line },
  foodSearchName: { fontSize: 15, fontWeight: '600', color: brandColors.foregroundSoft, textTransform: 'capitalize' },
  emptySearch: { textAlign: 'center', color: brandColors.textSubtle, marginTop: 40 },
  saveBtn: { backgroundColor: brandColors.brand900, borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  // Freeform AI
  freeformCard: { backgroundColor: brandColors.brand100, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(77, 196, 255, 0.2)', padding: 16, marginTop: 12, marginBottom: 8 },
  freeformHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  freeformTitle: { fontSize: 14, fontWeight: '700', color: '#0f4262' },
  freeformHint: { fontSize: 12, color: '#0f4262', marginBottom: 10 },
  // Supplements - list view
  supHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 10 },
  supTitle: { fontSize: 18, fontWeight: '700', color: brandColors.foreground },
  supManage: { fontSize: 14, fontWeight: '600', color: brandColors.brand500 },
  supEmptyCard: { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 18, padding: 20, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: brandColors.line, borderStyle: 'dashed' },
  supEmptyText: { fontSize: 14, color: brandColors.textSubtle },
  supCard: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 18, borderWidth: 1, borderColor: brandColors.line, padding: 14, marginBottom: 8, alignItems: 'center', gap: 12, ...brandShadow },
  supCheck: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: brandColors.lineStrong, alignItems: 'center', justifyContent: 'center' },
  supCheckDone: { backgroundColor: brandColors.brand900, borderColor: brandColors.brand900 },
  supName: { fontSize: 15, fontWeight: '600', color: brandColors.foregroundSoft },
  supNameDone: { textDecorationLine: 'line-through', color: brandColors.textSubtle },
  supDosage: { fontSize: 12, color: brandColors.textSubtle, marginTop: 2 },
  // Supplements - manage screen
  supMgmtCard: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 18, borderWidth: 1, borderColor: brandColors.line, padding: 16, marginBottom: 8, alignItems: 'center', gap: 12, ...brandShadow },
  supMgmtName: { fontSize: 16, fontWeight: '700', color: brandColors.foregroundSoft },
  supMgmtInfo: { fontSize: 13, color: brandColors.textMuted, marginTop: 2 },
  supMgmtNotes: { fontSize: 12, color: brandColors.textSubtle, fontStyle: 'italic', marginTop: 2 },
  addSupCard: { backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 18, borderWidth: 1, borderColor: brandColors.line, padding: 18, marginTop: 8, ...brandShadow },
  addSupTitle: { fontSize: 17, fontWeight: '700', color: brandColors.foreground, marginBottom: 4 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  supChip: { backgroundColor: brandColors.panelMuted, borderWidth: 1, borderColor: brandColors.line, borderRadius: 14, paddingVertical: 8, paddingHorizontal: 12 },
  supChipActive: { borderColor: 'rgba(29, 168, 240, 0.4)', backgroundColor: brandColors.brand100 },
  supChipText: { fontSize: 13, fontWeight: '600', color: brandColors.textMuted },
  supChipTextActive: { color: brandColors.brand500 },
  supCancelBtn: { flex: 1, borderWidth: 1, borderColor: brandColors.lineStrong, borderRadius: 14, paddingVertical: 14, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.84)' },
  supCancelText: { fontSize: 15, fontWeight: '600', color: brandColors.textMuted },
})
