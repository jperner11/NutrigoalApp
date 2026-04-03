import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
  RefreshControl, Alert, ActivityIndicator, Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../src/contexts/AuthContext'
import { supabase } from '../../src/lib/supabase'
import { calculateCardioCalories } from '@nutrigoal/shared'
import type { CardioSession, CardioType } from '@nutrigoal/shared'
import { brandColors, brandShadow } from '../../src/theme/brand'

export default function CardioScreen() {
  const { user, profile } = useAuth()
  const [sessions, setSessions] = useState<(CardioSession & { cardio_types?: CardioType })[]>([])
  const [cardioTypes, setCardioTypes] = useState<CardioType[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form state
  const [selectedTypeId, setSelectedTypeId] = useState('')
  const [duration, setDuration] = useState('30')
  const [bpm, setBpm] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])

  const fetchData = async () => {
    if (!user) return
    const [typesRes, sessionsRes] = await Promise.all([
      supabase.from('cardio_types').select('*').order('name'),
      supabase.from('cardio_sessions').select('*, cardio_types(*)').eq('user_id', user.id).order('date', { ascending: false }).limit(20),
    ])
    if (typesRes.data) {
      setCardioTypes(typesRes.data as CardioType[])
      if (!selectedTypeId && typesRes.data.length > 0) setSelectedTypeId(typesRes.data[0].id)
    }
    if (sessionsRes.data) setSessions(sessionsRes.data as any)
  }

  useEffect(() => { fetchData() }, [user])

  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false) }

  const handleSave = async () => {
    if (!user || !profile) return
    const durationNum = parseInt(duration)
    if (!durationNum || durationNum <= 0) { Alert.alert('Error', 'Enter a valid duration'); return }

    const selectedType = cardioTypes.find(t => t.id === selectedTypeId)
    if (!selectedType) return

    const bpmNum = bpm ? parseInt(bpm) : null
    const calories = calculateCardioCalories({
      durationMinutes: durationNum,
      avgBpm: bpmNum,
      weightKg: profile.weight_kg ?? 70,
      age: profile.age ?? 30,
      gender: profile.gender ?? 'male',
      metValue: selectedType.default_met,
    })

    setSaving(true)
    const { error } = await supabase.from('cardio_sessions').insert({
      user_id: user.id,
      created_by: user.id,
      cardio_type_id: selectedTypeId,
      date,
      duration_minutes: durationNum,
      avg_bpm: bpmNum,
      calories_burned: calories,
      is_completed: true,
    })
    setSaving(false)

    if (error) { Alert.alert('Error', error.message); return }
    setShowForm(false)
    setDuration('30')
    setBpm('')
    await fetchData()
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Cardio</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(true)}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brandColors.danger} />}
      >
        {sessions.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="heart-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>No cardio sessions yet</Text>
            <TouchableOpacity onPress={() => setShowForm(true)}>
              <Text style={styles.emptyLink}>Log your first session</Text>
            </TouchableOpacity>
          </View>
        ) : (
          sessions.map((s) => (
            <View key={s.id} style={styles.card}>
              <View style={styles.cardRow}>
                <View style={styles.cardIconBox}>
                  <Ionicons name="heart" size={20} color={brandColors.danger} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{(s as any).cardio_types?.name || 'Cardio'}</Text>
                  <Text style={styles.cardDate}>{new Date(s.date).toLocaleDateString()}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.cardCalories}>{s.calories_burned} kcal</Text>
                  <Text style={styles.cardDuration}>{s.duration_minutes} min{s.avg_bpm ? ` · ${s.avg_bpm} bpm` : ''}</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Log Session Modal */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Log Cardio</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={styles.label}>Activity Type</Text>
            <View style={styles.typeGrid}>
              {cardioTypes.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.typeBtn, selectedTypeId === t.id && styles.typeBtnActive]}
                  onPress={() => setSelectedTypeId(t.id)}
                >
                  <Text style={[styles.typeBtnText, selectedTypeId === t.id && styles.typeBtnTextActive]}>{t.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Duration (minutes)</Text>
            <TextInput style={styles.input} value={duration} onChangeText={setDuration} keyboardType="numeric" placeholder="30" placeholderTextColor={brandColors.textSubtle} />

            <Text style={styles.label}>Average Heart Rate (optional)</Text>
            <TextInput style={styles.input} value={bpm} onChangeText={setBpm} keyboardType="numeric" placeholder="e.g. 145" placeholderTextColor={brandColors.textSubtle} />

            {duration && parseInt(duration) > 0 && selectedTypeId && profile && (
              <View style={styles.previewCard}>
                <Text style={styles.previewLabel}>Estimated Calories</Text>
                <Text style={styles.previewValue}>
                  {calculateCardioCalories({
                    durationMinutes: parseInt(duration) || 0,
                    avgBpm: bpm ? parseInt(bpm) : null,
                    weightKg: profile.weight_kg ?? 70,
                    age: profile.age ?? 30,
                    gender: profile.gender ?? 'male',
                    metValue: cardioTypes.find(t => t.id === selectedTypeId)?.default_met ?? 5,
                  })} kcal
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Session</Text>}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: brandColors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', color: brandColors.foreground, letterSpacing: -0.6 },
  addBtn: { backgroundColor: brandColors.danger, borderRadius: 20, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingTop: 0 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyText: { fontSize: 18, fontWeight: '600', color: brandColors.textMuted },
  emptyLink: { fontSize: 15, fontWeight: '600', color: brandColors.danger, marginTop: 4 },
  card: { backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 18, borderWidth: 1, borderColor: brandColors.line, padding: 16, marginBottom: 10, ...brandShadow },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff0ef', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: brandColors.foregroundSoft },
  cardDate: { fontSize: 12, color: brandColors.textSubtle, marginTop: 2 },
  cardCalories: { fontSize: 15, fontWeight: '700', color: brandColors.danger },
  cardDuration: { fontSize: 12, color: brandColors.textMuted, marginTop: 2 },
  // Modal
  modalContainer: { flex: 1, backgroundColor: brandColors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: brandColors.line },
  cancelText: { fontSize: 16, color: brandColors.textMuted },
  modalTitle: { fontSize: 18, fontWeight: '700', color: brandColors.foreground },
  modalContent: { padding: 20, gap: 4 },
  label: { fontSize: 14, fontWeight: '600', color: brandColors.foregroundSoft, marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: 'rgba(255,255,255,0.92)', borderWidth: 1, borderColor: brandColors.lineStrong, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: brandColors.foreground },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeBtn: { backgroundColor: 'rgba(255,255,255,0.88)', borderWidth: 1, borderColor: brandColors.line, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14 },
  typeBtnActive: { borderColor: 'rgba(217, 92, 87, 0.35)', backgroundColor: '#fff0ef' },
  typeBtnText: { fontSize: 14, fontWeight: '600', color: brandColors.textMuted },
  typeBtnTextActive: { color: brandColors.danger },
  previewCard: { backgroundColor: '#fff0ef', borderRadius: 18, padding: 16, alignItems: 'center', marginTop: 16, borderWidth: 1, borderColor: 'rgba(217, 92, 87, 0.14)' },
  previewLabel: { fontSize: 13, color: '#8f3f3b' },
  previewValue: { fontSize: 28, fontWeight: '800', color: brandColors.danger, marginTop: 4 },
  saveBtn: { backgroundColor: brandColors.danger, borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
