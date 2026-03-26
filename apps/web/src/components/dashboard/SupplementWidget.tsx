'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Pill, Check } from 'lucide-react'
import { toast } from 'react-hot-toast'
import Link from 'next/link'
import type { UserSupplement, SupplementLog } from '@/lib/supabase/types'

interface SupplementWidgetProps {
  userId: string
}

export default function SupplementWidget({ userId }: SupplementWidgetProps) {
  const [supplements, setSupplements] = useState<UserSupplement[]>([])
  const [todayLogs, setTodayLogs] = useState<SupplementLog[]>([])
  const [loading, setLoading] = useState(true)

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      const [supRes, logRes] = await Promise.all([
        supabase
          .from('user_supplements')
          .select('*')
          .eq('user_id', userId)
          .eq('is_active', true)
          .order('created_at'),
        supabase
          .from('supplement_logs')
          .select('*')
          .eq('user_id', userId)
          .eq('date', today),
      ])

      setSupplements(supRes.data ?? [])
      setTodayLogs(logRes.data ?? [])
      setLoading(false)
    }

    load()
  }, [userId, today])

  async function toggleLog(sup: UserSupplement) {
    const supabase = createClient()
    const isLogged = todayLogs.some(l => l.supplement_id === sup.id)

    if (isLogged) {
      const { error } = await supabase
        .from('supplement_logs')
        .delete()
        .eq('user_id', userId)
        .eq('supplement_id', sup.id)
        .eq('date', today)

      if (error) return
      setTodayLogs(prev => prev.filter(l => l.supplement_id !== sup.id))
    } else {
      const { data, error } = await supabase
        .from('supplement_logs')
        .insert({ user_id: userId, supplement_id: sup.id, date: today })
        .select()
        .single()

      if (error) return
      setTodayLogs(prev => [...prev, data])
      toast.success(`${sup.name} taken!`)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-1/3 mb-3" />
        <div className="space-y-2">
          <div className="h-8 bg-gray-100 rounded" />
          <div className="h-8 bg-gray-100 rounded" />
        </div>
      </div>
    )
  }

  // Don't render if user has no supplements
  if (supplements.length === 0) return null

  const takenCount = todayLogs.length
  const total = supplements.length

  return (
    <div className="bg-gradient-to-br from-white to-green-50/40 rounded-xl p-5 shadow-sm border border-green-100/60 hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-br from-green-100 to-emerald-100 rounded-full p-2">
            <Pill className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">Supplements</h3>
            <p className="text-xs text-gray-500">{takenCount}/{total} taken today</p>
          </div>
        </div>
        <Link href="/supplements" className="text-xs text-purple-600 hover:text-purple-800 font-medium">
          Manage
        </Link>
      </div>

      <div className="w-full bg-green-100/50 rounded-full h-2 mb-3">
        <div
          className="bg-gradient-to-r from-green-400 to-emerald-500 h-2 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${total > 0 ? (takenCount / total) * 100 : 0}%` }}
        />
      </div>

      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {supplements.map(sup => {
          const isTaken = todayLogs.some(l => l.supplement_id === sup.id)
          return (
            <button
              key={sup.id}
              onClick={() => toggleLog(sup)}
              className={`w-full flex items-center gap-2 py-1.5 px-2 rounded-lg text-left text-sm transition-colors ${
                isTaken ? 'bg-green-50' : 'hover:bg-gray-50'
              }`}
            >
              <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                isTaken ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'
              }`}>
                {isTaken && <Check className="h-3 w-3" />}
              </div>
              <span className={`truncate ${isTaken ? 'text-green-800 line-through' : 'text-gray-700'}`}>
                {sup.name}
              </span>
              {sup.dosage && (
                <span className="text-xs text-gray-400 ml-auto flex-shrink-0">{sup.dosage}</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
