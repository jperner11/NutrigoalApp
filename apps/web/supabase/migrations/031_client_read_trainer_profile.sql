-- Allow clients to read their trainer's profile
-- Currently only trainers can view client profiles, but clients need
-- to see their trainer's name/email on the my-nutritionist page.

CREATE POLICY "Clients can view their trainer profile"
  ON user_profiles FOR SELECT
  USING (
    id IN (
      SELECT COALESCE(personal_trainer_id, nutritionist_id)
      FROM user_profiles
      WHERE id = auth.uid()
        AND COALESCE(personal_trainer_id, nutritionist_id) IS NOT NULL
    )
  );
