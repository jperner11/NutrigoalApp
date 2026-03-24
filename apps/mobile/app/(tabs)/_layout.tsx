import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../src/contexts/AuthContext'

type TabIconName = React.ComponentProps<typeof Ionicons>['name']

interface TabConfig {
  name: string
  title: string
  icon: TabIconName
  iconFocused: TabIconName
  roles?: string[]
}

const TABS: TabConfig[] = [
  { name: 'index', title: 'Dashboard', icon: 'home-outline', iconFocused: 'home' },
  { name: 'diet', title: 'Diet', icon: 'restaurant-outline', iconFocused: 'restaurant' },
  { name: 'training', title: 'Training', icon: 'barbell-outline', iconFocused: 'barbell' },
  { name: 'cardio', title: 'Cardio', icon: 'heart-outline', iconFocused: 'heart' },
  { name: 'more', title: 'More', icon: 'ellipsis-horizontal', iconFocused: 'ellipsis-horizontal' },
]

// Hidden tabs accessible via navigation but not in tab bar
const HIDDEN_TABS = ['onboarding', 'water', 'ai', 'ai-generate', 'clients', 'my-pt', 'settings']

export default function TabLayout() {
  const { profile } = useAuth()
  const userRole = profile?.role ?? 'free'

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#16a34a',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#e5e7eb',
          paddingBottom: 4,
          height: 88,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      {TABS.map((tab) => {
        const hidden = tab.roles && !tab.roles.includes(userRole)
        return (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              title: tab.title,
              href: hidden ? null : undefined,
              tabBarIcon: ({ focused, color }) => (
                <Ionicons
                  name={focused ? tab.iconFocused : tab.icon}
                  size={24}
                  color={color}
                />
              ),
            }}
          />
        )
      })}
      {HIDDEN_TABS.map((name) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{ href: null }}
        />
      ))}
    </Tabs>
  )
}
