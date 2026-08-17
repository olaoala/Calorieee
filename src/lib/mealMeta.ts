import { Coffee, Sun, Moon, Cookie, type LucideIcon } from "lucide-react";
import type { MealType } from "@/lib/types";

export interface MealTypeMeta {
  value: MealType;
  label: string;
  icon: LucideIcon;
  text: string;
  bg: string;
  bar: string;
}

export const MEAL_TYPES: MealTypeMeta[] = [
  {
    value: "breakfast",
    label: "Breakfast",
    icon: Coffee,
    text: "text-breakfast",
    bg: "bg-breakfast-light",
    bar: "bg-breakfast",
  },
  {
    value: "lunch",
    label: "Lunch",
    icon: Sun,
    text: "text-lunch",
    bg: "bg-lunch-light",
    bar: "bg-lunch",
  },
  {
    value: "dinner",
    label: "Dinner",
    icon: Moon,
    text: "text-dinner",
    bg: "bg-dinner-light",
    bar: "bg-dinner",
  },
  {
    value: "snack",
    label: "Snack",
    icon: Cookie,
    text: "text-snack",
    bg: "bg-snack-light",
    bar: "bg-snack",
  },
];

export function mealMeta(type: MealType): MealTypeMeta {
  return MEAL_TYPES.find((m) => m.value === type) ?? MEAL_TYPES[0];
}
