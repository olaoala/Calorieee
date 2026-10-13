export interface FoodResult {
  id: string;
  source: "usda" | "off" | "local";
  name: string;
  brand?: string;
  caloriesPerUnit: number;
  unitLabel: string;
}
