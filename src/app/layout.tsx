import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NutriGoal - Your Personalized Diet & Hydration Planner",
  description: "Built for everyday people who want to eat smart, feel better, and stay on track. Get AI-powered meal plans tailored to your goals.",
  keywords: "nutrition, diet, meal planning, calories, hydration, fitness, health",
  authors: [{ name: "NutriGoal Team" }],
  viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
          {children}
        </div>
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "#363636",
              color: "#fff",
            },
          }}
        />
      </body>
    </html>
  );
}
