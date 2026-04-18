-- Enable trigram search for fuzzy food name matching
create extension if not exists pg_trgm with schema public;

-- Local food database: caches external lookups and stores PT custom foods
create table if not exists public.foods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text,
  source text not null check (source in ('spoonacular', 'openfoodfacts', 'custom', 'ai_parsed')),
  external_id text,
  barcode text,
  calories_per_100g numeric not null default 0,
  protein_per_100g numeric not null default 0,
  carbs_per_100g numeric not null default 0,
  fat_per_100g numeric not null default 0,
  default_amount numeric not null default 100,
  default_unit text not null default 'g',
  created_by uuid references auth.users(id),
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_foods_name_trgm on public.foods using gin (name gin_trgm_ops);
create index idx_foods_source on public.foods (source);
create unique index idx_foods_external_id on public.foods (source, external_id) where external_id is not null;
create index idx_foods_barcode on public.foods (barcode) where barcode is not null;
create index idx_foods_created_by on public.foods (created_by) where created_by is not null;

alter table public.foods enable row level security;

-- Everyone can read verified foods and foods from external sources
create policy "Anyone can read verified or external foods"
  on public.foods for select
  using (is_verified = true or source in ('spoonacular', 'openfoodfacts'));

-- Users can read their own custom foods
create policy "Users can read own custom foods"
  on public.foods for select
  using (auth.uid() = created_by);

-- Trainers can create custom foods
create policy "Users can insert custom foods"
  on public.foods for insert
  with check (auth.uid() = created_by and source = 'custom');

-- Trainers can update their own custom foods
create policy "Users can update own custom foods"
  on public.foods for update
  using (auth.uid() = created_by and source = 'custom');

-- Trainers can delete their own custom foods
create policy "Users can delete own custom foods"
  on public.foods for delete
  using (auth.uid() = created_by and source = 'custom');

-- Service role can insert cached foods from external APIs
-- (handled by supabase service role key in API routes)

-- Pre-seed common gym foods with accurate per-100g macros
insert into public.foods (name, source, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, default_amount, default_unit, is_verified) values
  ('White rice (cooked)', 'custom', 130, 2.7, 28.2, 0.3, 200, 'g', true),
  ('Brown rice (cooked)', 'custom', 123, 2.7, 25.6, 1.0, 200, 'g', true),
  ('Chicken breast (cooked)', 'custom', 165, 31.0, 0, 3.6, 150, 'g', true),
  ('Potato (boiled)', 'custom', 87, 1.9, 20.1, 0.1, 200, 'g', true),
  ('Sweet potato (boiled)', 'custom', 90, 2.0, 20.7, 0.2, 200, 'g', true),
  ('Pasta (cooked)', 'custom', 131, 5.0, 25.0, 1.1, 200, 'g', true),
  ('Whey protein powder', 'custom', 380, 80.0, 6.0, 5.0, 30, 'g', true),
  ('Oats (dry)', 'custom', 389, 16.9, 66.3, 6.9, 50, 'g', true),
  ('Whole egg (raw)', 'custom', 155, 13.0, 1.1, 11.0, 50, 'g', true),
  ('Egg white (raw)', 'custom', 52, 11.0, 0.7, 0.2, 100, 'g', true),
  ('Banana', 'custom', 89, 1.1, 22.8, 0.3, 120, 'g', true),
  ('Peanut butter', 'custom', 588, 25.0, 20.0, 50.0, 32, 'g', true),
  ('Apple', 'custom', 52, 0.3, 13.8, 0.2, 180, 'g', true),
  ('Strawberries', 'custom', 32, 0.7, 7.7, 0.3, 150, 'g', true),
  ('Blueberries', 'custom', 57, 0.7, 14.5, 0.3, 100, 'g', true),
  ('Salmon fillet (cooked)', 'custom', 208, 20.4, 0, 13.4, 150, 'g', true),
  ('Ground beef 90/10 (cooked)', 'custom', 217, 26.1, 0, 11.8, 150, 'g', true),
  ('Greek yogurt (plain, 0% fat)', 'custom', 59, 10.2, 3.6, 0.4, 170, 'g', true),
  ('Olive oil', 'custom', 884, 0, 0, 100.0, 15, 'ml', true),
  ('Avocado', 'custom', 160, 2.0, 8.5, 14.7, 100, 'g', true),
  ('Broccoli (cooked)', 'custom', 35, 2.4, 7.2, 0.4, 150, 'g', true),
  ('Spinach (raw)', 'custom', 23, 2.9, 3.6, 0.4, 50, 'g', true),
  ('Almonds', 'custom', 579, 21.2, 21.6, 49.9, 30, 'g', true),
  ('Cottage cheese (low fat)', 'custom', 72, 12.4, 2.7, 1.0, 150, 'g', true),
  ('Tuna (canned in water)', 'custom', 116, 25.5, 0, 0.8, 100, 'g', true);
