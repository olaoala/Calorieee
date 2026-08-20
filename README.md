# Calorie Tracker

A Next.js + Supabase calorie tracking app: set a daily calorie goal, log meals via food search or manually, build reusable meal plans, and set reminders. Installable as a PWA.

## 1. Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. In your project, go to **SQL Editor**, paste the contents of `supabase/schema.sql`, and run it. This creates all tables, row-level security policies, and a trigger that auto-creates a profile row (with a default 2000 calorie goal) for every new user.
3. Go to **Settings -> API** and copy your **Project URL** and **anon public key**.

## 2. Configure environment variables

Copy `.env.local.example` to `.env.local` and fill in the two Supabase values from step 1:

```
cp .env.local.example .env.local
```

Also grab a free USDA FoodData Central API key (instant signup, no cost) at
[fdc.nal.usda.gov/api-key-signup](https://fdc.nal.usda.gov/api-key-signup) and set it as `FDC_API_KEY`.
This powers food search alongside Open Food Facts, which needs no key. Without a real key,
search falls back to USDA's shared `DEMO_KEY`, which is rate-limited to ~30 requests/hour/IP —
fine for a quick look, not for real use.

## 3. Install and run

```
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll be redirected to `/signup` to create an account (Supabase sends a confirmation email by default — check your inbox, or disable email confirmation in Supabase Auth settings for faster local testing).

Note: this project's `node_modules` may already contain a partial/interrupted install from initial scaffolding. If `npm run dev` complains about missing or broken packages, delete `node_modules` and reinstall:

```
rm -rf node_modules
npm install
```

## Project structure

- `src/app/(app)/` — the main authenticated app: dashboard, history, meal plans, reminders, settings (each a client component talking directly to Supabase).
- `src/app/login`, `src/app/signup` — auth pages using Supabase email/password auth (server actions).
- `src/app/api/food-search/route.ts` — server-side route that queries USDA FoodData Central and Open Food Facts, normalizes both into one shape, and merges the results. Keeps the FDC key off the client.
- `src/components/FoodSearch.tsx` — debounced search box + results dropdown, used in both meal logging and meal templates. Selecting a result autofills name/calories; a quantity field scales calories before adding.
- `src/lib/supabase/` — Supabase client helpers (browser, server, middleware session refresh, and an admin/service-role client for the reminders cron).
- `src/middleware.ts` — redirects signed-out users to `/login` and signed-in users away from the auth pages.
- `supabase/schema.sql` — full database schema, RLS policies, and the new-user trigger. Safe to re-run any time (every statement is idempotent) — do this whenever the file changes, since Supabase doesn't apply it for you.
- `public/manifest.json`, `public/sw.js`, `public/icons/` — PWA support (installable, offline shell caching, and push notification handling).
- `src/app/api/push/` — subscribe/unsubscribe endpoints plus `send-reminders`, a cron-triggered route that pushes due reminders to every subscribed device.

## Data model

- `profiles` — one row per user: `daily_goal`, `water_target`, `weight_goal_kg`, body stats (`sex`, `age`, `height_cm`, `activity_level`) used for the calorie-balance estimate, and `timezone` (auto-detected client-side, used by the reminders cron).
- `meals` — logged meals per day (`date`, `type`, `name`, `calories`).
- `meal_templates` — reusable meal building blocks.
- `meal_plans` / `meal_plan_items` — named plans made of templates; "Apply to today" inserts each template's meal into today's log.
- `water_logs` / `weight_logs` — one row per user per day.
- `reminders` — time + label + on/off, plus `last_sent_date` so the cron sends each one at most once per day.
- `push_subscriptions` — one row per subscribed browser/device (endpoint + keys), used to deliver background push notifications.

All tables have row-level security scoped to `auth.uid()`, so each user only ever sees their own data. `push_subscriptions` and `reminders` cron updates go through a service-role key from the server only (see below), which intentionally bypasses RLS to read across users.

## Setting up push reminders

Reminders now fire as real background push notifications (delivered even when no tab is open), not just while the app is open.

1. **Apply the schema.** Re-run `supabase/schema.sql` in the Supabase SQL editor — it adds `profiles.timezone`, `reminders.last_sent_date`, and the `push_subscriptions` table, and ends with `notify pgrst, 'reload schema';` to force Supabase's API layer to pick up new columns immediately. (This also fixes the *"Could not find the 'x' column of 'profiles' in the schema cache"* error if you've hit it — it means a column existed in this file but was never applied to your live database.)
2. **Add the service-role key.** In `.env.local`, set `SUPABASE_SERVICE_ROLE_KEY` from Supabase: Settings -> API -> Project API keys -> `service_role`. This is server-only and must never reach the client — only `src/lib/supabase/admin.ts` (used by the cron route) reads it.
3. **VAPID keys and cron secret** are already generated and present in `.env.local` for local dev. To rotate them or set up a fresh environment: `npx web-push generate-vapid-keys` for the key pair, and `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"` for `CRON_SECRET`.
4. **Schedule the cron.** `vercel.json` defines a `/api/push/send-reminders` cron every 5 minutes, guarded by `Authorization: Bearer $CRON_SECRET` (Vercel auto-attaches this header when an env var literally named `CRON_SECRET` is set on the project). Note: Vercel's **Hobby plan limits cron jobs to once a day** — sub-daily schedules need Pro, or an external pinger like [cron-job.org](https://cron-job.org) hitting the same URL every 5 minutes with that header set manually. The route tolerates a 10-minute polling gap, so anything from 1-10 minute intervals works.
5. On the **Reminders** page, users tap "Enable push notifications" once per device — this requests permission, subscribes via the service worker, and saves the subscription. Reminders they add after that fire in the background on every enabled device.

## Known limitations / v2 ideas

- **Food search has no barcode/camera scanning yet** — it's text search only, combining USDA FoodData Central (generic/whole foods) and Open Food Facts (branded/packaged products). Manual entry is always available as a fallback when a food isn't found. Barcode/camera scanning and macro tracking (protein/carbs/fat) are planned for v2.
- **I couldn't live-test the USDA/Open Food Facts calls from my build sandbox** (its network is restricted to an allowlist that doesn't include those domains) — the code follows each API's documented response shape, but verify search actually returns results once you run this locally with a real `FDC_API_KEY`.
- **Email confirmation** is on by default for new Supabase projects — fine for production, mildly annoying for local dev. Toggle it off under Authentication -> Providers -> Email if you want instant sign-in during development.
