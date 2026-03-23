'use client'

import { useState } from 'react'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { Settings, User, Crown } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { PRICING } from '@/lib/constants'
import Link from 'next/link'

export default function SettingsPage() {
  const { profile } = useUser()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    full_name: profile?.full_name ?? '',
    age: profile?.age ?? '',
    height_cm: profile?.height_cm ?? '',
    weight_kg: profile?.weight_kg ?? '',
    gender: profile?.gender ?? 'male',
  })

  // Update form when profile loads
  if (profile && !form.full_name && profile.full_name) {
    setForm({
      full_name: profile.full_name,
      age: profile.age ?? '',
      height_cm: profile.height_cm ?? '',
      weight_kg: profile.weight_kg ?? '',
      gender: profile.gender ?? 'male',
    })
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return

    setSaving(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('user_profiles')
      .update({
        full_name: form.full_name || null,
        age: form.age ? Number(form.age) : null,
        height_cm: form.height_cm ? Number(form.height_cm) : null,
        weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
        gender: form.gender,
      })
      .eq('id', profile.id)

    if (error) {
      toast.error('Failed to save settings')
    } else {
      toast.success('Settings saved')
    }
    setSaving(false)
  }

  if (!profile) return null

  const currentPlan = PRICING[profile.role]

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-900 mt-1">Manage your profile and subscription.</p>
      </div>

      {/* Subscription */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Crown className="h-6 w-6 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">Subscription</h2>
          </div>
          {profile.role === 'free' && (
            <Link
              href="/pricing"
              className="text-sm bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1.5 rounded-lg font-medium hover:shadow-lg transition-all"
            >
              Upgrade
            </Link>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-900">{currentPlan.name}</span>
          <span className="text-sm text-gray-500">
            {currentPlan.price === 0 ? '— Free' : `— $${currentPlan.price}/mo`}
          </span>
        </div>
      </div>

      {/* Profile */}
      <form onSubmit={handleSave} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex items-center space-x-3 mb-6">
          <User className="h-6 w-6 text-gray-900" />
          <h2 className="text-lg font-semibold text-gray-900">Profile</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => setForm(prev => ({ ...prev, full_name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={profile.email}
              disabled
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
              <input
                type="number"
                value={form.age}
                onChange={(e) => setForm(prev => ({ ...prev, age: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <select
                value={form.gender}
                onChange={(e) => setForm(prev => ({ ...prev, gender: e.target.value as 'male' | 'female' | 'other' }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Height (cm)</label>
              <input
                type="number"
                value={form.height_cm}
                onChange={(e) => setForm(prev => ({ ...prev, height_cm: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
              <input
                type="number"
                value={form.weight_kg}
                onChange={(e) => setForm(prev => ({ ...prev, weight_kg: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50"
          >
            <Settings className="h-4 w-4" />
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}
