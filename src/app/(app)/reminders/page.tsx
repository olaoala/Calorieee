"use client";

import { useState } from "react";
import { usePushNotifications } from "@/features/reminders/hooks/usePushNotifications";
import { useReminders } from "@/features/reminders/hooks/useReminders";

export default function RemindersPage() {
  const {
    userId,
    reminders,
    loading,
    error,
    addReminder: saveReminder,
    toggleReminder,
    removeReminder,
  } = useReminders();
  const { pushState, pushBusy, pushError, enablePush, disablePush } = usePushNotifications();
  const [time, setTime] = useState("");
  const [label, setLabel] = useState("");

  async function addReminder(e: React.FormEvent) {
    e.preventDefault();
    if (!time || !label.trim() || !userId) return;
    await saveReminder(time, label.trim());
    setTime("");
    setLabel("");
  }

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {error && (
        <p className="text-sm text-danger bg-danger-light border border-red-200 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-card">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
          Push notifications
        </h2>
        <p className="text-sm text-gray-500 mb-3">
          {pushState === "unsupported" &&
            "Push notifications are not supported in this browser."}
          {pushState === "checking" && "Checking notification status..."}
          {pushState === "denied" &&
            "Notifications are blocked for this site - allow them in your browser's site settings, then reload."}
          {pushState === "off" &&
            "Off. Enable to get reminders even when this tab isn't open."}
          {pushState === "on" && "On - this device will receive reminders in the background."}
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
              ? "Working..."
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
            {reminders.map((reminder) => (
              <li key={reminder.id} className="flex justify-between items-center py-2.5 text-sm">
                <span>
                  {reminder.time} - {reminder.label}
                </span>
                <span className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-gray-500">
                    <input
                      type="checkbox"
                      checked={reminder.enabled}
                      onChange={() => toggleReminder(reminder)}
                    />
                    On
                  </label>
                  <button
                    onClick={() => removeReminder(reminder.id)}
                    className="text-danger text-xs"
                  >
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
