import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../src/contexts/AuthContext'
import { PRICING } from '@nutrigoal/shared'
import { BrandLogo } from '../../src/components/BrandLogo'
import { brandColors, brandShadow } from '../../src/theme/brand'

export default function SettingsScreen() {
  const { profile, signOut } = useAuth()
  const tier = profile?.role ?? 'free'
  const tierInfo = PRICING[tier as keyof typeof PRICING]

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BrandLogo compact />
        <Text style={styles.title}>Settings</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={32} color={brandColors.brand500} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{profile?.full_name || 'User'}</Text>
            <Text style={styles.email}>{profile?.email}</Text>
          </View>
          <View style={styles.tierBadge}>
            <Text style={styles.tierText}>{tierInfo?.name || 'Free'}</Text>
          </View>
        </View>

        {/* Stats */}
        {profile?.daily_calories && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Daily Targets</Text>
            <View style={styles.statRow}>
              <StatItem label="Calories" value={`${profile.daily_calories}`} />
              <StatItem label="Protein" value={`${profile.daily_protein}g`} />
              <StatItem label="Water" value={`${((profile.daily_water_ml ?? 0) / 1000).toFixed(1)}L`} />
            </View>
          </View>
        )}

        <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: brandColors.background },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, gap: 8 },
  title: { fontSize: 24, fontWeight: '800', color: brandColors.foreground, letterSpacing: -0.6 },
  content: { padding: 20, paddingTop: 0 },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 20, borderWidth: 1, borderColor: brandColors.line, padding: 16, marginBottom: 16, ...brandShadow },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: brandColors.brand100, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 18, fontWeight: '700', color: brandColors.foreground },
  email: { fontSize: 13, color: brandColors.textMuted, marginTop: 2 },
  tierBadge: { backgroundColor: brandColors.brand100, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  tierText: { fontSize: 12, fontWeight: '700', color: brandColors.brand500 },
  card: { backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 20, borderWidth: 1, borderColor: brandColors.line, padding: 16, marginBottom: 16, ...brandShadow },
  cardTitle: { fontSize: 16, fontWeight: '700', color: brandColors.foregroundSoft, marginBottom: 12 },
  statRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: brandColors.brand500 },
  statLabel: { fontSize: 12, color: brandColors.textMuted, marginTop: 2 },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24, paddingVertical: 16 },
  signOutText: { fontSize: 16, fontWeight: '600', color: brandColors.danger },
})
