# mealandmotion - Personalized Nutrition & Fitness Tracker

A modern web application for tracking nutrition, hydration, workouts, and cardio — with support for nutritionist-managed client plans.

## Features

### For Users
- **Dashboard** with daily macro tracking (calories, protein, carbs, fat) and progress bars
- **Meal plan tracking** — check off meals from your diet plan, see real-time macro progress
- **Water intake tracker** — quick-add buttons (250ml, 500ml, 1L) with daily goal percentage
- **Diet plans** — create and manage meal plans with food items and macro targets
- **Training plans** — structured workout plans with exercises, sets, and reps
- **Cardio logging** — track sessions with duration, BPM, and calories burned
- **AI meal suggestions** — get personalized meal ideas based on your goals
- **Onboarding** — guided setup that calculates BMR, TDEE, and macro targets

### For Nutritionists
- **Client management** — invite and manage clients
- **Prescribe plans** — create diet plans, training plans, and cardio sessions for clients
- **Monitor progress** — view client meal logs, water intake, and workout history

### Pricing Tiers
- **Free** — basic tracking, 1 AI suggestion (lifetime)
- **Pro ($14.99/mo)** — full planning, 5 AI suggestions/month, analytics
- **Nutritionist ($49.99/mo)** — everything in Pro + 10 clients, 20 AI suggestions/month

## Tech Stack

- **Framework**: Next.js 15 (App Router, Turbopack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Database & Auth**: Supabase (PostgreSQL, Row Level Security)
- **Food Data**: Spoonacular API
- **Payments**: Stripe
- **Icons**: Lucide React
- **Notifications**: React Hot Toast

## Getting Started

### Prerequisites
- Node.js 18+ and npm

### Setup

```bash
git clone https://github.com/jperner11/NutrigoalApp.git
cd NutrigoalApp
npm install
```

Create a `.env.local` file:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Spoonacular
SPOONACULAR_API_KEY=your_spoonacular_api_key

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_key
STRIPE_SECRET_KEY=your_stripe_secret
```

### Database

Run the migrations in your Supabase SQL Editor in order:

1. `supabase/migrations/001_initial_schema.sql` — core tables, RLS policies, seed data
2. `supabase/migrations/002_add_meal_log_plan_reference.sql` — links meal logs to diet plan meals

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
├── app/
│   ├── (app)/              # Authenticated pages (dashboard, diet, training, etc.)
│   ├── (public)/           # Public pages (login, signup, pricing)
│   ├── api/                # API routes (food search, nutrition, AI, Stripe webhook)
│   └── auth/               # Auth callback
├── components/
│   ├── dashboard/          # MealPlanTracker
│   └── ui/                 # Sidebar
├── hooks/                  # useUser hook
└── lib/
    ├── supabase/           # Client, server, middleware, types
    ├── nutrition.ts        # BMR, TDEE, macro calculations
    ├── constants.ts        # App constants
    └── cardio.ts           # Cardio utilities
```

## Nutrition Science

- **BMR**: Mifflin-St Jeor equation
- **TDEE**: Activity level multipliers (1.2 - 1.9)
- **Goal adjustments**: Cutting (-500 cal), Bulking (+300 cal), Maintenance
- **Protein**: 1.8-2.2g/kg based on goal
- **Hydration**: 35ml/kg body weight

## License

MIT
