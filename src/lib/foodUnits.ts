export interface ApiServing {
  quantity: number;
  unit: string;
}

export function parseApiServing(unitLabel: string): ApiServing {
  const match = unitLabel.match(/^\s*(\d+(?:\.\d+)?)\s*(.*)$/);
  return {
    quantity: match ? parseFloat(match[1]) : 1,
    unit: match?.[2]?.trim() || "serving",
  };
}

export function formatQuantity(quantity: number): string {
  return quantity % 1 === 0 ? String(quantity) : String(Math.round(quantity * 10) / 10);
}

export function computeCaloriesFromApiUnit(
  caloriesPerUnit: number,
  apiQuantity: number,
  quantity: number
): number {
  return Math.max(0, Math.round((caloriesPerUnit / apiQuantity) * quantity));
}
