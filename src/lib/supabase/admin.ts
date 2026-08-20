import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client for server-only routes that must read/write across
// every user's rows (e.g. the reminders cron). Bypasses RLS — never import
// this from client code or from a route that handles a single user's
// request without an explicit authorization check of its own.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
