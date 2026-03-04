import type { GroceryItemOption } from "@/lib/grocery-items";

export type Ingredient = {
  rowId: string;
  groceryItemId?: string;
  groceryItemName?: string;
  quantity: number;
  unit: string;
  optional?: boolean;
  oneOfGroupId?: string | null;
};

export type PostFormProps = {
  postId?: string;
  initialTitle?: string;
  initialContent?: string;
  initialImageUrls?: string[];
  initialType?: "story" | "recipe";
  initialPostPrivate?: boolean;
  initialRecipe?: {
    name: string;
    description: string;
    imageUrl?: string;
    servings?: number;
    isPrivate?: boolean;
    ingredients: Omit<Ingredient, "rowId">[];
  };
  initialGroceryItems: GroceryItemOption[];
};
