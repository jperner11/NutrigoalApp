'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Target,
  LayoutDashboard,
  Utensils,
  Dumbbell,
  HeartPulse,
  Droplets,
  Users,
  Settings,
  Sparkles,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useState } from 'react'
import type { UserRole } from '@/lib/supabase/types'

interface SidebarProps {
  userRole: UserRole
  userName: string
  onSignOut: () => void
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['free', 'pro', 'nutritionist'] },
  { href: '/diet', label: 'Diet', icon: Utensils, roles: ['free', 'pro', 'nutritionist'] },
  { href: '/training', label: 'Training', icon: Dumbbell, roles: ['pro', 'nutritionist'] },
  { href: '/cardio', label: 'Cardio', icon: HeartPulse, roles: ['free', 'pro', 'nutritionist'] },
  { href: '/water', label: 'Water', icon: Droplets, roles: ['free', 'pro', 'nutritionist'] },
  { href: '/ai/suggest', label: 'AI Suggestions', icon: Sparkles, roles: ['free', 'pro', 'nutritionist'] },
  { href: '/clients', label: 'Clients', icon: Users, roles: ['nutritionist'] },
  { href: '/settings', label: 'Settings', icon: Settings, roles: ['free', 'pro', 'nutritionist'] },
]

export default function Sidebar({ userRole, userName, onSignOut }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const filteredItems = navItems.filter(item => item.roles.includes(userRole))

  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-white border-r border-gray-200 flex flex-col transition-all duration-200 z-40 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-gray-200">
        <Link href="/dashboard" className="flex items-center space-x-2 min-w-0">
          <div className="bg-gradient-to-r from-green-500 to-blue-500 rounded-lg p-1.5 flex-shrink-0">
            <Target className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <span className="text-xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent truncate">
              NutriGoal
            </span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {filteredItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-gradient-to-r from-green-50 to-blue-50 text-green-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-green-600' : ''}`} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* User & Collapse */}
      <div className="border-t border-gray-200 p-3 space-y-2">
        {!collapsed && (
          <div className="px-3 py-2">
            <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
            <p className="text-xs text-gray-500 capitalize">{userRole} plan</p>
          </div>
        )}

        <button
          onClick={onSignOut}
          className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors w-full"
          title={collapsed ? 'Sign Out' : undefined}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors w-full"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  )
}
