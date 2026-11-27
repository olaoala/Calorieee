# Calorieee Initial Codebase Audit

**Audit scope:** Read-only inspection of the current workspace checkout. Findings describe source-code evidence, not a verified production deployment or live Supabase project. No environment-variable values or user records were inspected; no database migrations, external food API calls, builds, dependency operations, or application changes were performed.

## Executive summary

Calorieee is a Next.js/Supabase calorie logger with real user-scoped data paths for meals, profiles, water, weight, and reminders. It is not yet the broader personalized nutrition platform described in the product vision: macro/micronutrient tracking, reusable/personalized meal plans, and AI guidance are absent. The most significant verified correctness risk is that dates are generated in UTC while the interface displays local dates. Nutrition values, especially local dishes, also lack sufficient provenance and portion validation for dependable personalized nutrition guidance.

No finding is classified P0 on the inspected evidence.

## 1. Verified technology stack

| Area | Findings |
|---|---|
| Frontend | Next.js 14.2.15 App Router, React 18, TypeScript, Tailwind. Pages are in `src/app/`, UI in `src/components/`, and hooks/services in `src/features/`. |
| Backend | No separate backend service found. Next.js server actions and route handlers provide server-side behavior; most logged-data operations call Supabase from the browser. |
| Database/data access | Supabase Auth and Postgres via `@supabase/ssr` and `@supabase/supabase-js`; declared schema is `supabase/schema.sql`. No live database or policy inspection was done. |
| Authentication | Supabase email/password with server-side session helpers and middleware refresh/redirect behavior. Forgot/reset-password routes exist in the current workspace. |
| External integrations | USDA FoodData Central and Open Food Facts food search; Web Push reminders. Live provider calls and production configuration were not verified. |
| Deployment | `vercel.json` declares a five-minute reminder cron. This proves repository configuration only, not deployment or execution. |
| PWA | Manifest, service worker, and icons exist. The worker caches a limited offline shell; authenticated data operations remain network-dependent. |
| Tests/CI | Vitest with one test file (`tests/scalability.spec.ts`). `.github/workflows/ci.yml` exists in the workspace but `.github/` is untracked in this checkout; active/committed CI is unverified. |
| Architecture | App Router pages compose client components and feature hooks; feature services wrap Supabase operations; RLS is intended as the ownership boundary. The current monolith/managed database is appropriate to observed needs; no evidence justifies microservices. |

## 2. Feature inventory and status

“Implemented” means a code path exists, not that production service configuration or full end-to-end behavior was verified.

| Feature | Status | Evidence and limitations |
|---|---|---|
| Registration, login, logout | **Implemented; Supabase Auth.** Signup/login use server actions and sign-out is in navigation. Password reset routes/actions exist. Account deletion is an admin CLI operation, not an in-app lifecycle flow. Current uncommitted signup code reports existing accounts explicitly; see Security. |
| Profile/preferences | **Partial; live Supabase profile path.** Name, goal type, daily calorie target, water target, weight target, and timezone exist. Dietary preferences, allergies, restrictions, and dislikes are not collected. Standalone onboarding redirects to dashboard. |
| Food search | **Implemented; mixed local/external data.** The API route combines hardcoded local foods with USDA and Open Food Facts. External requests were not live-tested. Provider exceptions are hidden as empty results; route concatenation does not call the tested deduplication helper. No visible request timeout, rate limit, or query-size bound. |
| Food database | **Partial.** Local Nigerian/African entries are hardcoded; external search is wired. Local values are described as estimates and lack citations, version, confidence, and recipe composition. |
| Food logging/calorie tracking | **Implemented; real Supabase meals.** User can add/remove meals and see calorie totals. Manual values are unverified. Meals persist name/calories/date/type, not structured food source, unit, or quantity. History is read-only; no edit flow was found. |
| Macro/micronutrients | **Missing.** Stored and searched data is calorie-only; no protein, carbohydrate, fat, fiber, sodium, vitamins, or minerals. |
| Serving/portion calculations | **Partial.** Search results include text unit labels and quantity scaling, rounded to whole kcal. Parsing relies on provider-provided strings; structured units and portion/source records are not saved. |
| Meal planning | **Partial, but not reusable/personalized plans.** Plans screen logs meals against future dates and allows users to edit recurring schedule slots. No active application code uses `meal_templates`, `meal_plans`, or `meal_plan_items`; no named plan library, apply-plan action, or personalization was found. |
| Weight/progress | **Implemented basic flow; real Supabase data.** Weight is upserted per day and a recent sparkline is shown. Full weight history is downloaded before the UI limits it to ten records. Average/adherence use only days with logged calories, not all seven calendar days. |
| Water | **Implemented; real Supabase data.** Daily cups are upserted and UI changes are bounded against target; database only enforces nonnegative values, so direct writes can exceed that UI bound. |
| Reminders | **Implemented in source; deployment unverified.** Reminder rows, push subscriptions, service worker, cron route, and Vercel schedule are present. Actual VAPID/cron setup and delivery were not checked. Scope docs still describe tab-only notifications, inconsistent with current push code. |
| AI guidance | **Missing.** No model/provider integration, AI endpoint, prompts, or AI dependency found. |
| Dashboard/history/reports | **Partial; real data.** Dashboard and history query Supabase. Date generation uses UTC while labels use local time. Past reports use current goal rather than a historical goal snapshot. |

