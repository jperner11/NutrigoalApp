-- Migration 053: Expand ai_usage.type values.
-- 'coaching' rows (AI coaching hub, training check-ins) were silently failing
-- the old CHECK constraint. 'ai_suggest' separates one-off meal suggestions
-- from plan generation so they don't consume the regeneration cooldown.

ALTER TABLE ai_usage DROP CONSTRAINT IF EXISTS ai_usage_type_check;
ALTER TABLE ai_usage ADD CONSTRAINT ai_usage_type_check
  CHECK (type IN ('meal_suggestion', 'workout_suggestion', 'coaching', 'ai_suggest'));
