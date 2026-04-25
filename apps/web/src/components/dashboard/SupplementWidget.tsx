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
      <div className="card animate-pulse" style={{ padding: 18 }}>
        <div className="mb-3 h-5 w-1/3 rounded" style={{ background: 'var(--line)' }} />
        <div className="col gap-2">
          <div className="h-8 rounded" style={{ background: 'var(--line)' }} />
          <div className="h-8 rounded" style={{ background: 'var(--line)' }} />
        </div>
      </div>
    )
  }

  if (supplements.length === 0) return null

  const takenCount = todayLogs.length
  const total = supplements.length
  const progress = total > 0 ? takenCount / total : 0

  return (
    <div className="card" style={{ padding: 18 }}>
      <div className="row mb-3 justify-between">
        <div className="row gap-2">
          <Pill className="h-4 w-4" style={{ color: 'var(--fg-3)' }} />
          <div>
            <div
              className="mono"
              style={{
                fontSize: 10,
                color: 'var(--fg-4)',
                letterSpacing: '0.14em',
              }}
            >
              SUPPLEMENTS
            </div>
            <div style={{ fontSize: 12, color: 'var(--fg-3)' }}>
              {takenCount}/{total} taken today
            </div>
          </div>
        </div>
        <Link
          href="/supplements"
          className="mono"
          style={{
            fontSize: 10,
            color: 'var(--acc)',
            letterSpacing: '0.1em',
          }}
        >
          MANAGE →
        </Link>
      </div>

      <div
        className="mb-3 overflow-hidden rounded-full"
        style={{ height: 3, background: 'var(--line)' }}
      >
        <div
          style={{
            width: `${progress * 100}%`,
            height: '100%',
            background: 'var(--acc)',
            transition: 'width 0.4s ease',
          }}
        />
      </div>

      <div className="col max-h-48 gap-1 overflow-y-auto">
        {supplements.map((sup) => {
          const isTaken = todayLogs.some((l) => l.supplement_id === sup.id)
          return (
            <button
              key={sup.id}
              onClick={() => toggleLog(sup)}
              className="row w-full gap-2 rounded-lg px-2 py-1.5 text-left transition"
              style={{
                background: isTaken ? 'var(--ink-3)' : 'transparent',
                fontSize: 13,
              }}
            >
              <div
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                style={{
                  border: isTaken
                    ? '2px solid var(--acc)'
                    : '2px solid var(--line-2)',
                  background: isTaken ? 'var(--acc)' : 'transparent',
                  color: '#fff',
                }}
              >
                {isTaken && <Check className="h-3 w-3" />}
              </div>
              <span
                className="truncate"
                style={{
                  color: isTaken ? 'var(--fg-3)' : 'var(--fg)',
                  textDecoration: isTaken ? 'line-through' : 'none',
                }}
              >
                {sup.name}
              </span>
              {sup.dosage && (
                <span
                  className="mono ml-auto shrink-0"
                  style={{ fontSize: 10, color: 'var(--fg-4)' }}
                >
                  {sup.dosage}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
