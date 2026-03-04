import type { GroceryItemOption } from "@/lib/grocery-items";

export type Grocery = {
  id: string;
  groceryItemId: string;
  groceryItem: { name: string; groceryType?: { name: string } };
  unit: string;
  quantity: number;
  lowThreshold: number;
};

export type GroceryListProps = {
  groceries: Grocery[];
  initialGroceryItems: GroceryItemOption[];
  /** Optional "Use by <date>" label per grocery id for close-to-spoiling items */
  useByByGroceryId?: Record<string, string>;
};
