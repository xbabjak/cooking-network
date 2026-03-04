export type RecipeIngredientForDone = {
  id: string;
  oneOfGroupId: string | null;
  groceryItem: { name: string };
  quantity: number;
  unit: string;
};

export type DoneCookingButtonProps = {
  recipeId: string;
  recipeName?: string;
  postId?: string;
  skipConfirmFromSettings?: boolean;
  recipeIngredients?: RecipeIngredientForDone[];
  servings?: number;
};

export type RowOverride = { deduct: number; include: boolean };

export type { DoneCookingPreviewRow } from "@/lib/actions/groceries";
