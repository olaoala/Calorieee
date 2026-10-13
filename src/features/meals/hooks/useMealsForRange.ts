"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getCurrentUser } from "@/features/auth/services/authService";
import { getMealsForRange } from "@/features/meals/services/mealService";
import type { Meal } from "@/lib/types";

export interface DayGroup {
  date: string;
  meals: Meal[];
  total: number;
}

export function useMealsForRange(startDate: string, endDate: string) {
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
      setMeals(await getMealsForRange(user.id, startDate, endDate));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load meal history.");
    } finally {
      setLoading(false);
    }
  }, [endDate, startDate]);

  useEffect(() => {
    load();
  }, [load]);

  const days = useMemo<DayGroup[]>(() => {
    const byDate = new Map<string, Meal[]>();
    for (const meal of meals) {
      const list = byDate.get(meal.date) ?? [];
      list.push(meal);
      byDate.set(meal.date, list);
    }

    return [...byDate.entries()]
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .map(([date, dayMeals]) => ({
        date,
        meals: dayMeals,
        total: dayMeals.reduce((sum, meal) => sum + meal.calories, 0),
      }));
  }, [meals]);

  const totalConsumed = useMemo(
    () => meals.reduce((sum, meal) => sum + meal.calories, 0),
    [meals]
  );

  return { meals, days, totalConsumed, loading, error, reload: load };
}
