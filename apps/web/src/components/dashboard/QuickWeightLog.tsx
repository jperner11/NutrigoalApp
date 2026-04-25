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
    <div className="card" style={{ padding: 18 }}>
      <div className="row mb-3 justify-between">
        <div className="row gap-2">
          <Scale className="h-4 w-4" style={{ color: 'var(--fg-3)' }} />
          <div
            className="mono"
            style={{
              fontSize: 10,
              color: 'var(--fg-4)',
              letterSpacing: '0.14em',
            }}
          >
            QUICK WEIGHT LOG
          </div>
        </div>
        <Link
          href="/progress"
          className="mono"
          style={{
            fontSize: 10,
            color: 'var(--acc)',
            letterSpacing: '0.1em',
          }}
        >
          HISTORY →
        </Link>
      </div>

      {currentWeight && (
        <div className="mb-3" style={{ fontSize: 12, color: 'var(--fg-3)' }}>
          Last:{' '}
          <span className="serif" style={{ color: 'var(--fg)' }}>
            {currentWeight} kg
          </span>
        </div>
      )}

      {justLogged ? (
        <div className="py-2 text-center">
          <p
            className="serif"
            style={{ fontSize: 16, color: 'var(--ok)' }}
          >
            Logged today.
          </p>
          <button
            onClick={() => setJustLogged(false)}
            className="mono mt-1"
            style={{
              fontSize: 10,
              color: 'var(--acc)',
              letterSpacing: '0.1em',
            }}
          >
            UPDATE
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="row gap-2">
          <input
            type="number"
            step="0.1"
            placeholder={currentWeight ? `${currentWeight}` : 'kg'}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="flex-1"
            style={{
              padding: '10px 12px',
              background: 'var(--ink-2)',
              border: '1px solid var(--line-2)',
              borderRadius: 10,
              fontSize: 14,
              color: 'var(--fg)',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={saving || !weight}
            className="btn btn-accent disabled:opacity-50"
            style={{ padding: '10px 14px', fontSize: 13 }}
          >
            <Plus className="h-4 w-4" />
            Log
          </button>
        </form>
      )}
    </div>
  )
}
