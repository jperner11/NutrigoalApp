'use client'

import { useCallback, useEffect, useState } from 'react'
import { Star, Loader2 } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface PublicReview {
  id: string
  rating: number
  title: string | null
  body: string | null
  created_at: string
  reviewer_name: string
}

interface MyReview {
  rating: number
  title: string | null
  body: string | null
}

function Stars({
  value,
  onChange,
  size = 16,
}: {
  value: number
  onChange?: (v: number) => void
  size?: number
}) {
  const interactive = typeof onChange === 'function'
  return (
    <div className="row" style={{ gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!interactive}
          onClick={interactive ? () => onChange!(n) : undefined}
          className={interactive ? 'cursor-pointer' : 'cursor-default'}
          style={{ lineHeight: 0, padding: 0, background: 'none', border: 'none' }}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
        >
          <Star
            width={size}
            height={size}
            style={{
              color: n <= value ? 'var(--acc)' : 'var(--fg-4)',
              fill: n <= value ? 'var(--acc)' : 'none',
            }}
          />
        </button>
      ))}
    </div>
  )
}

export default function CoachReviews({
  coachId,
  coachName,
}: {
  coachId: string
  coachName: string
}) {
  const [reviews, setReviews] = useState<PublicReview[]>([])
  const [canReview, setCanReview] = useState(false)
  const [myReview, setMyReview] = useState<MyReview | null>(null)
  const [loading, setLoading] = useState(true)

  const [rating, setRating] = useState(0)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/coach-reviews?coachId=${encodeURIComponent(coachId)}`)
      const json = await res.json()
      if (res.ok) {
        setReviews(json.reviews ?? [])
        setCanReview(Boolean(json.canReview))
        setMyReview(json.myReview ?? null)
        if (json.myReview) {
          setRating(json.myReview.rating)
          setTitle(json.myReview.title ?? '')
          setBody(json.myReview.body ?? '')
        }
      }
    } finally {
      setLoading(false)
    }
  }, [coachId])

  useEffect(() => {
    load()
  }, [load])

  async function submit() {
    if (rating < 1) {
      toast.error('Pick a star rating first.')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/coach-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coach_id: coachId, rating, title, body }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error || 'Failed to save review.')
        return
      }
      toast.success(myReview ? 'Review updated.' : 'Thanks for your review!')
      await load()
    } finally {
      setSaving(false)
    }
  }

  if (loading) return null

  const firstName = coachName.split(' ')[0]

  return (
    <div className="mt-12">
      <div
        className="mono"
        style={{ fontSize: 11, color: 'var(--fg-4)', letterSpacing: '0.12em' }}
      >
        REVIEWS
      </div>

      {canReview && (
        <div className="card-2 mt-3 p-4">
          <div style={{ fontSize: 14, fontWeight: 600 }}>
            {myReview ? 'Update your review' : `How was coaching with ${firstName}?`}
          </div>
          <div className="mt-2.5">
            <Stars value={rating} onChange={setRating} size={22} />
          </div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder="Summarise it in a line (optional)"
            className="input-field mt-3 px-3 py-2 text-sm"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={2000}
            rows={3}
            placeholder="What was the experience like? (optional)"
            className="input-field mt-2 px-3 py-2 text-sm"
          />
          <button
            onClick={submit}
            disabled={saving}
            className="btn btn-accent mt-3 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {myReview ? 'Update review' : 'Post review'}
          </button>
        </div>
      )}

      {reviews.length === 0 ? (
        <p className="mt-3" style={{ fontSize: 13, color: 'var(--fg-3)' }}>
          No reviews yet{canReview ? ' — be the first.' : '.'}
        </p>
      ) : (
        <div className="mt-3 grid gap-3">
          {reviews.map((r) => (
            <div key={r.id} className="card-2 p-4">
              <div className="row justify-between">
                <Stars value={r.rating} />
                <span className="mono" style={{ fontSize: 11, color: 'var(--fg-4)' }}>
                  {new Date(r.created_at).toLocaleDateString(undefined, {
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
              {r.title && (
                <div className="mt-2" style={{ fontSize: 14, fontWeight: 600 }}>
                  {r.title}
                </div>
              )}
              {r.body && (
                <p className="mt-1" style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.5 }}>
                  {r.body}
                </p>
              )}
              <div className="mt-2 mono" style={{ fontSize: 11, color: 'var(--fg-4)' }}>
                {r.reviewer_name}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
