'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { Droplets, Plus, Minus } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { WATER_QUICK_ADD } from '@/lib/constants'

export default function WaterPage() {
  const { profile } = useUser()
  const [todayTotal, setTodayTotal] = useState(0)
  const [customAmount, setCustomAmount] = useState(250)
  const [loading, setLoading] = useState(true)
  const today = new Date().toISOString().split('T')[0]

  const target = profile?.daily_water_ml ?? 2500
  const progress = Math.min((todayTotal / target) * 100, 100)

  useEffect(() => {
    if (!profile) return
    loadToday()
  }, [profile])

  async function loadToday() {
    const supabase = createClient()
    const { data } = await supabase
      .from('water_logs')
      .select('amount_ml')
      .eq('user_id', profile!.id)
      .eq('date', today)

    setTodayTotal(data?.reduce((sum, log) => sum + log.amount_ml, 0) ?? 0)
    setLoading(false)
  }

  async function addWater(amount: number) {
    if (!profile) return
    const supabase = createClient()

    const { error } = await supabase.from('water_logs').insert({
      user_id: profile.id,
      date: today,
      amount_ml: amount,
    })

    if (error) {
      toast.error('Failed to log water')
      return
    }

    setTodayTotal(prev => prev + amount)
    toast.success(`+${amount}ml logged`)
  }

  if (loading) return <div className="text-gray-500">Loading water tracker...</div>

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Water Intake</h1>
        <p className="text-gray-600 mt-1">Stay hydrated throughout the day.</p>
      </div>

      {/* Progress Circle */}
      <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 mb-8">
        <div className="flex flex-col items-center">
          <div className="relative w-48 h-48 mb-6">
            <svg className="w-48 h-48 transform -rotate-90" viewBox="0 0 160 160">
              <circle
                cx="80" cy="80" r="70"
                stroke="#e5e7eb" strokeWidth="12" fill="none"
              />
              <circle
                cx="80" cy="80" r="70"
                stroke="url(#waterGradient)" strokeWidth="12" fill="none"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 70}`}
                strokeDashoffset={`${2 * Math.PI * 70 * (1 - progress / 100)}`}
                className="transition-all duration-500"
              />
              <defs>
                <linearGradient id="waterGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Droplets className="h-8 w-8 text-cyan-500 mb-1" />
              <span className="text-3xl font-bold text-gray-900">{todayTotal}</span>
              <span className="text-sm text-gray-500">/ {target} ml</span>
            </div>
          </div>

          <p className="text-lg font-medium text-gray-700 mb-2">
            {progress >= 100
              ? 'Goal reached! Great job!'
              : `${target - todayTotal}ml to go`}
          </p>
        </div>
      </div>

      {/* Quick Add Buttons */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-8">
        <h3 className="font-semibold text-gray-900 mb-4">Quick Add</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {WATER_QUICK_ADD.map(({ amount, label }) => (
            <button
              key={amount}
              onClick={() => addWater(amount)}
              className="flex items-center justify-center space-x-2 px-4 py-3 bg-cyan-50 text-cyan-700 rounded-lg hover:bg-cyan-100 transition-colors font-medium"
            >
              <Plus className="h-4 w-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Custom Amount */}
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-600">Custom:</span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCustomAmount(prev => Math.max(50, prev - 50))}
              className="p-1 rounded-lg hover:bg-gray-100"
            >
              <Minus className="h-4 w-4 text-gray-600" />
            </button>
            <input
              type="number"
              min={50}
              step={50}
              value={customAmount}
              onChange={(e) => setCustomAmount(parseInt(e.target.value) || 50)}
              className="w-20 text-center px-2 py-1 border border-gray-300 rounded-lg text-sm"
            />
            <span className="text-sm text-gray-500">ml</span>
            <button
              onClick={() => setCustomAmount(prev => prev + 50)}
              className="p-1 rounded-lg hover:bg-gray-100"
            >
              <Plus className="h-4 w-4 text-gray-600" />
            </button>
          </div>
          <button
            onClick={() => addWater(customAmount)}
            className="px-4 py-1.5 bg-cyan-500 text-white rounded-lg text-sm font-medium hover:bg-cyan-600 transition-colors"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  )
}
