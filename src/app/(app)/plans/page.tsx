"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { todayStr } from "@/lib/date";
import type { Meal, MealType } from "@/lib/types";
import { MEAL_TYPES, mealMeta } from "@/lib/mealMeta";
import AddFoodSheet from "@/components/AddFoodSheet";
import ToastHost, { useToast } from "@/components/Toast";
import { Plus } from "lucide-react";

function dateNDaysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}
function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default function PlansPage() {
  const supabase = createClient();
  const today = todayStr();
  const [selectedDate, setSelectedDate] = useState(today);
  const [goal, setGoal] = useState(2000);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetType, setSheetType] = useState<MealType | null>(null);
  const { message, show } = useToast();
  const stripRef = useRef<HTMLDivElement>(null);

  const days = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const d = dateNDaysFromNow(i);
      return {
        key: toDateKey(d),
        dow: i === 0 ? "Today" : d.toLocaleDateString("en-US", { weekday: "short" }),
        num: d.getDate(),
        isToday: i === 0,
      };
    });
  }, []);

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
        .eq("date", selectedDate)
        .order("created_at", { ascending: true }),
    ]);

    if (profile) setGoal(profile.daily_goal);
    setMeals((mealRows as Meal[]) ?? []);
    setLoading(false);
  }, [supabase, selectedDate]);

  useEffect(() => {
    load();
  }, [load]);

  async function addMeal(type: MealType, name: string, calories: number) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("meals").insert({
      user_id: user.id,
      date: selectedDate,
      type,
      name,
      calories,
    });
    await load();
    show(
      selectedDate === today
        ? `Added to today's ${mealMeta(type).label}`
        : `Planned for ${mealMeta(type).label}`
    );
  }

  async function removeMeal(id: string) {
    await supabase.from("meals").delete().eq("id", id);
    load();
  }

  const total = meals.reduce((s, m) => s + m.calories, 0);
  const selectedLabel = new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
  const sheetMeta = sheetType ? mealMeta(sheetType) : null;

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Meal Plan</h1>
        <p className="text-sm text-gray-500 mt-0.5">Plan meals ahead of time</p>
      </div>

      <div ref={stripRef} className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
        {days.map((d) => {
          const selected = d.key === selectedDate;
          return (
            <button
              key={d.key}
              onClick={() => setSelectedDate(d.key)}
              className={`shrink-0 w-14 py-2.5 rounded-xl flex flex-col items-center gap-1 border transition-colors ${
                selected
                  ? "bg-accent border-accent text-white"
                  : "bg-white border-gray-200 text-gray-700"
              }`}
            >
              <span className={`text-[11px] font-semibold ${selected ? "text-white" : "text-gray-500"}`}>
                {d.dow}
              </span>
              <span className="text-base font-extrabold">{d.num}</span>
              {d.isToday && (
                <span className={`w-1 h-1 rounded-full ${selected ? "bg-white" : "bg-accent"}`} />
              )}
            </button>
          );
        })}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-card flex items-center justify-between">
        <div>
          <div className="text-lg font-extrabold text-gray-900">{total.toLocaleString()}</div>
          <div className="text-xs text-gray-500">Planned kcal · {selectedLabel}</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-extrabold text-gray-900">{goal.toLocaleString()}</div>
          <div className="text-xs text-gray-500">Daily goal</div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2.5 animate-pulse">
          <div className="h-16 bg-white border border-gray-200 rounded-xl" />
          <div className="h-16 bg-white border border-gray-200 rounded-xl" />
          <div className="h-16 bg-white border border-gray-200 rounded-xl" />
          <div className="h-16 bg-white border border-gray-200 rounded-xl" />
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {MEAL_TYPES.map((meta) => {
            const items = meals.filter((m) => m.type === meta.value);
            const subtotal = items.reduce((s, m) => s + m.calories, 0);
            const Icon = meta.icon;
            return (
              <div
                key={meta.value}
                className="bg-white border border-gray-200 rounded-xl shadow-card overflow-hidden"
              >
                <button
                  onClick={() => setSheetType(meta.value)}
                  className="w-full flex items-center gap-3.5 p-3.5 text-left"
                >
                  <div
                    className={`w-11 h-11 rounded-xl ${meta.bg} ${meta.text} flex items-center justify-center shrink-0`}
                  >
                    <Icon size={19} strokeWidth={2.25} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-gray-900">{meta.label}</div>
                    <div className="text-xs text-gray-400 truncate">
                      {items.length === 0
                        ? "No meal planned"
                        : items.map((i) => i.name).join(", ")}
                    </div>
                  </div>
                  {items.length === 0 ? (
                    <div className="w-7 h-7 rounded-full border-2 border-dashed border-gray-300 text-gray-300 flex items-center justify-center shrink-0">
                      <Plus size={14} />
                    </div>
                  ) : (
                    <div className="text-sm font-bold text-gray-900 shrink-0">{subtotal}</div>
                  )}
                </button>
                {items.length > 0 && (
                  <ul className="px-3.5 pb-2 flex flex-col divide-y divide-gray-100 border-t border-gray-100">
                    {items.map((m) => (
                      <li
                        key={m.id}
                        className="flex justify-between items-center py-2 text-xs text-gray-500"
                      >
                        <span>{m.name}</span>
                        <span className="flex items-center gap-3">
                          {m.calories} cal
                          <button
                            onClick={() => removeMeal(m.id)}
                            className="text-gray-300 hover:text-danger"
                            aria-label={`Remove ${m.name}`}
                          >
                            ✕
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}

      <AddFoodSheet
        open={sheetType !== null}
        meta={sheetMeta}
        items={sheetType ? meals.filter((m) => m.type === sheetType) : []}
        onClose={() => setSheetType(null)}
        onAdd={async (name, calories) => {
          if (sheetType) await addMeal(sheetType, name, calories);
        }}
        onRemove={removeMeal}
      />
      <ToastHost message={message} />
    </div>
  );
}
