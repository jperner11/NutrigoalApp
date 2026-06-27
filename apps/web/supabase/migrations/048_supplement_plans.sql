-- 048: coach-prescribed supplement plans

CREATE TABLE IF NOT EXISTS public.supplement_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  notes TEXT,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.supplement_plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.supplement_plans(id) ON DELETE CASCADE,
  supplement_name TEXT NOT NULL,
  dosage TEXT,
  unit TEXT,
  frequency TEXT,
  time_of_day TEXT,
  with_food BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplement_plans_client_active
  ON public.supplement_plans(client_id, is_active);
CREATE INDEX IF NOT EXISTS idx_supplement_plans_coach
  ON public.supplement_plans(coach_id);
CREATE INDEX IF NOT EXISTS idx_supplement_plan_items_plan
  ON public.supplement_plan_items(plan_id, sort_order);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_supplement_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS supplement_plans_set_updated_at ON public.supplement_plans;
CREATE TRIGGER supplement_plans_set_updated_at
  BEFORE UPDATE ON public.supplement_plans
  FOR EACH ROW EXECUTE FUNCTION public.touch_supplement_plans_updated_at();
