# Supabase Access-Control Review

**Review scope:** Repository-declared controls, application access paths, and safe availability of live-project verification.

**Verdict:** Production security sign-off is **on hold**. Local remediation has been made for the repository findings, but deployed policies, grants, project identity, and two-user behavior remain unverified.

## Executive summary

The declared schema enables row-level security (RLS) for application data tables and defines owner-scoped policies. The application generally uses a session-bound Supabase client for user data. The reminders cron uses a service-role client and therefore bypasses RLS; that path is protected by a cron authorization check in the application.

The source review found three repository-level issues. All three have local fixes:

1. The auth callback did not support the `recovery` OTP type for hash-based password-reset links.
2. `meal_plan_items` checked ownership of the parent plan but not the referenced template.
3. `meals` could reference a schedule owned by another user.

These fixes are not evidence of deployed remediation. The repository has a declarative `supabase/schema.sql`, but no migration workflow was found. Do not depend on the updated database policies until an approved deployment path has been completed and verified.

## Findings and remediation status

Severity and confidence below describe the original repository findings—not confirmed deployed vulnerabilities.

| # | Severity | File / object | Evidence | Finding and impact | Local status |
|---|---|---|---|---|---|
| 1 | 🟠 MEDIUM | [`src/app/auth/callback/route.ts`](../src/app/auth/callback/route.ts); [`src/lib/authCallback.ts`](../src/lib/authCallback.ts) | The original callback mapped hash verification types to `signup` or `email`, omitting `recovery`. | If the deployed password-reset email uses a hash-based recovery link, verification could fail and prevent password reset. This is a conditional recovery failure, not an authentication bypass. Confidence: 8/10. | Fixed locally: explicitly supports `signup`, `email`, and `recovery`, rejecting unknown OTP types. The code-exchange flow is preserved. Live email/link behavior remains unverified. |
| 2 | ⚪ LOW | [`supabase/schema.sql`](../supabase/schema.sql), policy `meal_plan_items: owner read/write` | The original `USING` and `WITH CHECK` clauses checked the caller-owned parent plan but did not check the referenced template owner. | A user could attach a known foreign template ID to their own plan if the deployed policy matches the old declaration and grants permit the operation. This is a cross-tenant integrity issue; no read or modification of the foreign template was demonstrated. Confidence: 9/10. | Fixed locally: read and write checks require both the parent plan and template to belong to the caller. No application write path was added. |
| 3 | ⚪ LOW | [`supabase/schema.sql`](../supabase/schema.sql), policy `meals: owner read/write` | The original meal policy checked `user_id` only; the meal service can supply an optional `schedule_id`. | A user could attach their meal to a known schedule ID belonging to another user if the deployed policy matches the old declaration. Confidence: 8/10. | Fixed locally: inserts and updates require `schedule_id` to be NULL or caller-owned. Owner access to existing meal rows remains based on meal ownership, so legacy rows with invalid references are not hidden or made undeletable. |

## Repository access-control matrix

This matrix reflects the current checked-in/worktree declarations, including the local policy fixes. It does **not** assert that deployed Supabase configuration matches them.

For a `FOR ALL` policy, `USING` governs row visibility and eligibility for operations such as SELECT, UPDATE, and DELETE; `WITH CHECK` constrains inserted and updated row values. These policies do not themselves grant SQL privileges. Effective access also depends on deployed table grants, other applicable policies, role memberships, and Supabase configuration.

Application client descriptions:

- **User-session client:** the application uses the anon key with the signed-in user’s session; requests are subject to RLS as the authenticated user. Client-supplied user IDs or filters are not an authorization boundary.
- **Service role:** server-side reminders processing uses a service-role client, which bypasses RLS. Protecting that credential and authorizing that route are critical.
- **No app access found:** no application code path accessing the declared table was found in the reviewed source.

