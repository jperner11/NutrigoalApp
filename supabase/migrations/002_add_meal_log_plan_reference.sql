-- Add reference from meal_logs to diet_plan_meals
-- This allows tracking which plan meal was checked off

ALTER TABLE meal_logs
  ADD COLUMN diet_plan_meal_id UUID REFERENCES diet_plan_meals(id) ON DELETE SET NULL;

CREATE INDEX idx_meal_logs_plan_meal ON meal_logs(diet_plan_meal_id);
