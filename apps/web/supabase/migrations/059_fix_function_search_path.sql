-- Migration 059: Pin a safe search_path on every public function.
--
-- SECURITY DEFINER trigger functions (e.g. log_beta_event,
-- capture_personal_trainer_signup) reference tables UNQUALIFIED (beta_events,
-- user_profiles). They run inside the signup transaction as `supabase_auth_admin`,
-- whose search_path on newly-created Supabase projects no longer includes `public`.
-- Result on a fresh project: PT/nutritionist signup fails with
-- "Database error creating new user" because those names don't resolve.
-- (Older projects — like current prod — had a laxer default search_path, so this
-- never surfaced there.)
--
-- Fix: pin `search_path = public, pg_temp` on all public functions. Idempotent and
-- safe to re-run; covers existing functions and is the recommended hardening for
-- SECURITY DEFINER functions regardless.

DO $$
DECLARE
  fn RECORD;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      -- Skip functions installed by extensions (e.g. pg_trgm) — we don't own them.
      AND NOT EXISTS (
        SELECT 1 FROM pg_depend d
        WHERE d.objid = p.oid AND d.deptype = 'e'
      )
  LOOP
    BEGIN
      EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', fn.signature);
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'skipped (not owner): %', fn.signature;
    END;
  END LOOP;
END $$;
