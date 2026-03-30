import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NutriGoal - Nutrition, Training & Wellness Platform",
  description: "All-in-one platform for individuals and nutritionists. AI-powered meal planning, workout builder, cardio tracking, and water intake monitoring.",
  keywords: "nutrition, diet, meal planning, workout, training, cardio, hydration, nutritionist, fitness",
  authors: [{ name: "NutriGoal Team" }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-slate-50">
          {children}
        </div>
        <Toaster
          position="top-center"
          reverseOrder={false}
          toastOptions={{
            duration: 3500,
            style: {
              padding: '14px 20px',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: '500',
              maxWidth: '420px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
            },
            success: {
              style: {
                background: '#f0fdf4',
                color: '#166534',
                border: '1px solid #bbf7d0',
              },
              iconTheme: {
                primary: '#22c55e',
                secondary: '#f0fdf4',
              },
            },
            error: {
              style: {
                background: '#fef2f2',
                color: '#991b1b',
                border: '1px solid #fecaca',
              },
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fef2f2',
              },
            },
          }}
        />
      </body>
    </html>
  );
}
