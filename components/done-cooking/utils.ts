import type {
  RecipeIngredientForDone,
  RowOverride,
  DoneCookingPreviewRow,
} from "./types";

export type OneOfGroup = {
  groupId: string;
  ingredients: RecipeIngredientForDone[];
};

export function getOneOfGroups(
  recipeIngredients: RecipeIngredientForDone[]
): OneOfGroup[] {
  const withGroup = recipeIngredients.filter((ing) => ing.oneOfGroupId);
  const groupIds = [...new Set(withGroup.map((ing) => ing.oneOfGroupId!))];
  return groupIds.map((groupId) => ({
    groupId,
    ingredients: recipeIngredients.filter((ing) => ing.oneOfGroupId === groupId),
  }));
}

export function buildIngredientIdsToConsume(
  recipeIngredients: RecipeIngredientForDone[],
  oneOfGroups: OneOfGroup[],
  oneOfChoices: Record<string, string>
): string[] {
  const standaloneIds = recipeIngredients
    .filter((ing) => !ing.oneOfGroupId)
    .map((ing) => ing.id);
  const ids = [...standaloneIds];
  for (const group of oneOfGroups) {
    const chosen = oneOfChoices[group.groupId];
    if (chosen) ids.push(chosen);
    else if (group.ingredients.length > 0) ids.push(group.ingredients[0].id);
  }
  return ids;
}

export function getDeductForRow(
  row: DoneCookingPreviewRow,
  rowOverrides: Record<string, RowOverride>
): number {
  const o = rowOverrides[row.ingredientId];
  return o?.deduct ?? row.quantityToDeduct;
}

export function getIncludeForRow(
  row: DoneCookingPreviewRow,
  rowOverrides: Record<string, RowOverride>
): boolean {
  const o = rowOverrides[row.ingredientId];
  if (o !== undefined) return o.include;
  return row.inInventory;
}

export function getNewQtyForRow(
  row: DoneCookingPreviewRow,
  rowOverrides: Record<string, RowOverride>
): number {
  if (!row.inInventory) return 0;
  const deduct = getDeductForRow(row, rowOverrides);
  return Math.max(0, Math.round((row.userCurrentQuantity - deduct) * 100) / 100);
}

export function buildDeductionOverrides(
  previewRows: DoneCookingPreviewRow[] | null,
  rowOverrides: Record<string, RowOverride>
): { ingredientId: string; quantityToDeduct: number }[] {
  if (!previewRows) return [];
  return previewRows
    .filter(
      (row) => row.inInventory && getIncludeForRow(row, rowOverrides)
    )
    .map((row) => ({
      ingredientId: row.ingredientId,
      quantityToDeduct: getDeductForRow(row, rowOverrides),
    }))
    .filter((o) => o.quantityToDeduct > 0);
}
