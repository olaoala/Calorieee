"use client";

import { useState } from "react";
import { useFoodSearch } from "@/features/food-search/hooks/useFoodSearch";
import type { FoodResult } from "@/features/food-search/types";
import {
  computeCaloriesFromApiUnit,
  formatQuantity,
  parseApiServing,
} from "@/lib/foodUnits";

interface FoodSearchProps {
  onUse: (name: string, calories: number) => void;
}

const SOURCE_LABEL: Record<FoodResult["source"], string> = {
  usda: "USDA",
  off: "Open Food Facts",
  local: "Nigerian & African",
};

export default function FoodSearch({ onUse }: FoodSearchProps) {
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<FoodResult | null>(null);
  const [qty, setQty] = useState("1");
  const { results, loading, open, error, setOpen } = useFoodSearch(query);

  const apiServing = picked ? parseApiServing(picked.unitLabel) : null;

  function pick(result: FoodResult) {
    setPicked(result);
    setOpen(false);
    setQty(String(parseApiServing(result.unitLabel).quantity));
  }

  function confirmUse() {
    if (!picked) return;
    if (!apiServing) return;
    const qtyNum = parseFloat(qty) || 0;
    const calories = computeCaloriesFromApiUnit(picked.caloriesPerUnit, apiServing.quantity, qtyNum);
    const label = `${picked.name} (${formatQuantity(qtyNum)} ${apiServing.unit})`;
    onUse(label, calories);
    setPicked(null);
    setQuery("");
    setQty("1");
  }

  const qtyNum = parseFloat(qty) || 0;
  const previewCalories = picked && apiServing
    ? computeCaloriesFromApiUnit(picked.caloriesPerUnit, apiServing.quantity, qtyNum)
    : 0;

  return (
    <div className="relative mb-3">
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setPicked(null);
        }}
        placeholder="Search a food (e.g. jollof rice, banana, chicken breast)..."
        className="w-full border border-gray-200 rounded-md px-3 py-2.5 text-sm bg-white"
      />
      {loading && <p className="text-xs text-gray-400 mt-1">Searching...</p>}
      {error && <p className="text-xs text-danger mt-1">{error}</p>}

      {open && results.length > 0 && (
        <ul className="absolute z-10 bg-white border border-gray-200 rounded-md mt-1 w-full max-h-56 overflow-y-auto shadow-lg">
          {results.map((result) => (
            <li key={`${result.source}-${result.id}`}>
              <button
                type="button"
                onClick={() => pick(result)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent-light"
              >
                <div>
                  {result.name}
                  {result.brand ? <span className="text-gray-400"> ({result.brand})</span> : null}
                </div>
                <div className="text-xs text-gray-400">
                  {Math.round(result.caloriesPerUnit)} cal / {result.unitLabel} -{" "}
                  {SOURCE_LABEL[result.source]}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && !loading && results.length === 0 && query.trim().length >= 2 && (
        <div className="absolute z-10 bg-white border border-gray-200 rounded-md mt-1 w-full px-3 py-2 text-xs text-gray-400 shadow-lg">
          No matches - you can still add this meal manually below.
        </div>
      )}

      {picked && (
        <div className="mt-2 text-sm bg-accent-light rounded-md px-3 py-2.5">
          <div className="text-gray-700 font-medium mb-2">{picked.name}</div>

          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              step="any"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="w-20 border border-gray-200 rounded-md px-2 py-1.5 text-sm"
            />
            <span className="text-xs text-gray-500 flex-1">
              {apiServing ? `API serving: ${picked.unitLabel}` : ""}
            </span>
            <button
              type="button"
              onClick={confirmUse}
              className="bg-accent text-white rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap"
            >
              Use ({previewCalories} cal)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
