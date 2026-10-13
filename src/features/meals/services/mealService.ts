import { createClient } from "@/lib/supabase/client";
import type { Meal, MealType } from "@/lib/types";

export async function getMealsForDate(userId: string, date: string): Promise<Meal[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("meals")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data as Meal[];
}

export async function getMealsForRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<Meal[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("meals")
    .select("*")
    .eq("user_id", userId)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data as Meal[];
}

export async function addMealForDate(
  userId: string,
  date: string,
  type: MealType,
  name: string,
  calories: number,
  scheduleId?: string
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("meals").insert({
    user_id: userId,
    date,
    type,
    name,
    calories,
    ...(scheduleId ? { schedule_id: scheduleId } : {}),
  });

  if (error) throw error;
}

export async function removeMeal(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("meals").delete().eq("id", id);
  if (error) throw error;
}
