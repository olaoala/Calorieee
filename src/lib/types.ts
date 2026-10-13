export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type GoalType = "lose" | "maintain" | "gain";

export interface Profile {
  id: string;
  full_name: string | null;
  daily_goal: number;
  goal_type: GoalType;
  water_target: number;
  weight_goal_kg: number | null;
  onboarded: boolean;
  timezone: string;
}

export interface WaterLog {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  cups: number;
}

export interface WeightLog {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  weight_kg: number;
}

export interface Meal {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  type: MealType;
  schedule_id: string | null;
  name: string;
  calories: number;
}

export interface MealTemplate {
  id: string;
  user_id: string;
  name: string;
  type: MealType;
  calories: number;
}

export interface MealPlan {
  id: string;
  user_id: string;
  name: string;
}

export interface MealPlanItem {
  id: string;
  plan_id: string;
  template_id: string;
}

export interface MealScheduleItem {
  id: string;
  user_id: string;
  position: number;
  type: MealType;
  label: string;
}

export interface Reminder {
  id: string;
  user_id: string;
  time: string; // HH:MM
  label: string;
  enabled: boolean;
  last_sent_date: string | null; // YYYY-MM-DD
}

export interface PushSubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}
