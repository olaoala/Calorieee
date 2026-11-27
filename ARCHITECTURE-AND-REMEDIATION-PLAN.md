# Calorieee Architecture and Remediation Plan

**Scope:** Repository-level architecture assessment and proposed engineering plan. No application code, database schemas, or configuration were changed to produce this plan. Findings describe the current checkout; deployed Supabase policies, grants, production settings, and runtime behavior were not independently verified.

## 1. Verified architecture overview

Calorieee is an existing Next.js 14 App Router application using React and TypeScript, with Supabase Auth and Postgres as its managed backend. Authenticated pages call feature hooks and services; many data operations use the browser Supabase client, with Row Level Security (RLS) intended to enforce ownership. Next.js routes handle food search and push-related server work. Nothing inspected justifies replacing this architecture or introducing microservices.

### Current capabilities and gaps

- **Meals, water, and weight:** Stored as user-owned records. Meals, weight logs, and water logs use PostgreSQL `date` fields. Meals currently retain name, calorie total, type, date, and optional schedule ID.
- **Dates:** Date keys are generated with UTC ISO strings while labels use local time. This creates a verified local-day boundary risk. Relevant paths include `src/lib/date.ts`, the dashboard, history, progress, and Plans pages.
- **Timezone:** Profiles already have an IANA timezone, defaulting to `Africa/Lagos`, and the reminders cron uses it. The browser updates it in the Reminders flow; other date-sensitive flows do not consistently use it.
- **Nutrition:** Food search combines hardcoded regional foods, USDA FoodData Central, and Open Food Facts. Search results and meal records are calorie-only. Serving units are text labels parsed for calorie scaling. Meals do not preserve a structured portion, source reference, or provenance.
- **Meal planning:** The Plans page supports future-dated meal logging and recurring meal-slot configuration. These are distinct from reusable named plans. `meal_templates`, `meal_plans`, and `meal_plan_items` exist in the declared schema but are not used by current application flows.
- **RLS:** The declared schema scopes main user-owned tables to `auth.uid()`. The `meal_plan_items` policy checks ownership of its parent plan but not the referenced template. The live database policy and grants were not inspected.
- **Reminders:** Background push code exists, but `docs/v1-scope.md` still describes tab-only notifications. README meal-planning descriptions also exceed the current reusable-plan implementation.
- **Architecture:** The current modular monolith and managed database remain proportionate to observed needs. There is no evidence supporting a rewrite or separate services.

### Security remediation verified in the current working tree

The changes described in `SECURITY-REVIEW.md` are present in this checkout: signup uses a generic confirmation response for duplicate/new accounts, the callback uses same-origin redirect validation, and push endpoints are validated at subscription and delivery. The meal-plan/template ownership gap remains. This does not establish that fixes are deployed.

### Working-tree changes to preserve

The checkout is dirty. Modified tracked files include README, package manifest, push routes, auth callback, login, signup, and Supabase middleware. Untracked work includes `.github/`, the audit and security review, recovery routes, redirect and push-endpoint helpers, a deletion script, and security tests. These appear to be ongoing user work and must not be reset or overwritten.

## 2. Architectural decisions to make

1. **Date authority:** Is the user’s calendar date determined by a persisted profile timezone, the current device timezone, or an explicit user setting? How should travel or timezone changes affect “today”?
2. **Historical goals:** Should reports compare past intake against today’s goal, or the goal in effect on each historical date? Current historical comparisons use the current profile goal.
3. **Nutrition trust and sourcing:** Which sources and methods qualify as verified, estimated, or user-entered? What attribution, licensing, and review process is required for regional food values?
4. **Portion convention:** Which canonical units and conversions will be supported, and what happens when a provider serving cannot be converted reliably?
5. **Recipe meaning:** Are recipes user-private, curated/shared, or both? How should regional and household variations be represented?
6. **Plan semantics:** Do plan entries track mutable templates or preserve snapshots? What happens when applying a plan to a date that already contains meals?
7. **AI scope:** What consent, access, retention, safety, and evaluation requirements must be met before personalized guidance is introduced?

## 3. Proposed date-handling design