## 3. Architecture and data flow

1. Supabase Auth provides the user/session. Middleware refreshes and checks sessions for page routes. API routes are excluded from middleware and are expected to authorize themselves.
2. Authenticated pages call feature hooks. Hooks use browser Supabase services for meals, profile, weight, water, schedules, and reminders.
3. Supabase Postgres and RLS are the intended persistence and ownership boundary.
4. Food search calls a Next.js route, which searches local entries and external providers and normalizes results for the browser.
5. Push subscription routes authenticate the caller. The cron route uses a server-side service-role client to read across users.

This is a conventional monolithic web app with managed Postgres/Auth. No separate queue or service architecture is evidenced.

## 4. Database and data-integrity findings

**Strengths:** the declared schema enables RLS for profiles and user data, scopes owner policies to `auth.uid()`, uses cascading user foreign keys, indexes meals by user/date, and enforces one water/weight record per user/date.

| Priority | Finding |
|---|---|
| **P2** | `meal_plan_items` policy verifies that the parent plan belongs to the caller, but not that the referenced template belongs to the same user. If the table is writable through project grants, a user can create a cross-owner association when they know a template ID. These tables are not used by current app code, reducing current exposure, but the policy is incomplete. |
| **P2** | Schedule replacement deletes all existing slots then inserts replacements in a separate request. If insertion fails after deletion, the schedule can be lost. Deleting slots also sets linked meal `schedule_id` to null. |
| **P2** | Dates are generated as UTC day keys while UI labels and users operate in local time. For Nigeria (UTC+1), entries can fall under the previous date during the first hour after local midnight; mismatches are larger in other time zones. |
| **P2** | Historical goal comparisons are not stable: the current profile goal is used for past days, and no per-day goal snapshot exists. Updating a goal can alter apparent past adherence. |
| **P2** | Weight history is selected without a database limit; it is only sliced in the UI. Meal history ranges have no explicit pagination. |
| **P2/P3** | Validation is uneven. Meal calories are constrained to nonnegative integers but not capped; reminder time/label text has no database format constraints; water has no database upper bound. Some limits exist only in UI code. |
| **Lifecycle** | Deleting an Auth user cascades rows in the declared schema. No in-app account deletion, export, or retention flow found. The admin deletion script is destructive and requires email confirmation. |

Live schema, grants, and policy equivalence with the checked-in schema remain unverified.

## 5. Security and privacy

**Positive evidence**

- Declared RLS policies scope user records to `auth.uid()`.
- Browser initialization uses the public anon key; the service-role client is isolated in a server helper and used by the reminder cron.
- Push subscribe/unsubscribe routes call `auth.getUser()` and require a signed-in user.
- `.env.local` is ignored by Git and is not tracked. Its values were not inspected. This says nothing about deployed secret management.

**Findings**

