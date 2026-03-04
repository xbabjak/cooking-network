import type { Unit } from "@/lib/units";
import type { Grocery } from "./types";

export function groupGroceriesByType(groceries: Grocery[]): {
  byType: Record<string, Grocery[]>;
  typeNames: string[];
} {
  const byType = groceries.reduce<Record<string, Grocery[]>>((acc, g) => {
    const typeName = g.groceryItem.groceryType?.name ?? "Other";
    if (!acc[typeName]) acc[typeName] = [];
    acc[typeName].push(g);
    return acc;
  }, {});
  const typeNames = [
    ...new Set(
      groceries.map((g) => g.groceryItem.groceryType?.name ?? "Other")
    ),
  ];
  return { byType, typeNames };
}

export function unitsToSelectData(
  units: Unit[]
): { value: string; label: string }[] {
  return units.map((u) => ({ value: u.symbol, label: u.label }));
}
