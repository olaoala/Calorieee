import { NextRequest, NextResponse } from "next/server";
import { searchLocalFoods } from "@/lib/localFoods";
import type { FoodResult } from "@/features/food-search/types";

interface UsdaNutrient {
  nutrientName?: string;
  unitName?: string;
  value?: number;
}

interface UsdaFood {
  fdcId: number;
  description: string;
  dataType?: string;
  brandOwner?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodNutrients?: UsdaNutrient[];
}

interface OffNutriments {
  "energy-kcal_100g"?: number;
  "energy-kcal_serving"?: number;
}

interface OffProduct {
  code?: string;
  product_name?: string;
  generic_name?: string;
  brands?: string;
  serving_size?: string;
  nutriments?: OffNutriments;
}

const FDC_API_KEY = process.env.FDC_API_KEY || "DEMO_KEY";

async function searchUSDA(query: string): Promise<FoodResult[]> {
  try {
    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(
      query
    )}&pageSize=8&api_key=${FDC_API_KEY}`;
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) return [];
    const data: { foods?: UsdaFood[] } = await res.json();
    const foods = data.foods ?? [];

    return foods
      .map((f): FoodResult | null => {
        const energy = (f.foodNutrients ?? []).find(
          (n) => n.nutrientName === "Energy" && n.unitName === "KCAL"
        );
        if (!energy || typeof energy.value !== "number") return null;

        const isBranded = f.dataType === "Branded";
        const unitLabel =
          isBranded && f.servingSize && f.servingSizeUnit
            ? `${f.servingSize}${f.servingSizeUnit}`
            : "100 g";

        return {
          id: String(f.fdcId),
          source: "usda",
          name: f.description,
          brand: f.brandOwner,
          caloriesPerUnit: energy.value,
          unitLabel,
        };
      })
      .filter((f): f is FoodResult => f !== null);
  } catch {
    return [];
  }
}

async function searchOFF(query: string): Promise<FoodResult[]> {
  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
      query
    )}&search_simple=1&action=process&json=1&page_size=8`;
    const res = await fetch(url, {
      headers: { "User-Agent": "CalorieTracker/1.0 (personal project)" },
      next: { revalidate: 0 },
    });
    if (!res.ok) return [];
    const data: { products?: OffProduct[] } = await res.json();
    const products = data.products ?? [];

    return products
      .map((p): FoodResult | null => {
        const name = p.product_name || p.generic_name;
        if (!name) return null;

        const kcalServing = p.nutriments?.["energy-kcal_serving"];
        const kcal100 = p.nutriments?.["energy-kcal_100g"];

        if (typeof kcalServing === "number" && p.serving_size) {
          return {
            id: p.code ?? name,
            source: "off",
            name,
            brand: p.brands,
            caloriesPerUnit: kcalServing,
            unitLabel: `1 serving (${p.serving_size})`,
          };
        }
        if (typeof kcal100 === "number") {
          return {
            id: p.code ?? name,
            source: "off",
            name,
            brand: p.brands,
            caloriesPerUnit: kcal100,
            unitLabel: "100 g",
          };
        }
        return null;
      })
      .filter((f): f is FoodResult => f !== null);
  } catch {
    return [];
  }
}

// Combines two free food databases so we get good coverage of both
// generic/whole foods (USDA FoodData Central) and packaged/branded
// products (Open Food Facts), without paying for a commercial API.
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const local = searchLocalFoods(q);
  const [usda, off] = await Promise.all([searchUSDA(q), searchOFF(q)]);

  // Local (Nigerian/African) matches lead, since general databases cover
  // USDA/OFF territory well already but barely touch these dishes.
  const results = [...local.slice(0, 8), ...usda.slice(0, 6), ...off.slice(0, 6)];

  return NextResponse.json({ results });
}
