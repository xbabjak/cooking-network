"use client";

import { useState, useEffect, useMemo } from "react";
import { getAllowedUnitsForItem, getAllUnits, type Unit } from "@/lib/units";
import type { Ingredient } from "./types";

export function useRecipeUnits(
  type: "story" | "recipe",
  ingredients: Ingredient[]
) {
  const [allowedUnitsCache, setAllowedUnitsCache] = useState<
    Record<string, Unit[]>
  >({});
  const [defaultUnitOptions, setDefaultUnitOptions] = useState<Unit[]>([]);

  const ingredientItemIds = useMemo(
    () => ingredients.map((i) => i.groceryItemId).filter(Boolean) as string[],
    [ingredients]
  );

  useEffect(() => {
    if (type !== "recipe" || defaultUnitOptions.length > 0) return;
    getAllUnits().then(setDefaultUnitOptions);
  }, [type, defaultUnitOptions.length]);

  // Only depend on type and ingredientItemIds; omit allowedUnitsCache to avoid
  // re-running when the effect updates the cache (which would cause extra runs).
  useEffect(() => {
    if (type !== "recipe") return;
    const ids = ingredientItemIds.filter((id) => !allowedUnitsCache[id]);
    if (ids.length === 0) return;
    Promise.all(ids.map((id) => getAllowedUnitsForItem(id))).then((results) => {
      setAllowedUnitsCache((prev) => {
        const next = { ...prev };
        ids.forEach((id, idx) => {
          if (results[idx]?.length) next[id] = results[idx];
        });
        return next;
      });
    });
  }, [type, ingredientItemIds.join(",")]);

  return { defaultUnitOptions, allowedUnitsCache, setAllowedUnitsCache };
}
