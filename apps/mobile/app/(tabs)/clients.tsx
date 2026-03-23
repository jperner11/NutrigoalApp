import { useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../src/contexts/AuthContext'
import { supabase } from '../../src/lib/supabase'
import type { NutritionistClient } from '@nutrigoal/shared'

export default function ClientsScreen() {
  const { user } = useAuth()
  const [clients, setClients] = useState<(NutritionistClient & { client_email?: string })[]>([])
  const [refreshing, setRefreshing] = useState(false)

  const fetchClients = async () => {
    if (!user) return
    const { data } = await supabase
      .from('nutritionist_clients')
      .select('*, user_profiles!nutritionist_clients_client_id_fkey(email)')
      .eq('nutritionist_id', user.id)
    if (data) setClients(data as any)
  }

  useEffect(() => { fetchClients() }, [user])

  const onRefresh = async () => { setRefreshing(true); await fetchClients(); setRefreshing(false) }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Clients</Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {clients.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>No clients yet</Text>
            <Text style={styles.emptySubtext}>Invite clients to start managing their nutrition</Text>
          </View>
        ) : (
          clients.map((c) => (
            <View key={c.id} style={styles.card}>
              <Ionicons name="person-circle-outline" size={40} color="#9ca3af" />
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{c.invited_email || 'Client'}</Text>
                <Text style={styles.cardSub}>{c.status}</Text>
              </View>
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
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#374151' },
  cardSub: { fontSize: 13, color: '#9ca3af', marginTop: 2 },
})
