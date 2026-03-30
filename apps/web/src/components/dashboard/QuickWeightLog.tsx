'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Scale, Plus } from 'lucide-react'
import { toast } from 'react-hot-toast'
import Link from 'next/link'

interface QuickWeightLogProps {
  userId: string
  currentWeight: number | null
  onWeightLogged: (weight: number) => void
}

export default function QuickWeightLog({ userId, currentWeight, onWeightLogged }: QuickWeightLogProps) {
  const [weight, setWeight] = useState('')
  const [saving, setSaving] = useState(false)
  const [justLogged, setJustLogged] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const val = parseFloat(weight)
    if (!val || val < 20 || val > 300) {
      toast.error('Enter a valid weight (20-300 kg)')
      return
    }

    setSaving(true)
    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]

    const { error } = await supabase
      .from('weight_logs')
      .upsert(
        { user_id: userId, date: today, weight_kg: val },
        { onConflict: 'user_id,date' }
      )

    if (error) {
      toast.error('Failed to log weight')
      setSaving(false)
      return
    }

    toast.success(`Weight logged: ${val} kg`)
    onWeightLogged(val)
    setWeight('')
    setJustLogged(true)
    setSaving(false)
  }

  return (
    <div className="bg-gradient-to-br from-white to-indigo-50/40 rounded-2xl p-5 shadow-sm border border-indigo-100/60 hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full p-2">
            <Scale className="h-5 w-5 text-indigo-600" />
          </div>
          <h3 className="font-semibold text-gray-900 text-sm">Quick Weight Log</h3>
        </div>
        <Link href="/progress" className="text-xs text-purple-600 hover:text-purple-800 font-medium">
          History
        </Link>
      </div>

      {currentWeight && (
        <p className="text-xs text-gray-500 mb-3">
          Last: <span className="font-semibold text-gray-700">{currentWeight} kg</span>
        </p>
      )}

      {justLogged ? (
        <div className="text-center py-3">
          <p className="text-sm text-green-600 font-medium">Logged today!</p>
          <button
            onClick={() => setJustLogged(false)}
            className="text-xs text-purple-600 hover:text-purple-800 mt-1"
          >
            Update
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="number"
            step="0.1"
            placeholder={currentWeight ? `${currentWeight}` : 'kg'}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
          />
          <button
            type="submit"
            disabled={saving || !weight}
            className="flex items-center gap-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:shadow-lg transition-all disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Log
          </button>
        </form>
      )}
    </div>
  )
}
