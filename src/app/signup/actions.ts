"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

export async function signup(formData: FormData) {
  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  const fullName = String(formData.get("full_name") || "").trim();
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));
  const goalType = String(formData.get("goal_type") || "maintain");
  const dailyGoalRaw = parseInt(String(formData.get("daily_goal") || ""), 10);
  const dailyGoal = !dailyGoalRaw || dailyGoalRaw < 800 ? 2000 : dailyGoalRaw;

  if (!fullName) {
    redirect(`/signup?error=${encodeURIComponent("Enter your name.")}`);
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      // Stashed on auth.users.raw_user_meta_data — the handle_new_user()
      // trigger reads these to seed the profile row at signup time, since
      // there's no session yet to write to `profiles` directly while email
      // confirmation is pending.
      data: {
        full_name: fullName,
        goal_type: goalType,
        daily_goal: dailyGoal,
      },
    },
  });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/signup?check_email=1");
}
