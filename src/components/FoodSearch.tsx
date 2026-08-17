"use client";

import { useEffect, useRef, useState } from "react";
import type { FoodResult } from "@/app/api/food-search/route";
import {
  type QtyUnit,
  UNIT_OPTIONS,
  parseGramsBase,
  computeCalories,
  qtyDescriptor,
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
  const [results, setResults] = useState<FoodResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<FoodResult | null>(null);
  const [unit, setUnit] = useState<QtyUnit>("g");
  const [qty, setQty] = useState("100");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/food-search?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        setResults(data.results ?? []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const gramsBase = picked ? parseGramsBase(picked.unitLabel) : null;
  const canUseGrams = gramsBase !== null;

  function pick(r: FoodResult) {
    setPicked(r);
    setOpen(false);
    const grams = parseGramsBase(r.unitLabel);
    if (grams !== null) {
      setUnit("g");
      setQty(String(grams));
    } else {
      setUnit("piece");
      setQty("1");
    }
  }

  function confirmUse() {
    if (!picked) return;
    const qtyNum = parseFloat(qty) || 0;
    const calories = computeCalories(picked.caloriesPerUnit, gramsBase, unit, qtyNum);
    const label = `${picked.name} (${qtyDescriptor(unit, qtyNum)})`;
    onUse(label, calories);
    setPicked(null);
    setQuery("");
    setQty("100");
    setUnit("g");
  }

  const qtyNum = parseFloat(qty) || 0;
  const previewCalories = picked ? computeCalories(picked.caloriesPerUnit, gramsBase, unit, qtyNum) : 0;
  const unitChoices = canUseGrams
    ? UNIT_OPTIONS
    : UNIT_OPTIONS.filter((o) => o.value === "piece");

  return (
    <div className="relative mb-3">
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setPicked(null);
        }}
        placeholder="Search a food (e.g. jollof rice, banana, chicken breast)…"
        className="w-full border border-gray-200 rounded-md px-3 py-2.5 text-sm bg-white"
      />
      {loading && <p className="text-xs text-gray-400 mt-1">Searching…</p>}

      {open && results.length > 0 && (
        <ul className="absolute z-10 bg-white border border-gray-200 rounded-md mt-1 w-full max-h-56 overflow-y-auto shadow-lg">
          {results.map((r) => (
            <li key={`${r.source}-${r.id}`}>
              <button
                type="button"
                onClick={() => pick(r)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent-light"
              >
                <div>
                  {r.name}
                  {r.brand ? <span className="text-gray-400"> ({r.brand})</span> : null}
                </div>
                <div className="text-xs text-gray-400">
                  {Math.round(r.caloriesPerUnit)} cal / {r.unitLabel} · {SOURCE_LABEL[r.source]}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && !loading && results.length === 0 && query.trim().length >= 2 && (
        <div className="absolute z-10 bg-white border border-gray-200 rounded-md mt-1 w-full px-3 py-2 text-xs text-gray-400 shadow-lg">
          No matches — you can still add this meal manually below.
        </div>
      )}

      {picked && (
        <div className="mt-2 text-sm bg-accent-light rounded-md px-3 py-2.5">
          <div className="text-gray-700 font-medium mb-2">{picked.name}</div>

          <div className="flex gap-1.5 mb-2 flex-wrap">
            {unitChoices.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setUnit(o.value)}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                  unit === o.value ? "bg-accent text-white" : "bg-white text-gray-500"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              step={unit === "g" ? 1 : 0.5}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="w-20 border border-gray-200 rounded-md px-2 py-1.5 text-sm"
            />
            <span className="text-xs text-gray-500 flex-1">
              {unit === "g" && "grams"}
              {unit === "bigScoop" && "big scoop(s) · 50g each"}
              {unit === "smallScoop" && "small scoop(s) · 25g each"}
              {unit === "piece" && `piece(s) · ${picked.unitLabel} each`}
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
