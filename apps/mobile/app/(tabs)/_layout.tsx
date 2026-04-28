import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../src/contexts/AuthContext'
import { brandColors } from '../../src/theme/brand'
import { isTrainerRole, isManagedClientRole } from '@nutrigoal/shared'

type TabIconName = React.ComponentProps<typeof Ionicons>['name']

interface TabConfig {
  name: string
  title: string
  icon: TabIconName
  iconFocused: TabIconName
  roles?: string[]
}

const CLIENT_TABS: TabConfig[] = [
  { name: 'index', title: 'Dashboard', icon: 'home-outline', iconFocused: 'home' },
  { name: 'diet', title: 'Diet', icon: 'restaurant-outline', iconFocused: 'restaurant' },
  { name: 'training', title: 'Training', icon: 'barbell-outline', iconFocused: 'barbell' },
  { name: 'cardio', title: 'Cardio', icon: 'heart-outline', iconFocused: 'heart' },
  { name: 'more', title: 'More', icon: 'ellipsis-horizontal', iconFocused: 'ellipsis-horizontal' },
]

const TRAINER_TABS: TabConfig[] = [
  { name: 'index', title: 'Home', icon: 'home-outline', iconFocused: 'home' },
  { name: 'clients', title: 'Clients', icon: 'people-outline', iconFocused: 'people' },
  { name: 'more', title: 'More', icon: 'ellipsis-horizontal', iconFocused: 'ellipsis-horizontal' },
]

// All screens that exist under (tabs)/. Anything not in the active tab set
// for the current role is rendered with href: null so it stays routable but
// doesn't appear in the tab bar.
const ALL_SCREENS = [
  'index',
  'diet',
  'training',
  'cardio',
  'water',
  'more',
  'clients',
  'my-pt',
  'ai',
  'ai-generate',
  'onboarding',
  'settings',
]

export default function TabLayout() {
  const { profile } = useAuth()
  const userRole = profile?.role ?? 'free'
  const isTrainer = isTrainerRole(userRole) && !isManagedClientRole(userRole)
  const tabs = isTrainer ? TRAINER_TABS : CLIENT_TABS

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: brandColors.brand500,
        tabBarInactiveTintColor: brandColors.textSubtle,
        tabBarStyle: {
          backgroundColor: brandColors.panel,
          borderTopColor: brandColors.line,
          paddingBottom: 8,
          paddingTop: 8,
          height: 92,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.2,
        },
        sceneStyle: {
          backgroundColor: brandColors.background,
        },
      }}
    >
      {tabs.map((tab) => {
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
      {ALL_SCREENS.filter((name) => !tabs.some((t) => t.name === name)).map((name) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{ href: null }}
        />
      ))}
    </Tabs>
  )
}