| Priority | Finding |
|---|---|
| **P2** | The current uncommitted signup action distinguishes existing accounts and returns an explicit message, allowing email enumeration. Treat this as a finding in the current worktree, not confirmed committed release behavior. |
| **P2** | Public food search makes two upstream requests for every qualifying query without visible rate limiting, authentication, query-size bound, or timeout. This can consume provider quota or degrade availability. Failures become empty results, which can look like “no matches.” |
| **P2** | The meal-plan join policy does not verify template ownership (see data-integrity section). This is a cross-user integrity concern; it is not evidence of direct nutrition-data disclosure. |
| **Unverified** | Live Supabase grants/policies, Auth rate limits, production secret storage, key rotation, response security headers, and deployment configuration were not inspected. Middleware excludes API routes, so each API handler must continue to enforce its own authorization. |

## 6. Nutrition data and calculations

- Sources are USDA FoodData Central, Open Food Facts, and a local hardcoded dataset. Local data explicitly describes values as estimates, without citations or recipe-level composition.
- Search and persistence are calorie-only; no macro/micronutrient calculation or storage exists.
- Serving labels are parsed from provider text and scaled, then rounded to whole kcal. Accuracy depends on provider metadata and consistent serving semantics.
- Manual calorie entry is unverified. Saved meals do not retain a structured quantity, unit, source record ID, or provenance.
- Nigerian/regional recipes vary in ingredients, oil, preparation, and portion size; the current model cannot represent those differences.
- No provider calls were made during the audit. Actual search coverage, response fields, and live availability remain unverified.

Before presenting personalized nutrition claims, document reliable sources, methods, serving basis, uncertainty, and a review process. Do not infer missing nutrients.

## 7. AI readiness

**Not implemented.** No model/provider integration, personal-data context, model tools, or model-based nutrition calculation was found.

Recommended foundation for future work: retain deterministic, sourced nutrition arithmetic; use only minimum, user-consented, user-scoped context; validate structured output; restrict tools to authorized reads unless a user confirms a write; and include prompt-injection controls, privacy disclosure, rate/cost limits, and explicit failure behavior. Do not present generated guidance as medical diagnosis or substitute model guesses for sourced food data.

## 8. Reliability, testing, and scalability

- `npm run lint`: completed with no ESLint warnings or errors.
- `npm test`: passed, **1 test file / 4 tests**.
- No build, live API tests, database integration tests, or browser/device tests were run.
- Tests cover a helper totals calculation, static schema-string assertions, reminder scheduling, and a food-result merge helper. They do not exercise actual routes, Supabase RLS/auth, push delivery, schedule failure behavior, or user journeys.
- The food deduplication helper is tested but not wired into the current food-search route.

| Priority | Finding |
|---|---|
| **P2** | Search provider exceptions are silently converted to empty results; there is no visible request timeout/cache strategy, and failures can be misread as no matches. |
| **P2** | Cron marks a reminder sent after delivery attempts, even if all subscriptions fail, preventing a same-day retry. Overlapping cron invocations can both send before either updates `last_sent_date`. Scans have no explicit pagination. |
| **P2** | Add-food mutation rejection leaves the sheet’s `saving` state uncleared and does not show an error in that sheet. |
| **P2/P3** | Weight history and cron scans are unbounded. No monitoring, alerting, or backup/restore procedure was evidenced in the inspected repository; these may exist outside it. |

## 9. UX and accessibility

**Present:** mobile-oriented responsive navigation, loading skeletons on major pages, empty states, date presets, manual food entry, and inline errors on several pages.

**Issues:**

- **P2:** `maximumScale: 1` disables zoom, affecting users who rely on magnification.
- **P2:** Add-food sheet lacks dialog semantics, modal announcement, focus trapping, Escape handling, and focus restoration. Keyboard and screen-reader testing is needed.
- Some controls rely on placeholders rather than persistent labels; no automated accessibility tests were found.
- Failed mutations/provider requests can appear as empty states or leave controls stuck. Past meal entries cannot be edited.
- Dates are often formatted with `en-US`, and UTC date keys can disagree with local calendar labels.

## 10. Prioritised risks and recommendations

