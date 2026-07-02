-- 060_add_missing_onboarding_columns.sql
--
-- Fixes schema drift discovered by the e2e client-onboarding completion test:
-- the onboarding save (handleFinish in app/(app)/onboarding/page.tsx) writes 14
-- user_profiles columns that exist in PRODUCTION (added by hand) but were never
-- captured in any migration. As a result, onboarding completion fails with
-- `PGRST204: Could not find the '<col>' column of 'user_profiles'` on any freshly
-- provisioned database (the e2e test project, staging, or any new deploy).
--
-- This migration captures that drift. Every statement is idempotent
-- (ADD COLUMN IF NOT EXISTS), so it is a safe no-op on production (columns already
-- exist) and adds the missing columns everywhere else. Types match the app's state
-- (see onboarding/page.tsx: parseFloat -> numeric, integer defaults -> integer,
-- boolean default -> boolean, split() arrays -> text[]).

ALTER TABLE public.user_profiles
  -- Strength 1-rep-maxes (parseFloat)
  ADD COLUMN IF NOT EXISTS squat_1rm               numeric,
  ADD COLUMN IF NOT EXISTS bench_1rm               numeric,
  ADD COLUMN IF NOT EXISTS deadlift_1rm            numeric,
  ADD COLUMN IF NOT EXISTS ohp_1rm                 numeric,
  -- Lifestyle / training numerics
  ADD COLUMN IF NOT EXISTS sleep_hours             numeric,
  ADD COLUMN IF NOT EXISTS max_session_minutes     integer,
  ADD COLUMN IF NOT EXISTS food_adventurousness    integer,
  ADD COLUMN IF NOT EXISTS late_night_snacking     boolean,
  -- Text enums / free text
  ADD COLUMN IF NOT EXISTS secondary_training_goal text,
  ADD COLUMN IF NOT EXISTS alcohol_frequency       text,
  ADD COLUMN IF NOT EXISTS alcohol_details         text,
  ADD COLUMN IF NOT EXISTS snack_motivation        text,
  ADD COLUMN IF NOT EXISTS snack_preference        text,
  -- Array
  ADD COLUMN IF NOT EXISTS current_snacks          text[];
