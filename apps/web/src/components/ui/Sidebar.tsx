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
  TrendingUp,
  Pill,
  ShoppingCart,
  BarChart3,
  Users,
  UserCheck,
  Settings,
  Sparkles,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import type { UserRole } from '@/lib/supabase/types'
import type { GatedFeature } from '@/lib/tierUtils'
import { isFeatureLocked } from '@/lib/tierUtils'
import ProBadge from './ProBadge'

interface SidebarProps {
  userRole: UserRole
  userName: string
  onSignOut: () => void
}

const navItems: {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  roles: string[]
  gatedFeature?: GatedFeature
}[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['free', 'pro', 'unlimited', 'nutritionist', 'nutritionist_client'] },
  { href: '/diet', label: 'Diet', icon: Utensils, roles: ['free', 'pro', 'unlimited', 'nutritionist', 'nutritionist_client'] },
  { href: '/training', label: 'Training', icon: Dumbbell, roles: ['free', 'pro', 'unlimited', 'nutritionist', 'nutritionist_client'] },
  { href: '/cardio', label: 'Cardio', icon: HeartPulse, roles: ['free', 'pro', 'unlimited', 'nutritionist', 'nutritionist_client'], gatedFeature: 'cardio' },
  { href: '/water', label: 'Water', icon: Droplets, roles: ['free', 'pro', 'unlimited', 'nutritionist', 'nutritionist_client'] },
  { href: '/progress', label: 'Progress', icon: TrendingUp, roles: ['free', 'pro', 'unlimited', 'nutritionist', 'nutritionist_client'] },
  { href: '/supplements', label: 'Supplements', icon: Pill, roles: ['free', 'pro', 'unlimited', 'nutritionist', 'nutritionist_client'], gatedFeature: 'supplements' },
  { href: '/grocery', label: 'Grocery List', icon: ShoppingCart, roles: ['pro', 'unlimited', 'nutritionist', 'nutritionist_client'] },
  { href: '/reports', label: 'Reports', icon: BarChart3, roles: ['pro', 'unlimited', 'nutritionist', 'nutritionist_client'] },
  { href: '/ai/suggest', label: 'AI Suggestions', icon: Sparkles, roles: ['free', 'pro', 'unlimited', 'nutritionist'], gatedFeature: 'ai_suggestions' },
  { href: '/clients', label: 'Clients', icon: Users, roles: ['nutritionist'] },
  { href: '/my-nutritionist', label: 'My Nutritionist', icon: UserCheck, roles: ['nutritionist_client'] },
  { href: '/settings', label: 'Settings', icon: Settings, roles: ['free', 'pro', 'unlimited', 'nutritionist', 'nutritionist_client'] },
]

export default function Sidebar({ userRole, userName, onSignOut }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const filteredItems = navItems.filter(item => item.roles.includes(userRole))

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-white/10">
        <Link href="/dashboard" className="flex items-center space-x-2.5 min-w-0">
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-1.5 flex-shrink-0 shadow-lg shadow-purple-900/10 border border-white/20">
            <Target className="h-5 w-5 text-white" />
          </div>
          {(!collapsed || mobileOpen) && (
            <span className="text-xl font-bold text-white truncate tracking-tight">
              NutriGoal
            </span>
          )}
        </Link>
        {/* Mobile close button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="ml-auto p-1.5 text-white/60 hover:text-white md:hidden"
        >
          <X className="h-5 w-5" />
        </button>
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
                  ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-md shadow-purple-500/30'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
              title={collapsed && !mobileOpen ? item.label : undefined}
            >
              <Icon className={`h-5 w-5 flex-shrink-0 transition-transform duration-200 ${
                isActive ? 'text-white' : 'text-white/60 group-hover:text-white group-hover:scale-110'
              }`} />
              {(!collapsed || mobileOpen) && (
                <>
                  <span>{item.label}</span>
                  {item.gatedFeature && isFeatureLocked(userRole, item.gatedFeature) && !isActive && (
                    <ProBadge />
                  )}
                </>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User & Collapse */}
      <div className="border-t border-white/10 p-3 space-y-2">
        {(!collapsed || mobileOpen) && (
          <div className="px-3 py-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10">
            <p className="text-sm font-semibold text-white truncate">{userName}</p>
            <p className="text-xs text-purple-300 capitalize font-medium">{userRole === 'nutritionist_client' ? 'Client Plan' : `${userRole} plan`}</p>
          </div>
        )}

        <button
          onClick={onSignOut}
          className="flex items-center space-x-3 px-3 py-2 rounded-xl text-sm text-white/60 hover:bg-red-500/20 hover:text-red-300 transition-all duration-200 w-full"
          title={collapsed && !mobileOpen ? 'Sign Out' : undefined}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {(!collapsed || mobileOpen) && <span>Sign Out</span>}
        </button>

        {/* Collapse toggle — desktop only */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex items-center justify-center p-2 rounded-xl text-white/40 hover:bg-white/10 hover:text-white transition-all duration-200 w-full"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 p-2 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/60 md:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5 text-gray-700" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — desktop: fixed, mobile: drawer */}
      <aside
        className={`
          fixed left-0 top-0 h-full bg-gradient-to-b from-slate-900 via-purple-950 to-indigo-950 backdrop-blur-xl border-r border-white/10 flex flex-col z-40 transition-all duration-300
          ${mobileOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64'}
          md:translate-x-0 ${!mobileOpen && (collapsed ? 'md:w-16' : 'md:w-64')}
        `}
      >
        {sidebarContent}
      </aside>
    </>
  )
}
