import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { mergeFoodResults } from "../src/lib/foodSearch";
import { buildDailyTotals } from "../src/lib/mealTotals";
import { isReminderDue } from "../src/lib/reminderScheduling";

const schemaSql = readFileSync(new URL("../supabase/schema.sql", import.meta.url), "utf8");

describe("data-growth checks", () => {
  it("builds totals for large day ranges without blowing up", () => {
    const start = performance.now();
    const baseMeals = Array.from({ length: 10000 }, (_, index) => ({
      date: `2024-01-${String((index % 30) + 1).padStart(2, "0")}`,
      calories: (index % 7) + 200,
    }));

    const totals = buildDailyTotals(baseMeals);
    const elapsed = performance.now() - start;

    expect(totals.length).toBeLessThanOrEqual(30);
    expect(totals.reduce((sum, entry) => sum + entry.total, 0)).toBe(
      baseMeals.reduce((sum, meal) => sum + meal.calories, 0)
    );
    expect(elapsed).toBeLessThan(1000);
  });
});

describe("database policy and index checks", () => {
  it("keeps user-scoped row-level security and growth-friendly indexes in the schema", () => {
    expect(schemaSql).toContain("alter table public.profiles enable row level security;");
    expect(schemaSql).toContain("alter table public.meals enable row level security;");
    expect(schemaSql).toContain("create index if not exists meals_user_date_idx on public.meals (user_id, date);");
    expect(schemaSql).toContain("create policy \"profiles: owner read/write\" on public.profiles");
    expect(schemaSql).toContain("auth.uid() = user_id");
    expect(schemaSql).toContain("create index if not exists weight_logs_user_date_idx on public.weight_logs (user_id, date);");
  });
});

describe("reminder scheduling", () => {
  it("fires on time and ignores duplicates for the same day", () => {
    const now = new Date("2024-01-01T08:00:00Z");
    expect(isReminderDue(now, "Africa/Lagos", "09:00", null)).toBe(true);
    expect(isReminderDue(now, "Africa/Lagos", "09:00", "2024-01-01")).toBe(false);
    expect(isReminderDue(now, "Africa/Lagos", "09:15", null)).toBe(false);
  });
});

describe("food search scalability", () => {
  it("prioritizes local matches but still merges provider results without duplicates", () => {
    const local = [
      { id: "l1", source: "local", name: "Eba", caloriesPerUnit: 200, unitLabel: "1 serving" },
    ] as const;
    const usda = [
      { id: "u1", source: "usda", name: "Rice", caloriesPerUnit: 180, unitLabel: "100 g" },
    ] as const;
    const off = [
      { id: "u1", source: "off", name: "Rice", caloriesPerUnit: 180, unitLabel: "100 g" },
      { id: "o1", source: "off", name: "Yam", caloriesPerUnit: 150, unitLabel: "100 g" },
    ] as const;

    const merged = mergeFoodResults(local as any, usda as any, off as any, 10);

    expect(merged[0].source).toBe("local");
    expect(merged.map((item) => item.name)).toContain("Rice");
    expect(merged.filter((item) => item.name === "Rice")).toHaveLength(1);
    expect(merged.some((item) => item.name === "Yam")).toBe(true);
  });
});
