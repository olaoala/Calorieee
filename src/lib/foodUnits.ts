export type QtyUnit = "g" | "bigScoop" | "smallScoop" | "piece";

export const SCOOP_GRAMS: Record<"bigScoop" | "smallScoop", number> = {
  bigScoop: 50,
  smallScoop: 25,
};

export const UNIT_OPTIONS: { value: QtyUnit; label: string }[] = [
  { value: "g", label: "Grams" },
  { value: "bigScoop", label: "Big scoop" },
  { value: "smallScoop", label: "Small scoop" },
  { value: "piece", label: "Pieces" },
];

// Pulls a grams figure out of API unit labels like "100 g", "240g", or
// "1 serving (30g)" so we can compute calories-per-gram. Returns null when
// the label isn't grams-based (e.g. "1 cup"), in which case only the
// "Pieces" unit (a straight multiplier on the API's own serving) applies.
export function parseGramsBase(unitLabel: string): number | null {
  const match = unitLabel.match(/(\d+(?:\.\d+)?)\s*g\b/i);
  return match ? parseFloat(match[1]) : null;
}

export function computeCalories(
  caloriesPerUnit: number,
  gramsBase: number | null,
  unit: QtyUnit,
  qty: number
): number {
  if (unit === "piece" || gramsBase === null) {
    return Math.round(caloriesPerUnit * qty);
  }
  const caloriesPerGram = caloriesPerUnit / gramsBase;
  if (unit === "g") return Math.round(caloriesPerGram * qty);
  return Math.round(caloriesPerGram * SCOOP_GRAMS[unit] * qty);
}

export function qtyDescriptor(unit: QtyUnit, qty: number): string {
  const n = qty % 1 === 0 ? qty : Math.round(qty * 10) / 10;
  switch (unit) {
    case "g":
      return `${n}g`;
    case "bigScoop":
      return `${n} big scoop${n === 1 ? "" : "s"} (${n * SCOOP_GRAMS.bigScoop}g)`;
    case "smallScoop":
      return `${n} small scoop${n === 1 ? "" : "s"} (${n * SCOOP_GRAMS.smallScoop}g)`;
    case "piece":
      return `${n} pc${n === 1 ? "" : "s"}`;
  }
}
