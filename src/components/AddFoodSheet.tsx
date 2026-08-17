"use client";

import { useState } from "react";
import { X } from "lucide-react";
import FoodSearch from "@/components/FoodSearch";
import type { MealTypeMeta } from "@/lib/mealMeta";
import type { Meal } from "@/lib/types";

interface AddFoodSheetProps {
  open: boolean;
  meta: MealTypeMeta | null;
  items: Meal[];
  onClose: () => void;
  onAdd: (name: string, calories: number) => Promise<void> | void;
  onRemove: (id: string) => Promise<void> | void;
}

export default function AddFoodSheet({
  open,
  meta,
  items,
  onClose,
  onAdd,
  onRemove,
}: AddFoodSheetProps) {
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const cal = parseInt(calories, 10);
    if (!name.trim() || isNaN(cal)) return;
    setSaving(true);
    await onAdd(name.trim(), cal);
    setName("");
    setCalories("");
    setSaving(false);
  }

  const subtotal = items.reduce((s, m) => s + m.calories, 0);

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/45 transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />
      <div
        className={`fixed left-0 right-0 bottom-0 z-50 mx-auto max-w-2xl bg-gray-50 rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out flex flex-col ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ maxHeight: "94dvh", height: "94dvh" }}
      >
        <div className="w-10 h-1.5 bg-gray-300 rounded-full mx-auto mt-3 shrink-0" />
        <div className="flex items-center justify-between px-5 pt-3 pb-2 shrink-0">
          <h2 className="text-base font-bold text-gray-900">
            Add to {meta?.label ?? "meal"}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full bg-white shadow-card flex items-center justify-center text-gray-500"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 pb-6 overflow-y-auto flex-1 min-h-0">
          {items.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl mb-4 overflow-hidden">
              <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-gray-100">
                <span className="text-xs font-semibold text-gray-500">
                  Already logged · {items.length} item{items.length > 1 ? "s" : ""}
                </span>
                <span className="text-xs font-bold text-gray-700">{subtotal} cal</span>
              </div>
              <ul className="flex flex-col divide-y divide-gray-100 max-h-40 overflow-y-auto">
                {items.map((m) => (
                  <li
                    key={m.id}
                    className="flex justify-between items-center px-3.5 py-2 text-sm"
                  >
                    <span className="text-gray-800 truncate">{m.name}</span>
                    <span className="flex items-center gap-3 shrink-0">
                      <span className="text-gray-500 text-xs">{m.calories} cal</span>
                      <button
                        onClick={() => onRemove(m.id)}
                        aria-label={`Remove ${m.name}`}
                        className="text-gray-300 hover:text-danger"
                      >
                        <X size={13} />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <FoodSearch
            onUse={(foodName, cal) => {
              setName(foodName);
              setCalories(String(cal));
            }}
          />
          <form onSubmit={submit} className="flex flex-wrap gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Food name"
              required
              className="flex-1 min-w-[140px] border border-gray-200 rounded-md px-3 py-2.5 text-sm bg-white"
            />
            <input
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              type="number"
              min={0}
              placeholder="Calories"
              required
              className="w-24 border border-gray-200 rounded-md px-3 py-2.5 text-sm bg-white"
            />
            <button
              type="submit"
              disabled={saving}
              className="flex-1 sm:flex-none bg-accent text-white rounded-md px-4 py-2.5 text-sm font-medium disabled:opacity-60"
            >
              Add item
            </button>
          </form>
          <p className="text-xs text-gray-400 mt-2">
            Keeps this sheet open so you can log the whole meal, one item at a time.
          </p>
        </div>
      </div>
    </>
  );
}
