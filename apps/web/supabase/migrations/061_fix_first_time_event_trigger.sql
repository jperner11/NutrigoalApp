-- 061: fix capture_first_time_user_events() — first meal/workout/message insert fails
--
-- Migration 022's function ends with
--   PERFORM log_beta_event(COALESCE(NEW.user_id, NEW.sender_id), ...)
-- but NEW is typed per-table: meal_logs/workout_logs rows have no sender_id and
-- messages rows have no user_id, so PL/pgSQL raises 42703 ("record \"new\" has no
-- field \"sender_id\"") the first time the branch is reached. Because the guard
-- only evaluates on a user's FIRST meal/workout/message, every new user's first
-- log insert has been failing outright (the AFTER trigger error aborts the insert).
--
-- Fix: resolve the actor id inside each table branch instead of a cross-table
-- COALESCE. Idempotent; safe to run on any project (test + prod).

CREATE OR REPLACE FUNCTION capture_first_time_user_events()
RETURNS TRIGGER AS $$
DECLARE
  v_existing_count INTEGER;
  v_event_name TEXT;
  v_actor_id UUID;
BEGIN
  IF TG_TABLE_NAME = 'meal_logs' THEN
    SELECT COUNT(*) INTO v_existing_count
    FROM meal_logs
    WHERE user_id = NEW.user_id
      AND id <> NEW.id;
    v_event_name := 'first_meal_logged';
    v_actor_id := NEW.user_id;
  ELSIF TG_TABLE_NAME = 'workout_logs' THEN
    SELECT COUNT(*) INTO v_existing_count
    FROM workout_logs
    WHERE user_id = NEW.user_id
      AND id <> NEW.id;
    v_event_name := 'first_workout_logged';
    v_actor_id := NEW.user_id;
  ELSIF TG_TABLE_NAME = 'messages' THEN
    SELECT COUNT(*) INTO v_existing_count
    FROM messages
    WHERE sender_id = NEW.sender_id
      AND id <> NEW.id;
    v_event_name := 'first_message_sent';
    v_actor_id := NEW.sender_id;
  ELSE
    RETURN NEW;
  END IF;

  IF v_existing_count = 0 THEN
    PERFORM log_beta_event(
      v_actor_id,
      v_event_name,
      TG_TABLE_NAME,
      NEW.id,
      '{}'::jsonb
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;
