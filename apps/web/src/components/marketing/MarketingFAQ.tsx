'use client'

import { useState } from 'react'
import { marketingFaqCopy } from '@/lib/copy/marketingFaq'

export default function MarketingFAQ() {
  const [open, setOpen] = useState(0)

  return (
    <section className="mx-auto max-w-[920px] px-8 py-24">
      <div className="mb-12 text-center">
        <div className="eyebrow eyebrow-dot mb-4 inline-flex">
          {marketingFaqCopy.eyebrow}
        </div>
        <h2 className="h2">{marketingFaqCopy.title}</h2>
      </div>

      <div
        className="col"
        style={{ borderTop: '1px solid var(--line)' }}
      >
        {marketingFaqCopy.questions.map((item, i) => (
          <div
            key={item.q}
            style={{
              borderBottom: '1px solid var(--line)',
              padding: '24px 4px',
            }}
          >
            <button
              onClick={() => setOpen(open === i ? -1 : i)}
              className="flex w-full items-center justify-between text-left"
              style={{ cursor: 'pointer' }}
            >
              <div className="serif" style={{ fontSize: 22, lineHeight: 1.25 }}>
                {item.q}
              </div>
              <span
                className="mono ml-6 shrink-0"
                style={{ color: 'var(--acc)', fontSize: 18 }}
              >
                {open === i ? '−' : '+'}
              </span>
            </button>
            {open === i && (
              <div
                className="mt-4 max-w-[720px]"
                style={{
                  fontSize: 15,
                  color: 'var(--fg-2)',
                  lineHeight: 1.6,
                }}
              >
                {item.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
