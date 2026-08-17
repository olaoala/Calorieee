"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import type { GoalType } from "@/lib/types";
import { signup } from "@/app/signup/actions";

const GOAL_OPTIONS: { value: GoalType; label: string; desc: string; suggested: number }[] = [
  { value: "lose", label: "Lose weight", desc: "Gentle calorie deficit", suggested: 1800 },
  { value: "maintain", label: "Maintain weight", desc: "Stay balanced", suggested: 2200 },
  { value: "gain", label: "Gain weight", desc: "Calorie surplus for muscle", suggested: 2600 },
];

export default function SignupForm() {
  const [goalType, setGoalType] = useState<GoalType>("maintain");
  const [calorieGoal, setCalorieGoal] = useState("2000");

  const suggested = GOAL_OPTIONS.find((o) => o.value === goalType)?.suggested ?? 2000;

  return (
    <form action={signup} className="flex flex-col gap-3">
      <input
        type="text"
        name="full_name"
        placeholder="Full name"
        autoComplete="name"
        required
        className="border border-gray-200 rounded-md px-3 py-2.5 text-sm"
      />
      <input
        type="email"
        name="email"
        placeholder="Email"
        autoComplete="email"
        required
        className="border border-gray-200 rounded-md px-3 py-2.5 text-sm"
      />

      <div className="mt-1">
        <div className="text-xs font-semibold text-gray-500 mb-2">Goal</div>
        <div className="flex flex-col gap-2">
          {GOAL_OPTIONS.map((opt) => {
            const selected = goalType === opt.value;
            return (
              <label
                key={opt.value}
                className={`flex items-center justify-between text-left px-3.5 py-2.5 rounded-lg border-2 cursor-pointer transition-colors ${
                  selected ? "border-accent bg-accent-light" : "border-gray-200"
                }`}
              >
                <input
                  type="radio"
                  name="goal_type"
                  value={opt.value}
                  checked={selected}
                  onChange={() => setGoalType(opt.value)}
                  className="sr-only"
                />
                <div>
                  <div className="text-sm font-semibold text-gray-900">{opt.label}</div>
                  <div className="text-xs text-gray-500">{opt.desc}</div>
                </div>
                <div
                  className={`w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    selected ? "border-accent bg-accent" : "border-gray-300"
                  }`}
                >
                  {selected && <Check size={11} className="text-white" strokeWidth={3} />}
                </div>
              </label>
            );
          })}
        </div>
      </div>

      <div className="mt-1">
        <div className="text-xs font-semibold text-gray-500 mb-2">Daily calorie goal</div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            name="daily_goal"
            min={800}
            value={calorieGoal}
            onChange={(e) => setCalorieGoal(e.target.value)}
            required
            className="flex-1 border border-gray-200 rounded-md px-3 py-2.5 text-sm"
          />
          <button
            type="button"
            onClick={() => setCalorieGoal(String(suggested))}
            className="bg-accent-light text-accent-dark rounded-md px-3 py-2.5 text-xs font-semibold whitespace-nowrap"
          >
            Use suggested ({suggested.toLocaleString()})
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1.5">You can change this anytime from your profile.</p>
      </div>

      <input
        type="password"
        name="password"
        placeholder="Password (min 6 characters)"
        autoComplete="new-password"
        minLength={6}
        required
        className="border border-gray-200 rounded-md px-3 py-2.5 text-sm mt-1"
      />

      <button
        type="submit"
        className="bg-accent text-white rounded-md py-2.5 text-sm font-medium mt-1 active:scale-[0.98] transition"
      >
        Sign up
      </button>
    </form>
  );
}
