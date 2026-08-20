export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type GoalType = "lose" | "maintain" | "gain";
export type Sex = "male" | "female";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";

export interface Profile {
  id: string;
  full_name: string | null;
  daily_goal: number;
  goal_type: GoalType;
  water_target: number;
  weight_goal_kg: number | null;
  onboarded: boolean;
  sex: Sex | null;
  age: number | null;
  height_cm: number | null;
  activity_level: ActivityLevel;
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