Adopt **user-local calendar dates** for meals, water, weight, history, progress, and future meal logging.

- Treat each user’s current date as a date-only `YYYY-MM-DD` value in their chosen IANA timezone. The profile timezone is the natural existing source of truth; `Africa/Lagos` is already the default.
- Centralize “now to local date,” calendar-day arithmetic, date-key validation, and date-only display formatting in shared utilities.
- Do not use `toISOString().slice(0, 10)` to obtain a user's local day, and do not parse date-only values as UTC instants for display.
- Use the IANA timezone saved in the user's profile as the source of truth before computing dates. New profiles default to `Africa/Lagos`; do not detect or automatically replace it with the device timezone. Surface missing or invalid timezone data rather than silently substituting another timezone.
- Keep PostgreSQL `date` columns as date-only values. **No schema migration is required** for this correction.
- Do not automatically shift existing dates. Current rows do not reliably indicate whether an entry was intended for a selected future date or the local date at entry time.
- Use the same timezone policy for reminder wall-clock times.

**Purpose:** Prevent food, water, and weight records from being assigned to the wrong calendar day and align reports with the day the user experiences.

**Affected components:** `src/lib/date.ts`; dashboard, Plans, history, and progress pages/hooks; water and weight writes; timezone/profile initialization; reminder timezone behavior.

**Policy decision:** Approved — use the saved profile timezone. A user-facing timezone editor is outside this task's scope.

**Risks:** Inconsistent timezone sources can still split reads and writes across different dates. Automatic historical correction could damage data; avoid it without reliable evidence.

**Verification:** Use fixed instants around local midnight in Lagos and positive-/negative-offset zones. Include DST transitions. Test day arithmetic, inclusive range boundaries, date-only formatting, and that meal/water/weight writes match their views.

## 4. Proposed nutrition-data model

Represent food identity, nutrition evidence, user portion, recipe composition, and historical consumption separately.

- **Food identity:** Canonical food/product identity with name, aliases, preparation description, and relevant region or brand. Namespace source IDs by provider; matching names do not prove equivalence.
- **Nutrition observations:** Store source-specific, versioned values with provider/source reference, retrieval or review date, stated basis, and provenance status (for example verified source data, reviewed estimate, user-entered). Nutrients are independently nullable.
- **Serving and measurement:** Use structured numeric quantities and units. Keep the source’s serving basis separate from the user’s portion. Convert only where a supported conversion exists; never infer a conversion from arbitrary display text.
- **Portion calculations:** Scale values deterministically from the recorded basis and portion. Preserve basis, quantity, and provenance; display rounding must not replace source precision.
- **Recipes:** Store ingredients and explicit quantities, preparation/variation information, and recipe yield. Calculate only where source data supports it. Missing or uncertain ingredients make results incomplete or estimated; do not fill gaps with guesses. Represent material regional variations as distinct recipes or versions.
- **Historical logs:** Reference a food/source version where possible and snapshot the food name, portion, nutrient values, and provenance at log time. Catalog updates must not rewrite historical logs. Legacy calorie-only rows should retain their values and be marked legacy/unknown provenance if migrated.

**Purpose:** Make nutrition values auditable and portion calculations reproducible while protecting historical records.

**Affected components:** Food-search route and types, `foodUnits.ts`, food logging UI and services, and eventually an additive meals/catalog schema migration.

**Dependencies:** Nutrition and product owners must agree on sources, licensing/attribution, supported units, recipe policy, and regional-food review standards before expanding the catalog or making personalized nutrient claims.

**Risks:** A migration cannot reliably determine whether existing calorie-only records were manual or sourced. Do not retroactively assert provenance or invent missing nutrients. Avoid destructive table replacement; preserve existing rows and values.

**Verification:** Test unit conversions and scaling with known fixtures; confirm missing nutrients stay null/incomplete; confirm provenance is retained at log time; test recipe yields and ensure catalog updates do not modify prior snapshots. Review regional values against an approved evidence source before publication.

## 5. Proposed meal-planning design

Keep these concepts separate:

