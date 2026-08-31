"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Flame,
  Droplet,
  Scale,
  Bell,
  History as HistoryIcon,
  Database,
  Check,
} from "lucide-react";

type EditKey = "goal" | "weightGoal" | "water" | null;

export default function ProfilePage() {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState<string | null>(null);
  const [goal, setGoal] = useState(2000);
  const [waterTarget, setWaterTarget] = useState(8);
  const [weightGoal, setWeightGoal] = useState<number | null>(null);
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EditKey>(null);
  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    setEmail(user.email ?? "");

    const [{ data: profile, error: profileError }, { data: latestWeight }] = await Promise.all([
      supabase
        .from("profiles")
        .select("daily_goal, water_target, weight_goal_kg, full_name")
        .eq("id", user.id)
        .single(),
      supabase
        .from("weight_logs")
        .select("weight_kg")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (profileError) setError(profileError.message);
    if (profile) {
      setGoal(profile.daily_goal);
      setWaterTarget(profile.water_target ?? 8);
      setWeightGoal(profile.weight_goal_kg);
      setFullName(profile.full_name ?? null);
    }
    setCurrentWeight(latestWeight?.weight_kg ?? null);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  function startEdit(key: EditKey, current: number | null) {
    setEditing(key);
    setDraft(current !== null ? String(current) : "");
    setError(null);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !editing) return;
    const value = parseFloat(draft);
    if (isNaN(value) || value <= 0) return;

    const updates: Record<string, number> = {};
    if (editing === "goal") updates.daily_goal = Math.round(value);
    if (editing === "water") updates.water_target = Math.round(value);
    if (editing === "weightGoal") updates.weight_goal_kg = value;

    setError(null);
    const { error: updateError } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    if (editing === "goal") setGoal(Math.round(value));
    if (editing === "water") setWaterTarget(Math.round(value));
    if (editing === "weightGoal") setWeightGoal(value);

    setEditing(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4 animate-pulse">
        <div className="h-32 bg-white border border-gray-200 rounded-xl" />
        <div className="h-48 bg-white border border-gray-200 rounded-xl" />
      </div>
    );
  }

  const initial = (fullName?.[0] ?? email[0] ?? "?").toUpperCase();

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-full bg-accent text-white flex items-center justify-center text-2xl font-extrabold mb-3">
          {initial}
        </div>
        <div className="text-base font-bold text-gray-900">{fullName || email.split("@")[0]}</div>
        <div className="text-xs text-gray-500 mt-0.5">{email}</div>

        <div className="flex w-full justify-around mt-5 pt-4 border-t border-gray-100">
          <StatItem value={goal.toLocaleString()} label="Daily target" />
          <StatItem value={currentWeight !== null ? `${currentWeight} kg` : "—"} label="Current" />
          <StatItem value={weightGoal !== null ? `${weightGoal} kg` : "—"} label="Goal" />
        </div>
        {saved && (
          <p className="flex items-center gap-1.5 text-xs text-accent mt-3">
            <Check size={13} /> Saved
          </p>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-card overflow-hidden">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 px-4 pt-4 pb-2">
          Goals & targets
        </h2>

        {error && (
          <p className="mx-4 mb-2 text-xs text-danger bg-danger-light border border-red-200 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        <SettingRow
          icon={<Flame size={16} className="text-lunch" />}
          iconBg="bg-lunch-light"
          label="Daily calorie target"
          value={`${goal.toLocaleString()} kcal`}
          editing={editing === "goal"}
          onEdit={() => startEdit("goal", goal)}
        >
          <EditForm draft={draft} setDraft={setDraft} onSubmit={saveEdit} step={50} unit="kcal" />
        </SettingRow>

        <SettingRow
          icon={<Scale size={16} className="text-dinner" />}
          iconBg="bg-dinner-light"
          label="Weight goal"
          value={weightGoal !== null ? `${weightGoal} kg` : "Not set"}
          editing={editing === "weightGoal"}
          onEdit={() => startEdit("weightGoal", weightGoal)}
        >
          <EditForm draft={draft} setDraft={setDraft} onSubmit={saveEdit} step={0.1} unit="kg" />
        </SettingRow>

        <SettingRow
          icon={<Droplet size={16} className="text-dinner" />}
          iconBg="bg-dinner-light"
          label="Daily water target"
          value={`${waterTarget} cups`}
          editing={editing === "water"}
          onEdit={() => startEdit("water", waterTarget)}
          last
        >
          <EditForm draft={draft} setDraft={setDraft} onSubmit={saveEdit} step={1} unit="cups" />
        </SettingRow>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-card overflow-hidden">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 px-4 pt-4 pb-2">
          More
        </h2>
        <Link
          href="/reminders"
          className="flex items-center gap-3.5 px-4 py-3.5 border-b border-gray-100 text-sm font-semibold text-gray-900"
        >
          <span className="w-8 h-8 rounded-lg bg-snack-light text-snack flex items-center justify-center shrink-0">
            <Bell size={15} />
          </span>
          Meal reminders
          <span className="ml-auto text-gray-300">›</span>
        </Link>
        <Link
          href="/history"
          className="flex items-center gap-3.5 px-4 py-3.5 text-sm font-semibold text-gray-900"
        >
          <span className="w-8 h-8 rounded-lg bg-breakfast-light text-breakfast flex items-center justify-center shrink-0">
            <HistoryIcon size={15} />
          </span>
          Meal history
          <span className="ml-auto text-gray-300">›</span>
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-card flex items-start gap-3">
        <span className="w-8 h-8 rounded-lg bg-accent-light text-accent flex items-center justify-center shrink-0">
          <Database size={15} />
        </span>
        <p className="text-xs text-gray-500 leading-relaxed">
          Your data is stored in your Supabase account and synced across any device you log in
          on.
        </p>
      </div>
    </div>
  );
}

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-base font-extrabold text-gray-900">{value}</div>
      <div className="text-[11px] text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

function SettingRow({
  icon,
  iconBg,
  label,
  value,
  editing,
  onEdit,
  last,
  children,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
  editing: boolean;
  onEdit: () => void;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`px-4 ${last ? "pb-4" : "pb-2 border-b border-gray-100"}`}>
      <button onClick={onEdit} className="w-full flex items-center gap-3.5 py-2.5 text-left">
        <span className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
          {icon}
        </span>
        <span className="flex-1 text-sm font-semibold text-gray-900">{label}</span>
        <span className="text-sm text-gray-500">{value}</span>
        <span className="text-gray-300">›</span>
      </button>
      {editing && <div className="pb-3 pl-11">{children}</div>}
    </div>
  );
}

function EditForm({
  draft,
  setDraft,
  onSubmit,
  step,
  unit,
}: {
  draft: string;
  setDraft: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  step: number;
  unit: string;
}) {
  return (
    <form onSubmit={onSubmit} className="flex gap-2">
      <input
        type="number"
        step={step}
        min={0}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        autoFocus
        required
        className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm"
        placeholder={unit}
      />
      <button
        type="submit"
        className="bg-accent text-white rounded-md px-4 py-2 text-sm font-medium"
      >
        Save
      </button>
    </form>
  );
}
