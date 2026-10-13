"use client";

import { useState } from "react";
import { todayStr } from "@/lib/date";
import type { MealType } from "@/lib/types";
import { MEAL_TYPES, mealMeta } from "@/lib/mealMeta";
import AddFoodSheet from "@/components/AddFoodSheet";
import ToastHost, { useToast } from "@/components/Toast";
import Link from "next/link";
import { Plus, Droplet, Minus, Flame } from "lucide-react";
import { useMealsForDate } from "@/features/meals/hooks/useMealsForDate";
import { useDashboardProfile } from "@/features/profile/hooks/useDashboardProfile";

const RADIUS = 50;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function DashboardPage() {
  const today = todayStr();
  const {
    email,
    profile,
    waterCups,
    setWaterCups,
    loading: profileLoading,
    error: profileError,
  } = useDashboardProfile(today);
  const {
    meals,
    total: consumed,
    loading: mealsLoading,
    error: mealsError,
    addMeal: addMealForDate,
    removeMeal,
  } = useMealsForDate(today);
  const [sheetType, setSheetType] = useState<MealType | null>(null);
  const { message, show } = useToast();

  async function addMeal(type: MealType, name: string, calories: number) {
    await addMealForDate(type, name, calories);
    show(`Added to ${mealMeta(type).label}`);
  }

  if (profileLoading || mealsLoading) {
    return (
      <div className="flex flex-col gap-4 animate-pulse">
        <div className="h-40 bg-white border border-gray-200 rounded-2xl" />
        <div className="h-24 bg-white border border-gray-200 rounded-2xl" />
        <div className="h-16 bg-white border border-gray-200 rounded-xl" />
        <div className="h-16 bg-white border border-gray-200 rounded-xl" />
      </div>
    );
  }

  const goal = profile?.daily_goal ?? 2000;
  const waterTarget = profile?.water_target ?? 8;
  const fullName = profile?.full_name ?? null;
  const goalType = profile?.goal_type ?? "maintain";
  const remaining = goal - consumed;
  const pct = Math.min(consumed / goal, 1) || 0;
  const dashoffset = CIRCUMFERENCE * (1 - pct);
  const dateLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
  const firstName = fullName?.trim().split(/\s+/)[0];
  const initial = (firstName?.[0] ?? email[0] ?? "?").toUpperCase();
  const sheetMeta = sheetType ? mealMeta(sheetType) : null;

  const net = consumed - goal;
  const netIsGood =
    goalType === "lose" ? net <= 0 : goalType === "gain" ? net >= 0 : Math.abs(net) <= 150;

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {(profileError || mealsError) && (
        <p className="text-sm text-danger bg-danger-light border border-red-200 rounded-md px-3 py-2">
          {profileError ?? mealsError}
        </p>
      )}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-gray-500">{dateLabel}</div>
          <h1 className="text-xl font-bold text-gray-900 mt-0.5">
            {firstName ? `Hi, ${firstName} 👋` : "Welcome back 👋"}
          </h1>
        </div>
        <Link
          href="/profile"
          className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center font-bold text-sm shrink-0"
        >
          {initial}
        </Link>
      </div>

      <div className="bg-ring rounded-2xl p-5 sm:p-6 flex items-center gap-5 shadow-card">
        <div className="relative w-[110px] h-[110px] sm:w-[120px] sm:h-[120px] shrink-0">
          <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
            <circle cx="60" cy="60" r={RADIUS} fill="none" stroke="#2A3234" strokeWidth="10" />
            <circle
              cx="60"
              cy="60"
              r={RADIUS}
              fill="none"
              stroke="#3DDC84"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashoffset}
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <div className="text-xl sm:text-2xl font-extrabold text-white">
              {consumed.toLocaleString()}
            </div>
            <div className="text-[10px] text-gray-400 font-medium mt-0.5">
              of {goal.toLocaleString()} kcal
            </div>
          </div>
        </div>
        <div className="flex-1 flex flex-col gap-2.5 min-w-0">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-gray-300">
              <span className="w-2 h-2 rounded-full bg-ring-progress shrink-0" />
              Remaining
            </span>
            <span className="font-bold text-white">{remaining.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-gray-300">
              <span className="w-2 h-2 rounded-full bg-dinner shrink-0" />
              Water
            </span>
            <span className="font-bold text-white">
              {waterCups}/{waterTarget} cups
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-card">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
          <Flame size={16} className="text-breakfast" />
          Calorie balance
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-lg font-extrabold text-gray-900">
              {consumed.toLocaleString()}
            </div>
            <div className="text-[11px] text-gray-500">Eaten</div>
          </div>
          <div>
            <div className="text-lg font-extrabold text-gray-900">{goal.toLocaleString()}</div>
            <div className="text-[11px] text-gray-500">Target</div>
          </div>
          <div>
            <div className={`text-lg font-extrabold ${netIsGood ? "text-accent" : "text-danger"}`}>
              {net > 0 ? "+" : net < 0 ? "−" : ""}
              {Math.abs(net).toLocaleString()}
            </div>
            <div className="text-[11px] text-gray-500">
              {net > 0 ? "Surplus" : net < 0 ? "Deficit" : "Balanced"}
            </div>
          </div>
        </div>
        <p className="text-[11px] text-gray-400 mt-3 leading-relaxed">
          Surplus/deficit is measured against your daily calorie target — set it from Profile.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Droplet size={16} className="text-dinner" />
            Water intake
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setWaterCups(waterCups - 1)}
              className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500"
              aria-label="Remove a cup"
            >
              <Minus size={13} />
            </button>
            <span className="text-sm font-bold text-dinner whitespace-nowrap">
              {waterCups}/{waterTarget}
            </span>
            <button
              onClick={() => setWaterCups(waterCups + 1)}
              className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500"
              aria-label="Add a cup"
            >
              <Plus size={13} />
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between gap-1.5">
          {Array.from({ length: waterTarget }).map((_, i) => {
            const filled = i < waterCups;
            return (
              <button
                key={i}
                onClick={() => setWaterCups(i + 1)}
                aria-label={`Set water to ${i + 1} cups`}
                className="shrink-0"
              >
                <Droplet
                  size={22}
                  className={filled ? "text-dinner" : "text-gray-200"}
                  fill={filled ? "currentColor" : "none"}
                />
              </button>
            );
          })}
        </div>
      </div>

      <h2 className="text-sm font-bold text-gray-900 mt-1">Today&apos;s Meals</h2>

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
                    {items.length === 0 ? "Not logged yet" : items.map((i) => i.name).join(", ")}
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
