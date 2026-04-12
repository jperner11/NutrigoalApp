-- Fix infinite recursion in the "Clients can view their trainer profile" policy
-- introduced in 031. The original policy's USING clause subqueries user_profiles,
-- which re-triggers RLS evaluation on the same table → infinite recursion →
-- every user_profiles query fails → useUser() hangs → app stalls.
--
-- Replace with a SECURITY DEFINER function that reads the caller's trainer id
-- without going through RLS, and rewrite the policy to compare against it.

DROP POLICY IF EXISTS "Clients can view their trainer profile" ON user_profiles;

CREATE OR REPLACE FUNCTION public.get_my_trainer_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(personal_trainer_id, nutritionist_id)
  FROM user_profiles
  WHERE id = auth.uid()
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.get_my_trainer_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_trainer_id() TO authenticated;

CREATE POLICY "Clients can view their trainer profile"
  ON user_profiles FOR SELECT
  USING (
    id = public.get_my_trainer_id()
  );
