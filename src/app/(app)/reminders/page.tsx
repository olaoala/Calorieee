"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { todayStr } from "@/lib/date";
import type { Reminder } from "@/lib/types";

export default function RemindersPage() {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [time, setTime] = useState("");
  const [label, setLabel] = useState("");
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    "default"
  );
  const lastFired = useRef<Record<string, string>>({});

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
  }, [supabase]);

  useEffect(() => {
    load();
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    } else {
      setPermission("unsupported");
    }
  }, [load]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const hhmm = now.toTimeString().slice(0, 5);
      const stamp = `${todayStr()} ${hhmm}`;
      reminders.forEach((r) => {
        if (r.enabled && r.time === hhmm && lastFired.current[r.id] !== stamp) {
          lastFired.current[r.id] = stamp;
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("Calorie Tracker", { body: r.label });
          }
        }
      });
    }, 30000);
    return () => clearInterval(interval);
  }, [reminders]);

  async function enableNotifications() {
    if (!("Notification" in window)) return;
    const perm = await Notification.requestPermission();
    setPermission(perm);
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
          Notifications
        </h2>
        <p className="text-sm text-gray-500 mb-3">
          {permission === "unsupported"
            ? "Notifications are not supported in this browser."
            : `Permission: ${permission}`}
        </p>
        <button
          onClick={enableNotifications}
          className="w-full sm:w-auto bg-accent-light text-accent rounded-md px-3 py-2.5 text-sm font-medium"
        >
          Enable browser notifications
        </button>
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
        {reminders.length === 0 ? (
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
