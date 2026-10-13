import { createClient } from "@/lib/supabase/client";
import type { MealScheduleItem, MealType } from "@/lib/types";

export const DEFAULT_MEAL_SCHEDULE: Omit<MealScheduleItem, "id" | "user_id" | "position">[] = [
  { type: "breakfast", label: "Breakfast" },
  { type: "snack", label: "Snack" },
  { type: "lunch", label: "Lunch" },
  { type: "dinner", label: "Dinner" },
];

export async function getMealSchedule(userId: string): Promise<MealScheduleItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("meal_schedule")
    .select("*")
    .eq("user_id", userId)
    .order("position", { ascending: true });

  if (error) throw error;
  return (data ?? []) as MealScheduleItem[];
}

export async function replaceMealSchedule(
  userId: string,
  items: { type: MealType; label: string }[]
): Promise<MealScheduleItem[]> {
  const supabase = createClient();
  const { error: deleteError } = await supabase.from("meal_schedule").delete().eq("user_id", userId);
  if (deleteError) throw deleteError;

  if (items.length === 0) return [];
  const { data, error } = await supabase
    .from("meal_schedule")
    .insert(items.map((item, position) => ({ ...item, user_id: userId, position })))
    .select("*")
    .order("position", { ascending: true });

  if (error) throw error;
  return (data ?? []) as MealScheduleItem[];
}