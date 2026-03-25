import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../src/contexts/AuthContext'

interface MenuItem {
  icon: string
  label: string
  route: string
  color: string
  roles?: string[]
}

const MENU_ITEMS: MenuItem[] = [
  { icon: 'water', label: 'Water Tracking', route: '/(tabs)/water', color: '#3b82f6' },
  { icon: 'sparkles', label: 'AI Generate Plans', route: '/(tabs)/ai-generate', color: '#7c3aed' },
  { icon: 'sparkles', label: 'AI Suggestions', route: '/(tabs)/ai', color: '#8b5cf6' },
  { icon: 'chatbubbles', label: 'My PT / Messages', route: '/(tabs)/my-pt', color: '#3b82f6', roles: ['free', 'pro'] },
  { icon: 'people', label: 'Clients', route: '/(tabs)/clients', color: '#f59e0b', roles: ['nutritionist'] },
  { icon: 'settings-sharp', label: 'Settings', route: '/(tabs)/settings', color: '#6b7280' },
]

export default function MoreScreen() {
  const router = useRouter()
  const { profile, signOut } = useAuth()
  const userRole = profile?.role ?? 'free'

  const visibleItems = MENU_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(userRole)
  )

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>More</Text>
      </View>
      <View style={styles.content}>
        {visibleItems.map((item) => (
          <TouchableOpacity
            key={item.route}
            style={styles.menuItem}
            onPress={() => router.push(item.route as any)}
          >
            <View style={[styles.iconBox, { backgroundColor: item.color + '15' }]}>
              <Ionicons name={item.icon as any} size={22} color={item.color} />
            </View>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827' },
  content: { padding: 20, paddingTop: 0, gap: 4 },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, gap: 12, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  iconBox: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontSize: 16, fontWeight: '600', color: '#374151' },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 32, paddingVertical: 16 },
  signOutText: { fontSize: 16, fontWeight: '600', color: '#ef4444' },
})
