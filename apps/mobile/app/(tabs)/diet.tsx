import { useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../src/contexts/AuthContext'
import { supabase } from '../../src/lib/supabase'
import type { DietPlan } from '@nutrigoal/shared'

export default function DietScreen() {
  const { user } = useAuth()
  const [plans, setPlans] = useState<DietPlan[]>([])
  const [refreshing, setRefreshing] = useState(false)

  const fetchPlans = async () => {
    if (!user) return
    const { data } = await supabase
      .from('diet_plans')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (data) setPlans(data as DietPlan[])
  }

  useEffect(() => { fetchPlans() }, [user])

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchPlans()
    setRefreshing(false)
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Diet Plans</Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {plans.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="restaurant-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>No diet plans yet</Text>
            <Text style={styles.emptySubtext}>Create your first plan to start tracking meals</Text>
          </View>
        ) : (
          plans.map((plan) => (
            <View key={plan.id} style={styles.card}>
              <View style={styles.cardRow}>
                <Text style={styles.cardTitle}>{plan.name}</Text>
                {plan.is_active && <View style={styles.activeBadge}><Text style={styles.badgeText}>Active</Text></View>}
              </View>
              {plan.target_calories && (
                <Text style={styles.cardSub}>{plan.target_calories} kcal/day</Text>
              )}
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
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#374151' },
  cardSub: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  activeBadge: { backgroundColor: '#dcfce7', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: '600', color: '#16a34a' },
})
