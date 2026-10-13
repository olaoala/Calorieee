"use client";

import { useState } from "react";
import Link from "next/link";
import { Flame, Scale, Plus } from "lucide-react";
import { useProgressData } from "@/features/profile/hooks/useProgressData";

export default function ProgressPage() {
  const {
    loading,
    error,
    goal,
    week,
    streak,
    avgKcal,
    adherence,
    weightSeries,
    monthDelta,
    logWeight: saveWeight,
  } = useProgressData();
  const [showWeightForm, setShowWeightForm] = useState(false);
  const [weightInput, setWeightInput] = useState("");
  const [savingWeight, setSavingWeight] = useState(false);

  async function logWeight(e: React.FormEvent) {
    e.preventDefault();
    const kg = parseFloat(weightInput);
    if (!kg || kg <= 0) return;
    setSavingWeight(true);
    try {
      await saveWeight(kg);
      setWeightInput("");
      setShowWeightForm(false);
    } finally {
      setSavingWeight(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4 animate-pulse">
        <div className="h-40 bg-white border border-gray-200 rounded-xl" />
        <div className="h-24 bg-white border border-gray-200 rounded-xl" />
        <div className="h-28 bg-white border border-gray-200 rounded-xl" />
      </div>
    );
  }

  const maxTotal = Math.max(goal, ...week.map((d) => d.total), 1);
  const latestWeight = weightSeries[weightSeries.length - 1];

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {error && (
        <p className="text-sm text-danger bg-danger-light border border-red-200 rounded-md px-3 py-2">
          {error}
        </p>
      )}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Progress</h1>
        <p className="text-sm text-gray-500 mt-0.5">Last 7 days</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-gray-900">Calories vs goal</h2>
          <Link href="/history" className="text-xs font-semibold text-accent">
            View a day →
          </Link>
        </div>
        <div className="flex items-end justify-between gap-2 h-32">
          {week.map((d) => {
            const over = d.total > goal;
            const pct = Math.max(4, Math.min(100, (d.total / maxTotal) * 100));
            return (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full h-24 bg-gray-100 rounded-md flex items-end overflow-hidden">
                  <div
                    className={`w-full rounded-md transition-all ${over ? "bg-danger" : "bg-lunch"}`}
                    style={{ height: `${d.total > 0 ? pct : 0}%` }}
                  />
                </div>
                <span className="text-[11px] font-bold text-gray-500">{d.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard value={avgKcal.toLocaleString()} label="Avg. daily kcal" />
        <StatCard value={`${streak} day${streak === 1 ? "" : "s"}`} label="Logging streak 🔥" />
        <StatCard value={`${adherence}%`} label="Goal adherence" />
        <StatCard
          value={monthDelta === null ? "—" : `${monthDelta > 0 ? "+" : ""}${monthDelta} kg`}
          label="Weight, last 30 days"
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
            <Scale size={16} className="text-dinner" />
            Weight trend
          </div>
          <button
            onClick={() => setShowWeightForm((v) => !v)}
            className="flex items-center gap-1 text-xs font-semibold text-accent"
          >
            <Plus size={13} /> Log weight
          </button>
        </div>

        {showWeightForm && (
          <form onSubmit={logWeight} className="flex gap-2 mb-4">
            <input
              type="number"
              step="0.1"
              min={0}
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              placeholder="Weight in kg"
              autoFocus
              required
              className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={savingWeight}
              className="bg-accent text-white rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60"
            >
              Save
            </button>
          </form>
        )}

        {weightSeries.length === 0 ? (
          <p className="text-sm text-gray-400">No weight entries yet.</p>
        ) : (
          <>
            <WeightSparkline data={weightSeries} />
            <p className="text-xs text-gray-400 mt-2">
              Latest: {latestWeight.weight_kg} kg on{" "}
              {new Date(latestWeight.date + "T00:00:00").toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </p>
          </>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-card">
        <div className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3">
          <Flame size={16} className="text-breakfast" />
          7-day streak
        </div>
        <div className="flex gap-1.5">
          {week.map((d) => (
            <div
              key={d.date}
              className={`flex-1 h-9 rounded-md flex items-center justify-center text-xs font-bold ${
                d.total > 0 ? "bg-lunch text-white" : "bg-gray-100 text-gray-400"
              }`}
            >
              {d.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-card">
      <div className="text-xl font-extrabold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

function WeightSparkline({ data }: { data: { date: string; weight_kg: number }[] }) {
  const width = 300;
  const height = 80;
  const values = data.map((d) => d.weight_kg);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = data.map((d, i) => {
    const x = data.length === 1 ? width : (i / (data.length - 1)) * width;
    const y = height - ((d.weight_kg - min) / range) * (height - 16) - 8;
    return `${x},${y}`;
  });

  const last = points[points.length - 1]?.split(",").map(Number) ?? [width, height / 2];

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke="#3d6fd1"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last[0]} cy={last[1]} r="4.5" fill="#3d6fd1" />
    </svg>
  );
}
