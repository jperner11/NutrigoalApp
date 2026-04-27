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
  title: `${BRAND_NAME} - Feel Your Momentum`,
  description: "Meal planning, training structure, coaching intelligence, and Personal Trainer workflows in one calm, momentum-driven platform.",
  keywords: "nutrition, diet, meal planning, workout, training, cardio, hydration, personal trainer, fitness coaching",
  authors: [{ name: `${BRAND_NAME} Team` }],
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
              border: '1px solid rgba(245, 241, 234, 0.16)',
              background: '#1a1719',
              color: '#f5f1ea',
            },
            success: {
              style: {
                background: 'rgba(26, 163, 122, 0.18)',
                color: '#f5f1ea',
                border: '1px solid rgba(26, 163, 122, 0.4)',
              },
              iconTheme: {
                primary: '#1aa37a',
                secondary: '#1a1719',
              },
            },
            error: {
              style: {
                background: 'rgba(230, 57, 70, 0.18)',
                color: '#f5f1ea',
                border: '1px solid rgba(230, 57, 70, 0.42)',
              },
              iconTheme: {
                primary: '#e63946',
                secondary: '#1a1719',
              },
            },
          }}
        />
      </body>
    </html>
  )
}
