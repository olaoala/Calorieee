export type MealTotalRow = {
  date: string;
  total: number;
};

export type MealWithCalories = {
  date: string;
  calories: number;
};

export function buildDailyTotals(meals: MealWithCalories[]): MealTotalRow[] {
  const totals = new Map<string, number>();

  for (const meal of meals) {
    totals.set(meal.date, (totals.get(meal.date) ?? 0) + meal.calories);
  }

  return [...totals.entries()]
    .map(([date, total]) => ({ date, total }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}
