-- 029: row-level security for trainer custom intake tables

ALTER TABLE public.personal_trainer_custom_intake_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_trainer_custom_intake_responses ENABLE ROW LEVEL SECURITY;

-- Trainers can manage their own custom intake questions.
DROP POLICY IF EXISTS personal_trainer_custom_intake_questions_manage_own
  ON public.personal_trainer_custom_intake_questions;
CREATE POLICY personal_trainer_custom_intake_questions_manage_own
  ON public.personal_trainer_custom_intake_questions
  FOR ALL
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

-- Assigned clients can read the active questions for their trainer.
DROP POLICY IF EXISTS personal_trainer_custom_intake_questions_select_assigned_client
  ON public.personal_trainer_custom_intake_questions;
CREATE POLICY personal_trainer_custom_intake_questions_select_assigned_client
  ON public.personal_trainer_custom_intake_questions
  FOR SELECT
  USING (
    is_active = true
    AND (
      EXISTS (
        SELECT 1
        FROM public.nutritionist_clients nc
        WHERE nc.client_id = auth.uid()
          AND nc.nutritionist_id = personal_trainer_custom_intake_questions.trainer_id
          AND nc.status = 'active'
      )
      OR EXISTS (
        SELECT 1
        FROM public.user_profiles up
        WHERE up.id = auth.uid()
          AND COALESCE(up.personal_trainer_id, up.nutritionist_id) = personal_trainer_custom_intake_questions.trainer_id
      )
    )
  );

-- Clients can read only their own custom intake responses.
DROP POLICY IF EXISTS personal_trainer_custom_intake_responses_select_own
  ON public.personal_trainer_custom_intake_responses;
CREATE POLICY personal_trainer_custom_intake_responses_select_own
  ON public.personal_trainer_custom_intake_responses
  FOR SELECT
  USING (
    client_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1
        FROM public.nutritionist_clients nc
        WHERE nc.client_id = auth.uid()
          AND nc.nutritionist_id = personal_trainer_custom_intake_responses.trainer_id
          AND nc.status = 'active'
      )
      OR EXISTS (
        SELECT 1
        FROM public.user_profiles up
        WHERE up.id = auth.uid()
          AND COALESCE(up.personal_trainer_id, up.nutritionist_id) = personal_trainer_custom_intake_responses.trainer_id
      )
    )
  );

-- Trainers can read responses for their own assigned clients.
DROP POLICY IF EXISTS personal_trainer_custom_intake_responses_select_trainer
  ON public.personal_trainer_custom_intake_responses;
CREATE POLICY personal_trainer_custom_intake_responses_select_trainer
  ON public.personal_trainer_custom_intake_responses
  FOR SELECT
  USING (
    trainer_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1
        FROM public.nutritionist_clients nc
        WHERE nc.nutritionist_id = auth.uid()
          AND nc.client_id = personal_trainer_custom_intake_responses.client_id
          AND nc.status = 'active'
      )
      OR EXISTS (
        SELECT 1
        FROM public.user_profiles up
        WHERE up.id = personal_trainer_custom_intake_responses.client_id
          AND COALESCE(up.personal_trainer_id, up.nutritionist_id) = auth.uid()
      )
    )
  );

-- Clients can insert responses only for their own trainer's questions.
DROP POLICY IF EXISTS personal_trainer_custom_intake_responses_insert_own
  ON public.personal_trainer_custom_intake_responses;
CREATE POLICY personal_trainer_custom_intake_responses_insert_own
  ON public.personal_trainer_custom_intake_responses
  FOR INSERT
  WITH CHECK (
    client_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.personal_trainer_custom_intake_questions q
      WHERE q.id = personal_trainer_custom_intake_responses.question_id
        AND q.trainer_id = personal_trainer_custom_intake_responses.trainer_id
    )
    AND (
      EXISTS (
        SELECT 1
        FROM public.nutritionist_clients nc
        WHERE nc.client_id = auth.uid()
          AND nc.nutritionist_id = personal_trainer_custom_intake_responses.trainer_id
          AND nc.status = 'active'
      )
      OR EXISTS (
        SELECT 1
        FROM public.user_profiles up
        WHERE up.id = auth.uid()
          AND COALESCE(up.personal_trainer_id, up.nutritionist_id) = personal_trainer_custom_intake_responses.trainer_id
      )
    )
  );

-- Clients can update only their own responses for their trainer's questions.
DROP POLICY IF EXISTS personal_trainer_custom_intake_responses_update_own
  ON public.personal_trainer_custom_intake_responses;
CREATE POLICY personal_trainer_custom_intake_responses_update_own
  ON public.personal_trainer_custom_intake_responses
  FOR UPDATE
  USING (client_id = auth.uid())
  WITH CHECK (
    client_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.personal_trainer_custom_intake_questions q
      WHERE q.id = personal_trainer_custom_intake_responses.question_id
        AND q.trainer_id = personal_trainer_custom_intake_responses.trainer_id
    )
    AND (
      EXISTS (
        SELECT 1
        FROM public.nutritionist_clients nc
        WHERE nc.client_id = auth.uid()
          AND nc.nutritionist_id = personal_trainer_custom_intake_responses.trainer_id
          AND nc.status = 'active'
      )
      OR EXISTS (
        SELECT 1
        FROM public.user_profiles up
        WHERE up.id = auth.uid()
          AND COALESCE(up.personal_trainer_id, up.nutritionist_id) = personal_trainer_custom_intake_responses.trainer_id
      )
    )
  );
