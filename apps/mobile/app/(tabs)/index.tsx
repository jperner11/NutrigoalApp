import { useEffect, useMemo, useState } from 'react'
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
import { WATER_QUICK_ADD, isManagedClientRole, isTrainerRole } from '@nutrigoal/shared'
import { BrandLogo } from '../../src/components/BrandLogo'
import { brandColors, brandShadow } from '../../src/theme/brand'

interface TrainerInfo {
  id: string
  full_name: string | null
  email: string
}

interface TrainerHomeState {
  activeClients: number
  pendingInvites: number
  noPlanClients: number
  unreadMessages: number
  overdueFeedback: number
}

export default function DashboardScreen() {
  const { user, profile } = useAuth()
  const router = useRouter()

  const normalizedRole = profile?.role ?? 'free'
  const trainerMode = isTrainerRole(normalizedRole) && !isManagedClientRole(normalizedRole)

  if (trainerMode) {
    return <TrainerHome />
  }

  return <ClientHome userId={user?.id ?? null} />
}

function ClientHome({ userId }: { userId: string | null }) {
  const { profile } = useAuth()
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  const [waterTotal, setWaterTotal] = useState(0)
  const [mealCalories, setMealCalories] = useState(0)
  const [mealProtein, setMealProtein] = useState(0)
  const [mealCarbs, setMealCarbs] = useState(0)
  const [mealFat, setMealFat] = useState(0)
  const [trainerInfo, setTrainerInfo] = useState<TrainerInfo | null>(null)
  const [hasDietPlan, setHasDietPlan] = useState(false)
  const [hasTrainingPlan, setHasTrainingPlan] = useState(false)

  const today = useMemo(() => new Date().toISOString().split('T')[0], [])
  const managedClient = isManagedClientRole(profile?.role)

  const fetchDashboardData = async () => {
    if (!userId) return

    const [waterRes, mealRes] = await Promise.all([
      supabase
        .from('water_logs')
        .select('amount_ml')
        .eq('user_id', userId)
        .eq('date', today),
      supabase
        .from('meal_logs')
        .select('total_calories, total_protein, total_carbs, total_fat')
        .eq('user_id', userId)
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

    if (managedClient && profile) {
      const trainerId = profile.personal_trainer_id ?? profile.nutritionist_id
      const [{ count: dietCount }, { count: trainingCount }, trainerRes] = await Promise.all([
        supabase.from('diet_plans').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('is_active', true),
        supabase.from('training_plans').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('is_active', true),
        trainerId
          ? supabase.from('user_profiles').select('id, full_name, email').eq('id', trainerId).single()
          : Promise.resolve({ data: null }),
      ])

      setHasDietPlan((dietCount ?? 0) > 0)
      setHasTrainingPlan((trainingCount ?? 0) > 0)
      setTrainerInfo((trainerRes as { data: TrainerInfo | null }).data ?? null)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [userId, profile?.role])

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchDashboardData()
    setRefreshing(false)
  }

  const addWater = async (amount: number) => {
    if (!userId) return
    await supabase.from('water_logs').insert({
      user_id: userId,
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
              <Text style={styles.heroBadgeText}>{managedClient ? 'Coach-managed plan' : 'Today’s dashboard'}</Text>
            </View>
          </View>
          <Text style={styles.greeting}>
            Hey{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}.
          </Text>
          <Text style={styles.heroTitle}>
            {managedClient
              ? 'Follow the plan, keep logging, and stay close to your momentum.'
              : 'Stay on target with nutrition, hydration, and training.'}
          </Text>
          <Text style={styles.date}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
        </View>

        {managedClient && (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Your trainer</Text>
              <Text style={styles.connectedName}>{trainerInfo?.full_name || 'Personal Trainer'}</Text>
              <Text style={styles.cardCopy}>
                {trainerInfo
                  ? `${trainerInfo.full_name || trainerInfo.email} is managing your plans, feedback, and check-ins.`
                  : 'Your trainer connection is active and your managed plans will appear here.'}
              </Text>
              <TouchableOpacity style={styles.inlineLink} onPress={() => router.push('/(tabs)/my-pt')}>
                <Text style={styles.inlineLinkText}>Open My Trainer</Text>
                <Ionicons name="chevron-forward" size={16} color={brandColors.brand500} />
              </TouchableOpacity>
            </View>

            <View style={styles.planStatusRow}>
              <PlanStatusCard
                label="Diet plan"
                ready={hasDietPlan}
                readyText="Assigned and ready."
                waitingText="Waiting for your trainer."
              />
              <PlanStatusCard
                label="Training plan"
                ready={hasTrainingPlan}
                readyText="Assigned and ready."
                waitingText="Programme coming soon."
              />
            </View>
          </>
        )}

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
          <QuickAction icon="restaurant" label="Open Diet" onPress={() => router.push('/(tabs)/diet')} />
          <QuickAction icon="barbell" label="Open Training" onPress={() => router.push('/(tabs)/training')} />
          <QuickAction icon="heart" label="Cardio" onPress={() => router.push('/(tabs)/cardio')} />
          <QuickAction icon={managedClient ? 'chatbubbles' : 'sparkles'} label={managedClient ? 'My Trainer' : 'AI Plans'} onPress={() => router.push(managedClient ? '/(tabs)/my-pt' : '/(tabs)/ai-generate')} />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function TrainerHome() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  const [state, setState] = useState<TrainerHomeState>({
    activeClients: 0,
    pendingInvites: 0,
    noPlanClients: 0,
    unreadMessages: 0,
    overdueFeedback: 0,
  })

  const fetchTrainerData = async () => {
    if (!user) return

    const [{ data: clients }, { count: pendingInvites }, { data: conversations }, { data: feedbackRequests }] = await Promise.all([
      supabase
        .from('nutritionist_clients')
        .select('id, client_id')
        .eq('nutritionist_id', user.id)
        .eq('status', 'active'),
      supabase
        .from('personal_trainer_invites')
        .select('*', { count: 'exact', head: true })
        .eq('personal_trainer_id', user.id)
        .eq('status', 'pending'),
      supabase.from('conversations').select('id').eq('nutritionist_id', user.id),
      supabase.from('feedback_requests').select('id, created_at').eq('nutritionist_id', user.id).eq('status', 'pending'),
    ])

    const clientIds = (clients ?? []).map((row: { client_id: string | null }) => row.client_id).filter(Boolean) as string[]

    const [{ data: dietPlans }, { data: trainingPlans }] = await Promise.all([
      clientIds.length > 0
        ? supabase.from('diet_plans').select('user_id').in('user_id', clientIds).eq('is_active', true)
        : Promise.resolve({ data: [] }),
      clientIds.length > 0
        ? supabase.from('training_plans').select('user_id').in('user_id', clientIds).eq('is_active', true)
        : Promise.resolve({ data: [] }),
    ])

    const dietSet = new Set((dietPlans ?? []).map((plan: { user_id: string }) => plan.user_id))
    const trainingSet = new Set((trainingPlans ?? []).map((plan: { user_id: string }) => plan.user_id))
    const noPlanClients = clientIds.filter((id) => !dietSet.has(id) || !trainingSet.has(id)).length

    let unreadMessages = 0
    const conversationIds = (conversations ?? []).map((conversation: { id: string }) => conversation.id)
    if (conversationIds.length > 0) {
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .in('conversation_id', conversationIds)
        .neq('sender_id', user.id)
        .is('read_at', null)
      unreadMessages = count ?? 0
    }

    const overdueFeedback = (feedbackRequests ?? []).filter((request: { created_at: string }) => {
      return new Date(request.created_at).getTime() < Date.now() - 3 * 24 * 60 * 60 * 1000
    }).length

    setState({
      activeClients: clients?.length ?? 0,
      pendingInvites: pendingInvites ?? 0,
      noPlanClients,
      unreadMessages,
      overdueFeedback,
    })
  }

  useEffect(() => {
    fetchTrainerData()
  }, [user?.id])

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchTrainerData()
    setRefreshing(false)
  }

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
              <Text style={styles.heroBadgeText}>Practitioner home</Text>
            </View>
          </View>
          <Text style={styles.greeting}>
            {profile?.full_name ? profile.full_name.split(' ')[0] : 'Coach'},
          </Text>
          <Text style={styles.heroTitle}>Here&apos;s what needs your attention today.</Text>
          <Text style={styles.date}>Focus on invites, plan assignment, and client follow-up.</Text>
        </View>

        <View style={styles.trainerStatsGrid}>
          <TrainerStatCard label="Active clients" value={state.activeClients} />
          <TrainerStatCard label="Pending invites" value={state.pendingInvites} />
          <TrainerStatCard label="Missing plans" value={state.noPlanClients} />
          <TrainerStatCard label="Unread replies" value={state.unreadMessages} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Today&apos;s tasks</Text>
          <TaskLine label="Review pending invites" value={state.pendingInvites} />
          <TaskLine label="Assign missing plans" value={state.noPlanClients} />
          <TaskLine label="Reply to unread messages" value={state.unreadMessages} />
          <TaskLine label="Overdue feedback follow-ups" value={state.overdueFeedback} />
        </View>

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <QuickAction icon="people" label="Open Clients" onPress={() => router.push('/(tabs)/clients')} />
          <QuickAction icon="person-add" label="Invite Client" onPress={() => router.push('/(tabs)/clients')} />
          <QuickAction icon="mail" label="Messages" onPress={() => router.push('/(tabs)/clients')} />
          <QuickAction icon="settings" label="Settings" onPress={() => router.push('/(tabs)/settings')} />
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

function PlanStatusCard({ label, ready, readyText, waitingText }: { label: string; ready: boolean; readyText: string; waitingText: string }) {
  return (
    <View style={styles.planStatusCard}>
      <Text style={styles.planStatusLabel}>{label}</Text>
      <Text style={[styles.planStatusValue, ready ? styles.planStatusReady : styles.planStatusWaiting]}>
        {ready ? readyText : waitingText}
      </Text>
    </View>
  )
}

function QuickAction({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.actionCard} onPress={onPress}>
      <Ionicons name={icon as never} size={24} color={brandColors.brand500} />
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  )
}

function TrainerStatCard({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.trainerStatCard}>
      <Text style={styles.trainerStatValue}>{value}</Text>
      <Text style={styles.trainerStatLabel}>{label}</Text>
    </View>
  )
}

function TaskLine({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.taskLine}>
      <Text style={styles.taskLabel}>{label}</Text>
      <View style={styles.taskBadge}>
        <Text style={styles.taskBadgeText}>{value}</Text>
      </View>
    </View>
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
  cardCopy: { marginTop: 8, fontSize: 14, lineHeight: 20, color: brandColors.textMuted },
  connectedName: { marginTop: 6, fontSize: 24, fontWeight: '800', color: brandColors.foreground },
  inlineLink: { marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 6 },
  inlineLinkText: { fontSize: 14, fontWeight: '700', color: brandColors.brand500 },
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
  planStatusRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  planStatusCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: brandColors.line,
    padding: 16,
    ...brandShadow,
  },
  planStatusLabel: { fontSize: 13, fontWeight: '700', color: brandColors.foregroundSoft },
  planStatusValue: { marginTop: 8, fontSize: 13, lineHeight: 18 },
  planStatusReady: { color: brandColors.success },
  planStatusWaiting: { color: brandColors.textMuted },
  trainerStatsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  trainerStatCard: {
    width: '47%',
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: brandColors.line,
    padding: 16,
    ...brandShadow,
  },
  trainerStatValue: { fontSize: 28, fontWeight: '800', color: brandColors.foreground },
  trainerStatLabel: { marginTop: 6, fontSize: 13, color: brandColors.textMuted },
  taskLine: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: brandColors.line,
    backgroundColor: 'rgba(255,255,255,0.76)',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  taskLabel: { flex: 1, fontSize: 14, color: brandColors.textMuted, paddingRight: 12 },
  taskBadge: {
    minWidth: 30,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: brandColors.brand100,
    alignItems: 'center',
  },
  taskBadgeText: { fontSize: 12, fontWeight: '700', color: brandColors.brand900 },
})
