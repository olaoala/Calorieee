"use client";

import { useCallback, useEffect, useState } from "react";
import { getCurrentUser } from "@/features/auth/services/authService";
import {
  getProfileSummary,
  getWaterCups,
  upsertWaterLog,
  type ProfileSummary,
} from "@/features/profile/services/profileService";

export function useDashboardProfile(date: string) {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [waterCups, setWaterCupsState] = useState(0);
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
      setEmail(user.email ?? "");
      const [profileData, cups] = await Promise.all([
        getProfileSummary(user.id),
        getWaterCups(user.id, date),
      ]);
      setProfile(profileData);
      setWaterCupsState(cups);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load profile.");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  const setWaterCups = useCallback(
    async (cups: number) => {
      if (!userId) return;
      const waterTarget = profile?.water_target ?? 8;
      const clamped = Math.max(0, Math.min(waterTarget + 4, cups));
      setWaterCupsState(clamped);
      try {
        await upsertWaterLog(userId, date, clamped);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not update water intake.");
        await load();
      }
    },
    [date, load, profile?.water_target, userId]
  );

  return { userId, email, profile, waterCups, loading, error, reload: load, setWaterCups };
}