| Table | Sensitive data | RLS and intended row permissions | Ownership checks | Application access |
|---|---|---|---|---|
| `profiles` | Name, goals, timezone, weight goal | Enabled. SELECT/DELETE use owner row check; INSERT/UPDATE require owner ID. | `auth.uid() = id` for all operations. | Profile service reads summary and updates goals; dashboard/profile/progress and timezone hooks consume it. Signup trigger inserts a profile. Reminders cron reads IDs/timezones with service role. |
| `meals` | Food entries, calories, meal metadata | Enabled. Owner can read/delete their rows; insert/update must retain caller ownership and have a valid schedule relationship. | `auth.uid() = user_id`; for INSERT/UPDATE, `schedule_id` must be NULL or reference a `meal_schedule` row with `user_id = auth.uid()`. | Meal service reads by date/range, inserts, and deletes; meal/date/range hooks and dashboard/history/plans/progress surfaces consume it. User-session client. |
| `water_logs` | Water intake history | Enabled. Owner-scoped SELECT/INSERT/UPDATE/DELETE. | `auth.uid() = user_id`. | Profile service reads and upserts; dashboard/profile hooks consume it. User-session client. |
| `weight_logs` | Weight history | Enabled. Owner-scoped SELECT/INSERT/UPDATE/DELETE. | `auth.uid() = user_id`. | Profile service reads latest/series and upserts; progress UI consumes it. User-session client. |
| `reminders` | Reminder labels, timing, send state | Enabled. Owner-scoped SELECT/INSERT/UPDATE/DELETE. | `auth.uid() = user_id`. | Reminder service performs user operations with a session. Reminders cron reads enabled reminders and updates send state with service role. |
| `meal_schedule` | User-defined meal slots | Enabled. Owner-scoped SELECT/INSERT/UPDATE/DELETE. | `auth.uid() = user_id`. | Meal-schedule service reads, inserts, and deletes for planner UI. User-session client. |
| `push_subscriptions` | Push endpoint and subscription keys | Enabled in schema. Owner-scoped SELECT/INSERT/UPDATE/DELETE. | `auth.uid() = user_id`. | Subscribe/unsubscribe API routes authenticate the caller and use a session client. Reminders cron reads subscriptions and deletes stale ones with service role. |
| `meal_templates` | Saved foods/recipes | Enabled. Owner-scoped SELECT/INSERT/UPDATE/DELETE. | `auth.uid() = user_id`. | No application access found. |
| `meal_plans` | Meal-plan names and metadata | Enabled. Owner-scoped SELECT/INSERT/UPDATE/DELETE. | `auth.uid() = user_id`. | No application access found. |
| `meal_plan_items` | Plan-to-template links | Enabled. SELECT/DELETE require caller-owned plan and template; INSERT/UPDATE checks require both references to be caller-owned. | `EXISTS` parent plan with `p.id = plan_id AND p.user_id = auth.uid()` and `EXISTS` template with `t.id = template_id AND t.user_id = auth.uid()`. | No application access found. The policy fix does not enable or broaden application write paths. |
| `auth.users` | Authentication identities and credentials metadata | Supabase-managed; repository does not declare its RLS or grants. | Managed by Supabase Auth; application access is through Auth APIs. | Signup/authentication flows. The `handle_new_user()` trigger creates a profile after signup. |

Application paths reviewed include:

- [`src/features/profile/services/profileService.ts`](../src/features/profile/services/profileService.ts)
- [`src/features/meals/services/mealService.ts`](../src/features/meals/services/mealService.ts)
- [`src/features/reminders/services/reminderService.ts`](../src/features/reminders/services/reminderService.ts)
- [`src/app/api/push/subscribe/route.ts`](../src/app/api/push/subscribe/route.ts)
- [`src/app/api/push/unsubscribe/route.ts`](../src/app/api/push/unsubscribe/route.ts)
- [`src/app/api/push/send-reminders/route.ts`](../src/app/api/push/send-reminders/route.ts)
- [`src/lib/supabase/client.ts`](../src/lib/supabase/client.ts)
- [`src/lib/supabase/admin.ts`](../src/lib/supabase/admin.ts)

## Functions, views, triggers, storage, and grants

- The schema declares `public.handle_new_user()` as a `SECURITY DEFINER` trigger function with `search_path = public, pg_temp`. This is intended to create a profile when an auth user is created. The live function definition, owner, execute privileges, and trigger attachment were not verified.
- No views, storage objects/policies, or explicit `GRANT`/`REVOKE` statements were found in the repository schema.
- Deployed additional policies, grants, inherited role privileges, functions, views, triggers, and storage configuration remain unknown.
- The cron's service-role client bypasses RLS. Its secret must remain server-side, and its route must reject unauthorized requests before any privileged work.

## Live Supabase verification status

**Not verified.** A project URL/ref was present in local configuration, but this does not establish that it is the intended project or distinguish production from an isolated test project. The Supabase CLI was not available, and no authorized Dashboard/catalog session was available. No database connection was made, no production rows were accessed, and no secrets were disclosed.

As a result, there is no deployed-versus-declared comparison for:

- Project identity and environment.
- RLS enablement and policies.
- Effective table, function, and sequence privileges or role memberships.
- Security-definer function definitions, owners, settings, and trigger wiring.
- Views, storage policies, or other deployed database objects.

### Safe Dashboard verification procedure

