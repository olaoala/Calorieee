"use client";

import { useState, useMemo, useRef } from "react";
import { todayStr } from "@/lib/date";
import type { MealScheduleItem, MealType } from "@/lib/types";
import { MEAL_TYPES, mealMeta } from "@/lib/mealMeta";
import AddFoodSheet from "@/components/AddFoodSheet";
import ToastHost, { useToast } from "@/components/Toast";
import { Plus } from "lucide-react";
import { useMealsForDate } from "@/features/meals/hooks/useMealsForDate";
import { useProfileSummary } from "@/features/profile/hooks/useProfileSummary";
import { useMealSchedule } from "@/features/meals/hooks/useMealSchedule";

function dateNDaysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}
function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default function PlansPage() {
  const today = todayStr();
  const [selectedDate, setSelectedDate] = useState(today);
  const {
    meals,
    total,
    loading: mealsLoading,
    error: mealsError,
    addMeal: addMealForDate,
    removeMeal,
  } = useMealsForDate(selectedDate);
  const { profile, loading: profileLoading, error: profileError } = useProfileSummary();
  const [sheetSlot, setSheetSlot] = useState<MealScheduleItem | null>(null);
  const [scheduleLabel, setScheduleLabel] = useState("");
  const [scheduleType, setScheduleType] = useState<MealType>("snack");
  const { message, show } = useToast();
  const stripRef = useRef<HTMLDivElement>(null);
  const {
    items: schedule,
    loading: scheduleLoading,
    saving: scheduleSaving,
    error: scheduleError,
    save: saveSchedule,
  } = useMealSchedule();

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

  async function addMeal(type: MealType, name: string, calories: number) {
    await addMealForDate(type, name, calories, sheetSlot?.id.startsWith("default-") ? undefined : sheetSlot?.id);
    show(
      selectedDate === today
        ? `Added to today's ${mealMeta(type).label}`
        : `Planned for ${mealMeta(type).label}`
    );
  }

  function itemsForSlot(slot: MealScheduleItem) {
    const directItems = meals.filter((meal) => meal.schedule_id === slot.id);
    if (directItems.length > 0 || schedule.filter((item) => item.type === slot.type && item.id !== slot.id).some((item) => meals.some((meal) => meal.schedule_id === item.id))) {
      return directItems;
    }
    return meals.filter((meal) => !meal.schedule_id && meal.type === slot.type);
  }

  async function addScheduleSlot(e: React.FormEvent) {
    e.preventDefault();
    const label = scheduleLabel.trim();
    if (!label) return;
    await saveSchedule([...schedule, { type: scheduleType, label }]);
    setScheduleLabel("");
  }

  function updateSchedule(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= schedule.length) return;
    const next = schedule.map(({ type, label }) => ({ type, label }));
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    void saveSchedule(next);
  }

  function removeScheduleSlot(index: number) {
    void saveSchedule(schedule.filter((_, itemIndex) => itemIndex !== index).map(({ type, label }) => ({ type, label })));
  }

  const goal = profile?.daily_goal ?? 2000;
  const loading = mealsLoading || profileLoading;
  const selectedLabel = new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {(profileError || mealsError || scheduleError) && (
        <p className="text-sm text-danger bg-danger-light border border-red-200 rounded-md px-3 py-2">
          {profileError ?? mealsError ?? scheduleError}
        </p>
      )}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Meal Plan</h1>
        <p className="text-sm text-gray-500 mt-0.5">Plan meals ahead of time</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-card">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Your meal schedule</h2>
            <p className="text-xs text-gray-500 mt-0.5">Choose the slots you want each day.</p>
          </div>
          {scheduleSaving && <span className="text-xs text-gray-400">Saving...</span>}
        </div>
        {scheduleLoading ? (
          <div className="h-10 bg-gray-100 rounded-md animate-pulse" />
        ) : (
          <div className="flex flex-col gap-2">
            {schedule.map((item, index) => (
              <div key={item.id} className="flex items-center gap-2 border border-gray-100 rounded-md px-2.5 py-2">
                <span className="text-xs font-semibold text-gray-400 w-5">{index + 1}</span>
                <span className="text-sm text-gray-800 flex-1 min-w-0 truncate">{item.label}</span>
                <button type="button" onClick={() => updateSchedule(index, -1)} disabled={index === 0 || scheduleSaving} className="text-xs text-gray-500 disabled:opacity-30">Up</button>
                <button type="button" onClick={() => updateSchedule(index, 1)} disabled={index === schedule.length - 1 || scheduleSaving} className="text-xs text-gray-500 disabled:opacity-30">Down</button>
                <button type="button" onClick={() => removeScheduleSlot(index)} disabled={scheduleSaving} className="text-xs text-danger disabled:opacity-30">Remove</button>
              </div>
            ))}
            <form onSubmit={addScheduleSlot} className="flex flex-wrap gap-2 pt-1">
              <input value={scheduleLabel} onChange={(e) => setScheduleLabel(e.target.value)} placeholder="New slot (e.g. Afternoon snack)" maxLength={80} className="flex-1 min-w-[170px] border border-gray-200 rounded-md px-3 py-2 text-sm" />
              <select value={scheduleType} onChange={(e) => setScheduleType(e.target.value as MealType)} className="border border-gray-200 rounded-md px-2 py-2 text-sm bg-white">
                {MEAL_TYPES.map((meta) => <option key={meta.value} value={meta.value}>{meta.label}</option>)}
              </select>
              <button type="submit" disabled={scheduleSaving || !scheduleLabel.trim()} className="bg-accent-light text-accent rounded-md px-3 py-2 text-sm font-medium disabled:opacity-50">Add slot</button>
            </form>
          </div>
        )}
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
            {schedule.map((slot) => {
            const meta = mealMeta(slot.type);
            const items = itemsForSlot(slot);
            const subtotal = items.reduce((s, m) => s + m.calories, 0);
            const Icon = meta.icon;
            return (
              <div
                key={slot.id}
                className="bg-white border border-gray-200 rounded-xl shadow-card overflow-hidden"
              >
                <button
                  onClick={() => setSheetSlot(slot)}
                  className="w-full flex items-center gap-3.5 p-3.5 text-left"
                >
                  <div
                    className={`w-11 h-11 rounded-xl ${meta.bg} ${meta.text} flex items-center justify-center shrink-0`}
                  >
                    <Icon size={19} strokeWidth={2.25} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-gray-900">{slot.label}</div>
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
        open={sheetSlot !== null}
        meta={sheetSlot ? mealMeta(sheetSlot.type) : null}
        items={sheetSlot ? itemsForSlot(sheetSlot) : []}
        onClose={() => setSheetSlot(null)}
        onAdd={async (name, calories) => {
          if (sheetSlot) await addMeal(sheetSlot.type, name, calories);
        }}
        onRemove={removeMeal}
      />
      <ToastHost message={message} />
    </div>
  );
}
