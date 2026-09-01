"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Reminder } from "@/lib/types";
import {
  pushSupported,
  getExistingSubscription,
  subscribeToPush,
  unsubscribeFromPush,
  subscriptionToPayload,
} from "@/lib/push";

type PushState = "unsupported" | "checking" | "denied" | "off" | "on";

export default function RemindersPage() {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState("");
  const [label, setLabel] = useState("");
  const [pushState, setPushState] = useState<PushState>("checking");
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data } = await supabase
      .from("reminders")
      .select("*")
      .eq("user_id", user.id)
      .order("time");
    setReminders((data as Reminder[]) ?? []);
    setLoading(false);

    // Keep the stored timezone current so the reminders cron (which has no
    // browser to read this from) fires at the right local time.
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("timezone")
          .eq("id", user.id)
          .single();
        if (profile && profile.timezone !== tz) {
          await supabase.from("profiles").update({ timezone: tz }).eq("id", user.id);
        }
      }
    } catch {
      // Best-effort — reminders still work off the default timezone.
    }
  }, [supabase]);

  const refreshPushState = useCallback(async () => {
    if (!pushSupported()) {
      setPushState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setPushState("denied");
      return;
    }
    const sub = await getExistingSubscription();
    setPushState(sub ? "on" : "off");
  }, []);

  useEffect(() => {
    load();
    refreshPushState();
  }, [load, refreshPushState]);

  async function enablePush() {
    setPushBusy(true);
    setPushError(null);
    try {
      const sub = await subscribeToPush();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscriptionToPayload(sub)),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Save failed");
      setPushState("on");
    } catch (err) {
      setPushError(err instanceof Error ? err.message : "Could not enable push notifications.");
      await refreshPushState();
    } finally {
      setPushBusy(false);
    }
  }

  async function disablePush() {
    setPushBusy(true);
    setPushError(null);
    try {
      await unsubscribeFromPush();
      setPushState("off");
    } catch (err) {
      setPushError(err instanceof Error ? err.message : "Could not disable push notifications.");
    } finally {
      setPushBusy(false);
    }
  }

  async function addReminder(e: React.FormEvent) {
    e.preventDefault();
    if (!time || !label.trim() || !userId) return;
    await supabase.from("reminders").insert({
      user_id: userId,
      time,
      label: label.trim(),
      enabled: true,
    });
    setTime("");
    setLabel("");
    load();
  }

  async function toggleReminder(r: Reminder) {
    await supabase.from("reminders").update({ enabled: !r.enabled }).eq("id", r.id);
    load();
  }

  async function removeReminder(id: string) {
    await supabase.from("reminders").delete().eq("id", id);
    load();
  }

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-card">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
          Push notifications
        </h2>
        <p className="text-sm text-gray-500 mb-3">
          {pushState === "unsupported" &&
            "Push notifications are not supported in this browser."}
          {pushState === "checking" && "Checking notification status…"}
          {pushState === "denied" &&
            "Notifications are blocked for this site — allow them in your browser's site settings, then reload."}
          {pushState === "off" &&
            "Off. Enable to get reminders even when this tab isn't open."}
          {pushState === "on" && "On — this device will receive reminders in the background."}
        </p>
        {pushError && (
          <p className="text-xs text-danger bg-danger-light border border-red-200 rounded-md px-3 py-2 mb-3">
            {pushError}
          </p>
        )}
        {(pushState === "off" || pushState === "on") && (
          <button
            onClick={pushState === "on" ? disablePush : enablePush}
            disabled={pushBusy}
            className={`w-full sm:w-auto rounded-md px-3 py-2.5 text-sm font-medium disabled:opacity-60 ${
              pushState === "on" ? "bg-danger-light text-danger" : "bg-accent-light text-accent"
            }`}
          >
            {pushBusy
              ? "Working…"
              : pushState === "on"
                ? "Disable on this device"
                : "Enable push notifications"}
          </button>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-card">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
          Add a reminder
        </h2>
        <form onSubmit={addReminder} className="flex flex-wrap gap-2">
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
            className="border border-gray-200 rounded-md px-3 py-2.5 text-sm"
          />
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label (e.g. Log lunch)"
            required
            className="flex-1 min-w-[140px] border border-gray-200 rounded-md px-3 py-2.5 text-sm"
          />
          <button
            type="submit"
            className="flex-1 sm:flex-none bg-accent text-white rounded-md px-4 py-2.5 text-sm font-medium"
          >
            Add
          </button>
        </form>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-card">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
          Your reminders
        </h2>
        {loading ? (
          <div className="flex flex-col gap-2 animate-pulse">
            <div className="h-9 bg-gray-100 rounded-md" />
            <div className="h-9 bg-gray-100 rounded-md" />
          </div>
        ) : reminders.length === 0 ? (
          <p className="text-sm text-gray-400">No reminders set.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-gray-100">
            {reminders.map((r) => (
              <li key={r.id} className="flex justify-between items-center py-2.5 text-sm">
                <span>
                  {r.time} — {r.label}
                </span>
                <span className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-gray-500">
                    <input
                      type="checkbox"
                      checked={r.enabled}
                      onChange={() => toggleReminder(r)}
                    />
                    On
                  </label>
                  <button onClick={() => removeReminder(r.id)} className="text-danger text-xs">
                    Remove
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
