-- Brings the live database in line with supabase/schema.sql (checked Nov 27, 2026).
-- Live was missing: the meal_schedule table, meals.schedule_id, and the
-- tightened meals / meal_plan_items ownership policies.
-- Additive and safe to re-run: no existing rows are changed or removed.

begin;

-- 1. Meal schedule slots (used by the Plans page)
create table if not exists public.meal_schedule (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  position integer not null check (position >= 0),
  type text not null check (type in ('breakfast', 'lunch', 'dinner', 'snack')),
  label text not null check (char_length(label) between 1 and 80),
  unique (user_id, position)
);
create index if not exists meal_schedule_user_idx on public.meal_schedule (user_id, position);
alter table public.meal_schedule enable row level security;

drop policy if exists "meal_schedule: owner read/write" on public.meal_schedule;
create policy "meal_schedule: owner read/write" on public.meal_schedule
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 2. Optional link from a meal to a schedule slot (nullable, existing meals unaffected)
alter table public.meals add column if not exists schedule_id uuid
  references public.meal_schedule(id) on delete set null;

-- 3. Meals may only point at the caller's own schedule slot
drop policy if exists "meals: owner read/write" on public.meals;
create policy "meals: owner read/write" on public.meals
  for all using (auth.uid() = user_id) with check (
    auth.uid() = user_id
    and (
      schedule_id is null
      or exists (
        select 1 from public.meal_schedule s
        where s.id = schedule_id and s.user_id = auth.uid()
      )
    )
  );

-- 4. Meal plan items must reference the caller's own plan AND template
drop policy if exists "meal_plan_items: owner read/write" on public.meal_plan_items;
create policy "meal_plan_items: owner read/write" on public.meal_plan_items
  for all using (
    exists (select 1 from public.meal_plans p where p.id = plan_id and p.user_id = auth.uid())
    and exists (select 1 from public.meal_templates t where t.id = template_id and t.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.meal_plans p where p.id = plan_id and p.user_id = auth.uid())
    and exists (select 1 from public.meal_templates t where t.id = template_id and t.user_id = auth.uid())
  );

commit;
