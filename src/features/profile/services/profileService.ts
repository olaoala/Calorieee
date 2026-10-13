import { createClient } from "@/lib/supabase/client";
import type { GoalType, Profile, WeightLog } from "@/lib/types";

export type ProfileSummary = Pick<
  Profile,
  "daily_goal" | "water_target" | "full_name" | "goal_type" | "weight_goal_kg"
>;

export interface ProfileGoalUpdate {
  daily_goal?: number;
  water_target?: number;
  weight_goal_kg?: number;
}

export async function getProfileSummary(userId: string): Promise<ProfileSummary> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("daily_goal, water_target, full_name, goal_type, weight_goal_kg")
    .eq("id", userId)
    .single();

  if (error) throw error;
  return {
    daily_goal: data.daily_goal,
    water_target: data.water_target ?? 8,
    full_name: data.full_name ?? null,
    goal_type: (data.goal_type ?? "maintain") as GoalType,
    weight_goal_kg: data.weight_goal_kg ?? null,
  };
}

export async function updateProfileGoals(
  userId: string,
  updates: ProfileGoalUpdate
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("profiles").update(updates).eq("id", userId);
  if (error) throw error;
}

export async function getLatestWeight(userId: string): Promise<number | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("weight_logs")
    .select("weight_kg")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.weight_kg ?? null;
}

export async function getWeightSeries(userId: string): Promise<Pick<WeightLog, "date" | "weight_kg">[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("weight_logs")
    .select("date, weight_kg")
    .eq("user_id", userId)
    .order("date", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Pick<WeightLog, "date" | "weight_kg">[];
}

export async function upsertWeight(userId: string, date: string, weightKg: number): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("weight_logs")
    .upsert({ user_id: userId, date, weight_kg: weightKg }, { onConflict: "user_id,date" });

  if (error) throw error;
}

export async function updateTimezoneIfChanged(userId: string, timezone: string): Promise<void> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", userId)
    .single();

  if (error) throw error;
  if (data.timezone === timezone) return;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ timezone })
    .eq("id", userId);

  if (updateError) throw updateError;
}

export async function upsertWaterLog(
  userId: string,
  date: string,
  cups: number
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("water_logs")
    .upsert({ user_id: userId, date, cups }, { onConflict: "user_id,date" });

  if (error) throw error;
}

export async function getWaterCups(userId: string, date: string): Promise<number> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("water_logs")
    .select("cups")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();

  if (error) throw error;
  return data?.cups ?? 0;
}
