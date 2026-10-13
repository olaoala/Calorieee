import type { FoodResult } from "@/features/food-search/types";

export async function searchFoods(query: string): Promise<FoodResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const response = await fetch(`/api/food-search?q=${encodeURIComponent(trimmed)}`);
  if (!response.ok) throw new Error("Could not search foods.");

  const data = (await response.json()) as { results?: FoodResult[] };
  return data.results ?? [];
}
