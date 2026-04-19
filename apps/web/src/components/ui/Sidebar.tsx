'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
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
  Brain,
  Sparkles,
  ClipboardList,
  Compass,
  Inbox,
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
import BrandLogo from '@/components/brand/BrandLogo'
import { getRolePlanLabel, isManagedClientRole, isTrainerRole } from '@nutrigoal/shared'

interface SidebarProps {
  userRole: UserRole
  userName: string
  onSignOut: () => void
}

const clientNavItems: {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  roles: string[]
  gatedFeature?: GatedFeature
}[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['free', 'pro', 'unlimited', 'nutritionist_client', 'personal_trainer_client'] },
  { href: '/diet', label: 'Diet', icon: Utensils, roles: ['free', 'pro', 'unlimited', 'nutritionist_client', 'personal_trainer_client'] },
  { href: '/training', label: 'Training', icon: Dumbbell, roles: ['free', 'pro', 'unlimited', 'nutritionist_client', 'personal_trainer_client'] },
  { href: '/cardio', label: 'Cardio', icon: HeartPulse, roles: ['free', 'pro', 'unlimited', 'nutritionist_client', 'personal_trainer_client'], gatedFeature: 'cardio' },
  { href: '/water', label: 'Water', icon: Droplets, roles: ['free', 'pro', 'unlimited', 'nutritionist_client', 'personal_trainer_client'] },
  { href: '/progress', label: 'Progress', icon: TrendingUp, roles: ['free', 'pro', 'unlimited', 'nutritionist_client', 'personal_trainer_client'] },
  { href: '/supplements', label: 'Supplements', icon: Pill, roles: ['free', 'pro', 'unlimited', 'nutritionist_client', 'personal_trainer_client'], gatedFeature: 'supplements' },
  { href: '/grocery', label: 'Grocery List', icon: ShoppingCart, roles: ['pro', 'unlimited', 'nutritionist_client', 'personal_trainer_client'] },
  { href: '/reports', label: 'Reports', icon: BarChart3, roles: ['pro', 'unlimited', 'nutritionist_client', 'personal_trainer_client'] },
  { href: '/ai/coaching', label: 'AI Coaching', icon: Brain, roles: ['free', 'pro', 'unlimited'] },
  { href: '/ai/suggest', label: 'AI Suggestions', icon: Sparkles, roles: ['free', 'pro', 'unlimited'], gatedFeature: 'ai_suggestions' },
  { href: '/discover', label: 'Discover Coaches', icon: Compass, roles: ['free', 'pro', 'unlimited'] },
  { href: '/check-ins', label: 'Check-ins', icon: ClipboardList, roles: ['nutritionist_client', 'personal_trainer_client'] },
  { href: '/my-nutritionist', label: 'My Trainer', icon: UserCheck, roles: ['nutritionist_client', 'personal_trainer_client'] },
  { href: '/settings', label: 'Settings', icon: Settings, roles: ['free', 'pro', 'unlimited', 'nutritionist_client', 'personal_trainer_client'] },
]

const trainerNavItems: typeof clientNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['nutritionist', 'personal_trainer'] },
  { href: '/clients', label: 'Clients', icon: Users, roles: ['nutritionist', 'personal_trainer'] },
  { href: '/check-ins', label: 'Check-ins', icon: ClipboardList, roles: ['nutritionist', 'personal_trainer'] },
  { href: '/leads', label: 'Leads', icon: Inbox, roles: ['nutritionist', 'personal_trainer'] },
  { href: '/reports', label: 'Reports', icon: BarChart3, roles: ['nutritionist', 'personal_trainer'] },
  { href: '/ai/coaching', label: 'AI Coaching', icon: Brain, roles: ['nutritionist', 'personal_trainer'] },
  { href: '/ai/suggest', label: 'AI Suggestions', icon: Sparkles, roles: ['nutritionist', 'personal_trainer'], gatedFeature: 'ai_suggestions' },
  { href: '/settings', label: 'Settings', icon: Settings, roles: ['nutritionist', 'personal_trainer'] },
]

export default function Sidebar({ userRole, userName, onSignOut }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const navItems = isTrainerRole(userRole) && !isManagedClientRole(userRole) ? trainerNavItems : clientNavItems
  const filteredItems = navItems.filter(item => item.roles.includes(userRole))

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex items-center h-20 px-4 border-b border-white/8">
        {(!collapsed || mobileOpen) ? (
          <BrandLogo href="/dashboard" light />
        ) : (
          <BrandLogo href="/dashboard" compact light />
        )}
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
              className={`flex items-center space-x-3 px-3 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 group ${
                isActive
                  ? 'bg-[linear-gradient(135deg,rgba(77,196,255,0.16),rgba(255,255,255,0.08))] text-white shadow-[0_14px_28px_rgba(0,0,0,0.18)] ring-1 ring-white/14'
                  : 'text-slate-300 hover:bg-white/8 hover:text-white'
              }`}
              title={collapsed && !mobileOpen ? item.label : undefined}
            >
              <Icon className={`h-5 w-5 flex-shrink-0 transition-transform duration-200 ${
                isActive ? 'text-sky-200' : 'text-slate-400 group-hover:text-white group-hover:scale-110'
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
      <div className="border-t border-white/8 p-3 space-y-2">
        {(!collapsed || mobileOpen) && (
          <div className="rounded-2xl border border-white/10 bg-white/6 px-3 py-3 backdrop-blur-sm">
            <p className="truncate text-sm font-semibold text-white">{userName}</p>
            <p className="text-xs font-semibold tracking-[0.14em] text-sky-200/70">{getRolePlanLabel(userRole).toUpperCase()}</p>
          </div>
        )}

        <button
          onClick={onSignOut}
          className="flex items-center space-x-3 px-3 py-2 rounded-xl text-sm text-slate-400 hover:bg-white/8 hover:text-white transition-all duration-200 w-full"
          title={collapsed && !mobileOpen ? 'Sign Out' : undefined}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {(!collapsed || mobileOpen) && <span>Sign Out</span>}
        </button>

        {/* Collapse toggle — desktop only */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex items-center justify-center p-2 rounded-xl text-slate-500 hover:bg-white/8 hover:text-white transition-all duration-200 w-full"
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
          fixed left-0 top-0 h-full bg-[linear-gradient(180deg,#0b1724_0%,#102436_38%,#12283c_100%)] backdrop-blur-xl border-r border-white/8 flex flex-col z-40 transition-all duration-300
          ${mobileOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64'}
          md:translate-x-0 ${!mobileOpen && (collapsed ? 'md:w-16' : 'md:w-64')}
        `}
      >
        {sidebarContent}
      </aside>
    </>
  )
}
