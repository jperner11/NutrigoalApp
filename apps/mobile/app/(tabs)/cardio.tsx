import { useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../src/contexts/AuthContext'
import { supabase } from '../../src/lib/supabase'
import type { CardioSession } from '@nutrigoal/shared'

export default function CardioScreen() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState<CardioSession[]>([])
  const [refreshing, setRefreshing] = useState(false)

  const fetchSessions = async () => {
    if (!user) return
    const { data } = await supabase
      .from('cardio_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(20)
    if (data) setSessions(data as CardioSession[])
  }

  useEffect(() => { fetchSessions() }, [user])

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchSessions()
    setRefreshing(false)
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Cardio</Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {sessions.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="heart-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>No cardio sessions yet</Text>
            <Text style={styles.emptySubtext}>Log your first cardio session</Text>
          </View>
        ) : (
          sessions.map((s) => (
            <View key={s.id} style={styles.card}>
              <Text style={styles.cardTitle}>{s.duration_minutes} min</Text>
              <Text style={styles.cardSub}>{s.calories_burned} kcal burned</Text>
              <Text style={styles.cardDate}>{new Date(s.date).toLocaleDateString()}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827' },
  content: { padding: 20, paddingTop: 0 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#6b7280' },
  emptySubtext: { fontSize: 14, color: '#9ca3af' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#374151' },
  cardSub: { fontSize: 14, color: '#16a34a', marginTop: 2 },
  cardDate: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
})
