'use client'

import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { Droplets, Plus, Minus } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { WATER_QUICK_ADD } from '@/lib/constants'
import AppPageHeader from '@/components/ui/AppPageHeader'

export default function WaterPage() {
  const { profile } = useUser()
  const [todayTotal, setTodayTotal] = useState(0)
  const [customAmount, setCustomAmount] = useState(250)
  const [loading, setLoading] = useState(true)
  const today = new Date().toISOString().split('T')[0]

  const target = profile?.daily_water_ml ?? 2500
  const progress = Math.min((todayTotal / target) * 100, 100)
  const remaining = Math.max(target - todayTotal, 0)

  const loadToday = useCallback(async () => {
    if (!profile) return
    const supabase = createClient()
    const { data } = await supabase
      .from('water_logs')
      .select('amount_ml')
      .eq('user_id', profile.id)
      .eq('date', today)

    setTodayTotal(data?.reduce((sum, log) => sum + log.amount_ml, 0) ?? 0)
    setLoading(false)
  }, [profile, today])

  useEffect(() => {
    if (!profile) return
    loadToday()
  }, [profile, loadToday])

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

    setTodayTotal((prev) => prev + amount)
    toast.success(`+${amount}ml logged`)
  }

  if (loading) {
    return (
      <div className="card p-8">
        <div
          className="mono"
          style={{ fontSize: 11, color: 'var(--fg-4)', letterSpacing: '0.14em' }}
        >
          LOADING
        </div>
        <div className="serif mt-2" style={{ fontSize: 24, color: 'var(--fg)' }}>
          Pulling your hydration log.
        </div>
      </div>
    )
  }

  // Ring math
  const radius = 70
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - progress / 100)

  return (
    <div className="mx-auto max-w-[720px]">
      <AppPageHeader
        eyebrow="Hydration"
        title="Water"
        accent="today."
        subtitle="Stay hydrated throughout the day."
      />

      {/* Progress ring */}
      <div className="card mb-5 p-8">
        <div className="flex flex-col items-center">
          <div className="relative mb-5 h-48 w-48">
            <svg
              className="h-48 w-48 -rotate-90"
              viewBox="0 0 160 160"
              aria-hidden="true"
            >
              <circle
                cx="80"
                cy="80"
                r={radius}
                stroke="var(--line)"
                strokeWidth="12"
                fill="none"
              />
              <circle
                cx="80"
                cy="80"
                r={radius}
                stroke="var(--acc)"
                strokeWidth="12"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                style={{ transition: 'stroke-dashoffset 0.5s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Droplets
                className="mb-2 h-6 w-6"
                style={{ color: 'var(--acc)' }}
              />
              <span className="serif" style={{ fontSize: 36, lineHeight: 1 }}>
                {todayTotal}
              </span>
              <span
                className="mono mt-1.5"
                style={{
                  fontSize: 10,
                  color: 'var(--fg-3)',
                  letterSpacing: '0.12em',
                }}
              >
                / {target}ML · {Math.round(progress)}%
              </span>
            </div>
          </div>

          <div className="serif text-center" style={{ fontSize: 22 }}>
            {progress >= 100 ? (
              <>
                Goal{' '}
                <span className="italic-serif" style={{ color: 'var(--fg-3)' }}>
                  reached.
                </span>
              </>
            ) : (
              <>
                <span style={{ color: 'var(--acc)' }}>{remaining}ml</span>{' '}
                <span className="italic-serif" style={{ color: 'var(--fg-3)' }}>
                  to go.
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Quick add */}
      <div className="card mb-5 p-6">
        <div
          className="mono mb-4"
          style={{ fontSize: 11, color: 'var(--fg-4)', letterSpacing: '0.14em' }}
        >
          QUICK ADD
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {WATER_QUICK_ADD.map(({ amount, label }) => (
            <button
              key={amount}
              onClick={() => addWater(amount)}
              className="btn btn-ghost justify-center"
              style={{ padding: '12px 8px', fontSize: 13 }}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Custom amount */}
      <div className="card p-6">
        <div
          className="mono mb-4"
          style={{ fontSize: 11, color: 'var(--fg-4)', letterSpacing: '0.14em' }}
        >
          CUSTOM AMOUNT
        </div>
        <div className="row flex-wrap gap-3">
          <div
            className="row gap-1.5"
            style={{
              padding: '6px 8px',
              background: 'var(--ink-2)',
              border: '1px solid var(--line-2)',
              borderRadius: 12,
            }}
          >
            <button
              onClick={() => setCustomAmount((prev) => Math.max(50, prev - 50))}
              className="flex h-7 w-7 items-center justify-center rounded-md transition hover:bg-[var(--ink-3)]"
              style={{ color: 'var(--fg-2)' }}
              aria-label="Decrease"
            >
              <Minus className="h-4 w-4" />
            </button>
            <input
              type="number"
              min={50}
              step={50}
              value={customAmount}
              onChange={(e) =>
                setCustomAmount(parseInt(e.target.value) || 50)
              }
              className="w-20 text-center"
              style={{
                fontSize: 14,
                color: 'var(--fg)',
                background: 'transparent',
                border: 'none',
                outline: 'none',
              }}
            />
            <span
              className="mono"
              style={{
                fontSize: 11,
                color: 'var(--fg-3)',
                letterSpacing: '0.1em',
              }}
            >
              ML
            </span>
            <button
              onClick={() => setCustomAmount((prev) => prev + 50)}
              className="flex h-7 w-7 items-center justify-center rounded-md transition hover:bg-[var(--ink-3)]"
              style={{ color: 'var(--fg-2)' }}
              aria-label="Increase"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={() => addWater(customAmount)}
            className="btn btn-accent"
          >
            Add {customAmount}ml →
          </button>
        </div>
      </div>
    </div>
  )
}
