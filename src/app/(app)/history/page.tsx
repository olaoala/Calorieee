"use client";

import { useState } from "react";
import { todayStr, daysAgoStr } from "@/lib/date";
import { MEAL_TYPES } from "@/lib/mealMeta";
import { CalendarDays, ChevronDown } from "lucide-react";
import { useMealsForRange } from "@/features/meals/hooks/useMealsForRange";
import { useProfileSummary } from "@/features/profile/hooks/useProfileSummary";

const RANGE_PRESETS = [
  { label: "7D", days: 6 },
  { label: "14D", days: 13 },
  { label: "30D", days: 29 },
];

function formatDayLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  const today = todayStr();
  const yesterday = daysAgoStr(1);
  if (dateStr === today) return "Today";
  if (dateStr === yesterday) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export default function HistoryPage() {
  const [startDate, setStartDate] = useState(daysAgoStr(6));
  const [endDate, setEndDate] = useState(todayStr());
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const { days, totalConsumed, loading: mealsLoading, error: mealsError } = useMealsForRange(
    startDate,
    endDate
  );
  const { profile, loading: profileLoading, error: profileError } = useProfileSummary();

  function selectPreset(days: number) {
    setStartDate(daysAgoStr(days));
    setEndDate(todayStr());
  }

  const goal = profile?.daily_goal ?? 2000;
  const loading = mealsLoading || profileLoading;
  const avgPerDay = days.length > 0 ? Math.round(totalConsumed / days.length) : 0;

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {(profileError || mealsError) && (
        <p className="text-sm text-danger bg-danger-light border border-red-200 rounded-md px-3 py-2">
          {profileError ?? mealsError}
        </p>
      )}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-card">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
          Date range
        </h2>
        <div className="flex gap-1.5 mb-3">
          {RANGE_PRESETS.map((p) => {
            const active = startDate === daysAgoStr(p.days) && endDate === todayStr();
            return (
              <button
                key={p.label}
                onClick={() => selectPreset(p.days)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  active ? "bg-accent text-white" : "bg-gray-100 text-gray-500"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <CalendarDays
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type="date"
              value={startDate}
              max={endDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border border-gray-200 rounded-md pl-9 pr-2 py-2.5 text-sm"
            />
          </div>
          <span className="text-gray-400 text-xs">to</span>
          <div className="relative flex-1">
            <CalendarDays
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type="date"
              value={endDate}
              min={startDate}
              max={todayStr()}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border border-gray-200 rounded-md pl-9 pr-2 py-2.5 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-card">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
          Summary
        </h2>
        {loading ? (
          <div className="h-14 bg-gray-100 rounded-md animate-pulse" />
        ) : (
          <div className="flex justify-between">
            <Stat label="Daily target" value={goal} />
            <Stat label="Total eaten" value={totalConsumed} />
            <Stat label="Avg / day" value={avgPerDay} />
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col gap-2.5 animate-pulse">
          <div className="h-14 bg-white border border-gray-200 rounded-xl" />
          <div className="h-14 bg-white border border-gray-200 rounded-xl" />
          <div className="h-14 bg-white border border-gray-200 rounded-xl" />
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-card overflow-hidden">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 px-5 pt-4 pb-2">
            Days
          </h2>
          {days.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-gray-400">No meals logged in this range.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-gray-100">
              {days.map((day) => {
                const expanded = expandedDate === day.date;
                const over = day.total > goal;
                return (
                  <li key={day.date}>
                    <button
                      onClick={() => setExpandedDate(expanded ? null : day.date)}
                      className="w-full flex items-center gap-3 px-5 py-3.5 text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900">
                          {formatDayLabel(day.date)}
                        </div>
                        <div className="text-xs text-gray-400">
                          {day.meals.length} item{day.meals.length > 1 ? "s" : ""}
                        </div>
                      </div>
                      <span className={`text-sm font-bold ${over ? "text-danger" : "text-gray-900"}`}>
                        {day.total.toLocaleString()}
                      </span>
                      <ChevronDown
                        size={16}
                        className={`text-gray-300 transition-transform shrink-0 ${
                          expanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {expanded && (
                      <div className="px-5 pb-4 flex flex-col gap-3">
                        {MEAL_TYPES.map((meta) => {
                          const items = day.meals.filter((m) => m.type === meta.value);
                          if (items.length === 0) return null;
                          const subtotal = items.reduce((s, m) => s + m.calories, 0);
                          const Icon = meta.icon;
                          return (
                            <div
                              key={meta.value}
                              className="bg-gray-50 border border-gray-100 rounded-lg overflow-hidden"
                            >
                              <div className="flex items-center gap-2.5 px-3 py-2.5">
                                <div
                                  className={`w-7 h-7 rounded-md ${meta.bg} ${meta.text} flex items-center justify-center shrink-0`}
                                >
                                  <Icon size={14} strokeWidth={2.25} />
                                </div>
                                <div className="text-xs font-semibold text-gray-900">
                                  {meta.label}
                                </div>
                                <div className="ml-auto text-xs text-gray-400">
                                  {subtotal} cal
                                </div>
                              </div>
                              <ul className="flex flex-col divide-y divide-gray-100 px-3 pb-1">
                                {items.map((m) => (
                                  <li
                                    key={m.id}
                                    className="flex justify-between items-center py-1.5 text-xs"
                                  >
                                    <span className="text-gray-700">{m.name}</span>
                                    <span className="text-gray-400">{m.calories} cal</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex-1 text-center">
      <div className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}
