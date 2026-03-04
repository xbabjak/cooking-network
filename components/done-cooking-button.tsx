"use client";

import { useRouter } from "next/navigation";
import { useState, useCallback, useEffect } from "react";
import { notifications } from "@mantine/notifications";
import { NumberInput, Checkbox } from "@mantine/core";
import {
  getDoneCookingPreview,
  consumeRecipeIngredients,
  type DoneCookingPreviewRow,
} from "@/lib/actions/groceries";

type RecipeIngredientForDone = {
  id: string;
  oneOfGroupId: string | null;
  groceryItem: { name: string };
  quantity: number;
  unit: string;
};

type Props = {
  recipeId: string;
  recipeName?: string;
  postId?: string;
  skipConfirmFromSettings?: boolean;
  recipeIngredients?: RecipeIngredientForDone[];
};

type RowOverride = { deduct: number; include: boolean };

export function DoneCookingButton({
  recipeId,
  recipeName,
  postId,
  skipConfirmFromSettings = false,
  recipeIngredients = [],
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [dontAskAgain, setDontAskAgain] = useState(false);
  const [oneOfChoices, setOneOfChoices] = useState<Record<string, string>>({});
  const [previewRows, setPreviewRows] = useState<DoneCookingPreviewRow[] | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [rowOverrides, setRowOverrides] = useState<Record<string, RowOverride>>({});

  const oneOfGroups = (() => {
    const withGroup = recipeIngredients.filter((ing) => ing.oneOfGroupId);
    const groupIds = [...new Set(withGroup.map((ing) => ing.oneOfGroupId!))];
    return groupIds.map((groupId) => ({
      groupId,
      ingredients: recipeIngredients.filter((ing) => ing.oneOfGroupId === groupId),
    }));
  })();

  const standaloneIds = recipeIngredients.filter((ing) => !ing.oneOfGroupId).map((ing) => ing.id);

  function buildIngredientIdsToConsume(): string[] {
    const ids = [...standaloneIds];
    for (const group of oneOfGroups) {
      const chosen = oneOfChoices[group.groupId];
      if (chosen) ids.push(chosen);
      else if (group.ingredients.length > 0) ids.push(group.ingredients[0].id);
    }
    return ids;
  }

  const fetchPreview = useCallback(async () => {
    setPreviewError(null);
    setPreviewLoading(true);
    try {
      const chosenIds = oneOfGroups.length > 0 ? buildIngredientIdsToConsume() : undefined;
      const result = await getDoneCookingPreview(recipeId, chosenIds);
      if (result.error) {
        setPreviewError(result.error);
        return;
      }
      if (result.preview) {
        setPreviewRows(result.preview);
        setRowOverrides(
          Object.fromEntries(
            result.preview.map((row) => [
              row.ingredientId,
              {
                deduct: row.quantityToDeduct,
                include: row.inInventory,
              },
            ])
          )
        );
      }
    } finally {
      setPreviewLoading(false);
    }
  }, [recipeId, oneOfGroups.length, oneOfChoices]);

  async function consume(
    chosenIngredientIds?: string[],
    deductionOverrides?: { ingredientId: string; quantityToDeduct: number }[]
  ) {
    setError(null);
    setLoading(true);
    try {
      const result = await consumeRecipeIngredients(
        recipeId,
        postId,
        chosenIngredientIds,
        deductionOverrides
      );
      if (result?.error) {
        setError(result.error);
        return;
      }
      notifications.show({
        title: "Done",
        message: "Ingredients removed from your groceries.",
        color: "green",
      });
      setShowConfirm(false);
      setPreviewRows(null);
      setRowOverrides({});
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleClick() {
    if (skipConfirmFromSettings && oneOfGroups.length === 0) {
      await consume();
      return;
    }
    setOneOfChoices({});
    setDontAskAgain(false);
    setPreviewRows(null);
    setPreviewError(null);
    setRowOverrides({});
    setShowConfirm(true);
  }

  useEffect(() => {
    if (!showConfirm) return;
    fetchPreview();
  }, [showConfirm, fetchPreview]);

  function getDeductForRow(row: DoneCookingPreviewRow): number {
    const o = rowOverrides[row.ingredientId];
    return o?.deduct ?? row.quantityToDeduct;
  }

  function getIncludeForRow(row: DoneCookingPreviewRow): boolean {
    const o = rowOverrides[row.ingredientId];
    if (o !== undefined) return o.include;
    return row.inInventory;
  }

  function getNewQtyForRow(row: DoneCookingPreviewRow): number {
    if (!row.inInventory) return 0;
    const deduct = getDeductForRow(row);
    return Math.max(0, Math.round((row.userCurrentQuantity - deduct) * 100) / 100);
  }

  function setRowOverride(ingredientId: string, patch: Partial<RowOverride>) {
    setRowOverrides((prev) => {
      const cur = prev[ingredientId] ?? { deduct: 0, include: true };
      return { ...prev, [ingredientId]: { ...cur, ...patch } };
    });
  }

  function buildDeductionOverrides(): { ingredientId: string; quantityToDeduct: number }[] {
    if (!previewRows) return [];
    return previewRows
      .filter((row) => row.inInventory && getIncludeForRow(row))
      .map((row) => ({
        ingredientId: row.ingredientId,
        quantityToDeduct: getDeductForRow(row),
      }))
      .filter((o) => o.quantityToDeduct > 0);
  }

  async function handleConfirm() {
    setShowConfirm(false);
    if (dontAskAgain) {
      try {
        await fetch("/api/user", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ skipDoneCookingConfirm: true }),
        });
      } catch {
        // continue to consume even if setting save fails
      }
    }
    const ids = oneOfGroups.length > 0 ? buildIngredientIdsToConsume() : undefined;
    const overrides = buildDeductionOverrides();
    await consume(ids, overrides);
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="px-4 py-2 bg-primary hover:bg-primary-hover text-primary-foreground font-medium rounded-md disabled:opacity-50"
      >
        {loading ? "Removing…" : "I'm done cooking"}
      </button>
      {error && (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
        >
          <div className="mx-4 w-full max-w-md rounded-lg border border-border bg-background p-4 shadow-lg max-h-[90vh] overflow-y-auto">
            <h2 id="confirm-title" className="font-semibold text-lg">
              Remove ingredients from inventory?
            </h2>

            {oneOfGroups.length > 0 && (
              <>
                <p className="mt-2 text-muted-foreground text-sm">
                  Which ingredients did you use?
                </p>
                <div className="mt-3 space-y-3">
                  {oneOfGroups.map(({ groupId, ingredients }) => (
                    <fieldset key={groupId} className="space-y-1.5">
                      <legend className="sr-only">
                        One of: {ingredients.map((ing) => ing.groceryItem.name).join(", ")}
                      </legend>
                      {ingredients.map((ing) => {
                        const label = `${ing.groceryItem.name}${ing.quantity > 0 ? ` — ${ing.quantity} ${ing.unit || ""}` : ""}`;
                        return (
                          <label key={ing.id} className="flex cursor-pointer items-center gap-2">
                            <input
                              type="radio"
                              name={`oneOf-${groupId}`}
                              value={ing.id}
                              checked={(oneOfChoices[groupId] ?? ingredients[0]?.id) === ing.id}
                              onChange={() =>
                                setOneOfChoices((prev) => ({ ...prev, [groupId]: ing.id }))
                              }
                              className="h-4 w-4 border-border"
                            />
                            <span className="text-sm">{label}</span>
                          </label>
                        );
                      })}
                    </fieldset>
                  ))}
                </div>
              </>
            )}

            {previewLoading && (
              <p className="mt-3 text-sm text-muted-foreground">Loading preview…</p>
            )}
            {previewError && (
              <p className="mt-3 text-sm text-destructive" role="alert">
                {previewError}
              </p>
            )}
            {!previewLoading && previewRows && previewRows.length > 0 && (
              <div className="mt-3 space-y-3">
                <p className="text-sm font-medium">Changes to your inventory</p>
                <ul className="space-y-3">
                  {previewRows.map((row) => (
                    <li
                      key={row.ingredientId}
                      className="border border-border rounded-md p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{row.groceryItemName}</span>
                        <span className="text-muted-foreground text-sm">
                          Recipe: {row.recipeQuantity} {row.recipeUnit || ""}
                        </span>
                      </div>
                      {row.inInventory ? (
                        <>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                            <span className="text-muted-foreground">
                              Current: {row.userCurrentQuantity} {row.userUnit}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <label className="text-muted-foreground">Deduct:</label>
                              <NumberInput
                                min={0}
                                max={row.userCurrentQuantity}
                                step={0.25}
                                value={getDeductForRow(row)}
                                onChange={(v) => {
                                  const n =
                                    typeof v === "string" ? parseFloat(v) : v;
                                  setRowOverride(row.ingredientId, {
                                    deduct: Number.isFinite(n) ? n : 0,
                                  });
                                }}
                                className="w-20"
                                size="xs"
                              />
                              <span className="font-medium text-foreground">
                                {row.userUnit}
                              </span>
                            </div>
                            <span className="text-muted-foreground">
                              New: {getNewQtyForRow(row)} {row.userUnit}
                            </span>
                          </div>
                          <Checkbox
                            size="xs"
                            label="Include in deduction"
                            checked={getIncludeForRow(row)}
                            onChange={(e) =>
                              setRowOverride(row.ingredientId, {
                                include: e.currentTarget.checked,
                              })
                            }
                          />
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">Not in inventory</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {!previewLoading && previewRows && previewRows.length === 0 && (
              <p className="mt-3 text-sm text-muted-foreground">
                No ingredients to show.
              </p>
            )}

            <label className="mt-4 flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                id="done-cooking-dont-ask"
                className="h-4 w-4 rounded border-border"
                checked={dontAskAgain}
                onChange={(e) => setDontAskAgain(e.target.checked)}
              />
              <span className="text-sm">Don&apos;t ask me again</span>
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowConfirm(false);
                  setPreviewRows(null);
                  setRowOverrides({});
                }}
                className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={previewLoading}
                className="px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary-hover disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
