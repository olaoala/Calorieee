"use client";

import { useCallback, useEffect, useState } from "react";
import { getCurrentUser } from "@/features/auth/services/authService";
import { getMealsForRange } from "@/features/meals/services/mealService";
import {
  getProfileSummary,
  getWeightSeries,
  upsertWeight,
} from "@/features/profile/services/profileService";
import { todayStr } from "@/lib/date";

export interface DayTotal {
  date: string;
  label: string;
  total: number;
}

function dateNDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export function useProgressData() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [goal, setGoal] = useState(2000);
  const [week, setWeek] = useState<DayTotal[]>([]);
  const [streak, setStreak] = useState(0);
  const [avgKcal, setAvgKcal] = useState(0);
  const [adherence, setAdherence] = useState(0);
  const [weightSeries, setWeightSeries] = useState<{ date: string; weight_kg: number }[]>([]);
  const [monthDelta, setMonthDelta] = useState<number | null>(null);

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
      const start30 = dateNDaysAgo(29);
      const [profile, mealRows, weightRows] = await Promise.all([
        getProfileSummary(user.id),
        getMealsForRange(user.id, start30, todayStr()),
        getWeightSeries(user.id),
      ]);

      const dailyGoal = profile.daily_goal;
      setGoal(dailyGoal);

      const totals: Record<string, number> = {};
      mealRows.forEach((meal) => {
        totals[meal.date] = (totals[meal.date] ?? 0) + meal.calories;
      });

      const last7: DayTotal[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = dateNDaysAgo(i);
        const label = new Date(date + "T00:00:00").toLocaleDateString("en-US", {
          weekday: "narrow",
        });
        last7.push({ date, label, total: totals[date] ?? 0 });
      }
      setWeek(last7);

      const loggedLast7 = last7.filter((day) => day.total > 0);
      setAvgKcal(
        loggedLast7.length
          ? Math.round(loggedLast7.reduce((sum, day) => sum + day.total, 0) / loggedLast7.length)
          : 0
      );
      setAdherence(
        loggedLast7.length
          ? Math.round(
              (loggedLast7.filter((day) => day.total <= dailyGoal).length / loggedLast7.length) *
                100
            )
          : 0
      );

      let currentStreak = 0;
      for (let i = 0; i < 30; i++) {
        const date = dateNDaysAgo(i);
        if (totals[date] > 0) currentStreak++;
        else break;
      }
      setStreak(currentStreak);

      const weights = weightRows;
      setWeightSeries(weights.slice(-10));
      if (weights.length > 0) {
        const latest = weights[weights.length - 1];
        const monthAgo = weights.find((weight) => weight.date >= start30) ?? weights[0];
        setMonthDelta(
          monthAgo.date === latest.date
            ? null
            : Math.round((latest.weight_kg - monthAgo.weight_kg) * 10) / 10
        );
      } else {
        setMonthDelta(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load progress.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const logWeight = useCallback(
    async (weightKg: number) => {
      if (!userId) return;
      await upsertWeight(userId, todayStr(), weightKg);
      await load();
    },
    [load, userId]
  );

  return {
    loading,
    error,
    goal,
    week,
    streak,
    avgKcal,
    adherence,
    weightSeries,
    monthDelta,
    reload: load,
    logWeight,
  };
}
