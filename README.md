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
- `src/lib/supabase/` — Supabase client helpers (browser, server, and middleware session refresh).
- `src/middleware.ts` — redirects signed-out users to `/login` and signed-in users away from the auth pages.
- `supabase/schema.sql` — full database schema, RLS policies, and the new-user trigger.
- `public/manifest.json`, `public/sw.js`, `public/icons/` — PWA support (installable, basic offline shell caching).

## Data model

- `profiles` — one row per user, holds `daily_goal`.
- `meals` — logged meals per day (`date`, `type`, `name`, `calories`).
- `meal_templates` — reusable meal building blocks.
- `meal_plans` / `meal_plan_items` — named plans made of templates; "Apply to today" inserts each template's meal into today's log.
- `reminders` — time + label + on/off; browser notifications fire while the app tab is open (see "Reminders" caveat below).

All tables have row-level security scoped to `auth.uid()`, so each user only ever sees their own data.

## Known limitations / v2 ideas

- **Reminders only fire while the app is open in a tab.** True background push notifications need a service worker push subscription plus a server that can trigger pushes at scheduled times — worth adding once this is live.
- **Food search has no barcode/camera scanning yet** — it's text search only, combining USDA FoodData Central (generic/whole foods) and Open Food Facts (branded/packaged products). Manual entry is always available as a fallback when a food isn't found. Barcode scanning and macro tracking (protein/carbs/fat) and weekly trend charts are planned for v2.
- **I couldn't live-test the USDA/Open Food Facts calls from my build sandbox** (its network is restricted to an allowlist that doesn't include those domains) — the code follows each API's documented response shape, but verify search actually returns results once you run this locally with a real `FDC_API_KEY`.
- **Email confirmation** is on by default for new Supabase projects — fine for production, mildly annoying for local dev. Toggle it off under Authentication -> Providers -> Email if you want instant sign-in during development.