| Priority | Recommendation | Dependencies and rationale |
|---|---|---|
| **P1** | Define a user-local date policy and use it consistently across dashboard, history, progress, plans, and logging; add timezone-boundary tests. | Essential; first decide timezone source/persistence. It addresses a verified core-record correctness risk. |
| **P1** | Establish reliable provenance, recipe/portion basis, uncertainty, and review for nutrition entries, especially local foods. | Essential before personalized nutrition claims; depends on reliable local food composition research and validation. |
| **P2** | Enforce same-user ownership for both plan and template in `meal_plan_items`; test with two users. | Essential before enabling reusable meal plans; depends on test Supabase project/policy verification. |
| **P2** | Bound food-search queries, add abuse controls and request deadlines, expose provider-degraded states, and wire deduplication. | Essential for public release; rate-limit choice depends on deployment/request infrastructure. |
| **P2** | Make schedule replacement transactional; implement reminder claim/idempotency/retry behavior and bounded scans. | Essential before relying on schedules/push; requires reliable state transition design. |
| **P2** | Avoid email-enumerating signup responses in the current uncommitted signup change. | Essential privacy fix before committing/deploying that change; verify Auth provider behavior. |
| **P2** | Define progress metric denominators and historical-goal semantics. | Essential for trustworthy reports; decide whether historical goal snapshots are required. |
| **P3** | Restore browser zoom and add accessible modal/focus behavior; run keyboard/screen-reader checks. | Essential accessibility remediation before broad launch; automated checks are an optional supplement. |
| **P3** | Document monitoring, secret rotation, backup/restore, and cron ownership; measure before adding infrastructure. | Essential before scale; no evidence justifies microservices. |

## 11. Suggested implementation roadmap

1. **Phase 1 — Resolve critical security, correctness, and data-integrity issues.** Fix date semantics and test boundaries; fix plan/template ownership before enabling plan tables; harden public search; address signup enumeration in the uncommitted change; verify live RLS/configuration.
2. **Phase 2 — Stabilise and test existing functionality.** Make schedule saves atomic and push delivery idempotent/observable; improve mutation errors; add integration tests for auth, ownership, meals, schedules, and reminders. Confirm CI files are committed and include a build check.
3. **Phase 3 — Complete core nutrition tracking.** Define food provenance and portion conventions; retain structured food/source/quantity data; add macros only with reliable data; distinguish manual and sourced values; add edit flows and tests. Never fabricate missing nutrients.
4. **Phase 4 — Implement personalized meal planning and weight tracking.** Implement reusable templates/plans and apply-to-date behavior, or rename the current Plans page to accurately describe dated logging. Add dietary preferences with a deliberate privacy/data model; bound weight queries and clarify trend semantics.
5. **Phase 5 — Introduce/improve personalized AI guidance.** Defer until data quality, date handling, preferences, and authorization are ready. Start with consented, user-scoped, read-only context and validated output; keep nutrition calculations deterministic.
6. **Phase 6 — Prepare for growth.** Measure query/API load; add pagination/indexes where warranted; monitor provider and cron failures; document backup/restore and key rotation. Retain managed Postgres and the monolith until measurements justify more infrastructure.

## 12. Important unknowns

- Whether the declared schema/RLS matches the live Supabase project.
- Whether production Auth, provider keys, VAPID keys, cron secret, and Vercel schedule are configured and working.
- Whether external food providers return expected results for real queries and Nigerian foods.
- Whether `.github/workflows/ci.yml` and the untracked account-related files are intended changes and will be committed.
- Whether production backups, monitoring, account controls, and privacy/legal disclosures exist outside this repository.
- No production build, live provider test, or browser/device accessibility test was performed.

## Five most important findings and single best next action

1. Daily date keys use UTC rather than user-local dates, risking misdated records.
2. Local Nigerian food values are estimates without auditable provenance or recipe-level portions.
3. Reusable/personalized meal plans, macros/micronutrients, and AI guidance are not implemented.
4. Meal-plan-item RLS checks the plan owner but not the template owner.
5. Food search, schedule saves, and push reminders have reliability/abuse gaps; automated coverage is only four tests.

**Best next action:** define and test user-local date handling across all logging and reporting paths before adding features. It is a verified core correctness issue and can be addressed without waiting for nutrition research or AI design.
