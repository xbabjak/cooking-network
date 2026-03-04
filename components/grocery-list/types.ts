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
};
