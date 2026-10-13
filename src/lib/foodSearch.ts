import type { FoodResult } from "@/features/food-search/types";

export function mergeFoodResults(
  local: FoodResult[] = [],
  usda: FoodResult[] = [],
  off: FoodResult[] = [],
  limit = 20
): FoodResult[] {
  const deduped = new Map<string, FoodResult>();

  for (const item of [...local, ...usda, ...off]) {
    const normalizedKey = `${item.name.toLowerCase().trim()}::${(item.brand ?? "").toLowerCase().trim()}`;
    const existing = deduped.get(normalizedKey);

    if (!existing || (existing.source !== "local" && item.source === "local")) {
      deduped.set(normalizedKey, item);
    }
  }

  return [...deduped.values()]
    .sort((a, b) => {
      const sourceOrder = { local: 0, usda: 1, off: 2 };
      return (sourceOrder[a.source] ?? 99) - (sourceOrder[b.source] ?? 99);
    })
    .slice(0, limit);
}