1. **Dated meal logs:** Entries in `meals` for a specific date. The current UI already supports future dates.
2. **Meal schedule:** The user’s recurring meal-slot labels and ordering; this is structure, not meal content.
3. **Reusable meal plans:** Named collections of meal entries independent of a date.

The smallest coherent plan feature supports creating a named plan, adding/reordering/editing/removing entries, and applying the plan to a selected future date. Applying creates independent dated entries; future plan edits do not rewrite applied logs. Snapshot plan-entry values when applying.

Do **not** enable writes to existing plan tables until ownership integrity is addressed. The `meal_plan_items` RLS policy must validate ownership of both the plan and referenced template for reads and writes, including updates. Add appropriate constraints to prevent invalid relationships. Verify actual grants and deployed policy behavior in a non-production Supabase project using two users. Use an authenticated, atomic apply operation; ordinary user actions should not use the service-role client.

**Purpose:** Provide actual reusable planning without conflating it with future-date logging or recurring schedules.

**Affected components:** Plans UI, meal-plan services/types, `meal_plans`, `meal_templates`, `meal_plan_items`, and meal insertion logic.

**Dependencies:** Ownership policy, RLS/grant verification, and explicit plan/template snapshot semantics.

**Risks:** Cross-user links, partial application, duplicate plans, and silent changes to saved plans if templates are mutable. Define whether repeated application appends, replaces, or rejects before implementation.

**Verification:** CRUD and apply tests; transaction rollback tests; two-user RLS tests for cross-owner read/insert/update/delete; verify applying copies the chosen values and does not alter the plan or existing logs.

## 6. Prioritised remediation backlog

| Priority | Task and purpose | Affected components / dependencies | Risks | Verification |
|---|---|---|---|---|
| **P1** | Establish one user-local date policy and correct date generation, comparison, and display. | Shared utilities and all date-sensitive flows; timezone decision first. | Mixed timezone sources and midnight regressions. | Fixed-clock timezone-boundary and end-to-end date consistency tests. |
| **P1** | Verify deployed RLS policies and grants before relying on repository ownership claims. | Supabase project; requires project-owner verification outside this repository. | Treating checked-in SQL as evidence of deployed configuration. | Read-only comparison and two-user tests in non-production. |
| **P1** | Define nutrition provenance, serving basis, recipe rules, and regional-food evidence standards. | Nutrition data model and food UI; source/unit/licensing decisions first. | Estimates or missing values presented as verified. | Approved source/method review and deterministic model tests. |
| **P2** | Fix plan/template ownership before enabling reusable meal plans. | Join-table policy/constraints and plan services; security verification first. | Cross-user linkage or unsafe direct client writes. | Two-user tests covering relevant operations and effective grants. |
| **P2** | Implement reusable-plan CRUD and atomic apply-to-date. | Plans UI/services, plan tables, meal writes; depends on ownership and snapshot decisions. | Partial inserts, duplicate application, or confusion with recurring schedules. | CRUD, rollback, snapshot, and duplicate-policy tests. |
| **P2** | Harden public food search reliability and abuse controls. | Food-search route and search UI; rate-limit approach depends on deployment constraints. | Quota exhaustion and upstream failure presented as no matches. | Input-bound, timeout, and provider-degraded tests. |
| **P2** | Make schedule replacement and reminder delivery reliable. | Schedule service and push cron; independent of nutrition work. | Schedule loss on failed replacement; duplicate/lost pushes under overlapping runs. | Failure-injection and concurrent claim/idempotency tests. |
| **P2** | Decide historical-goal reporting and progress denominators. | Profile, history, and progress calculations. | Reports change meaning as goals change. | Documented metric contract and date/goal fixtures. |
| **P3** | Align documentation with shipped plan and push behavior. | `README.md`, `docs/v1-scope.md`; after scope decisions. | Documentation promises absent or outdated behavior. | Check described workflows against UI and routes. |
| **P3** | Improve accessibility and operational readiness. | Add-food dialog, browser zoom behavior, CI, backup/monitoring/operations docs. | Accessibility barriers and unverified operations. | Keyboard/screen-reader checks and build/CI/deployment-owner verification. |

### Work boundaries

