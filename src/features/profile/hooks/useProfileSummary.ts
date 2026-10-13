"use client";

import { useCallback, useEffect, useState } from "react";
import { getCurrentUser } from "@/features/auth/services/authService";
import {
  getLatestWeight,
  getProfileSummary,
  updateProfileGoals,
  type ProfileGoalUpdate,
  type ProfileSummary,
} from "@/features/profile/services/profileService";

export function useProfileSummary() {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);
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
      const [profileData, latestWeight] = await Promise.all([
        getProfileSummary(user.id),
        getLatestWeight(user.id),
      ]);
      setProfile(profileData);
      setCurrentWeight(latestWeight);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateGoals = useCallback(
    async (updates: ProfileGoalUpdate) => {
      if (!userId) return;
      await updateProfileGoals(userId, updates);
      await load();
    },
    [load, userId]
  );

  return { userId, email, profile, currentWeight, loading, error, reload: load, updateGoals };
}
