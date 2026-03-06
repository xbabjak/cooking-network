"use client";

import { useState, useEffect } from "react";
import { NumberInput } from "@mantine/core";
import { DoneCookingButton } from "@/components/done-cooking";
import { BookmarkButton } from "@/components/bookmark-button";
import { RecipeLikeDislike } from "@/components/recipe-like-dislike";

type RecipeIngredient = {
  id: string;
  oneOfGroupId: string | null;
  optional?: boolean;
  quantity: number;
  unit: string;
  groceryItem: { name: string };
};

type RecipeWithServingsProps = {
  recipe: {
    id: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
    servings: number | null;
    ingredients: RecipeIngredient[];
  };
  postId: string;
  skipDoneCookingConfirm: boolean;
  userCookCount: number;
  bookmarkExists: boolean;
  likeCount?: number;
  dislikeCount?: number;
  userReaction?: "like" | "dislike" | null;
  hasUser: boolean;
};

function formatScaledQuantity(qty: number): string {
  if (Number.isInteger(qty)) return String(qty);
  const rounded = Math.round(qty * 100) / 100;
  return String(rounded);
}

export function RecipeWithServings({
  recipe,
  postId,
  skipDoneCookingConfirm,
  userCookCount,
  bookmarkExists,
  likeCount = 0,
  dislikeCount = 0,
  userReaction = null,
  hasUser,
}: RecipeWithServingsProps) {
  const baseServings = recipe.servings != null && recipe.servings > 0 ? recipe.servings : 1;
  const [servings, setServings] = useState(baseServings);

  // Reset servings to the new recipe's default when recipe changes (e.g. client navigation)
  useEffect(() => {
    setServings(baseServings);
  }, [recipe.id, baseServings]);

  const scale = servings / baseServings;

  const ingredients = recipe.ingredients;
  const seenGroups = new Set<string | null>();
  const items: React.ReactNode[] = [];

  for (const ing of ingredients) {
    const scaledQty = ing.quantity * scale;
    const qtyStr =
      scaledQty > 0
        ? ` — ${formatScaledQuantity(scaledQty)} ${(ing.unit || "").trim() || "items"}`
        : "";

    if (!ing.oneOfGroupId) {
      items.push(
        <li key={ing.id}>
          {ing.groceryItem.name}
          {ing.optional ? " (optional)" : ""}
          {qtyStr}
        </li>
      );
    } else {
      if (seenGroups.has(ing.oneOfGroupId)) continue;
      seenGroups.add(ing.oneOfGroupId);
      const group = ingredients.filter((i) => i.oneOfGroupId === ing.oneOfGroupId);
      const partNodes = group.map((i, idx) => {
        const sq = i.quantity * scale;
        const label = `${i.groceryItem.name}${sq > 0 ? ` — ${formatScaledQuantity(sq)} ${(i.unit || "").trim() || "items"}` : ""}`;
        return (
          <span key={i.id}>
            {idx > 0 && (
              <span className="text-muted text-sm font-normal mx-1"> or </span>
            )}
            {label}
          </span>
        );
      });
      items.push(
        <li key={ing.oneOfGroupId!}>
          {partNodes}
          {group.some((i) => i.optional) ? " (optional)" : ""}
        </li>
      );
    }
  }

  return (
    <div className="flex gap-4 items-start justify-between">
      <div className="flex gap-4 items-start min-w-0 flex-1">
        {recipe.imageUrl && (
          <img
            src={recipe.imageUrl}
            alt=""
            className="w-20 h-20 object-cover rounded flex-shrink-0"
          />
        )}
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-lg">Recipe: {recipe.name}</h2>
          {recipe.description && (
            <p className="text-muted mt-1">{recipe.description}</p>
          )}
          <div className="mt-3">
            <NumberInput
              label="Servings"
              description="Scale ingredients to this many servings"
              value={servings}
              onChange={(v) =>
                setServings(
                  typeof v === "string" ? parseFloat(v) || 1 : (v || 1)
                )
              }
              min={0.25}
              step={0.5}
              className="max-w-[8rem]"
            />
          </div>
          <h3 className="font-medium mt-3">Ingredients</h3>
          <ul className="list-disc list-inside mt-1">{items}</ul>
          {hasUser && (
            <>
              <p className="mt-1 text-sm text-muted-foreground">
                You&apos;ve made this {userCookCount} time
                {userCookCount !== 1 ? "s" : ""}.
              </p>
              <div className="mt-2 flex flex-wrap gap-2 items-center">
                <DoneCookingButton
                  recipeId={recipe.id}
                  recipeName={recipe.name}
                  postId={postId}
                  skipConfirmFromSettings={skipDoneCookingConfirm}
                  recipeIngredients={recipe.ingredients}
                  servings={servings}
                />
                <RecipeLikeDislike
                  recipeId={recipe.id}
                  initialLikeCount={likeCount}
                  initialDislikeCount={dislikeCount}
                  initialUserReaction={userReaction}
                />
              </div>
            </>
          )}
        </div>
      </div>
      {hasUser && (
        <div className="shrink-0 pt-0.5">
          <BookmarkButton
            recipeId={recipe.id}
            initialBookmarked={bookmarkExists}
          />
        </div>
      )}
    </div>
  );
}
