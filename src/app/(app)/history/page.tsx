"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { todayStr } from "@/lib/date";
import type { Meal } from "@/lib/types";
import { MEAL_TYPES } from "@/lib/mealMeta";
import { CalendarDays } from "lucide-react";

export default function HistoryPage() {
  const supabase = createClient();
  const [date, setDate] = useState(todayStr());
  const [goal, setGoal] = useState(2000);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: profile }, { data: mealRows }] = await Promise.all([
      supabase.from("profiles").select("daily_goal").eq("id", user.id).single(),
      supabase
        .from("meals")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", date)
        .order("created_at", { ascending: true }),
    ]);

    if (profile) setGoal(profile.daily_goal);
    setMeals((mealRows as Meal[]) ?? []);
    setLoading(false);
  }, [supabase, date]);

  useEffect(() => {
    load();
  }, [load]);

  const consumed = meals.reduce((s, m) => s + m.calories, 0);

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-card">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
          Pick a date
        </h2>
        <div className="relative">
          <CalendarDays
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="date"
            value={date}
            max={todayStr()}
            onChange={(e) => setDate(e.target.value)}
            className="w-full sm:w-auto border border-gray-200 rounded-md pl-9 pr-3 py-2.5 text-sm"
          />
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-card">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
          Summary
        </h2>
        {loading ? (
          <div className="flex flex-col gap-2 animate-pulse">
            <div className="h-14 bg-gray-100 rounded-md" />
            <div className="h-2.5 bg-gray-100 rounded-full" />
          </div>
        ) : (
          <>
            <div className="flex justify-between mb-3">
              <Stat label="Goal" value={goal} />
              <Stat label="Consumed" value={consumed} />
              <Stat
                label="Remaining"
                value={goal - consumed}
                accent={consumed > goal ? "text-danger" : undefined}
              />
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${consumed > goal ? "bg-danger" : "bg-accent"} transition-all`}
                style={{ width: `${Math.min(100, (consumed / goal) * 100 || 0)}%` }}
              />
            </div>
          </>
        )}
      </div>

      {!loading && (
        <div className="flex flex-col gap-3">
          {MEAL_TYPES.map((meta) => {
            const items = meals.filter((m) => m.type === meta.value);
            if (items.length === 0) return null;
            const subtotal = items.reduce((s, m) => s + m.calories, 0);
            const Icon = meta.icon;

            return (
              <div
                key={meta.value}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-card"
              >
                <div className="flex items-center gap-3 p-4">
                  <div
                    className={`w-9 h-9 rounded-lg ${meta.bg} ${meta.text} flex items-center justify-center`}
                  >
                    <Icon size={17} strokeWidth={2.25} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{meta.label}</div>
                    <div className="text-xs text-gray-400">
                      {items.length} item{items.length > 1 ? "s" : ""} · {subtotal} cal
                    </div>
                  </div>
                </div>
                <ul className="flex flex-col divide-y divide-gray-100 px-4 pb-1">
                  {items.map((m) => (
                    <li key={m.id} className="flex justify-between items-center py-2.5 text-sm">
                      <span className="text-gray-800">{m.name}</span>
                      <span className="text-gray-500">{m.calories} cal</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          {meals.length === 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-card text-center">
              <p className="text-sm text-gray-400">No meals logged for this date.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="flex-1 text-center">
      <div className={`text-2xl font-bold ${accent ?? "text-gray-900"}`}>{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}
