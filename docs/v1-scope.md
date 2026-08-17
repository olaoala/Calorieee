# Calorie Tracker — V1 Scope

## Objectives

Give users a simple way to see whether they're over or under their daily calorie goal, with minimal friction to log a meal. Support real accounts so data isn't tied to one browser or device. Make the app installable so it feels native, without app store overhead. Keep the data model and codebase simple enough to extend cleanly into v2 (food database, macros, trends).

## Functionality

**Accounts and sessions.** Email/password sign-up and login via Supabase Auth. Sessions persist via cookies and refresh automatically; signed-out users are redirected to login, signed-in users are redirected away from the auth pages. Each user's data is isolated at the database level via row-level security — no user can read or write another user's rows.

**Daily calorie goal.** User sets a daily calorie target from Settings. New accounts default to 2000 calories. The goal can be changed at any time and immediately affects the dashboard.

**Meal logging.** From the dashboard, add a meal with name, calorie count, and type (breakfast, lunch, dinner, snack) for the current day. Today's meals list updates instantly, each removable individually. A progress bar shows consumed vs. goal, turning red when over.

**Food database search.** Typing a food name searches USDA FoodData Central (generic/whole foods — fruit, vegetables, meats, grains) and Open Food Facts (branded/packaged products) together, merging results into one list. Picking a result autofills name and calories, with a quantity field to scale servings; manual entry is still available for anything not found. Both APIs are free — Open Food Facts needs no key, USDA needs a free signup key.

**History.** Pick any past date to see that day's goal, total consumed, remaining, and full meal list. Read-only — for reviewing trends day to day, not editing past entries.

**Meal plans.** Save reusable meal templates (name, calories, type — filled in via food search or manually). Group templates into a named plan (e.g. "Weekday plan"). Applying a plan to today logs every meal in it in one action, instead of re-entering the same meals repeatedly.

**Reminders.** Set a time and label (e.g. "7:00 PM — Log dinner"), toggle reminders on/off, delete them. Browser notifications fire while the app is open in a tab; this does not yet cover background/closed-app push (see Known Limitations).

**Installable app.** Manifest, icons, and a service worker let the app be installed to a phone or desktop home screen and cache a basic offline shell.

**Data and sync.** All data lives in Postgres via Supabase rather than local device storage, so it's available on any device the user logs into.

## Known limitations (deferred, not v1 bugs)

Reminders only fire while a browser tab is open — real background push notifications need a service worker push subscription plus a server trigger. Food search is text-only, no barcode or camera scanning. No macro (protein/carb/fat) tracking or weekly trend charts yet.

## Planned for V2

Barcode/camera food scanning, macro tracking, weekly trend charts, and true background push reminders.
