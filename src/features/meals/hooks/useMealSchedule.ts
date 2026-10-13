"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  DEFAULT_MEAL_SCHEDULE,
  getMealSchedule,
  replaceMealSchedule,
} from "@/features/meals/services/mealScheduleService";
import type { MealScheduleItem, MealType } from "@/lib/types";

export function useMealSchedule() {
  const [items, setItems] = useState<MealScheduleItem[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      setUserId(data.user.id);
      const saved = await getMealSchedule(data.user.id);
      setItems(saved.length > 0 ? saved : DEFAULT_MEAL_SCHEDULE.map((item, position) => ({
        ...item,
        id: `default-${position}`,
        user_id: data.user.id,
        position,
      })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load meal schedule.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(async (next: { type: MealType; label: string }[]) => {
    if (!userId) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await replaceMealSchedule(userId, next);
      setItems(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save meal schedule.");
    } finally {
      setSaving(false);
    }
  }, [userId]);

  return { items, loading, saving, error, save };
}