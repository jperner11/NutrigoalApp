-- 049: row-level security for coach supplement plans

ALTER TABLE public.supplement_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplement_plan_items ENABLE ROW LEVEL SECURITY;

-- ─── supplement_plans policies ────────────────────────────

-- Coach can manage plans they own for their assigned clients.
DROP POLICY IF EXISTS supplement_plans_coach_manage ON public.supplement_plans;
CREATE POLICY supplement_plans_coach_manage
  ON public.supplement_plans
  FOR ALL
  USING (
    coach_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1
        FROM public.nutritionist_clients nc
        WHERE nc.nutritionist_id = auth.uid()
          AND nc.client_id = supplement_plans.client_id
          AND nc.status = 'active'
      )
      OR EXISTS (
        SELECT 1
        FROM public.user_profiles up
        WHERE up.id = supplement_plans.client_id
          AND COALESCE(up.personal_trainer_id, up.nutritionist_id) = auth.uid()
      )
    )
  )
  WITH CHECK (
    coach_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1
        FROM public.nutritionist_clients nc
        WHERE nc.nutritionist_id = auth.uid()
          AND nc.client_id = supplement_plans.client_id
          AND nc.status = 'active'
      )
      OR EXISTS (
        SELECT 1
        FROM public.user_profiles up
        WHERE up.id = supplement_plans.client_id
          AND COALESCE(up.personal_trainer_id, up.nutritionist_id) = auth.uid()
      )
    )
  );

-- Client can read their own plans (read-only).
DROP POLICY IF EXISTS supplement_plans_client_select ON public.supplement_plans;
CREATE POLICY supplement_plans_client_select
  ON public.supplement_plans
  FOR SELECT
  USING (client_id = auth.uid());

-- ─── supplement_plan_items policies (inherit via plan) ────

DROP POLICY IF EXISTS supplement_plan_items_coach_manage ON public.supplement_plan_items;
CREATE POLICY supplement_plan_items_coach_manage
  ON public.supplement_plan_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.supplement_plans p
      WHERE p.id = supplement_plan_items.plan_id
        AND p.coach_id = auth.uid()
        AND (
          EXISTS (
            SELECT 1 FROM public.nutritionist_clients nc
            WHERE nc.nutritionist_id = auth.uid()
              AND nc.client_id = p.client_id
              AND nc.status = 'active'
          )
          OR EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = p.client_id
              AND COALESCE(up.personal_trainer_id, up.nutritionist_id) = auth.uid()
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.supplement_plans p
      WHERE p.id = supplement_plan_items.plan_id
        AND p.coach_id = auth.uid()
        AND (
          EXISTS (
            SELECT 1 FROM public.nutritionist_clients nc
            WHERE nc.nutritionist_id = auth.uid()
              AND nc.client_id = p.client_id
              AND nc.status = 'active'
          )
          OR EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = p.client_id
              AND COALESCE(up.personal_trainer_id, up.nutritionist_id) = auth.uid()
          )
        )
    )
  );

DROP POLICY IF EXISTS supplement_plan_items_client_select ON public.supplement_plan_items;
CREATE POLICY supplement_plan_items_client_select
  ON public.supplement_plan_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.supplement_plans p
      WHERE p.id = supplement_plan_items.plan_id
        AND p.client_id = auth.uid()
    )
  );
