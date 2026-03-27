-- Add is_ai_generated flag to diet and training plans
-- so free users can see all meals/days in manually-created plans.

ALTER TABLE diet_plans ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT FALSE;
ALTER TABLE training_plans ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT FALSE;

-- Mark existing plans created via AI generation as ai-generated
-- (plans created by generate-plans page have 'AI Meal Plan' in the name)
UPDATE diet_plans SET is_ai_generated = TRUE WHERE name LIKE '%AI Meal Plan%';
UPDATE training_plans SET is_ai_generated = TRUE WHERE name LIKE '%AI Training Plan%';
