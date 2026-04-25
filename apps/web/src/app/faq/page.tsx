import Link from 'next/link'
import MarketingNav from '@/components/marketing/MarketingNav'
import MarketingFAQ from '@/components/marketing/MarketingFAQ'
import PublicFooter from '@/components/marketing/PublicFooter'
import { faqCopy } from '@/lib/copy/faq'

export const metadata = {
  title: 'FAQ · Meal & Motion',
  description: faqCopy.shell.intro,
}

export default function FAQPage() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <MarketingNav />

      <MarketingFAQ />

      <section className="mx-auto max-w-[920px] px-8 pb-24">
        <div className="col gap-12">
          {faqCopy.sections.map((section) => (
            <div key={section.title}>
              <div
                className="mono mb-5"
                style={{
                  fontSize: 11,
                  color: 'var(--fg-3)',
                  letterSpacing: '0.14em',
                }}
              >
                {section.title.toUpperCase()}
              </div>
              <div
                className="col"
                style={{ borderTop: '1px solid var(--line)' }}
              >
                {section.items.map((item) => (
                  <div
                    key={item.q}
                    style={{
                      borderBottom: '1px solid var(--line)',
                      padding: '20px 4px',
                    }}
                  >
                    <div
                      className="serif"
                      style={{ fontSize: 18, lineHeight: 1.3 }}
                    >
                      {item.q}
                    </div>
                    <div
                      className="mt-3"
                      style={{
                        fontSize: 14,
                        color: 'var(--fg-2)',
                        lineHeight: 1.6,
                      }}
                    >
                      {item.a}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 rounded-[20px] p-8" style={{ background: 'var(--ink-2)', border: '1px solid var(--line-2)' }}>
          <div className="serif" style={{ fontSize: 28 }}>
            {faqCopy.stillUnsure.title}
          </div>
          <p
            className="mt-3 max-w-[640px]"
            style={{ fontSize: 15, color: 'var(--fg-2)', lineHeight: 1.6 }}
          >
            {faqCopy.stillUnsure.body}
          </p>
          <div className="row mt-6 gap-2">
            <Link href="/support" className="btn btn-accent">
              {faqCopy.stillUnsure.primaryCta}
            </Link>
            <Link href="/signup" className="btn btn-ghost">
              {faqCopy.stillUnsure.secondaryCta}
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  )
}
