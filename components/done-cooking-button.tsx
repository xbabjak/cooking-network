"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { notifications } from "@mantine/notifications";
import { consumeRecipeIngredients } from "@/lib/actions/groceries";

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

  async function consume(chosenIngredientIds?: string[]) {
    setError(null);
    setLoading(true);
    try {
      const result = await consumeRecipeIngredients(recipeId, postId, chosenIngredientIds);
      if (result?.error) {
        setError(result.error);
        return;
      }
      notifications.show({
        title: "Done",
        message: "Ingredients removed from your groceries.",
        color: "green",
      });
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleClick() {
    if (oneOfGroups.length > 0) {
      setOneOfChoices({});
      setDontAskAgain(false);
      setShowConfirm(true);
      return;
    }
    if (skipConfirmFromSettings) {
      await consume();
      return;
    }
    setDontAskAgain(false);
    setShowConfirm(true);
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
    await consume(ids);
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
            <p className="mt-2 text-muted-foreground text-sm">
              Quantities will be reduced from your groceries and won&apos;t go
              below zero.
            </p>
            {oneOfGroups.length > 0 && (
              <div className="mt-4 space-y-3">
                <p className="text-sm font-medium">Which ingredients did you use?</p>
                {oneOfGroups.map(({ groupId, ingredients }) => (
                  <fieldset key={groupId} className="space-y-1.5">
                    <legend className="sr-only">One of: {ingredients.map((ing) => ing.groceryItem.name).join(", ")}</legend>
                    {ingredients.map((ing) => {
                      const label = `${ing.groceryItem.name}${ing.quantity > 0 ? ` — ${ing.quantity} ${ing.unit || ""}` : ""}`;
                      return (
                        <label key={ing.id} className="flex cursor-pointer items-center gap-2">
                          <input
                            type="radio"
                            name={`oneOf-${groupId}`}
                            value={ing.id}
                            checked={(oneOfChoices[groupId] ?? ingredients[0]?.id) === ing.id}
                            onChange={() => setOneOfChoices((prev) => ({ ...prev, [groupId]: ing.id }))}
                            className="h-4 w-4 border-border"
                          />
                          <span className="text-sm">{label}</span>
                        </label>
                      );
                    })}
                  </fieldset>
                ))}
              </div>
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
                onClick={() => setShowConfirm(false)}
                className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary-hover"
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
