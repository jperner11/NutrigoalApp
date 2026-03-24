import { useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../../src/contexts/AuthContext'
import { supabase } from '../../src/lib/supabase'
import { WATER_QUICK_ADD } from '@nutrigoal/shared'

export default function DashboardScreen() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  const [waterTotal, setWaterTotal] = useState(0)
  const [mealCalories, setMealCalories] = useState(0)
  const [mealProtein, setMealProtein] = useState(0)
  const [mealCarbs, setMealCarbs] = useState(0)
  const [mealFat, setMealFat] = useState(0)

  const today = new Date().toISOString().split('T')[0]

  const fetchDashboardData = async () => {
    if (!user) return

    const [waterRes, mealRes] = await Promise.all([
      supabase
        .from('water_logs')
        .select('amount_ml')
        .eq('user_id', user.id)
        .eq('date', today),
      supabase
        .from('meal_logs')
        .select('total_calories, total_protein, total_carbs, total_fat')
        .eq('user_id', user.id)
        .eq('date', today),
    ])

    if (waterRes.data) {
      setWaterTotal(waterRes.data.reduce((sum, w) => sum + w.amount_ml, 0))
    }
    if (mealRes.data) {
      setMealCalories(mealRes.data.reduce((sum, m) => sum + m.total_calories, 0))
      setMealProtein(mealRes.data.reduce((sum, m) => sum + m.total_protein, 0))
      setMealCarbs(mealRes.data.reduce((sum, m) => sum + m.total_carbs, 0))
      setMealFat(mealRes.data.reduce((sum, m) => sum + m.total_fat, 0))
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [user])

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchDashboardData()
    setRefreshing(false)
  }

  const addWater = async (amount: number) => {
    if (!user) return
    await supabase.from('water_logs').insert({
      user_id: user.id,
      date: today,
      amount_ml: amount,
    })
    setWaterTotal(prev => prev + amount)
  }

  const waterTarget = profile?.daily_water_ml ?? 2500
  const calTarget = profile?.daily_calories ?? 2000
  const waterPercent = Math.min(100, Math.round((waterTotal / waterTarget) * 100))
  const calPercent = Math.min(100, Math.round((mealCalories / calTarget) * 100))

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.greeting}>
          Hey{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}!
        </Text>
        <Text style={styles.date}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>

        {/* Calories Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Calories</Text>
            <Text style={styles.cardValue}>{mealCalories} / {calTarget}</Text>
          </View>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${calPercent}%`, backgroundColor: '#16a34a' }]} />
          </View>
          <View style={styles.macroRow}>
            <MacroPill label="Protein" value={mealProtein} target={profile?.daily_protein ?? 150} color="#3b82f6" unit="g" />
            <MacroPill label="Carbs" value={mealCarbs} target={profile?.daily_carbs ?? 250} color="#f59e0b" unit="g" />
            <MacroPill label="Fat" value={mealFat} target={profile?.daily_fat ?? 65} color="#ef4444" unit="g" />
          </View>
        </View>

        {/* Water Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Water</Text>
            <Text style={styles.cardValue}>{(waterTotal / 1000).toFixed(1)}L / {(waterTarget / 1000).toFixed(1)}L</Text>
          </View>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${waterPercent}%`, backgroundColor: '#3b82f6' }]} />
          </View>
          <View style={styles.waterButtons}>
            {WATER_QUICK_ADD.map((opt) => (
              <TouchableOpacity key={opt.amount} style={styles.waterBtn} onPress={() => addWater(opt.amount)}>
                <Text style={styles.waterBtnText}>+{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <QuickAction icon="restaurant" label="Log Meal" onPress={() => router.push('/(tabs)/diet')} />
          <QuickAction icon="barbell" label="Workout" onPress={() => router.push('/(tabs)/training')} />
          <QuickAction icon="heart" label="Cardio" onPress={() => router.push('/(tabs)/cardio')} />
          <QuickAction icon="sparkles" label="AI Plans" onPress={() => router.push('/(tabs)/ai-generate')} />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function MacroPill({ label, value, target, color, unit }: { label: string; value: number; target: number; color: string; unit: string }) {
  return (
    <View style={styles.macroPill}>
      <View style={[styles.macroDot, { backgroundColor: color }]} />
      <Text style={styles.macroLabel}>{label}</Text>
      <Text style={styles.macroValue}>{value}/{target}{unit}</Text>
    </View>
  )
}

function QuickAction({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.actionCard} onPress={onPress}>
      <Ionicons name={icon as any} size={24} color="#16a34a" />
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  content: { padding: 20 },
  greeting: { fontSize: 28, fontWeight: '800', color: '#111827' },
  date: { fontSize: 14, color: '#6b7280', marginTop: 4, marginBottom: 20 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#374151' },
  cardValue: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  progressBg: { height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  macroRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  macroPill: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  macroDot: { width: 8, height: 8, borderRadius: 4 },
  macroLabel: { fontSize: 12, color: '#6b7280' },
  macroValue: { fontSize: 12, fontWeight: '600', color: '#374151' },
  waterButtons: { flexDirection: 'row', gap: 8, marginTop: 12 },
  waterBtn: { flex: 1, backgroundColor: '#eff6ff', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  waterBtnText: { fontSize: 13, fontWeight: '600', color: '#3b82f6' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 12, marginTop: 8 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCard: { width: '47%', backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', gap: 8, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  actionLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
})
