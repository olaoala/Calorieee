# Calorieee Supabase Access-Control Review

**Review date:** 2026-10-19  
**Scope:** Repository schema, migration files, authentication/session helpers, database clients, data-access call sites, tests, and safe live-access availability check.  
**Restrictions observed:** No application, schema, grant, policy, or configuration changes were made during this review. No secrets or user records were read. No production connection or destructive operation was attempted.

## Executive summary

**Live access-control verification: NOT PERFORMED.** No approved Supabase read-only integration or Supabase CLI connection was available. A local `.env.local` exists, but its contents were not read or used. The intended project identity, deployed schema, policies, and grants could not be verified. No live two-user authorization tests were executed.

The repository declares RLS enabled for all nine application tables and has owner-scoped `FOR ALL` policies on the main user-owned tables. These are repository declarations only; they do not establish the deployed state or effective grants. The declared `meal_plan_items` policy checks the parent plan owner but does not verify ownership of the referenced template. This is a **P2 repository-only integrity risk** to resolve and test before enabling reusable meal-plan CRUD. The app does not currently access those tables.

**Release verdict:** No live database security sign-off is possible from the available evidence. Do not enable saved meal-plan CRUD until live RLS/grants are verified and the plan/template ownership gap is addressed. No P0/P1 finding is established by this repository-only review.

## Review status and worktree

- The worktree contains pre-existing uncommitted changes. They were preserved; no files were changed during the investigation.
- Signup response, callback redirect, and push endpoint protections are present in the current worktree, but their deployment state is not verified here.
- The repository’s declared schema is `supabase/schema.sql`. No migration directory was found in the repository review.
- An existing test checks for selected RLS SQL strings; it does not test database authorization with distinct users.

## Repository-only table access-control matrix

The following reflects `supabase/schema.sql`, not deployed Supabase configuration. For `FOR ALL` policies, `USING` constrains visible/targetable existing rows for reads, updates, and deletes; `WITH CHECK` constrains inserted rows and updated row values. Effective operations also depend on table grants.

| Table | Sensitive/user-owned data | Declared RLS and intended owner conditions | Repository access paths | Service-role use in app |
|---|---|---|---|---|
| `profiles` | Name, goals, timezone, profile attributes | Enabled; `auth.uid() = id` for existing-row operations and new/updated rows. | `src/features/profile/services/profileService.ts`; profile hooks/pages. | Reminder cron reads `id, timezone`; signup trigger creates initial profile. |
| `meals` | Food names, calorie totals, dates, meal type | Enabled; `auth.uid() = user_id` for existing and inserted/updated rows. | `src/features/meals/services/mealService.ts`; dashboard, history, progress, plans. | None found. |
| `water_logs` | Daily water intake | Enabled; `auth.uid() = user_id` for existing and inserted/updated rows. | `src/features/profile/services/profileService.ts`; dashboard profile hook/page. | None found. |
| `weight_logs` | Weight and dates | Enabled; `auth.uid() = user_id` for existing and inserted/updated rows. Unique `(user_id,date)` is declared. | `src/features/profile/services/profileService.ts`; profile/progress hooks/pages. | None found. |
| `reminders` | Reminder times/labels and send state | Enabled; `auth.uid() = user_id` for existing and inserted/updated rows. | `src/features/reminders/services/reminderService.ts`; reminder hook/page. | Reminder cron reads enabled rows and updates `last_sent_date`. |
| `meal_schedule` | User-defined schedule slots | Enabled; `auth.uid() = user_id` for existing and inserted/updated rows. | `src/features/meals/services/mealScheduleService.ts`, `useMealSchedule.ts`, Plans page. | None found. |
| `push_subscriptions` | Push endpoint and subscription keys | Enabled; `auth.uid() = user_id` for existing and inserted/updated rows. Endpoint is unique in declared schema. | `/api/push/subscribe` and `/api/push/unsubscribe`; push UI/service. | Reminder cron reads subscriptions and deletes stale ones. |
| `meal_templates` | Saved meal names/calories/types | Enabled; `auth.uid() = user_id` for existing and inserted/updated rows. | No current application `.from()` access found. | None found. |
| `meal_plans` | User-named plans | Enabled; `auth.uid() = user_id` for existing and inserted/updated rows. | No current application `.from()` access found. | None found. |
| `meal_plan_items` | Relationship between plan and template | Enabled; existing rows must point to a plan owned by `auth.uid()`. Inserts/updated rows must also point to an owned plan. **No template-owner condition is declared.** | No current application `.from()` access found. | None found. |

`meal_templates`, `meal_plans`, and `meal_plan_items` are created and protected in schema, but the current Plans page uses `meals` and `meal_schedule`; it does not use reusable saved-plan tables.

### Authorization interpretation

