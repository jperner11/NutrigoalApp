-- 026: coach custom intake questions and client responses

CREATE TABLE IF NOT EXISTS personal_trainer_custom_intake_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  help_text TEXT,
  type TEXT NOT NULL CHECK (type IN ('short_text', 'long_text', 'single_select', 'multi_select', 'yes_no')),
  options TEXT[] NOT NULL DEFAULT '{}'::text[],
  required BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pt_custom_intake_questions_trainer
  ON personal_trainer_custom_intake_questions(trainer_id, is_active, sort_order);

CREATE TABLE IF NOT EXISTS personal_trainer_custom_intake_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES personal_trainer_custom_intake_questions(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  response_text TEXT,
  response_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(question_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_pt_custom_intake_responses_client
  ON personal_trainer_custom_intake_responses(client_id, trainer_id);
