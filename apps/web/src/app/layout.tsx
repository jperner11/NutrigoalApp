import type { Metadata } from "next"
import { Mulish, Bricolage_Grotesque } from "next/font/google"
import "./globals.css"
import { Toaster } from "react-hot-toast"
import { BRAND_NAME } from '@/lib/site'

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
})

const body = Mulish({
  subsets: ["latin"],
  variable: "--font-body",
})

export const metadata: Metadata = {
  title: `${BRAND_NAME} — One fitness app.`,
  description: "Treno is one fitness app for athletes and the coaches who train them. Plan, train, eat, and check in — without the noise.",
  keywords: "nutrition, diet, meal planning, workout, training, cardio, hydration, personal trainer, fitness coaching, coach marketplace",
  authors: [{ name: `${BRAND_NAME}` }],
  openGraph: {
    title: `${BRAND_NAME} — One fitness app.`,
    description: "One app for athletes and the coaches who train them.",
    siteName: BRAND_NAME,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${BRAND_NAME} — One fitness app.`,
    description: "One app for athletes and the coaches who train them.",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable}`}>
        <div className="min-h-screen bg-[var(--background)]">
          {children}
        </div>
        <Toaster
          position="top-center"
          reverseOrder={false}
          toastOptions={{
            duration: 3500,
            style: {
              padding: '14px 20px',
              borderRadius: '16px',
              fontSize: '14px',
              fontWeight: '600',
              maxWidth: '420px',
              boxShadow: '0 18px 45px rgba(0, 0, 0, 0.45)',
              border: '1px solid var(--line-strong)',
              background: 'var(--background-elevated)',
              color: 'var(--foreground)',
            },
            success: {
              style: {
                background: 'rgba(26, 163, 122, 0.18)',
                color: 'var(--foreground)',
                border: '1px solid rgba(26, 163, 122, 0.4)',
              },
              iconTheme: {
                primary: '#1aa37a',
                secondary: 'var(--background-elevated)',
              },
            },
            error: {
              style: {
                background: 'rgba(220, 38, 38, 0.18)',
                color: 'var(--foreground)',
                border: '1px solid rgba(220, 38, 38, 0.42)',
              },
              iconTheme: {
                primary: '#dc2626',
                secondary: 'var(--background-elevated)',
              },
            },
          }}
        />
      </body>
    </html>
  )
}
