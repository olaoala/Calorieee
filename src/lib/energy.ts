import type { ActivityLevel, Sex } from "@/lib/types";

// Standard activity multipliers applied to BMR to estimate Total Daily
// Energy Expenditure (TDEE) — the conventional approach used by most
// calorie-tracking apps in the absence of a wearable/fitness tracker.
export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: "Sedentary (little/no exercise)",
  light: "Light (exercise 1-3 days/week)",
  moderate: "Moderate (exercise 3-5 days/week)",
  active: "Active (exercise 6-7 days/week)",
  very_active: "Very active (hard exercise + physical job)",
};

export const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string }[] = (
  Object.keys(ACTIVITY_LABELS) as ActivityLevel[]
).map((value) => ({ value, label: ACTIVITY_LABELS[value] }));

// Mifflin-St Jeor equation — the most widely validated BMR formula for
// everyday use (more accurate than the older Harris-Benedict equation).
export function calcBMR(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === "male" ? base + 5 : base - 161;
}

export function calcTDEE(bmr: number, activityLevel: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel]);
}

export interface BodyStatsInput {
  sex: Sex | null;
  age: number | null;
  heightCm: number | null;
  activityLevel: ActivityLevel;
  weightKg: number | null;
}

// Returns the estimated TDEE, or null if any required input is missing.
export function estimateTDEE(input: BodyStatsInput): number | null {
  const { sex, age, heightCm, activityLevel, weightKg } = input;
  if (!sex || !age || !heightCm || !weightKg) return null;
  return calcTDEE(calcBMR(sex, weightKg, heightCm, age), activityLevel);
}
