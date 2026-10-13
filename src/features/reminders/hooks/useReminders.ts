"use client";

import { useCallback, useEffect, useState } from "react";
import { getCurrentUser } from "@/features/auth/services/authService";
import {
  addReminder as addReminderRow,
  deleteReminder,
  getReminders,
  setReminderEnabled,
} from "@/features/reminders/services/reminderService";
import { updateTimezoneIfChanged } from "@/features/profile/services/profileService";
import type { Reminder } from "@/lib/types";

export function useReminders() {
  const [userId, setUserId] = useState<string | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
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
      setReminders(await getReminders(user.id));

      try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (timezone) await updateTimezoneIfChanged(user.id, timezone);
      } catch {
        // Timezone freshness is best-effort; reminders fall back server-side.
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load reminders.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addReminder = useCallback(
    async (time: string, label: string) => {
      if (!userId) return;
      await addReminderRow(userId, time, label);
      await load();
    },
    [load, userId]
  );

  const toggleReminder = useCallback(
    async (reminder: Reminder) => {
      await setReminderEnabled(reminder.id, !reminder.enabled);
      await load();
    },
    [load]
  );

  const removeReminder = useCallback(
    async (id: string) => {
      await deleteReminder(id);
      await load();
    },
    [load]
  );

  return { userId, reminders, loading, error, reload: load, addReminder, toggleReminder, removeReminder };
}
