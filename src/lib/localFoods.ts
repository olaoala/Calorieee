import type { FoodResult } from "@/app/api/food-search/route";

// A curated set of common Nigerian and wider West/East African dishes.
// General food databases (USDA, Open Food Facts) have poor coverage of
// these, so we keep our own small dataset and merge it into search results.
// Calorie figures are reasonable estimates for a typical home-cooked
// serving (as-prepared, including oil where relevant) — not lab-measured.
export const LOCAL_FOODS: FoodResult[] = [
  { id: "jollof-rice", source: "local", name: "Jollof Rice", caloriesPerUnit: 200, unitLabel: "100 g" },
  { id: "ofada-rice-stew", source: "local", name: "Ofada Rice & Ayamase Stew", caloriesPerUnit: 230, unitLabel: "100 g" },
  { id: "jollof-spaghetti", source: "local", name: "Jollof Spaghetti", caloriesPerUnit: 180, unitLabel: "100 g" },
  { id: "egusi-soup", source: "local", name: "Egusi Soup", caloriesPerUnit: 250, unitLabel: "100 g" },
  { id: "efo-riro", source: "local", name: "Efo Riro", caloriesPerUnit: 120, unitLabel: "100 g" },
  { id: "ogbono-soup", source: "local", name: "Ogbono Soup", caloriesPerUnit: 200, unitLabel: "100 g" },
  { id: "okra-soup", source: "local", name: "Okra Soup", caloriesPerUnit: 110, unitLabel: "100 g" },
  { id: "bitterleaf-soup", source: "local", name: "Bitterleaf Soup (Ofe Onugbu)", caloriesPerUnit: 130, unitLabel: "100 g" },
  { id: "banga-soup", source: "local", name: "Banga Soup", caloriesPerUnit: 220, unitLabel: "100 g" },
  { id: "pepper-soup", source: "local", name: "Pepper Soup", caloriesPerUnit: 70, unitLabel: "100 g" },
  { id: "pounded-yam", source: "local", name: "Pounded Yam", caloriesPerUnit: 120, unitLabel: "100 g" },
  { id: "amala", source: "local", name: "Amala", caloriesPerUnit: 110, unitLabel: "100 g" },
  { id: "fufu", source: "local", name: "Fufu (Cassava)", caloriesPerUnit: 150, unitLabel: "100 g" },
  { id: "eba-garri", source: "local", name: "Eba (Garri)", caloriesPerUnit: 110, unitLabel: "100 g" },
  { id: "semovita", source: "local", name: "Semovita / Semo", caloriesPerUnit: 115, unitLabel: "100 g" },
  { id: "yam-porridge", source: "local", name: "Yam Porridge (Asaro)", caloriesPerUnit: 150, unitLabel: "100 g" },
  { id: "beans-porridge", source: "local", name: "Beans Porridge (Ewa Aganyin)", caloriesPerUnit: 140, unitLabel: "100 g" },
  { id: "moin-moin", source: "local", name: "Moin Moin", caloriesPerUnit: 180, unitLabel: "100 g" },
  { id: "akara", source: "local", name: "Akara (Bean Cakes)", caloriesPerUnit: 330, unitLabel: "1 piece (40g)" },
  { id: "suya", source: "local", name: "Suya", caloriesPerUnit: 250, unitLabel: "100 g" },
  { id: "nkwobi", source: "local", name: "Nkwobi", caloriesPerUnit: 280, unitLabel: "100 g" },
  { id: "isi-ewu", source: "local", name: "Isi Ewu", caloriesPerUnit: 250, unitLabel: "100 g" },
  { id: "abacha", source: "local", name: "Abacha (African Salad)", caloriesPerUnit: 180, unitLabel: "100 g" },
  { id: "dodo", source: "local", name: "Fried Plantain (Dodo)", caloriesPerUnit: 250, unitLabel: "100 g" },
  { id: "boiled-plantain", source: "local", name: "Boiled Plantain", caloriesPerUnit: 120, unitLabel: "100 g" },
  { id: "kelewele", source: "local", name: "Kelewele (Spiced Fried Plantain)", caloriesPerUnit: 260, unitLabel: "100 g" },
  { id: "chin-chin", source: "local", name: "Chin Chin", caloriesPerUnit: 450, unitLabel: "100 g" },
  { id: "puff-puff", source: "local", name: "Puff Puff", caloriesPerUnit: 300, unitLabel: "1 piece (30g)" },
  { id: "meat-pie", source: "local", name: "Nigerian Meat Pie", caloriesPerUnit: 350, unitLabel: "1 piece (150g)" },
  { id: "fried-rice-naija", source: "local", name: "Nigerian Fried Rice", caloriesPerUnit: 190, unitLabel: "100 g" },
  { id: "waakye", source: "local", name: "Waakye", caloriesPerUnit: 180, unitLabel: "100 g" },
  { id: "injera", source: "local", name: "Injera", caloriesPerUnit: 85, unitLabel: "100 g" },
  { id: "ugali", source: "local", name: "Ugali", caloriesPerUnit: 120, unitLabel: "100 g" },
  { id: "jollof-couscous", source: "local", name: "Couscous", caloriesPerUnit: 165, unitLabel: "100 g" },
  { id: "zobo", source: "local", name: "Zobo Drink", caloriesPerUnit: 45, unitLabel: "100 g" },
];

export function searchLocalFoods(query: string): FoodResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return LOCAL_FOODS.filter((f) => f.name.toLowerCase().includes(q));
}
