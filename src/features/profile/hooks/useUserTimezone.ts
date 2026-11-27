"use client";

import { useCallback, useEffect, useState } from "react";
import { getCurrentUser } from "@/features/auth/services/authService";
import { getProfileSummary } from "@/features/profile/services/profileService";

export function useUserTimezone() {
  const [timeZone, setTimeZone] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const user = await getCurrentUser();
      if (!user) {
        setTimeZone(null);
        return;
      }
      const profile = await getProfileSummary(user.id);
      setTimeZone(profile.timezone);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load your timezone.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { timeZone, loading, error, reload: load };
}