- Browser services sometimes include a caller-supplied `user_id` in filters or writes. This is not authorization by itself. Correct isolation depends on deployed RLS and effective grants.
- Push subscribe/unsubscribe API routes call `auth.getUser()` and use the authenticated user ID for caller-scoped operations.
- Middleware bypasses redirect/session handling for all `/api/` routes; each API route must authorize itself. The user-scoped push routes do so. The food-search route is public and does not query user data.
- The reminder route accesses records across users through a server-side service-role client after checking `CRON_SECRET`. Service-role credentials bypass RLS and must stay server-only.
- `scripts/delete-supabase-user.js` uses a service-role key for interactive Auth account lookup/deletion. It is an admin script, not routine table access.
- This review found no application code paths using service-role access for ordinary user-scoped table CRUD.

## Declared schema, functions, views, triggers, storage, and grants

- `supabase/schema.sql` enables RLS on the nine tables above and declares owner policies. It also declares a `handle_new_user()` trigger function that is `SECURITY DEFINER` and sets `search_path = public, pg_temp`, then inserts the new user’s profile from Auth metadata.
- No repository-defined views, storage policies, explicit `GRANT`/`REVOKE` statements, or separate migration directory were found in the repository inspection.
- The schema alone does not establish default privileges, effective grants, dashboard-created objects, deployed function definitions, or whether the live database has applied this file.
- The meal `schedule_id` foreign key references `meal_schedule` with `ON DELETE SET NULL`; no same-owner database constraint between a meal and schedule is declared. No cross-user schedule disclosure was established, but record-level owner consistency is not enforced by that FK.

## Findings

| ID | Severity | Confidence | Type | Finding and evidence | Release impact |
|---|---|---:|---|---|---|
| DB-1 | **P2** | 9/10 | Repository-only | `supabase/schema.sql` meal-plan-item policy checks `meal_plans.user_id = auth.uid()` but not `meal_templates.user_id = auth.uid()` (`schema.sql:180-187`). If grants permit writes and an attacker knows a foreign template UUID, the policy can permit linking their own plan to another user’s template. The template row remains subject to its own RLS. This is an integrity/relationship gap, not evidence that the foreign template contents become readable. | Resolve before enabling reusable plan CRUD; live exploitability is unknown until deployed grants/policies are inspected. |
| DB-2 | **P3** | 8/10 | Repository-only | `meals.schedule_id` can reference a schedule row owned by another user because the FK does not assert matching `user_id` and the meal policy checks only the meal’s `user_id`. No current evidence shows this exposes or modifies the other user’s schedule. | Optional integrity hardening; verify intended cross-table ownership rule before changing schema. |
| DB-3 | **Unverified** | N/A | Deployment unknown | Live RLS enablement/force status, policies, grants, functions, views, storage policies, and role defaults are unavailable. | No production authorization sign-off until owner inspection and isolated two-user tests are complete. |

The signup enumeration, callback redirect, and push endpoint controls are present in the current worktree following earlier work. This review does not re-test those application behaviors or establish that the changes have been deployed.

## Live/deployed versus declared comparison

| Control | Repository declaration | Deployed result |
|---|---|---|
| RLS enabled | `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` for all nine application tables in `supabase/schema.sql`. | **Unknown — not inspected.** |
| Owner policies | Per-table `FOR ALL` owner policies; join table policy checks plan owner only. | **Unknown — not inspected.** |
| Effective grants | No explicit `GRANT`/`REVOKE` in checked-in SQL. | **Unknown — not inspected.** |
| Functions/triggers | `handle_new_user()` security-definer trigger declared in checked-in SQL. | **Unknown — not inspected.** |
| Views/storage | No repository-defined views or storage policies found. | **Unknown — not inspected.** |
| Project identity | Not available from approved access tooling. Local environment file was not opened. | **Unknown — not confirmed.** |

## Two-user authorization tests

**Status: designed, not executed.** No isolated non-production Supabase project was available through approved tooling. Do not use a privileged SQL Editor role to infer authenticated-user RLS behavior.

Use separate authenticated sessions/JWTs for disposable User A and User B and disposable records only. For each owner table:

1. Confirm A can read, insert, update, and delete their own disposable rows as intended.
2. Confirm B cannot read A’s rows.
3. Confirm B cannot update or delete A’s rows by changing the record ID.
4. Confirm B cannot insert rows with `user_id = A` (or `profiles.id = A`).
5. Confirm B cannot change an existing row’s owner to A or transfer A’s row to B.
6. Repeat relevant cases without a session and expect rejection for user-protected operations.

Table-specific coverage:

