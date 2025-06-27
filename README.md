# 🎯 NutriGoal - Your Personalized Diet & Hydration Planner

**Built for everyday people who want to eat smart, feel better, and stay on track.**

NutriGoal is a modern web application that provides AI-powered meal plans tailored to your personal goals—whether you're building muscle, losing weight, or maintaining your ideal lifestyle.

## ✨ Features

### 🆓 Free Plan
- ✅ Smart goal calculator (BMR/TDEE calculation)
- ✅ Daily calorie and water intake targets
- ✅ 1-day personalized meal plan
- ✅ Basic progress tracking
- ✅ Dietary preferences & allergy management

### 💎 Premium Plan
- 🔥 7-day & 30-day meal plans
- 🤖 AI nutrition assistant
- 📝 Smart grocery lists
- 🔄 Meal alternatives & swaps
- 📊 Advanced progress analytics
- 🔔 Habit & hydration reminders
- 📱 Export meal plans & recipes
- ♾️ Unlimited plan regeneration

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **AI Integration**: OpenAI GPT API
- **Food Data**: Spoonacular API (planned)
- **Payments**: Stripe (planned)
- **Hosting**: Vercel + Supabase
- **Icons**: Lucide React
- **Notifications**: React Hot Toast

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Git

### 1. Clone the Repository
\`\`\`bash
git clone https://github.com/yourusername/nutrigoal.git
cd nutrigoal
\`\`\`

### 2. Install Dependencies
\`\`\`bash
npm install
\`\`\`

### 3. Environment Setup
Create a \`.env.local\` file in the root directory:

\`\`\`env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# OpenAI (for AI meal planning)
OPENAI_API_KEY=your_openai_api_key_here

# Food APIs
SPOONACULAR_API_KEY=your_spoonacular_api_key_here

# Stripe (for payments)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key_here
STRIPE_SECRET_KEY=your_stripe_secret_key_here
\`\`\`

### 4. Run the Development Server
\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 📱 Pages & Features

### 🏠 Landing Page (`/`)
- Hero section with value proposition
- Feature highlights
- Call-to-action to start onboarding

### 📝 Onboarding (`/onboarding`)
- Multi-step form to collect user metrics
- Goal calculator with scientific formulas
- Dietary preferences and allergy selection
- Real-time nutrition target calculation

### 🏁 Dashboard (`/dashboard`)
- Daily nutrition overview
- Progress tracking with visual indicators
- Today's meal plan display
- Tabs for different time periods

### 🔐 Authentication (`/login`)
- Email/password authentication
- Sign up and sign in flows
- Password visibility toggle
- Form validation

### 💎 Premium (`/premium`)
- Pricing comparison
- Feature highlights
- Testimonials
- Subscription call-to-action

## 🧮 Nutrition Science

### BMR Calculation
Uses the **Mifflin-St Jeor equation** for accurate basal metabolic rate:
- **Males**: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age + 5
- **Females**: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age - 161

### TDEE Calculation
Total Daily Energy Expenditure using activity multipliers:
- Sedentary: BMR × 1.2
- Lightly Active: BMR × 1.375
- Moderately Active: BMR × 1.55
- Very Active: BMR × 1.725
- Extremely Active: BMR × 1.9

### Goal Adjustments
- **Cutting**: TDEE - 500 calories (1lb/week loss)
- **Bulking**: TDEE + 300 calories (lean gains)
- **Maintenance**: TDEE (current weight)

### Macro Distribution
- **Protein**: 1.8-2.2g per kg body weight
- **Fat**: 20-25% of total calories
- **Carbs**: Remaining calories

### Hydration
- **Water intake**: 35ml per kg body weight

## 🎨 Design System

### Color Palette
- **Primary**: Green to Blue gradient (`from-green-500 to-blue-500`)
- **Premium**: Purple to Pink gradient (`from-purple-500 to-pink-500`)
- **Background**: Soft gradient (`from-green-50 via-blue-50 to-purple-50`)
- **Text**: Gray scale for optimal readability

### Typography
- **Font**: Inter (system font)
- **Sizes**: Responsive scale from sm to 7xl
- **Weights**: Regular (400) to Bold (700)

## 📊 Database Schema (Planned)

### User Profiles
\`\`\`sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  age INTEGER,
  height INTEGER, -- cm
  weight INTEGER, -- kg
  gender TEXT CHECK (gender IN ('male', 'female')),
  activity_level TEXT,
  goal TEXT CHECK (goal IN ('bulking', 'cutting', 'maintenance')),
  dietary_preferences TEXT[],
  allergies TEXT[],
  daily_calories INTEGER,
  daily_water INTEGER, -- ml
  is_premium BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
\`\`\`

### Meal Plans
\`\`\`sql
CREATE TABLE meal_plans (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id),
  date DATE,
  meals JSONB, -- breakfast, lunch, dinner, snacks
  total_calories INTEGER,
  total_protein INTEGER,
  total_carbs INTEGER,
  total_fat INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
\`\`\`

## 🚢 Deployment

### Vercel Deployment
1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on git push

### Supabase Setup
1. Create a new Supabase project
2. Run database migrations
3. Configure authentication settings
4. Set up Row Level Security (RLS)

## 🔮 Roadmap

### Phase 1 - MVP (Current)
- [x] Landing page with hero section
- [x] Multi-step onboarding flow
- [x] Nutrition calculation engine
- [x] Basic dashboard with progress tracking
- [x] Authentication system
- [x] Premium pricing page
- [x] Responsive design

### Phase 2 - Core Features
- [ ] Supabase database integration
- [ ] Real user authentication
- [ ] AI meal plan generation (OpenAI)
- [ ] Food API integration (Spoonacular)
- [ ] Stripe payment processing
- [ ] User profile management

### Phase 3 - Advanced Features
- [ ] 7-day meal planning
- [ ] Smart grocery lists
- [ ] Meal alternatives & swaps
- [ ] Progress analytics & insights
- [ ] Push notifications
- [ ] PWA capabilities

### Phase 4 - Growth
- [ ] Mobile app (React Native)
- [ ] Wearable integrations
- [ ] Meal delivery partnerships
- [ ] Community features
- [ ] Advanced AI recommendations

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (\`git checkout -b feature/amazing-feature\`)
3. Commit your changes (\`git commit -m 'Add amazing feature'\`)
4. Push to the branch (\`git push origin feature/amazing-feature\`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙋‍♂️ Support

- 📧 Email: support@nutrigoal.com
- 💬 Discord: [Join our community](https://discord.gg/nutrigoal)
- 📱 Twitter: [@NutriGoalApp](https://twitter.com/NutriGoalApp)

## 🏆 Acknowledgments

- **Mifflin-St Jeor equation** for BMR calculations
- **Lucide React** for beautiful icons
- **Tailwind CSS** for rapid UI development
- **Next.js** team for the amazing framework
- **Supabase** for backend-as-a-service

---

**Built with ❤️ for better nutrition and healthier lives.**
