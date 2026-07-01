-- Coach-prescribed cardio plans (mirrors training_plans structure).
-- Plans hold weekly recurring prescriptive cardio sessions tied to a day of week.
-- Existing ad-hoc cardio_sessions logging is unaffected.

create table if not exists public.cardio_plans (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  notes text,
  start_date date not null default current_date,
  end_date date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_cardio_plans_coach on public.cardio_plans (coach_id);
create index if not exists idx_cardio_plans_client on public.cardio_plans (client_id);
create index if not exists idx_cardio_plans_active on public.cardio_plans (client_id, is_active) where is_active = true;

create table if not exists public.cardio_plan_sessions (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.cardio_plans(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6),
  type text not null,
  duration_minutes int not null check (duration_minutes > 0),
  intensity text not null default 'moderate',
  target_zone text,
  target_hr_min int,
  target_hr_max int,
  notes text,
  sort_order int not null default 0
);

create index if not exists idx_cardio_plan_sessions_plan on public.cardio_plan_sessions (plan_id);
create index if not exists idx_cardio_plan_sessions_dow on public.cardio_plan_sessions (plan_id, day_of_week);

-- Updated-at trigger for cardio_plans (reuses existing update_updated_at function)
do $$ begin
  if not exists (
    select 1 from pg_trigger where tgname = 'cardio_plans_updated_at'
  ) then
    create trigger cardio_plans_updated_at
      before update on public.cardio_plans
      for each row execute function update_updated_at();
  end if;
end $$;

-- ─── Row Level Security ─────────────────────────────────
alter table public.cardio_plans enable row level security;
alter table public.cardio_plan_sessions enable row level security;

-- Coach can manage own plans
create policy "Coaches can manage own cardio plans"
  on public.cardio_plans for all
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

-- Coach can manage plans for their active clients (via nutritionist_clients)
create policy "Coaches can manage cardio plans for active clients"
  on public.cardio_plans for all
  using (
    client_id in (
      select client_id from public.nutritionist_clients
      where nutritionist_id = auth.uid() and status = 'active'
    )
  )
  with check (
    client_id in (
      select client_id from public.nutritionist_clients
      where nutritionist_id = auth.uid() and status = 'active'
    )
  );

-- Client can view own cardio plans (read-only)
create policy "Clients can view own cardio plans"
  on public.cardio_plans for select
  using (client_id = auth.uid());

-- Sessions inherit access from parent plan (coach manage, client read)
create policy "Coaches can manage own cardio plan sessions"
  on public.cardio_plan_sessions for all
  using (
    plan_id in (
      select id from public.cardio_plans where coach_id = auth.uid()
    )
  )
  with check (
    plan_id in (
      select id from public.cardio_plans where coach_id = auth.uid()
    )
  );

create policy "Clients can view own cardio plan sessions"
  on public.cardio_plan_sessions for select
  using (
    plan_id in (
      select id from public.cardio_plans where client_id = auth.uid()
    )
  );
