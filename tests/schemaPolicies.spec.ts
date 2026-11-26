import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const schema = readFileSync(new URL("../supabase/schema.sql", import.meta.url), "utf8");

function getPolicyClauses(name: string) {
  const policy = schema.match(
    new RegExp(`create policy "${name}"[\\s\\S]*?for all using \\(([\\s\\S]*?)\\)\\s+with check \\(([\\s\\S]*?)\\);`, "i")
  );

  expect(policy, `expected policy ${name} in schema.sql`).not.toBeNull();
  return [policy![1], policy![2]];
}

describe("declared row-level security policies", () => {
  it("requires meal schedule references to be NULL or owned by the caller", () => {
    const [using, withCheck] = getPolicyClauses("meals: owner read/write");

    expect(using).toMatch(/auth\.uid\(\)\s*=\s*user_id/i);
    expect(withCheck).toMatch(/auth\.uid\(\)\s*=\s*user_id/i);
    expect(withCheck).toMatch(/schedule_id\s+is\s+null/i);
    expect(withCheck).toMatch(
      /s\.id\s*=\s*schedule_id\s+and\s+s\.user_id\s*=\s*auth\.uid\(\)/i
    );
  });

  it("requires meal plan items to reference caller-owned plans and templates", () => {
    const [using, withCheck] = getPolicyClauses("meal_plan_items: owner read/write");

    for (const clause of [using, withCheck]) {
      expect(clause).toMatch(/p\.id\s*=\s*plan_id\s+and\s+p\.user_id\s*=\s*auth\.uid\(\)/i);
      expect(clause).toMatch(
        /t\.id\s*=\s*template_id\s+and\s+t\.user_id\s*=\s*auth\.uid\(\)/i
      );
    }
  });
});