1. In the Supabase Dashboard, confirm the project reference against the intended project and determine whether it is production or isolated non-production.
2. Use SQL Editor only for catalog `SELECT` queries during inspection. Do not execute the schema file, DDL, DML, or policy changes as part of verification.
3. Compare all returned deployed policies and grants, including unexpected extras, with the repository declarations. Review effective privileges and role memberships in addition to direct grants.
4. Do not paste or publish outputs containing secrets or sensitive user data.

Read-only catalog queries:

```sql
-- Relations and RLS status
select n.nspname as schema_name,
       c.relname as object_name,
       c.relkind as object_kind,
       c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as force_rls,
       pg_get_userbyid(c.relowner) as owner
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname in ('public', 'storage')
  and c.relkind in ('r', 'p', 'v', 'm', 'f')
order by n.nspname, c.relname;

-- RLS policies, including storage policies if present
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname in ('public', 'storage')
order by schemaname, tablename, policyname;

-- Direct table grants to application roles; also inspect role memberships
select table_schema, table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema in ('public', 'storage')
  and grantee in ('anon', 'authenticated', 'service_role')
order by table_schema, table_name, grantee, privilege_type;

-- Security-definer function definitions and settings
select n.nspname as schema_name,
       p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as arguments,
       p.prosecdef as security_definer,
       p.proconfig as function_settings,
       pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('public', 'auth', 'storage')
  and p.prosecdef
order by n.nspname, p.proname;

-- Non-internal triggers
select n.nspname as table_schema,
       c.relname as table_name,
       t.tgname,
       pg_get_triggerdef(t.oid) as trigger_definition
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where not t.tgisinternal
  and n.nspname in ('public', 'auth', 'storage')
order by n.nspname, c.relname, t.tgname;

-- View definitions
select schemaname, viewname, definition
from pg_views
where schemaname in ('public', 'storage')
order by schemaname, viewname;
```

## Two-user authorization tests

**Designed, not executed.** No isolated non-production project was confirmed. Unit tests against repository code do not demonstrate live RLS behavior.

Use two disposable accounts, User A and User B, in a confirmed isolated project. Use their normal authenticated sessions, never the service-role key:

1. For profiles, meals, water logs, weight logs, reminders, schedules, and push subscriptions, create disposable records for both users. Verify each user can access their own data and cannot read, falsely attribute an insert to, update, or delete the other user's rows.
2. Attempt updates that change an owned row's `user_id`/`id`; attempt changing object IDs and supplying another user's UUID. Verify these cannot transfer ownership or expose the other row.
3. For meals, verify NULL and own schedule IDs are accepted, but another user's schedule ID is rejected for insert/update. Confirm an invalid legacy reference does not prevent the meal owner from reading or deleting their meal.
4. For plan items, verify own plan + own template works; foreign plan and foreign template references fail on insert/update; another user cannot read or delete the item. Specifically test a caller-owned plan with the other user's template ID.
5. Verify unauthenticated requests are rejected wherever authentication is required and ordinary client roles cannot exercise service-role privileges.
6. Exercise password reset through the actual deployed email flow. Verify callback session establishment and password replacement for each configured link format; the local OTP mapping test does not verify deployed email templates or Supabase Auth configuration.
7. Clean up only disposable accounts and records. Never run destructive checks against production or real user data.

## Validation and release impact

Local validation after remediation:

- `npm test -- --reporter=dot`: **6 test files passed; 49 tests passed**.
- `npx tsc --noEmit`: passed.
- `git diff --check`: passed; Git emitted line-ending conversion warnings.

These tests verify local behavior and declared policy text only. No live database, two-user, deployed auth-flow, or grants tests were run.

### Remediation and release actions

1. **Before production security sign-off:** Verify intended project identity and inspect deployed policies, grants, role memberships, functions, triggers, views, and storage configuration using authorized read-only catalog access.
2. **Before relying on schedule or meal-plan isolation:** Prepare and review an approved deployment path for the current `supabase/schema.sql` policy changes. No migration workflow was found in the repository; do not treat local schema edits as deployed remediation.
3. **Before relying on password recovery:** Test the actual deployed reset email format and callback flow with a disposable account.
4. **Before enabling reusable meal plans:** Keep plan tables unused until both plan and template ownership rules are deployed and verified with two users. Do not expand plan-item write paths as part of this review.
5. **Then:** Execute the isolated two-user authorization checks and record results, including denied requests and cleanup.

**Release verdict: HOLD production security sign-off.** Repository issues have local fixes, but deployed state, live authorization behavior, project identity, and application of database changes remain unverified.
