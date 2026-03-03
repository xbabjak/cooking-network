"use client";

import { TextInput } from "@mantine/core";
import { useMemo } from "react";
import type { GroceryItemOption } from "@/lib/grocery-items";
import type { Unit } from "@/lib/units";
import { IngredientRow } from "./ingredient-row";
import type { Ingredient } from "./types";

type RecipeFieldsProps = {
  recipeName: string;
  setRecipeName: (v: string) => void;
  recipeDescription: string;
  setRecipeDescription: (v: string) => void;
  recipeImageUrl: string;
  setRecipeImageUrl: (v: string) => void;
  ingredients: Ingredient[];
  groceryItemsMap: Record<string, GroceryItemOption[]>;
  initialGroceryItems: GroceryItemOption[];
  allowedUnitsCache: Record<string, Unit[]>;
  defaultUnitOptions: Unit[];
  addIngredient: () => void;
  updateIngredient: (
    i: number,
    field: keyof Omit<Ingredient, "rowId">,
    value: string | number | boolean | undefined | null
  ) => void;
  setIngredientGroceryItem: (
    i: number,
    item: GroceryItemOption | null,
    typedValue?: string
  ) => Promise<void>;
  removeIngredient: (i: number) => void;
  fetchGroceryItems: (rowId: string, search: string) => Promise<GroceryItemOption[]>;
};

export function RecipeFields({
  recipeName,
  setRecipeName,
  recipeDescription,
  setRecipeDescription,
  recipeImageUrl,
  setRecipeImageUrl,
  ingredients,
  groceryItemsMap,
  initialGroceryItems,
  allowedUnitsCache,
  defaultUnitOptions,
  addIngredient,
  updateIngredient,
  setIngredientGroceryItem,
  removeIngredient,
  fetchGroceryItems,
}: RecipeFieldsProps) {
  const oneOfGroupOptions = useMemo(() => {
    const seen = new Set<string>();
    const out: { value: string; label: string }[] = [];
    for (const ing of ingredients) {
      if (!ing.oneOfGroupId) continue;
      const name = (ing.groceryItemName?.trim() || "").slice(0, 30) || "?";
      if (!seen.has(ing.oneOfGroupId)) {
        seen.add(ing.oneOfGroupId);
        out.push({ value: ing.oneOfGroupId, label: `One of: ${name}` });
      }
    }
    return [
      { value: "", label: "—" },
      { value: "__new__", label: "New 'one of' group" },
      ...out,
    ];
  }, [ingredients]);

  return (
    <div className="space-y-3 p-4 border border-border rounded-lg bg-surface-alt">
      <h3 className="font-medium">Recipe details</h3>
      <TextInput
        label="Recipe name"
        value={recipeName}
        onChange={(e) => setRecipeName(e.currentTarget.value)}
      />
      <TextInput
        label="Description"
        value={recipeDescription}
        onChange={(e) => setRecipeDescription(e.currentTarget.value)}
      />
      <div>
        <label className="block text-sm font-medium mb-1">
          Preview picture URL
        </label>
        <TextInput
          type="url"
          value={recipeImageUrl}
          onChange={(e) => setRecipeImageUrl(e.currentTarget.value)}
          placeholder="https://..."
          className="flex-1"
        />
        {recipeImageUrl.startsWith("http") && (
          <div className="mt-2">
            <img
              src={recipeImageUrl}
              alt=""
              className="h-20 w-20 object-cover rounded"
            />
          </div>
        )}
      </div>
      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="text-sm">Ingredients</label>
          <button
            type="button"
            onClick={addIngredient}
            className="shrink-0 px-3 py-1.5 text-sm border border-border text-primary hover:bg-hover rounded-md"
          >
            + Add
          </button>
        </div>
        {ingredients.map((ing, i) => (
          <IngredientRow
            key={ing.rowId}
            ingredient={ing}
            index={i}
            items={groceryItemsMap[ing.rowId] ?? initialGroceryItems}
            allowedUnitsCache={allowedUnitsCache}
            defaultUnitOptions={defaultUnitOptions}
            oneOfGroupOptions={oneOfGroupOptions}
            onFetchGroceryItems={fetchGroceryItems}
            onSetGroceryItem={setIngredientGroceryItem}
            onUpdate={updateIngredient}
            onRemove={removeIngredient}
          />
        ))}
      </div>
    </div>
  );
}
