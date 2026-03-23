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
  { href: '/training', label: 'Training', icon: Dumbbell, roles: ['free', 'pro', 'nutritionist'] },
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
      className={`fixed left-0 top-0 h-full bg-white/90 backdrop-blur-xl border-r border-gray-200/80 flex flex-col transition-all duration-300 z-40 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-gray-200/80">
        <Link href="/dashboard" className="flex items-center space-x-2 min-w-0">
          <div className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl p-1.5 flex-shrink-0 shadow-lg shadow-purple-500/20">
            <Target className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent truncate">
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
              className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/20'
                  : 'text-gray-700 hover:bg-purple-50 hover:text-purple-700'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={`h-5 w-5 flex-shrink-0 transition-transform duration-200 ${
                isActive ? 'text-white' : 'group-hover:scale-110'
              }`} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* User & Collapse */}
      <div className="border-t border-gray-200/80 p-3 space-y-2">
        {!collapsed && (
          <div className="px-3 py-2 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl">
            <p className="text-sm font-semibold text-gray-900 truncate">{userName}</p>
            <p className="text-xs text-purple-600 capitalize font-medium">{userRole} plan</p>
          </div>
        )}

        <button
          onClick={onSignOut}
          className="flex items-center space-x-3 px-3 py-2 rounded-xl text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all duration-200 w-full"
          title={collapsed ? 'Sign Out' : undefined}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center p-2 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-all duration-200 w-full"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  )
}