- **Profiles:** A’s `id`; test select/update/insert/delete and attempts to change `id`.
- **Meals:** read/insert/update/delete, false `user_id`, changed meal ID, and ownership transfer.
- **Water/weight logs:** same checks; also confirm unique `(user_id,date)` behavior does not permit cross-owner overwrite.
- **Reminders:** CRUD checks; confirm B cannot change A’s reminder or `last_sent_date`.
- **Meal schedules:** CRUD checks; test `position` uniqueness and changing schedule ID.
- **Push subscriptions:** CRUD checks; verify B cannot read A’s endpoint/keys or delete/update A’s subscription by endpoint.
- **Meal templates/plans:** owner CRUD checks even though current UI does not use the tables.
- **Meal-plan items:** valid A-plan/A-template association succeeds; B cannot read/change/delete items under A’s plan; B cannot insert under A’s plan; and critically, B cannot associate a B-owned plan with A’s template or update a valid item to reference A’s template. The last case is expected to reveal the repository policy gap if the deployed policy/grants match the checked-in declaration.
- **Meal schedule reference:** verify whether a B-owned meal referencing A’s schedule should be rejected; checked-in FK/policy do not enforce same-owner consistency.
- **Service role:** confirm ordinary authenticated clients cannot perform cross-user operations; test the admin cron path only through its authorized secret-protected route, without exposing its secret.

Record each case as pass/fail, table, operation, principal, expected result, observed result, and project reference (not credentials). Never use real user records.

## Safe project-owner verification instructions

1. Use an authorized operator account and select a confirmed **isolated staging/non-production project**. Compare the displayed project reference to the approved deployment target. Do not paste project keys, database passwords, JWTs, or service-role secrets into chat or reports.
2. In the Supabase Dashboard SQL Editor, run the following read-only catalog queries against that confirmed staging project. These catalog queries inspect declarations/privileges but do **not** replace requests made with User A and B authentication:

```sql
select n.nspname as schema_name, c.relname as table_name,
       c.relrowsecurity, c.relforcerowsecurity
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname in ('public', 'storage')
  and c.relkind in ('r', 'p')
order by 1, 2;

select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname in ('public', 'storage')
order by 1, 2, 3;

select table_schema, table_name, grantee, privilege_type, is_grantable
from information_schema.role_table_grants
where table_schema in ('public', 'storage')
  and grantee in ('anon', 'authenticated', 'service_role', 'PUBLIC')
order by 1, 2, 3, 4;

select n.nspname, p.proname, p.prosecdef, p.proconfig,
       pg_get_functiondef(p.oid)
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('public', 'storage')
order by 1, 2;

select n.nspname, c.relname, t.tgname, pg_get_triggerdef(t.oid)
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where not t.tgisinternal
  and n.nspname in ('public', 'auth', 'storage')
order by 1, 2, 3;

select schemaname, viewname, definition
from pg_views
where schemaname in ('public', 'storage')
order by 1, 2;
```

3. Compare outputs with `supabase/schema.sql` and the matrix above. Review default privileges and any dashboard-managed objects separately where applicable.
4. Run the two-user plan only in that isolated staging project, through separate authenticated client sessions. Do not infer RLS from an SQL Editor session with elevated privileges.
5. Record outcomes without including identifiers that expose users or any credential material. Do not change policies/grants during this verification phase.

## Prioritized remediation and requirements before saved meal plans

1. **P1 — Complete verification before release sign-off.** Confirm the intended project identity and compare deployed RLS, policies, grants, functions, views, and triggers with repository expectations. This is a verification gate, not a claim that production is known vulnerable.
2. **P2 — Resolve `meal_plan_items` ownership before enabling saved plans.** Ensure both referenced rows (plan and template) belong to the authenticated owner for reads and writes, and enforce same-owner relationships robustly. Validate cross-user insert/update/read/delete cases with separate staging users. No schema or policy changes were made in this investigation.
3. **P3 — Decide and enforce meal/schedule ownership consistency.** Confirm whether a meal may reference only a schedule owned by the same user; if so, add an appropriate database-level invariant and test it through authenticated requests.
4. **P3 — Review service-role and account-admin operations operationally.** Verify deployment secret isolation, route exposure, cron authentication, least privilege, and auditability without disclosing secrets.

## Outstanding questions

- Does the intended Supabase project have RLS enabled on all nine tables, and are the policy expressions identical to the repository schema?
- What are the effective grants and default privileges for `anon`, `authenticated`, and `service_role`?
- Are there dashboard-created policies, views, functions, triggers, storage buckets, or grants not represented in the repository?
- Do the two-user tests pass in staging, especially foreign-template association and meal-to-foreign-schedule references?
- Are the current worktree changes included in the release being reviewed?

## Final verdict

**Not verified for production.** This is a repository-only access-control review; deployed database state and two-user behavior remain unknown. The main owner-scoped policy model is present in the declared schema, but the `meal_plan_items` cross-owner relationship gap must be addressed before saved-plan CRUD is enabled. The safest next step is an authorized, read-only comparison in a confirmed staging project followed by the disposable two-user tests above.
