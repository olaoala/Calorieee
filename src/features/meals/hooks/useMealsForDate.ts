"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getCurrentUser } from "@/features/auth/services/authService";
import {
  addMealForDate,
  getMealsForDate,
  removeMeal as removeMealById,
} from "@/features/meals/services/mealService";
import type { Meal, MealType } from "@/lib/types";

export function useMealsForDate(date: string) {
  const [userId, setUserId] = useState<string | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const user = await getCurrentUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);
      setMeals(await getMealsForDate(user.id, date));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load meals.");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  const total = useMemo(() => meals.reduce((sum, meal) => sum + meal.calories, 0), [meals]);

  const addMeal = useCallback(
    async (type: MealType, name: string, calories: number, scheduleId?: string) => {
      if (!userId) return;
      await addMealForDate(userId, date, type, name, calories, scheduleId);
      await load();
    },
    [date, load, userId]
  );

  const removeMeal = useCallback(
    async (id: string) => {
      await removeMealById(id);
      await load();
    },
    [load]
  );

  return { userId, meals, total, loading, error, reload: load, addMeal, removeMeal };
}
