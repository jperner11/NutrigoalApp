import type { Metadata } from "next"
import { Manrope, Plus_Jakarta_Sans } from "next/font/google"
import "./globals.css"
import { Toaster } from "react-hot-toast"

const display = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
})

const body = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
})

export const metadata: Metadata = {
  title: "Nutrigoal - Performance Clinic for Nutrition and Training",
  description: "Precision meal planning, training systems, coaching intelligence, and practitioner workflows in one sharp performance platform.",
  keywords: "nutrition, diet, meal planning, workout, training, cardio, hydration, nutritionist, fitness",
  authors: [{ name: "Nutrigoal Team" }],
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
              boxShadow: '0 18px 45px rgba(9, 26, 42, 0.18)',
              border: '1px solid rgba(149, 176, 201, 0.28)',
              background: '#fbfdff',
              color: '#0d1b2a',
            },
            success: {
              style: {
                background: '#edf9ff',
                color: '#0d1b2a',
                border: '1px solid #b6ddf6',
              },
              iconTheme: {
                primary: '#1da8f0',
                secondary: '#edf9ff',
              },
            },
            error: {
              style: {
                background: '#fdf1f0',
                color: '#7a2d20',
                border: '1px solid #f1c7c0',
              },
              iconTheme: {
                primary: '#d45f48',
                secondary: '#fdf1f0',
              },
            },
          }}
        />
      </body>
    </html>
  )
}
