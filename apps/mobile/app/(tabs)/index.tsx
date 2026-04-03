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
import { BrandLogo } from '../../src/components/BrandLogo'
import { brandColors, brandShadow } from '../../src/theme/brand'

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
    setWaterTotal((prev) => prev + amount)
  }

  const waterTarget = profile?.daily_water_ml ?? 2500
  const calTarget = profile?.daily_calories ?? 2000
  const waterPercent = Math.min(100, Math.round((waterTotal / waterTarget) * 100))
  const calPercent = Math.min(100, Math.round((mealCalories / calTarget) * 100))

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brandColors.brand500} />}
      >
        <View style={styles.hero}>
          <View style={styles.heroGlow} />
          <View style={styles.heroHeader}>
            <BrandLogo compact />
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>Today's clinic view</Text>
            </View>
          </View>
          <Text style={styles.greeting}>
            Hey{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}.
          </Text>
          <Text style={styles.heroTitle}>Stay on target with nutrition, hydration, and training.</Text>
          <Text style={styles.date}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Calories</Text>
            <Text style={styles.cardValue}>{mealCalories} / {calTarget}</Text>
          </View>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${calPercent}%`, backgroundColor: brandColors.brand900 }]} />
          </View>
          <View style={styles.macroRow}>
            <MacroPill label="Protein" value={mealProtein} target={profile?.daily_protein ?? 150} color={brandColors.success} unit="g" />
            <MacroPill label="Carbs" value={mealCarbs} target={profile?.daily_carbs ?? 250} color={brandColors.warning} unit="g" />
            <MacroPill label="Fat" value={mealFat} target={profile?.daily_fat ?? 65} color={brandColors.danger} unit="g" />
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Water</Text>
            <Text style={styles.cardValue}>
              {(waterTotal / 1000).toFixed(1)}L / {(waterTarget / 1000).toFixed(1)}L
            </Text>
          </View>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${waterPercent}%`, backgroundColor: brandColors.brand500 }]} />
          </View>
          <View style={styles.waterButtons}>
            {WATER_QUICK_ADD.map((opt) => (
              <TouchableOpacity key={opt.amount} style={styles.waterBtn} onPress={() => addWater(opt.amount)}>
                <Text style={styles.waterBtnText}>+{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

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
  const iconColor = label === 'Cardio' ? brandColors.danger : brandColors.brand500

  return (
    <TouchableOpacity style={styles.actionCard} onPress={onPress}>
      <Ionicons name={icon as any} size={24} color={iconColor} />
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: brandColors.background },
  content: { padding: 20, paddingBottom: 32 },
  hero: {
    borderRadius: 28,
    padding: 22,
    marginBottom: 18,
    backgroundColor: brandColors.brand900,
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    top: -30,
    right: -20,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(77, 196, 255, 0.2)',
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
  },
  heroBadge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  heroBadgeText: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '600' },
  greeting: { fontSize: 18, fontWeight: '700', color: 'rgba(255,255,255,0.76)' },
  heroTitle: {
    marginTop: 6,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -1.1,
  },
  date: { fontSize: 14, color: 'rgba(255,255,255,0.72)', marginTop: 14 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: brandColors.line,
    padding: 18,
    marginBottom: 16,
    ...brandShadow,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: brandColors.foregroundSoft },
  cardValue: { fontSize: 14, fontWeight: '600', color: brandColors.textMuted },
  progressBg: { height: 8, backgroundColor: brandColors.brand200, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  macroRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  macroPill: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  macroDot: { width: 8, height: 8, borderRadius: 4 },
  macroLabel: { fontSize: 12, color: brandColors.textMuted },
  macroValue: { fontSize: 12, fontWeight: '600', color: brandColors.foregroundSoft },
  waterButtons: { flexDirection: 'row', gap: 8, marginTop: 12 },
  waterBtn: {
    flex: 1,
    backgroundColor: brandColors.brand100,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(77, 196, 255, 0.2)',
  },
  waterBtnText: { fontSize: 13, fontWeight: '700', color: brandColors.brand500 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: brandColors.foreground, marginBottom: 12, marginTop: 8 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCard: {
    width: '47%',
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: brandColors.line,
    padding: 18,
    alignItems: 'center',
    gap: 8,
  },
  actionLabel: { fontSize: 13, fontWeight: '700', color: brandColors.foregroundSoft },
})
