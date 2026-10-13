-- Calorie Tracker schema
-- Run this in the Supabase SQL editor for your project.

-- 1. Profile / goal (one row per user)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  daily_goal integer not null default 2000,
  created_at timestamptz not null default now()
);

-- 2. Logged meals
create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  type text not null check (type in ('breakfast', 'lunch', 'dinner', 'snack')),
  name text not null,
  calories integer not null check (calories >= 0),
  created_at timestamptz not null default now()
);
create index if not exists meals_user_date_idx on public.meals (user_id, date);

-- 3. Saved meal templates (building blocks for plans)
create table if not exists public.meal_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('breakfast', 'lunch', 'dinner', 'snack')),
  calories integer not null check (calories >= 0),
  created_at timestamptz not null default now()
);

-- 4. Meal plans (named collections of templates)
create table if not exists public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

-- 5. Join table: which templates belong to which plan
create table if not exists public.meal_plan_items (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.meal_plans(id) on delete cascade,
  template_id uuid not null references public.meal_templates(id) on delete cascade
);

-- 5b. User-defined ordered meal slots. A slot may repeat a type, such as
-- two snacks, and its label is what the user sees in the daily planner.
create table if not exists public.meal_schedule (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  position integer not null check (position >= 0),
  type text not null check (type in ('breakfast', 'lunch', 'dinner', 'snack')),
  label text not null check (char_length(label) between 1 and 80),
  unique (user_id, position)
);
create index if not exists meal_schedule_user_idx on public.meal_schedule (user_id, position);
alter table public.meals add column if not exists schedule_id uuid references public.meal_schedule(id) on delete set null;

-- 6. Reminders
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  time text not null, -- 'HH:MM'
  label text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

-- 7. Water intake (one row per user per day)
create table if not exists public.water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  cups integer not null default 0 check (cups >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

-- 8. Weight entries (one row per user per day)
create table if not exists public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  weight_kg numeric not null check (weight_kg > 0),
  created_at timestamptz not null default now(),
  unique (user_id, date)
);
create index if not exists weight_logs_user_date_idx on public.weight_logs (user_id, date);

-- Onboarding + extra goal fields on profiles
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists goal_type text not null default 'maintain';
alter table public.profiles add column if not exists water_target integer not null default 8;
alter table public.profiles add column if not exists weight_goal_kg numeric;
alter table public.profiles add column if not exists onboarded boolean not null default false;

-- Body stats (sex/age/height/activity) were briefly used for a BMR-based
-- calorie-balance estimate. Dropped — calorie balance is now measured
-- against daily_goal instead. Dropping the columns also drops their check
-- constraints, so this is safe to re-run even on a database that never had
-- them (nothing to drop).
alter table public.profiles drop column if exists sex;
alter table public.profiles drop column if exists age;
alter table public.profiles drop column if exists height_cm;
alter table public.profiles drop column if exists activity_level;

-- Defense-in-depth: the app already validates these ranges client-side,
-- but bounds are enforced at the database level too so a bad direct API
-- call (or a future bug) can't write nonsense data.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_goal_type_check'
  ) then
    alter table public.profiles
      add constraint profiles_goal_type_check check (goal_type in ('lose', 'maintain', 'gain'));
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_daily_goal_check'
  ) then
    alter table public.profiles
      add constraint profiles_daily_goal_check check (daily_goal > 0 and daily_goal <= 20000);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_water_target_check'
  ) then
    alter table public.profiles
      add constraint profiles_water_target_check check (water_target > 0 and water_target <= 50);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_weight_goal_check'
  ) then
    alter table public.profiles
      add constraint profiles_weight_goal_check
      check (weight_goal_kg is null or (weight_goal_kg > 0 and weight_goal_kg <= 500));
  end if;
end $$;

-- ---------- Row Level Security ----------
alter table public.profiles enable row level security;
alter table public.meals enable row level security;
alter table public.meal_templates enable row level security;
alter table public.meal_plans enable row level security;
alter table public.meal_plan_items enable row level security;
alter table public.meal_schedule enable row level security;
alter table public.reminders enable row level security;
alter table public.water_logs enable row level security;
alter table public.weight_logs enable row level security;

drop policy if exists "profiles: owner read/write" on public.profiles;
create policy "profiles: owner read/write" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "meals: owner read/write" on public.meals;
create policy "meals: owner read/write" on public.meals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "meal_templates: owner read/write" on public.meal_templates;
create policy "meal_templates: owner read/write" on public.meal_templates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "meal_plans: owner read/write" on public.meal_plans;
create policy "meal_plans: owner read/write" on public.meal_plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "reminders: owner read/write" on public.reminders;
create policy "reminders: owner read/write" on public.reminders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "water_logs: owner read/write" on public.water_logs;
create policy "water_logs: owner read/write" on public.water_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "weight_logs: owner read/write" on public.weight_logs;
create policy "weight_logs: owner read/write" on public.weight_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- meal_plan_items has no user_id directly; gate through the parent plan
drop policy if exists "meal_plan_items: owner read/write" on public.meal_plan_items;
create policy "meal_plan_items: owner read/write" on public.meal_plan_items
  for all using (
    exists (select 1 from public.meal_plans p where p.id = plan_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.meal_plans p where p.id = plan_id and p.user_id = auth.uid())
  );

-- ---------- Auto-create a profile row on signup ----------
-- Goal fields are collected on the signup form and passed through as
-- auth signUp() metadata (new.raw_user_meta_data), since there's no
-- authenticated session yet to write to `profiles` directly while email
-- confirmation is pending.
create or replace function public.handle_new_user()
returns trigger as $$
declare
  meta_goal_type text := new.raw_user_meta_data ->> 'goal_type';
  meta_daily_goal text := new.raw_user_meta_data ->> 'daily_goal';
  meta_full_name text := new.raw_user_meta_data ->> 'full_name';
begin
  insert into public.profiles (id, daily_goal, goal_type, full_name, onboarded)
  values (
    new.id,
    coalesce(nullif(meta_daily_goal, '')::integer, 2000),
    case
      when meta_goal_type in ('lose', 'maintain', 'gain') then meta_goal_type
      else 'maintain'
    end,
    nullif(meta_full_name, ''),
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer
set search_path = public, pg_temp;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------- Push reminders ----------
-- IANA timezone used to evaluate each user's reminder times server-side
-- (the reminders cron has no browser to read this from otherwise).
alter table public.profiles add column if not exists timezone text not null default 'Africa/Lagos';

-- Tracks the last local date a reminder actually fired a push, so the cron
-- (which may run every few minutes, not exactly on the minute) sends each
-- reminder at most once per day instead of once per cron tick.
alter table public.reminders add column if not exists last_sent_date date;

-- One row per browser/device push subscription. A user can have several
-- (phone + laptop); each is pushed to independently and pruned if the
-- browser reports it gone (410/404).
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

drop policy if exists "meal_schedule: owner read/write" on public.meal_schedule;
create policy "meal_schedule: owner read/write" on public.meal_schedule
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions: owner read/write" on public.push_subscriptions;
create policy "push_subscriptions: owner read/write" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- Force PostgREST to pick up the schema changes above ----------
-- Supabase usually detects DDL automatically, but when columns are added
-- outside the dashboard's migration flow the API layer can keep serving a
-- stale cached schema (surfaces as "Could not find the 'x' column of ...
-- in the schema cache" even though the column exists). This makes the
-- reload explicit and safe to re-run.
notify pgrst, 'reload schema';
