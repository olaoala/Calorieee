"use client";

import { useCallback, useEffect, useState } from "react";
import {
  disablePushNotifications,
  enablePushNotifications,
  getPushState,
  type PushState,
} from "@/features/reminders/services/pushNotificationService";

export function usePushNotifications() {
  const [pushState, setPushState] = useState<PushState>("checking");
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);

  const refreshPushState = useCallback(async () => {
    setPushState(await getPushState());
  }, []);

  useEffect(() => {
    refreshPushState();
  }, [refreshPushState]);

  const enablePush = useCallback(async () => {
    setPushBusy(true);
    setPushError(null);
    try {
      await enablePushNotifications();
      setPushState("on");
    } catch (err) {
      setPushError(err instanceof Error ? err.message : "Could not enable push notifications.");
      await refreshPushState();
    } finally {
      setPushBusy(false);
    }
  }, [refreshPushState]);

  const disablePush = useCallback(async () => {
    setPushBusy(true);
    setPushError(null);
    try {
      await disablePushNotifications();
      setPushState("off");
    } catch (err) {
      setPushError(err instanceof Error ? err.message : "Could not disable push notifications.");
    } finally {
      setPushBusy(false);
    }
  }, []);

  return { pushState, pushBusy, pushError, enablePush, disablePush, refreshPushState };
}
