import { howItWorksCopy } from '@/lib/copy/howItWorks'

export default function MarketingHowItWorks() {
  return (
    <section
      id="how-it-works"
      className="mx-auto max-w-[1320px] px-8 py-24"
    >
      <div className="mb-14">
        <div className="eyebrow eyebrow-dot mb-4">{howItWorksCopy.eyebrow}</div>
        <h2 className="h2">{howItWorksCopy.title}</h2>
      </div>

      <div className="col gap-12">
        {howItWorksCopy.audiences.map((audience, audienceIdx) => (
          <div key={audience.label}>
            <div
              className="mono mb-4"
              style={{
                fontSize: 11,
                color: 'var(--fg-3)',
                letterSpacing: '0.14em',
              }}
            >
              {audience.label}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {audience.steps.map((step) => (
                <div
                  key={step.n}
                  className="rounded-[20px] p-6"
                  style={{
                    border: '1px solid var(--line-2)',
                    background: audienceIdx === 0 ? 'var(--ink-2)' : 'transparent',
                  }}
                >
                  <div
                    className="mono"
                    style={{
                      fontSize: 11,
                      color: 'var(--acc)',
                      letterSpacing: '0.14em',
                    }}
                  >
                    {step.n}
                  </div>
                  <div
                    className="serif mt-3.5"
                    style={{ fontSize: 24, lineHeight: 1.1 }}
                  >
                    {step.t}
                  </div>
                  <div
                    className="mt-2.5"
                    style={{
                      fontSize: 13,
                      color: 'var(--fg-2)',
                      lineHeight: 1.5,
                    }}
                  >
                    {step.s}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
