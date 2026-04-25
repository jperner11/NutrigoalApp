import Link from 'next/link'
import BrandLogo from '@/components/brand/BrandLogo'
import { footerCopy } from '@/lib/copy/footer'

export default function PublicFooter() {
  return (
    <footer
      className="border-t"
      style={{
        borderColor: 'var(--line)',
        background: 'rgba(255,255,255,0.4)',
        padding: '60px 32px',
      }}
    >
      <div
        className="mx-auto grid max-w-[1320px] gap-10 lg:grid-cols-[2fr_1fr_1fr_1fr]"
      >
        <div>
          <BrandLogo href="/" />
          <p
            className="mt-4 max-w-[360px]"
            style={{ fontSize: 13, color: 'var(--fg-3)', lineHeight: 1.55 }}
          >
            {footerCopy.tagline}
          </p>
        </div>

        {footerCopy.columns.map((col) => (
          <div key={col.heading}>
            <div
              className="mono mb-3.5"
              style={{
                fontSize: 10,
                color: 'var(--fg-4)',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
              }}
            >
              {col.heading}
            </div>
            <div className="col gap-2">
              {col.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="transition hover:text-[var(--fg)]"
                  style={{ fontSize: 13, color: 'var(--fg-2)' }}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div
        className="row mx-auto mt-10 max-w-[1320px] justify-between border-t pt-6"
        style={{ borderColor: 'var(--line)' }}
      >
        <span
          className="mono"
          style={{ fontSize: 11, color: 'var(--fg-4)', letterSpacing: '0.12em' }}
        >
          {footerCopy.legal}
        </span>
        <span
          className="mono"
          style={{ fontSize: 11, color: 'var(--fg-4)', letterSpacing: '0.12em' }}
        >
          {footerCopy.version}
        </span>
      </div>
    </footer>
  )
}