- **Backend:** Own additive migrations, validation, authenticated service/RPC contracts, transactions, and explicit errors. Never rely on browser-supplied user IDs as the security boundary.
- **Frontend:** Own date selection/presentation, nutrition uncertainty labels, and plan CRUD/apply UX against agreed contracts. Do not redefine date or nutrition semantics independently.
- **Nutrition:** Own source suitability, attribution/licensing, regional-food evidence, unit conventions, uncertainty labels, and recipe methodology. Do not guess missing values.
- **Security:** Own deployed-policy/grant verification, two-user authorization tests, and review of plan ownership and service-role usage.
- **QA:** Own fixed-clock/timezone-boundary tests, migration/data-preservation checks, nutrition arithmetic fixtures, plan/apply failure tests, and cross-user integration scenarios.

## 7. Dependency graph

```text
Timezone/date policy decision
  -> Shared date utilities and deterministic tests
  -> Dashboard, history, progress, Plans, water/weight/meals use one date contract
  -> Timezone-boundary user-journey acceptance

Nutrition source + unit + recipe decisions
  -> Additive provenance/portion model
  -> Food search and logging integration
  -> Reliable nutrient reporting and any future personalized guidance

Live RLS/grant verification
  -> Correct meal-plan/template ownership policy
  -> Plan data/API contract and atomic apply
  -> Plan builder and apply UI
  -> Two-user and end-to-end acceptance

Search-abuse design
  -> Search bounds, deadlines, and degraded-state implementation
  -> Provider tests

Schedule/push reliability design
  -> Atomic schedule save and idempotent delivery
  -> Failure and concurrency tests

Historical-goal decision
  -> Progress/history semantics
  -> Metric tests
```

Date work, nutrition evidence gathering, search hardening, schedule/push reliability, and live-policy verification can proceed in parallel. Plan write paths must wait for ownership-policy decisions and tests. AI guidance must wait for reliable provenance, date semantics, explicit consent/privacy decisions, and user-scoped access controls.

## 8. Testing and acceptance criteria

- **Dates:** Reads and writes use the same user-local date across meals, water, weight, history, progress, and future planning. Midnight, DST, and date-only display tests pass in multiple timezones. Existing stored dates are not silently rewritten.
- **Nutrition:** Values retain source, basis, portion, status, and log-time snapshot. Unknown nutrients remain unknown; estimates and user-entered values are distinguishable. Recipe and serving calculations are deterministic.
- **Meal plans:** A user cannot access or create another user’s plan/template relation. Apply is atomic and creates independent dated entries without modifying prior logs. Duplicate-apply semantics are explicit and tested.
- **Security/deployment:** Verify deployed RLS/grants independently from schema source. Test push endpoint mitigation, signup behavior, and callback redirects against intended providers/configuration before release.
- **Search/reliability:** Bound input size; show provider failure distinctly from empty results; ensure failed schedule saves preserve prior schedules; prevent overlapping cron runs from duplicating or losing reminder delivery.
- **Quality gates:** Run focused unit and Supabase integration tests, TypeScript, lint, and production build for implementation changes. Prior review reports describe repository tests/lint/type-check passing, but no live Supabase or production behavior was verified here.

## 9. Unresolved questions

- Should timezone follow the device automatically, be an explicit profile preference, or be inferred once and then user-controlled?
- Should travel change “today” immediately, and should reminders use the same setting?
- Should historical reports use current goals or date-specific goal snapshots?
- What source, licensing, and review standard is acceptable for Nigerian and regional food data?
- Which serving units and conversions can Calorieee support safely?
- How should partially known nutrition and estimated recipe ingredients be displayed?
- Should editing a reusable meal entry change existing plans, or should plans own snapshots?
- Should applying a plan append, replace, or reject when the target date already contains meals?
- What data export, account deletion, retention, and privacy disclosures are required before commercial release?
- Who will verify live Supabase grants/policies and production Auth/push configuration?

## 10. Best implementation task to begin with

**Define the profile-timezone date policy, then implement and test shared date-only utilities before wiring them through all current date-sensitive flows.** It addresses a verified user-visible correctness issue, requires no schema migration, and provides a stable date contract for history and future planning.
