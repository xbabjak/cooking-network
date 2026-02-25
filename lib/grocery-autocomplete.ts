import type { GroceryItemOption } from "@/lib/grocery-items";

/** Group items by type for Mantine Autocomplete dropdown (sections with type labels). */
export function groupGroceryItemsForAutocomplete(
  items: GroceryItemOption[]
): Array<{ group: string; items: string[] }> {
  const byType = new Map<string, string[]>();
  const order: string[] = [];
  for (const item of items) {
    const type = item.groceryTypeName;
    if (!byType.has(type)) {
      byType.set(type, []);
      order.push(type);
    }
    byType.get(type)!.push(item.name);
  }
  return order.map((group) => ({ group, items: byType.get(group)! }));
}
