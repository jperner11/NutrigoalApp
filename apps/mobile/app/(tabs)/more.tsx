import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../src/contexts/AuthContext'
import { BrandLogo } from '../../src/components/BrandLogo'
import { brandColors, brandShadow } from '../../src/theme/brand'
import { isManagedClientRole, isTrainerRole } from '@nutrigoal/shared'

interface MenuItem {
  icon: string
  label: string
  route: string
  color: string
  roles?: string[]
}

const CLIENT_MENU_ITEMS: MenuItem[] = [
  { icon: 'water', label: 'Water Tracking', route: '/(tabs)/water', color: brandColors.brand500 },
  { icon: 'sparkles', label: 'AI Generate Plans', route: '/(tabs)/ai-generate', color: brandColors.brand500 },
  { icon: 'sparkles', label: 'AI Suggestions', route: '/(tabs)/ai', color: brandColors.brand400 },
  { icon: 'chatbubbles', label: 'My Trainer / Messages', route: '/(tabs)/my-pt', color: '#3b82f6', roles: ['free', 'pro', 'personal_trainer_client', 'nutritionist_client'] },
  { icon: 'people', label: 'Clients', route: '/(tabs)/clients', color: '#df9a2b', roles: ['personal_trainer', 'nutritionist'] },
  { icon: 'settings-sharp', label: 'Settings', route: '/(tabs)/settings', color: brandColors.textMuted },
]

const TRAINER_MENU_ITEMS: MenuItem[] = [
  { icon: 'people', label: 'Client Roster', route: '/(tabs)/clients', color: '#df9a2b' },
  { icon: 'sparkles', label: 'AI Suggestions', route: '/(tabs)/ai', color: brandColors.brand400 },
  { icon: 'settings-sharp', label: 'Settings', route: '/(tabs)/settings', color: brandColors.textMuted },
]

export default function MoreScreen() {
  const router = useRouter()
  const { profile, signOut } = useAuth()
  const userRole = profile?.role ?? 'free'
  const managedClient = isManagedClientRole(userRole)
  const trainerMode = isTrainerRole(userRole) && !isManagedClientRole(userRole)

  const baseItems = trainerMode
    ? TRAINER_MENU_ITEMS
    : CLIENT_MENU_ITEMS.filter((item) => !(managedClient && item.route === '/(tabs)/ai-generate'))

  const visibleItems = baseItems.filter(
    (item) => !item.roles || item.roles.includes(userRole)
  )

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BrandLogo compact />
        <Text style={styles.title}>More</Text>
        <Text style={styles.subtitle}>
          {trainerMode
            ? 'Practitioner tools, roster access, and account controls.'
            : 'Secondary tools, coaching workflows, and account controls.'}
        </Text>
      </View>
      <View style={styles.content}>
        {visibleItems.map((item) => (
          <TouchableOpacity
            key={item.route}
            style={styles.menuItem}
            onPress={() => router.push(item.route as any)}
          >
            <View style={[styles.iconBox, { backgroundColor: `${item.color}15` }]}>
              <Ionicons name={item.icon as any} size={22} color={item.color} />
            </View>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={20} color={brandColors.textSubtle} />
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
          <Ionicons name="log-out-outline" size={20} color={brandColors.danger} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: brandColors.background },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, gap: 8 },
  title: { fontSize: 24, fontWeight: '800', color: brandColors.foreground, letterSpacing: -0.6 },
  subtitle: { fontSize: 14, color: brandColors.textMuted },
  content: { padding: 20, paddingTop: 0, gap: 8 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: brandColors.line,
    padding: 16,
    gap: 12,
    ...brandShadow,
  },
  iconBox: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontSize: 16, fontWeight: '600', color: brandColors.foregroundSoft },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 32, paddingVertical: 16 },
  signOutText: { fontSize: 16, fontWeight: '600', color: brandColors.danger },
})
