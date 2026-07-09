'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Send } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { AppHeroPanel } from '@/components/ui/AppDesign'

export default function FeedbackPage() {
  const pathname = usePathname()
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = message.trim()
    if (trimmed.length < 3) {
      toast.error('Tell us a little more — at least a few words.')
      return
    }

    setIsSending(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, page: pathname }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        toast.error(data?.message ?? 'Failed to send feedback. Please try again.')
        return
      }
      setSent(true)
      setMessage('')
      toast.success('Feedback sent — thank you!')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <AppHeroPanel
        eyebrow="Beta feedback"
        title="Tell us what's broken, confusing, or missing"
        subtitle="Every note lands directly with the team. Rough thoughts are welcome — a sentence is plenty."
      />

      {sent ? (
        <div className="rounded-[24px] border border-[var(--line)] bg-white/80 p-6 text-sm leading-6 text-[var(--muted)]">
          <p className="font-semibold text-[var(--foreground)]">Got it — thank you!</p>
          <p className="mt-2">Your feedback is in. Send as many notes as you like.</p>
          <button
            type="button"
            onClick={() => setSent(false)}
            className="mt-4 text-sm font-semibold text-[var(--foreground)] underline underline-offset-4"
          >
            Send another
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="feedback-message" className="mb-2 block text-sm font-semibold text-[var(--foreground)]">
              Your feedback
            </label>
            <textarea
              id="feedback-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              maxLength={4000}
              className="input-field min-h-[160px] w-full resize-y"
              placeholder="What were you trying to do? What happened instead?"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSending}
            className="btn-primary flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-base font-semibold disabled:opacity-50"
          >
            {isSending ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span>Send feedback</span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  )
}
