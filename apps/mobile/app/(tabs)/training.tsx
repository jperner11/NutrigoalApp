import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
  RefreshControl, Alert, ActivityIndicator, Modal, FlatList,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../src/contexts/AuthContext'
import { supabase } from '../../src/lib/supabase'
import {
  BODY_PARTS, EQUIPMENT_TYPES, DEFAULT_REST_SECONDS, DEFAULT_SETS, DEFAULT_REPS,
  calculateSuggestion, parseRepRange,
} from '@nutrigoal/shared'
import type {
  TrainingPlan, Exercise, BodyPart, Equipment,
  TrainingPlanDay, TrainingPlanExercise, WorkoutSetLog, WorkoutExerciseLog,
} from '@nutrigoal/shared'

// ─── Types ──────────────────────────────────────────────
interface DayEntry {
  name: string
  exercises: ExerciseEntry[]
}
interface ExerciseEntry {
  exercise: Exercise
  sets: number
  reps: string
  rest_seconds: number
}
interface DayWithExercises extends TrainingPlanDay {
  exercises: (TrainingPlanExercise & { exercises: Exercise })[]
}
interface SessionSet { weight_kg: string; reps: string; completed: boolean }

// ─── Screens ────────────────────────────────────────────
type Screen = 'list' | 'create' | 'detail' | 'session'

