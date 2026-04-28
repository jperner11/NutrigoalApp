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
import { isManagedClientRole } from '@nutrigoal/shared'
import { brandColors, brandShadow } from '../../src/theme/brand'

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
interface SessionSet {
  set_number: number
  weight_kg: string
  reps: string
  completed: boolean
  suggestedWeight: number | null
  suggestedReason: string | null
  lastWeight: number | null
  lastReps: number | null
}

// ─── Screens ────────────────────────────────────────────
type Screen = 'list' | 'create' | 'detail' | 'session'

export default function TrainingScreen() {
  const { user, profile } = useAuth()
  const managedClient = isManagedClientRole(profile?.role)
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

  if (screen === 'create' && !managedClient) return <CreatePlan user={user} profile={profile} onDone={() => { setScreen('list'); fetchPlans() }} onCancel={() => setScreen('list')} />
  if (screen === 'detail' && selectedPlanId) return <PlanDetail planId={selectedPlanId} user={user} onBack={() => { setScreen('list'); fetchPlans() }} onStartSession={(dayId: string) => { setSessionDayId(dayId); setScreen('session') }} />
  if (screen === 'session' && sessionDayId) return <WorkoutSession dayId={sessionDayId} user={user} profile={profile} onDone={() => { setScreen('list'); fetchPlans() }} />

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Training Plans</Text>
        {!managedClient && (
          <TouchableOpacity style={s.addBtn} onPress={() => setScreen('create')}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
      <ScrollView contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brandColors.brand500} />}>
        {plans.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="barbell-outline" size={48} color={brandColors.textSubtle} />
            <Text style={s.emptyText}>{managedClient ? 'No training plan assigned yet' : 'No training plans yet'}</Text>
            {managedClient ? (
              <Text style={s.emptyHint}>Your trainer will assign your workouts here when your programme is ready.</Text>
            ) : (
              <TouchableOpacity onPress={() => setScreen('create')}><Text style={s.emptyLink}>Create your first plan</Text></TouchableOpacity>
            )}
          </View>
        ) : plans.map((p) => (
          <TouchableOpacity key={p.id} style={s.card} onPress={() => { setSelectedPlanId(p.id); setScreen('detail') }}>
            <View style={s.cardRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>{p.name}</Text>
                <Text style={s.cardSub}>{p.days_per_week} days/week</Text>
              </View>
              {p.created_by !== user?.id && <View style={s.ptBadge}><Text style={s.ptBadgeText}>From PT</Text></View>}
              {p.is_active && <View style={s.activeBadge}><Text style={s.badgeText}>Active</Text></View>}
              <Ionicons name="chevron-forward" size={20} color={brandColors.textSubtle} />
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
        <TextInput style={s.input} value={planName} onChangeText={setPlanName} placeholder="e.g. Push Pull Legs" placeholderTextColor={brandColors.textSubtle} />

        {days.map((day, di) => (
          <View key={di} style={s.dayCard}>
            <View style={s.dayHeader}>
              <TextInput style={s.dayNameInput} value={day.name} onChangeText={(t) => { const u = [...days]; u[di].name = t; setDays(u) }} />
              {days.length > 1 && <TouchableOpacity onPress={() => removeDay(di)}><Ionicons name="trash-outline" size={20} color={brandColors.danger} /></TouchableOpacity>}
            </View>
            {day.exercises.map((ex, ei) => (
              <View key={ei} style={s.exerciseRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.exerciseName}>{ex.exercise.name}</Text>
                  <Text style={s.exerciseMeta}>{ex.sets} sets × {ex.reps} · {ex.rest_seconds}s rest</Text>
                </View>
                <TouchableOpacity onPress={() => removeExercise(di, ei)}><Ionicons name="close-circle" size={22} color={brandColors.textSubtle} /></TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={s.addExBtn} onPress={() => { setPickerDayIdx(di); setShowPicker(true); setSearch(''); setFilterBody('') }}>
              <Ionicons name="add-circle-outline" size={20} color={brandColors.brand500} />
              <Text style={s.addExText}>Add Exercise</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={s.addDayBtn} onPress={addDay}>
          <Ionicons name="add" size={20} color={brandColors.brand500} />
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
            <TextInput style={s.input} placeholder="Search exercises..." placeholderTextColor={brandColors.textSubtle} value={search} onChangeText={setSearch} />
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
                <Ionicons name="add-circle" size={24} color={brandColors.brand500} />
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
        <TouchableOpacity onPress={onBack}><Ionicons name="arrow-back" size={24} color={brandColors.foreground} /></TouchableOpacity>
        <Text style={s.modalTitle}>{plan.name}</Text>
        <TouchableOpacity onPress={handleDelete}><Ionicons name="trash-outline" size={22} color={brandColors.danger} /></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={s.content}>
        {days.map((day) => (
          <View key={day.id} style={s.dayCard}>
            <TouchableOpacity style={s.dayHeader} onPress={() => setExpandedDay(expandedDay === day.id ? null : day.id)}>
              <Text style={s.dayNameDisplay}>{day.name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={s.exerciseCount}>{day.exercises.length} exercises</Text>
                <Ionicons name={expandedDay === day.id ? 'chevron-up' : 'chevron-down'} size={20} color={brandColors.textSubtle} />
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
  const [showOverloadBanner, setShowOverloadBanner] = useState(false)
  const [restTimerActive, setRestTimerActive] = useState(false)
  const [restTimerSeconds, setRestTimerSeconds] = useState(0)
  const [saving, setSaving] = useState(false)
  const [startTime] = useState(new Date())

  useEffect(() => {
    if (!restTimerActive || restTimerSeconds <= 0) return

    const interval = setInterval(() => {
      setRestTimerSeconds((prev) => {
        if (prev <= 1) {
          setRestTimerActive(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [restTimerActive, restTimerSeconds])

  useEffect(() => {
    const load = async () => {
      const { data: exs } = await supabase.from('training_plan_exercises').select('*, exercises(*)').eq('plan_day_id', dayId).order('order_index')
      if (!exs) return
      setExercises(exs as any)

      // Load last workout for suggestions
      const { data: last } = await supabase.from('workout_logs').select('*').eq('plan_day_id', dayId).eq('user_id', user.id).order('date', { ascending: false }).limit(1)
      const lastExercises = last && last.length > 0 ? (last[0].exercises as WorkoutExerciseLog[]) : null
      if (lastExercises) setLastWorkout(lastExercises)

      let hasOverloadSuggestion = false
      const initSets = exs.map((exercise: any) => {
        const lastExercise = lastExercises?.find((item) => item.exercise_id === exercise.exercise_id)
        const fallbackSuggestion = calculateSuggestion(
          (lastExercise?.sets ?? []) as WorkoutSetLog[],
          exercise.reps,
          exercise.exercises.is_compound,
        )
        const { min: repMin } = parseRepRange(exercise.reps)

        return Array.from({ length: exercise.sets }, (_, setIndex) => {
          const lastSet = lastExercise?.sets?.[setIndex]
          const suggestedWeight = fallbackSuggestion?.suggestedWeight ?? lastSet?.weight_kg ?? null
          const suggestedReason = fallbackSuggestion?.reason ?? null

          if (
            typeof suggestedWeight === 'number' &&
            typeof lastExercise?.sets?.[0]?.weight_kg === 'number' &&
            suggestedWeight !== lastExercise.sets[0].weight_kg
          ) {
            hasOverloadSuggestion = true
          }

          return {
            set_number: setIndex + 1,
            weight_kg: suggestedWeight ? String(suggestedWeight) : '',
            reps: String(lastSet?.reps ?? repMin),
            completed: false,
            suggestedWeight,
            suggestedReason,
            lastWeight: lastSet?.weight_kg ?? null,
            lastReps: lastSet?.reps ?? null,
          }
        })
      })

      setShowOverloadBanner(hasOverloadSuggestion)
      setSets(initSets)
    }
    load()
  }, [dayId, user.id])

  const currentEx = exercises[currentIdx]
  const currentSets = sets[currentIdx] || []
  const currentLastExercise = lastWorkout?.find((exercise) => exercise.exercise_id === currentEx?.exercise_id) ?? null
  const currentSuggestion = currentSets.find((set) => set.suggestedReason)?.suggestedReason ?? null
  const currentRestSeconds = currentEx?.rest_seconds ?? DEFAULT_REST_SECONDS
  const restProgress = currentRestSeconds > 0 ? ((currentRestSeconds - restTimerSeconds) / currentRestSeconds) * 100 : 100

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remaining = seconds % 60
    return `${minutes}:${remaining.toString().padStart(2, '0')}`
  }

  const updateSet = (setIdx: number, field: 'weight_kg' | 'reps', value: string) => {
    const updated = [...sets]
    updated[currentIdx] = [...currentSets]
    updated[currentIdx][setIdx] = { ...currentSets[setIdx], [field]: value }
    setSets(updated)
  }

  const toggleComplete = (setIdx: number) => {
    const updated = [...sets]
    updated[currentIdx] = [...currentSets]
    const wasCompleted = currentSets[setIdx].completed
    updated[currentIdx][setIdx] = { ...currentSets[setIdx], completed: !wasCompleted }
    setSets(updated)

    if (!wasCompleted) {
      setRestTimerActive(true)
      setRestTimerSeconds(currentRestSeconds)
    }
  }

  const addSet = () => {
    const updated = [...sets]
    const lastSet = currentSets[currentSets.length - 1]
    const { min: repMin } = parseRepRange(currentEx.reps)
    updated[currentIdx] = [
      ...currentSets,
      {
        set_number: currentSets.length + 1,
        weight_kg: lastSet?.weight_kg ?? '',
        reps: lastSet?.reps ?? String(repMin),
        completed: false,
        suggestedWeight: null,
        suggestedReason: null,
        lastWeight: null,
        lastReps: null,
      },
    ]
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
          <Ionicons name="close" size={24} color={brandColors.foreground} />
        </TouchableOpacity>
        <Text style={s.modalTitle}>{currentIdx + 1} / {exercises.length}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={s.modalContent}>
        {showOverloadBanner && (
          <View style={s.overloadBanner}>
            <Ionicons name="sparkles" size={16} color={brandColors.warning} />
            <Text style={s.overloadBannerText}>AI progressive overload is active for this workout</Text>
          </View>
        )}

        <Text style={s.sessionExName}>{currentEx.exercises.name}</Text>
        <Text style={s.sessionExMeta}>{currentEx.exercises.body_part} · {currentEx.exercises.equipment} · {currentEx.reps} reps</Text>

        {currentLastExercise && (
          <View style={s.lastSessionCard}>
            <Text style={s.lastSessionLabel}>Last session</Text>
            <Text style={s.lastSessionValue}>
              {currentLastExercise.sets[0]?.weight_kg ?? 0}kg top set · {currentLastExercise.sets.length} logged sets
            </Text>
          </View>
        )}

        {currentSuggestion && (
          <View style={s.suggestionCard}>
            <Ionicons name="trending-up" size={18} color={brandColors.brand500} />
            <Text style={s.suggestionText}>{currentSuggestion}</Text>
          </View>
        )}

        {restTimerActive && restTimerSeconds > 0 && (
          <View style={s.restTimerCard}>
            <View style={s.restTimerTopRow}>
              <View style={s.restTimerTitleRow}>
                <Ionicons name="timer-outline" size={18} color="#fff" />
                <Text style={s.restTimerTitle}>Rest timer</Text>
              </View>
              <TouchableOpacity onPress={() => { setRestTimerActive(false); setRestTimerSeconds(0) }}>
                <Text style={s.restTimerSkip}>Skip</Text>
              </TouchableOpacity>
            </View>
            <Text style={s.restTimerValue}>{formatTime(restTimerSeconds)}</Text>
            <View style={s.restTimerTrack}>
              <View style={[s.restTimerFill, { width: `${restProgress}%` }]} />
            </View>
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
              editable={!set.completed}
              placeholder={set.suggestedWeight ? `${set.suggestedWeight}` : '0'}
              placeholderTextColor="#c4b5fd"
            />
            <TextInput
              style={[s.setInput]}
              value={set.reps}
              onChangeText={(v) => updateSet(si, 'reps', v)}
              keyboardType="numeric"
              editable={!set.completed}
              placeholder={currentEx.reps.split('-').pop() || '12'}
              placeholderTextColor="#c4b5fd"
            />
            <TouchableOpacity style={[s.checkBtn, set.completed && s.checkBtnDone]} onPress={() => toggleComplete(si)}>
              <Ionicons name={set.completed ? 'checkmark-circle' : 'ellipse-outline'} size={28} color={set.completed ? brandColors.brand500 : brandColors.textSubtle} />
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={s.addSetBtn} onPress={addSet}>
          <Ionicons name="add" size={18} color={brandColors.textMuted} />
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
            setRestTimerActive(false)
            setRestTimerSeconds(0)
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
  container: { flex: 1, backgroundColor: brandColors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', color: brandColors.foreground, letterSpacing: -0.6 },
  addBtn: { backgroundColor: brandColors.brand500, borderRadius: 20, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingTop: 0 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyText: { fontSize: 18, fontWeight: '600', color: brandColors.textMuted },
  emptyHint: { fontSize: 14, color: brandColors.textSubtle, textAlign: 'center', maxWidth: 280, lineHeight: 20 },
  emptyLink: { fontSize: 15, fontWeight: '600', color: brandColors.brand500, marginTop: 4 },
  card: { backgroundColor: brandColors.panel, borderRadius: 18, borderWidth: 1, borderColor: brandColors.line, padding: 16, marginBottom: 10, ...brandShadow },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: brandColors.foregroundSoft },
  cardSub: { fontSize: 13, color: brandColors.textMuted, marginTop: 2 },
  activeBadge: { backgroundColor: brandColors.brand100, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: '600', color: brandColors.brand500 },
  ptBadge: { backgroundColor: brandColors.brand100, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, marginRight: 6 },
  ptBadgeText: { fontSize: 11, fontWeight: '600', color: brandColors.brand500 },
  // Modal/Form shared
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: brandColors.line },
  cancelText: { fontSize: 16, color: brandColors.textMuted },
  modalTitle: { fontSize: 18, fontWeight: '700', color: brandColors.foreground },
  modalContent: { padding: 20 },
  label: { fontSize: 14, fontWeight: '600', color: brandColors.foregroundSoft, marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: brandColors.panel, borderWidth: 1, borderColor: brandColors.lineStrong, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: brandColors.foreground },
  // Day card
  dayCard: { backgroundColor: brandColors.panel, borderRadius: 18, borderWidth: 1, borderColor: brandColors.line, padding: 16, marginTop: 16, ...brandShadow },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dayNameInput: { fontSize: 16, fontWeight: '700', color: brandColors.foregroundSoft, flex: 1 },
  dayNameDisplay: { fontSize: 16, fontWeight: '700', color: brandColors.foregroundSoft },
  exerciseCount: { fontSize: 13, color: brandColors.textMuted },
  exerciseRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: brandColors.line },
  exerciseName: { fontSize: 15, fontWeight: '600', color: brandColors.foregroundSoft },
  exerciseMeta: { fontSize: 12, color: brandColors.textSubtle, marginTop: 2 },
  addExBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 12 },
  addExText: { fontSize: 14, fontWeight: '600', color: brandColors.brand500 },
  addDayBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 16, marginTop: 8 },
  addDayText: { fontSize: 15, fontWeight: '600', color: brandColors.brand500 },
  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: brandColors.brand500, borderRadius: 14, paddingVertical: 12, marginTop: 12 },
  startBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  saveBtn: { backgroundColor: brandColors.brand500, borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  // Picker
  filterChip: { backgroundColor: brandColors.panelMuted, borderWidth: 1, borderColor: brandColors.line, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  filterChipActive: { backgroundColor: brandColors.brand500, borderColor: brandColors.brand500 },
  filterChipText: { fontSize: 13, fontWeight: '600', color: brandColors.textMuted },
  filterChipTextActive: { color: '#fff' },
  pickItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: brandColors.line },
  pickName: { fontSize: 15, fontWeight: '600', color: brandColors.foregroundSoft },
  pickMeta: { fontSize: 12, color: brandColors.textSubtle, marginTop: 2 },
  // Session
  sessionExName: { fontSize: 22, fontWeight: '800', color: brandColors.foreground, textAlign: 'center' },
  sessionExMeta: { fontSize: 14, color: brandColors.textMuted, textAlign: 'center', marginTop: 4, marginBottom: 16 },
  suggestionCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: brandColors.brand100, borderRadius: 14, borderWidth: 1, borderColor: brandColors.accentLine, padding: 12, marginBottom: 16 },
  suggestionText: { fontSize: 13, color: brandColors.foregroundSoft, flex: 1 },
  overloadBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: brandColors.warningBg, borderRadius: 14, borderWidth: 1, borderColor: '#f3d27a', padding: 12, marginBottom: 14 },
  overloadBannerText: { fontSize: 13, color: brandColors.foregroundSoft, fontWeight: '600', flex: 1 },
  lastSessionCard: { backgroundColor: brandColors.panel, borderRadius: 14, borderWidth: 1, borderColor: brandColors.line, padding: 12, marginBottom: 12 },
  lastSessionLabel: { fontSize: 12, fontWeight: '700', color: brandColors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  lastSessionValue: { fontSize: 14, color: brandColors.foregroundSoft, marginTop: 4, fontWeight: '600' },
  restTimerCard: { backgroundColor: brandColors.brand500, borderRadius: 18, padding: 16, marginBottom: 16 },
  restTimerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  restTimerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  restTimerTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  restTimerSkip: { color: 'rgba(255,255,255,0.82)', fontSize: 13, fontWeight: '700' },
  restTimerValue: { color: '#fff', fontSize: 34, fontWeight: '800', textAlign: 'center', marginVertical: 10 },
  restTimerTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 999, overflow: 'hidden' },
  restTimerFill: { height: '100%', backgroundColor: brandColors.brand400, borderRadius: 999 },
  setsHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: brandColors.lineStrong },
  setCol: { flex: 1, fontSize: 12, fontWeight: '700', color: brandColors.textMuted, textAlign: 'center' },
  setRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  setRowDone: { backgroundColor: brandColors.panelMuted, borderRadius: 8 },
  setInput: { flex: 1, backgroundColor: brandColors.panel, borderWidth: 1, borderColor: brandColors.line, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, fontSize: 16, textAlign: 'center', color: brandColors.foreground, marginHorizontal: 4 },
  checkBtn: { flex: 0.5, alignItems: 'center' },
  checkBtnDone: {},
  addSetBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 12 },
  addSetText: { fontSize: 14, color: brandColors.textMuted },
  sessionNav: { flexDirection: 'row', padding: 20, gap: 12, borderTopWidth: 1, borderTopColor: brandColors.line },
  prevBtn: { flex: 1, borderWidth: 1, borderColor: brandColors.lineStrong, borderRadius: 16, paddingVertical: 16, alignItems: 'center', backgroundColor: brandColors.panelMuted },
  prevBtnText: { fontSize: 16, fontWeight: '600', color: brandColors.textMuted },
})
