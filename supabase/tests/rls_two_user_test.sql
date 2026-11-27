-- Two-user RLS test (Claude, Nov 27). Runs in ONE transaction and ends with
-- RAISE EXCEPTION on purpose, so every test row and both test users are rolled back.
do $$
declare
  ua uuid := gen_random_uuid(); ub uuid := gen_random_uuid();
  r text := ''; n int; ma uuid; sa uuid; ta uuid; pb uuid;
begin
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
  values (ua, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-test-a@example.invalid', '{}', '{}', now(), now()),
         (ub, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-test-b@example.invalid', '{}', '{}', now(), now());

  -- ===== act as User A: create data =====
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.meals (user_id, date, type, name, calories) values (ua, current_date, 'lunch', 'test', 100) returning id into ma;
  insert into public.meal_schedule (user_id, position, type, label) values (ua, 0, 'lunch', 'Lunch') returning id into sa;
  insert into public.meal_templates (user_id, name, type, calories) values (ua, 'tpl', 'lunch', 1) returning id into ta;
  insert into public.water_logs (user_id, date, cups) values (ua, current_date, 1);
  insert into public.weight_logs (user_id, date, weight_kg) values (ua, current_date, 70);
  insert into public.reminders (user_id, time, label, enabled) values (ua, '08:00', 'x', true);
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values (ua, 'https://example.invalid/' || ua, 'k', 'a');
  select count(*) into n from public.meals where user_id = ua; r := r || 'A sees own meals=' || n || '; ';
  select count(*) into n from public.profiles where id = ua; r := r || 'A sees own profile=' || n || '; ';

  -- ===== act as User B: try to reach A's data =====
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.meals where user_id = ua;              r := r || 'B reads A meals=' || n || '; ';
  select count(*) into n from public.profiles where id = ua;                r := r || 'B reads A profile=' || n || '; ';
  select count(*) into n from public.water_logs where user_id = ua;         r := r || 'B reads A water=' || n || '; ';
  select count(*) into n from public.weight_logs where user_id = ua;        r := r || 'B reads A weight=' || n || '; ';
  select count(*) into n from public.reminders where user_id = ua;          r := r || 'B reads A reminders=' || n || '; ';
  select count(*) into n from public.push_subscriptions where user_id = ua; r := r || 'B reads A push=' || n || '; ';
  select count(*) into n from public.meal_schedule where user_id = ua;      r := r || 'B reads A schedule=' || n || '; ';
  select count(*) into n from public.meal_templates where user_id = ua;     r := r || 'B reads A templates=' || n || '; ';
  update public.meals set calories = 999 where id = ma; get diagnostics n = row_count; r := r || 'B updates A meal=' || n || '; ';
  update public.profiles set daily_goal = 1 where id = ua; get diagnostics n = row_count; r := r || 'B updates A profile=' || n || '; ';
  delete from public.meals where id = ma; get diagnostics n = row_count;  r := r || 'B deletes A meal=' || n || '; ';
  update public.meals set user_id = ub where id = ma; get diagnostics n = row_count; r := r || 'B steals A meal=' || n || '; ';
  begin insert into public.meals (user_id, date, type, name, calories) values (ua, current_date, 'lunch', 'x', 1); r := r || 'B inserts as A=ALLOWED; ';
  exception when others then r := r || 'B inserts as A=blocked; '; end;
  begin insert into public.meals (user_id, date, type, name, calories, schedule_id) values (ub, current_date, 'lunch', 'x', 1, sa); r := r || 'B links A schedule=ALLOWED; ';
  exception when others then r := r || 'B links A schedule=blocked; '; end;
  insert into public.meal_plans (user_id, name) values (ub, 'p') returning id into pb;
  begin insert into public.meal_plan_items (plan_id, template_id) values (pb, ta); r := r || 'B links A template=ALLOWED; ';
  exception when others then r := r || 'B links A template=blocked; '; end;
  begin insert into public.meals (user_id, date, type, name, calories) values (ub, current_date, 'lunch', 'own', 1); r := r || 'B own meal=ok; ';
  exception when others then r := r || 'B own meal=FAILED ' || sqlerrm || '; '; end;

  -- ===== act as anonymous visitor =====
  reset role;
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;
  select count(*) into n from public.meals;    r := r || 'anon reads meals=' || n || '; ';
  select count(*) into n from public.profiles; r := r || 'anon reads profiles=' || n || '; ';
  begin insert into public.meals (user_id, date, type, name, calories) values (ua, current_date, 'lunch', 'x', 1); r := r || 'anon inserts=ALLOWED; ';
  exception when others then r := r || 'anon inserts=blocked; '; end;

  reset role;
  raise exception 'RLS_TEST_RESULT (rolled back) %', r;
end $$;