export default function TrainingScreen() {
  const { user, profile } = useAuth()
  const [screen, setScreen] = useState<Screen>('list')
  const [plans, setPlans] = useState<TrainingPlan[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [sessionDayId, setSessionDayId] = useState<string | null>(null)

  const fetchPlans = async () => {
    if (!user) return
    const { data } = await supabase.from('training_plans').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    if (data) setPlans(data as TrainingPlan[])
  }

  useEffect(() => { fetchPlans() }, [user])
  const onRefresh = async () => { setRefreshing(true); await fetchPlans(); setRefreshing(false) }

  if (screen === 'create') return <CreatePlan user={user} profile={profile} onDone={() => { setScreen('list'); fetchPlans() }} onCancel={() => setScreen('list')} />
  if (screen === 'detail' && selectedPlanId) return <PlanDetail planId={selectedPlanId} user={user} onBack={() => { setScreen('list'); fetchPlans() }} onStartSession={(dayId) => { setSessionDayId(dayId); setScreen('session') }} />
  if (screen === 'session' && sessionDayId) return <WorkoutSession dayId={sessionDayId} user={user} profile={profile} onDone={() => { setScreen('list'); fetchPlans() }} />

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Training Plans</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => setScreen('create')}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {plans.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="barbell-outline" size={48} color="#d1d5db" />
            <Text style={s.emptyText}>No training plans yet</Text>
            <TouchableOpacity onPress={() => setScreen('create')}><Text style={s.emptyLink}>Create your first plan</Text></TouchableOpacity>
          </View>
        ) : plans.map((p) => (
          <TouchableOpacity key={p.id} style={s.card} onPress={() => { setSelectedPlanId(p.id); setScreen('detail') }}>
            <View style={s.cardRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>{p.name}</Text>
                <Text style={s.cardSub}>{p.days_per_week} days/week</Text>
              </View>
              {p.is_active && <View style={s.activeBadge}><Text style={s.badgeText}>Active</Text></View>}
              <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}

// ─── Create Plan ────────────────────────────────────────
function CreatePlan({ user, profile, onDone, onCancel }: any) {
  const [planName, setPlanName] = useState('')
  const [days, setDays] = useState<DayEntry[]>([{ name: 'Day 1', exercises: [] }])
  const [allExercises, setAllExercises] = useState<Exercise[]>([])
  const [showPicker, setShowPicker] = useState(false)
  const [pickerDayIdx, setPickerDayIdx] = useState(0)
  const [search, setSearch] = useState('')
  const [filterBody, setFilterBody] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('exercises').select('*').then(({ data }) => { if (data) setAllExercises(data as Exercise[]) })
  }, [])

  const filteredExercises = allExercises.filter(e => {
    if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false
    if (filterBody && e.body_part !== filterBody) return false
    return true
  })

  const addDay = () => setDays([...days, { name: `Day ${days.length + 1}`, exercises: [] }])
  const removeDay = (i: number) => { if (days.length > 1) setDays(days.filter((_, idx) => idx !== i)) }

  const addExercise = (exercise: Exercise) => {
    const updated = [...days]
    updated[pickerDayIdx].exercises.push({ exercise, sets: DEFAULT_SETS, reps: DEFAULT_REPS, rest_seconds: DEFAULT_REST_SECONDS })
    setDays(updated)
    setShowPicker(false)
  }

  const removeExercise = (dayIdx: number, exIdx: number) => {
    const updated = [...days]
    updated[dayIdx].exercises.splice(exIdx, 1)
    setDays(updated)
  }

  const handleSave = async () => {
    if (!planName.trim()) { Alert.alert('Error', 'Enter a plan name'); return }
    if (days.some(d => d.exercises.length === 0)) { Alert.alert('Error', 'Each day needs at least one exercise'); return }

    setSaving(true)
    // Deactivate old plans
    await supabase.from('training_plans').update({ is_active: false }).eq('user_id', user.id).eq('is_active', true)

    const { data: plan, error } = await supabase.from('training_plans').insert({
      user_id: user.id, created_by: user.id, name: planName, days_per_week: days.length, is_active: true,
    }).select().single()

    if (error || !plan) { Alert.alert('Error', error?.message || 'Failed'); setSaving(false); return }

    for (let i = 0; i < days.length; i++) {
      const { data: day } = await supabase.from('training_plan_days').insert({
        training_plan_id: plan.id, day_number: i + 1, name: days[i].name,
      }).select().single()
      if (!day) continue

      const exerciseRows = days[i].exercises.map((e, idx) => ({
        plan_day_id: day.id, exercise_id: e.exercise.id, order_index: idx,
        sets: e.sets, reps: e.reps, rest_seconds: e.rest_seconds,
      }))
      await supabase.from('training_plan_exercises').insert(exerciseRows)
    }

    setSaving(false)
    onDone()
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.modalHeader}>
        <TouchableOpacity onPress={onCancel}><Text style={s.cancelText}>Cancel</Text></TouchableOpacity>
        <Text style={s.modalTitle}>New Plan</Text>
        <View style={{ width: 60 }} />
      </View>
      <ScrollView contentContainerStyle={s.modalContent}>
        <Text style={s.label}>Plan Name</Text>
        <TextInput style={s.input} value={planName} onChangeText={setPlanName} placeholder="e.g. Push Pull Legs" placeholderTextColor="#9ca3af" />

        {days.map((day, di) => (
          <View key={di} style={s.dayCard}>
            <View style={s.dayHeader}>
              <TextInput style={s.dayNameInput} value={day.name} onChangeText={(t) => { const u = [...days]; u[di].name = t; setDays(u) }} />
              {days.length > 1 && <TouchableOpacity onPress={() => removeDay(di)}><Ionicons name="trash-outline" size={20} color="#ef4444" /></TouchableOpacity>}
            </View>
            {day.exercises.map((ex, ei) => (
              <View key={ei} style={s.exerciseRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.exerciseName}>{ex.exercise.name}</Text>
                  <Text style={s.exerciseMeta}>{ex.sets} sets × {ex.reps} · {ex.rest_seconds}s rest</Text>
                </View>
                <TouchableOpacity onPress={() => removeExercise(di, ei)}><Ionicons name="close-circle" size={22} color="#d1d5db" /></TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={s.addExBtn} onPress={() => { setPickerDayIdx(di); setShowPicker(true); setSearch(''); setFilterBody('') }}>
              <Ionicons name="add-circle-outline" size={20} color="#16a34a" />
              <Text style={s.addExText}>Add Exercise</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={s.addDayBtn} onPress={addDay}>
          <Ionicons name="add" size={20} color="#16a34a" />
          <Text style={s.addDayText}>Add Day</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[s.saveBtn, saving && s.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Create Plan</Text>}
        </TouchableOpacity>
      </ScrollView>

      {/* Exercise Picker Modal */}
      <Modal visible={showPicker} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.container}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setShowPicker(false)}><Text style={s.cancelText}>Close</Text></TouchableOpacity>
            <Text style={s.modalTitle}>Pick Exercise</Text>
            <View style={{ width: 60 }} />
          </View>
          <View style={{ padding: 16, gap: 8 }}>
            <TextInput style={s.input} placeholder="Search exercises..." placeholderTextColor="#9ca3af" value={search} onChangeText={setSearch} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              <TouchableOpacity style={[s.filterChip, !filterBody && s.filterChipActive]} onPress={() => setFilterBody('')}><Text style={[s.filterChipText, !filterBody && s.filterChipTextActive]}>All</Text></TouchableOpacity>
              {BODY_PARTS.map(bp => (
                <TouchableOpacity key={bp.value} style={[s.filterChip, filterBody === bp.value && s.filterChipActive]} onPress={() => setFilterBody(filterBody === bp.value ? '' : bp.value)}>
                  <Text style={[s.filterChipText, filterBody === bp.value && s.filterChipTextActive]}>{bp.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <FlatList
            data={filteredExercises}
            keyExtractor={(e) => e.id}
            contentContainerStyle={{ padding: 16, paddingTop: 0 }}
            renderItem={({ item }) => (
              <TouchableOpacity style={s.pickItem} onPress={() => addExercise(item)}>
                <View style={{ flex: 1 }}>
                  <Text style={s.pickName}>{item.name}</Text>
                  <Text style={s.pickMeta}>{item.body_part} · {item.equipment}{item.is_compound ? ' · compound' : ''}</Text>
                </View>
                <Ionicons name="add-circle" size={24} color="#16a34a" />
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

// ─── Plan Detail ────────────────────────────────────────
function PlanDetail({ planId, user, onBack, onStartSession }: any) {
  const [plan, setPlan] = useState<TrainingPlan | null>(null)
  const [days, setDays] = useState<DayWithExercises[]>([])
  const [expandedDay, setExpandedDay] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data: p } = await supabase.from('training_plans').select('*').eq('id', planId).single()
      if (p) setPlan(p as TrainingPlan)

      const { data: d } = await supabase.from('training_plan_days').select('*').eq('training_plan_id', planId).order('day_number')
      if (!d) return

      const daysWithEx: DayWithExercises[] = []
      for (const day of d) {
        const { data: exs } = await supabase.from('training_plan_exercises').select('*, exercises(*)').eq('plan_day_id', day.id).order('order_index')
        daysWithEx.push({ ...day, exercises: (exs || []) as any })
      }
      setDays(daysWithEx)
    }
    load()
  }, [planId])

  const handleDelete = () => {
    Alert.alert('Delete Plan', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await supabase.from('training_plans').delete().eq('id', planId)
        onBack()
      }},
    ])
  }

  if (!plan) return <SafeAreaView style={s.container}><ActivityIndicator style={{ marginTop: 40 }} /></SafeAreaView>

  return (
    <SafeAreaView style={s.container}>
      <View style={s.modalHeader}>
        <TouchableOpacity onPress={onBack}><Ionicons name="arrow-back" size={24} color="#374151" /></TouchableOpacity>
        <Text style={s.modalTitle}>{plan.name}</Text>
        <TouchableOpacity onPress={handleDelete}><Ionicons name="trash-outline" size={22} color="#ef4444" /></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={s.content}>
        {days.map((day) => (
          <View key={day.id} style={s.dayCard}>
            <TouchableOpacity style={s.dayHeader} onPress={() => setExpandedDay(expandedDay === day.id ? null : day.id)}>
              <Text style={s.dayNameDisplay}>{day.name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={s.exerciseCount}>{day.exercises.length} exercises</Text>
                <Ionicons name={expandedDay === day.id ? 'chevron-up' : 'chevron-down'} size={20} color="#9ca3af" />
              </View>
            </TouchableOpacity>
            {expandedDay === day.id && day.exercises.map((ex) => (
              <View key={ex.id} style={s.exerciseRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.exerciseName}>{ex.exercises.name}</Text>
                  <Text style={s.exerciseMeta}>{ex.sets} × {ex.reps} · {ex.rest_seconds || 90}s rest</Text>
                </View>
              </View>
            ))}
            <TouchableOpacity style={s.startBtn} onPress={() => onStartSession(day.id)}>
              <Ionicons name="play" size={18} color="#fff" />
              <Text style={s.startBtnText}>Start Workout</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}

// ─── Workout Session ────────────────────────────────────
function WorkoutSession({ dayId, user, profile, onDone }: any) {
  const [exercises, setExercises] = useState<(TrainingPlanExercise & { exercises: Exercise })[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [sets, setSets] = useState<SessionSet[][]>([])
  const [lastWorkout, setLastWorkout] = useState<WorkoutExerciseLog[] | null>(null)
  const [saving, setSaving] = useState(false)
  const [startTime] = useState(new Date())

  useEffect(() => {
    const load = async () => {
      const { data: exs } = await supabase.from('training_plan_exercises').select('*, exercises(*)').eq('plan_day_id', dayId).order('order_index')
      if (!exs) return
      setExercises(exs as any)

      // Initialize empty sets for each exercise
      const initSets = exs.map((e: any) => Array.from({ length: e.sets }, () => ({ weight_kg: '', reps: '', completed: false })))
      setSets(initSets)

      // Load last workout for suggestions
      const { data: last } = await supabase.from('workout_logs').select('*').eq('plan_day_id', dayId).eq('user_id', user.id).order('date', { ascending: false }).limit(1)
      if (last && last.length > 0) setLastWorkout(last[0].exercises as WorkoutExerciseLog[])
    }
    load()
  }, [dayId])

  const currentEx = exercises[currentIdx]
  const currentSets = sets[currentIdx] || []

  // Progressive overload suggestion
  const suggestion = currentEx && lastWorkout ? (() => {
    const lastEx = lastWorkout.find(e => e.exercise_id === currentEx.exercise_id)
    if (!lastEx) return null
    return calculateSuggestion(lastEx.sets as WorkoutSetLog[], currentEx.reps, currentEx.exercises.is_compound)
  })() : null

  const updateSet = (setIdx: number, field: 'weight_kg' | 'reps', value: string) => {
    const updated = [...sets]
    updated[currentIdx] = [...currentSets]
    updated[currentIdx][setIdx] = { ...currentSets[setIdx], [field]: value }
    setSets(updated)
  }

  const toggleComplete = (setIdx: number) => {
    const updated = [...sets]
    updated[currentIdx] = [...currentSets]
    updated[currentIdx][setIdx] = { ...currentSets[setIdx], completed: !currentSets[setIdx].completed }
    setSets(updated)
  }

  const addSet = () => {
    const updated = [...sets]
    updated[currentIdx] = [...currentSets, { weight_kg: '', reps: '', completed: false }]
    setSets(updated)
  }

  const handleFinish = async () => {
    setSaving(true)
    const exerciseLogs: WorkoutExerciseLog[] = exercises.map((ex, i) => ({
      exercise_id: ex.exercise_id,
      exercise_name: ex.exercises.name,
      sets: sets[i].filter(s => s.completed).map((s, si) => ({
        set_number: si + 1,
        weight_kg: parseFloat(s.weight_kg) || 0,
        reps: parseInt(s.reps) || 0,
        completed: true,
      })),
    }))

    const durationMin = Math.round((Date.now() - startTime.getTime()) / 60000)

    await supabase.from('workout_logs').insert({
      user_id: user.id,
      plan_day_id: dayId,
      date: new Date().toISOString().split('T')[0],
      duration_minutes: durationMin,
      exercises: exerciseLogs,
    })

    setSaving(false)
    Alert.alert('Workout Complete!', `${durationMin} minutes`, [{ text: 'Done', onPress: onDone }])
  }

  if (exercises.length === 0) return <SafeAreaView style={s.container}><ActivityIndicator style={{ marginTop: 40 }} /></SafeAreaView>

  return (
    <SafeAreaView style={s.container}>
      <View style={s.modalHeader}>
        <TouchableOpacity onPress={() => Alert.alert('Quit?', 'Your progress will be lost', [{ text: 'Stay' }, { text: 'Quit', style: 'destructive', onPress: onDone }])}>
          <Ionicons name="close" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={s.modalTitle}>{currentIdx + 1} / {exercises.length}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={s.modalContent}>
        <Text style={s.sessionExName}>{currentEx.exercises.name}</Text>
        <Text style={s.sessionExMeta}>{currentEx.exercises.body_part} · {currentEx.exercises.equipment} · {currentEx.reps} reps</Text>

        {suggestion && (
          <View style={s.suggestionCard}>
            <Ionicons name="trending-up" size={18} color="#16a34a" />
            <Text style={s.suggestionText}>{suggestion.reason}</Text>
          </View>
        )}

        <View style={s.setsHeader}>
          <Text style={[s.setCol, { flex: 0.5 }]}>Set</Text>
          <Text style={s.setCol}>Weight (kg)</Text>
          <Text style={s.setCol}>Reps</Text>
          <Text style={[s.setCol, { flex: 0.5 }]}></Text>
        </View>

        {currentSets.map((set, si) => (
          <View key={si} style={[s.setRow, set.completed && s.setRowDone]}>
            <Text style={[s.setCol, { flex: 0.5, fontWeight: '700' }]}>{si + 1}</Text>
            <TextInput
              style={[s.setInput]}
              value={set.weight_kg}
              onChangeText={(v) => updateSet(si, 'weight_kg', v)}
              keyboardType="numeric"
              placeholder={suggestion ? `${suggestion.suggestedWeight}` : '0'}
              placeholderTextColor="#c4b5fd"
            />
            <TextInput
              style={[s.setInput]}
              value={set.reps}
              onChangeText={(v) => updateSet(si, 'reps', v)}
              keyboardType="numeric"
              placeholder={currentEx.reps.split('-').pop() || '12'}
              placeholderTextColor="#c4b5fd"
            />
            <TouchableOpacity style={[s.checkBtn, set.completed && s.checkBtnDone]} onPress={() => toggleComplete(si)}>
              <Ionicons name={set.completed ? 'checkmark-circle' : 'ellipse-outline'} size={28} color={set.completed ? '#16a34a' : '#d1d5db'} />
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={s.addSetBtn} onPress={addSet}>
          <Ionicons name="add" size={18} color="#6b7280" />
          <Text style={s.addSetText}>Add Set</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={s.sessionNav}>
        {currentIdx > 0 && (
          <TouchableOpacity style={s.prevBtn} onPress={() => setCurrentIdx(currentIdx - 1)}>
            <Text style={s.prevBtnText}>Previous</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[s.saveBtn, { flex: 2 }, saving && s.saveBtnDisabled]}
          onPress={() => {
            if (currentIdx < exercises.length - 1) setCurrentIdx(currentIdx + 1)
            else handleFinish()
          }}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#fff" /> : (
            <Text style={s.saveBtnText}>{currentIdx < exercises.length - 1 ? 'Next Exercise' : 'Finish Workout'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

// ─── Styles ─────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827' },
  addBtn: { backgroundColor: '#16a34a', borderRadius: 20, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingTop: 0 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#6b7280' },
  emptyLink: { fontSize: 15, fontWeight: '600', color: '#16a34a', marginTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#374151' },
  cardSub: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  activeBadge: { backgroundColor: '#dcfce7', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: '600', color: '#16a34a' },
  // Modal/Form shared
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  cancelText: { fontSize: 16, color: '#6b7280' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  modalContent: { padding: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: '#111827' },
  // Day card
  dayCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginTop: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dayNameInput: { fontSize: 16, fontWeight: '700', color: '#374151', flex: 1 },
  dayNameDisplay: { fontSize: 16, fontWeight: '700', color: '#374151' },
  exerciseCount: { fontSize: 13, color: '#6b7280' },
  exerciseRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  exerciseName: { fontSize: 15, fontWeight: '600', color: '#374151' },
  exerciseMeta: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  addExBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 12 },
  addExText: { fontSize: 14, fontWeight: '600', color: '#16a34a' },
  addDayBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 16, marginTop: 8 },
  addDayText: { fontSize: 15, fontWeight: '600', color: '#16a34a' },
  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#16a34a', borderRadius: 10, paddingVertical: 12, marginTop: 12 },
  startBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  saveBtn: { backgroundColor: '#16a34a', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  // Picker
  filterChip: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  filterChipActive: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  filterChipText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  filterChipTextActive: { color: '#fff' },
  pickItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  pickName: { fontSize: 15, fontWeight: '600', color: '#374151' },
  pickMeta: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  // Session
  sessionExName: { fontSize: 22, fontWeight: '800', color: '#111827', textAlign: 'center' },
  sessionExMeta: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginTop: 4, marginBottom: 16 },
  suggestionCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#dcfce7', borderRadius: 10, padding: 12, marginBottom: 16 },
  suggestionText: { fontSize: 13, color: '#166534', flex: 1 },
  setsHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 2, borderBottomColor: '#e5e7eb' },
  setCol: { flex: 1, fontSize: 12, fontWeight: '700', color: '#6b7280', textAlign: 'center' },
  setRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  setRowDone: { backgroundColor: '#f0fdf4', borderRadius: 8 },
  setInput: { flex: 1, backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, fontSize: 16, textAlign: 'center', color: '#111827', marginHorizontal: 4 },
  checkBtn: { flex: 0.5, alignItems: 'center' },
  checkBtnDone: {},
  addSetBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 12 },
  addSetText: { fontSize: 14, color: '#6b7280' },
  sessionNav: { flexDirection: 'row', padding: 20, gap: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  prevBtn: { flex: 1, borderWidth: 2, borderColor: '#e5e7eb', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  prevBtnText: { fontSize: 16, fontWeight: '600', color: '#6b7280' },
})
