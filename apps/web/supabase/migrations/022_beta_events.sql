CREATE TABLE IF NOT EXISTS beta_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  account_role TEXT,
  event_name TEXT NOT NULL,
  entity_table TEXT,
  entity_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE beta_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own beta events" ON beta_events;
CREATE POLICY "Users can view own beta events"
  ON beta_events FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Service role manages beta events" ON beta_events;
CREATE POLICY "Service role manages beta events"
  ON beta_events FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_beta_events_user_id ON beta_events(user_id);
CREATE INDEX IF NOT EXISTS idx_beta_events_event_name ON beta_events(event_name);
CREATE INDEX IF NOT EXISTS idx_beta_events_created_at ON beta_events(created_at DESC);

CREATE OR REPLACE FUNCTION log_beta_event(
  p_user_id UUID,
  p_event_name TEXT,
  p_entity_table TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS VOID AS $$
DECLARE
  v_role TEXT;
BEGIN
  IF p_user_id IS NOT NULL THEN
    SELECT role INTO v_role
    FROM user_profiles
    WHERE id = p_user_id;
  END IF;

  INSERT INTO beta_events (user_id, account_role, event_name, entity_table, entity_id, metadata)
  VALUES (p_user_id, v_role, p_event_name, p_entity_table, p_entity_id, COALESCE(p_metadata, '{}'::jsonb));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION capture_personal_trainer_signup()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IN ('personal_trainer', 'nutritionist') THEN
    PERFORM log_beta_event(
      NEW.id,
      'pt_signup',
      'user_profiles',
      NEW.id,
      jsonb_build_object('email', NEW.email)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_capture_personal_trainer_signup ON user_profiles;
CREATE TRIGGER trg_capture_personal_trainer_signup
AFTER INSERT ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION capture_personal_trainer_signup();

CREATE OR REPLACE FUNCTION capture_invite_events()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_beta_event(
      NEW.personal_trainer_id,
      'client_invite_sent',
      'personal_trainer_invites',
      NEW.id,
      jsonb_build_object('invited_email', NEW.invited_email, 'status', NEW.status)
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'accepted' THEN
      PERFORM log_beta_event(
        NEW.personal_trainer_id,
        'client_invite_accepted',
        'personal_trainer_invites',
        NEW.id,
        jsonb_build_object('invited_email', NEW.invited_email)
      );
    ELSIF NEW.status = 'declined' THEN
      PERFORM log_beta_event(
        NEW.personal_trainer_id,
        'client_invite_declined',
        'personal_trainer_invites',
        NEW.id,
        jsonb_build_object('invited_email', NEW.invited_email)
      );
    ELSIF NEW.status = 'expired' THEN
      PERFORM log_beta_event(
        NEW.personal_trainer_id,
        'client_invite_expired',
        'personal_trainer_invites',
        NEW.id,
        jsonb_build_object('invited_email', NEW.invited_email)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_capture_invite_events ON personal_trainer_invites;
CREATE TRIGGER trg_capture_invite_events
AFTER INSERT OR UPDATE ON personal_trainer_invites
FOR EACH ROW
EXECUTE FUNCTION capture_invite_events();

CREATE OR REPLACE FUNCTION capture_plan_assignment_events()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.created_by IS NOT NULL AND NEW.created_by <> NEW.user_id THEN
    IF TG_TABLE_NAME = 'diet_plans' THEN
      PERFORM log_beta_event(
        NEW.created_by,
        'diet_plan_assigned',
        TG_TABLE_NAME,
        NEW.id,
        jsonb_build_object('client_id', NEW.user_id, 'is_active', NEW.is_active)
      );
    ELSIF TG_TABLE_NAME = 'training_plans' THEN
      PERFORM log_beta_event(
        NEW.created_by,
        'training_plan_assigned',
        TG_TABLE_NAME,
        NEW.id,
        jsonb_build_object('client_id', NEW.user_id, 'is_active', NEW.is_active)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_capture_diet_plan_assignment_events ON diet_plans;
CREATE TRIGGER trg_capture_diet_plan_assignment_events
AFTER INSERT ON diet_plans
FOR EACH ROW
EXECUTE FUNCTION capture_plan_assignment_events();

DROP TRIGGER IF EXISTS trg_capture_training_plan_assignment_events ON training_plans;
CREATE TRIGGER trg_capture_training_plan_assignment_events
AFTER INSERT ON training_plans
FOR EACH ROW
EXECUTE FUNCTION capture_plan_assignment_events();

CREATE OR REPLACE FUNCTION capture_first_time_user_events()
RETURNS TRIGGER AS $$
DECLARE
  v_existing_count INTEGER;
  v_event_name TEXT;
BEGIN
  IF TG_TABLE_NAME = 'meal_logs' THEN
    SELECT COUNT(*) INTO v_existing_count
    FROM meal_logs
    WHERE user_id = NEW.user_id
      AND id <> NEW.id;
    v_event_name := 'first_meal_logged';
  ELSIF TG_TABLE_NAME = 'workout_logs' THEN
    SELECT COUNT(*) INTO v_existing_count
    FROM workout_logs
    WHERE user_id = NEW.user_id
      AND id <> NEW.id;
    v_event_name := 'first_workout_logged';
  ELSIF TG_TABLE_NAME = 'messages' THEN
    SELECT COUNT(*) INTO v_existing_count
    FROM messages
    WHERE sender_id = NEW.sender_id
      AND id <> NEW.id;
    v_event_name := 'first_message_sent';
  ELSE
    RETURN NEW;
  END IF;

  IF v_existing_count = 0 THEN
    PERFORM log_beta_event(
      COALESCE(NEW.user_id, NEW.sender_id),
      v_event_name,
      TG_TABLE_NAME,
      NEW.id,
      '{}'::jsonb
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_capture_first_meal_logged ON meal_logs;
CREATE TRIGGER trg_capture_first_meal_logged
AFTER INSERT ON meal_logs
FOR EACH ROW
EXECUTE FUNCTION capture_first_time_user_events();

DROP TRIGGER IF EXISTS trg_capture_first_workout_logged ON workout_logs;
CREATE TRIGGER trg_capture_first_workout_logged
AFTER INSERT ON workout_logs
FOR EACH ROW
EXECUTE FUNCTION capture_first_time_user_events();

DROP TRIGGER IF EXISTS trg_capture_first_message_sent ON messages;
CREATE TRIGGER trg_capture_first_message_sent
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION capture_first_time_user_events();

CREATE OR REPLACE FUNCTION capture_feedback_completed()
RETURNS TRIGGER AS $$
DECLARE
  v_existing_count INTEGER;
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT COUNT(*) INTO v_existing_count
    FROM feedback_requests
    WHERE client_id = NEW.client_id
      AND status = 'completed'
      AND id <> NEW.id;

    IF v_existing_count = 0 THEN
      PERFORM log_beta_event(
        NEW.client_id,
        'first_feedback_completed',
        'feedback_requests',
        NEW.id,
        jsonb_build_object('trainer_id', NEW.nutritionist_id)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_capture_feedback_completed ON feedback_requests;
CREATE TRIGGER trg_capture_feedback_completed
AFTER UPDATE ON feedback_requests
FOR EACH ROW
EXECUTE FUNCTION capture_feedback_completed();
