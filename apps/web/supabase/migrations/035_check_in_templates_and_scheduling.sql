-- Reusable check-in templates for trainers
create table if not exists public.feedback_templates (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  questions jsonb not null default '[]',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_feedback_templates_trainer on public.feedback_templates (trainer_id);

alter table public.feedback_templates enable row level security;

create policy "Trainers can manage own templates"
  on public.feedback_templates for all
  using (auth.uid() = trainer_id)
  with check (auth.uid() = trainer_id);

-- Scheduled check-in configuration per client
create table if not exists public.feedback_schedules (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references auth.users(id) on delete cascade,
  template_id uuid not null references public.feedback_templates(id) on delete cascade,
  day_of_week int not null default 0 check (day_of_week between 0 and 6),
  recurrence text not null default 'weekly' check (recurrence in ('weekly', 'biweekly', 'monthly')),
  is_active boolean not null default true,
  last_triggered_at timestamptz,
  created_at timestamptz not null default now(),
  unique (trainer_id, client_id)
);

create index idx_feedback_schedules_active on public.feedback_schedules (is_active, day_of_week) where is_active = true;

alter table public.feedback_schedules enable row level security;

create policy "Trainers can manage own schedules"
  on public.feedback_schedules for all
  using (auth.uid() = trainer_id)
  with check (auth.uid() = trainer_id);

create policy "Clients can view own schedules"
  on public.feedback_schedules for select
  using (auth.uid() = client_id);

-- Extend feedback_requests with template and schedule references
alter table public.feedback_requests
  add column if not exists template_id uuid references public.feedback_templates(id) on delete set null,
  add column if not exists schedule_id uuid references public.feedback_schedules(id) on delete set null;

-- Extend the question type check: allow 'photo' and 'rating_10' in addition to existing types
-- (question types are stored in JSONB so no DB constraint needed, only app-level validation)

-- Allow clients to read feedback templates (to display question labels in their response UI)
create policy "Clients can read templates used in their feedback"
  on public.feedback_templates for select
  using (
    exists (
      select 1 from public.feedback_requests fr
      where fr.template_id = feedback_templates.id
        and fr.client_id = auth.uid()
    )
  );
