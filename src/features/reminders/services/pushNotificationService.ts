import {
  getExistingSubscription,
  pushSupported,
  subscribeToPush,
  subscriptionToPayload,
  unsubscribeFromPush,
} from "@/lib/push";

export type PushState = "unsupported" | "checking" | "denied" | "off" | "on";

export async function getPushState(): Promise<PushState> {
  if (!pushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  try {
    const subscription = await getExistingSubscription();
    return subscription ? "on" : "off";
  } catch {
    return "off";
  }
}

export async function enablePushNotifications(): Promise<void> {
  const subscription = await subscribeToPush();
  const response = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscriptionToPayload(subscription)),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Could not save push subscription (${response.status}).`);
  }
}

export async function disablePushNotifications(): Promise<void> {
  await unsubscribeFromPush();
}
