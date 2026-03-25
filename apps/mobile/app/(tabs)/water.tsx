import { useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../src/contexts/AuthContext'
import { supabase } from '../../src/lib/supabase'
import { WATER_QUICK_ADD } from '@nutrigoal/shared'

export default function WaterScreen() {
  const { user, profile } = useAuth()
  const [logs, setLogs] = useState<{ id: string; amount_ml: number; logged_at: string }[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const today = new Date().toISOString().split('T')[0]

  const fetchLogs = async () => {
    if (!user) return
    const { data } = await supabase
      .from('water_logs')
      .select('id, amount_ml, logged_at')
      .eq('user_id', user.id)
      .eq('date', today)
      .order('logged_at', { ascending: false })
    if (data) setLogs(data)
  }

  useEffect(() => { fetchLogs() }, [user])

  const onRefresh = async () => { setRefreshing(true); await fetchLogs(); setRefreshing(false) }

  const addWater = async (amount: number) => {
    if (!user) return
    await supabase.from('water_logs').insert({ user_id: user.id, date: today, amount_ml: amount })
    await fetchLogs()
  }

  const total = logs.reduce((sum, l) => sum + l.amount_ml, 0)
  const target = profile?.daily_water_ml ?? 2500

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Water Tracking</Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.card}>
          <Ionicons name="water" size={40} color="#3b82f6" />
          <Text style={styles.bigNum}>{(total / 1000).toFixed(1)}L</Text>
          <Text style={styles.target}>of {(target / 1000).toFixed(1)}L target</Text>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${Math.min(100, (total / target) * 100)}%` }]} />
          </View>
        </View>

        <View style={styles.quickRow}>
          {WATER_QUICK_ADD.map((opt) => (
            <TouchableOpacity key={opt.amount} style={styles.quickBtn} onPress={() => addWater(opt.amount)}>
              <Text style={styles.quickBtnText}>+{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {logs.length > 0 && <Text style={styles.sectionTitle}>Today's Log</Text>}
        {logs.map((l) => (
          <View key={l.id} style={styles.logRow}>
            <Text style={styles.logAmount}>{l.amount_ml}ml</Text>
            <Text style={styles.logTime}>{new Date(l.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827' },
  content: { padding: 20, paddingTop: 0 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  bigNum: { fontSize: 48, fontWeight: '800', color: '#3b82f6', marginTop: 8 },
  target: { fontSize: 14, color: '#6b7280', marginBottom: 16 },
  progressBg: { width: '100%', height: 10, backgroundColor: '#e5e7eb', borderRadius: 5, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#3b82f6', borderRadius: 5 },
  quickRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  quickBtn: { flex: 1, backgroundColor: '#eff6ff', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  quickBtnText: { fontSize: 15, fontWeight: '700', color: '#3b82f6' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 8 },
  logRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  logAmount: { fontSize: 15, fontWeight: '600', color: '#374151' },
  logTime: { fontSize: 14, color: '#9ca3af' },
})
