"use client";

import { useRouter } from "next/navigation";
import { useState, useCallback, useEffect, useMemo } from "react";
import { notifications } from "@mantine/notifications";
import {
  getDoneCookingPreview,
  consumeRecipeIngredients,
} from "@/lib/actions/groceries";
import type { DoneCookingButtonProps, DoneCookingPreviewRow, RowOverride } from "./types";
import {
  getOneOfGroups,
  buildIngredientIdsToConsume,
  getDeductForRow as getDeductForRowUtil,
  getIncludeForRow as getIncludeForRowUtil,
  getNewQtyForRow as getNewQtyForRowUtil,
  buildDeductionOverrides,
  type OneOfGroup,
} from "./utils";

export type { OneOfGroup };

export function useDoneCooking({
  recipeId,
  postId,
  skipConfirmFromSettings = false,
  recipeIngredients = [],
}: DoneCookingButtonProps) {
  const router = useRouter();
  const oneOfGroups = useMemo(
    () => getOneOfGroups(recipeIngredients),
    [recipeIngredients]
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [dontAskAgain, setDontAskAgain] = useState(false);
  const [oneOfChoices, setOneOfChoices] = useState<Record<string, string>>({});
  const [previewRows, setPreviewRows] = useState<DoneCookingPreviewRow[] | null>(
    null
  );
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [rowOverrides, setRowOverrides] = useState<Record<string, RowOverride>>(
    {}
  );

  const fetchPreview = useCallback(async () => {
    setPreviewError(null);
    setPreviewLoading(true);
    try {
      const chosenIds =
        oneOfGroups.length > 0
          ? buildIngredientIdsToConsume(
              recipeIngredients,
              oneOfGroups,
              oneOfChoices
            )
          : undefined;
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
  }, [recipeId, recipeIngredients, oneOfGroups, oneOfChoices]);

  const consume = useCallback(
    async (
      chosenIngredientIds?: string[],
      deductionOverrides?: { ingredientId: string; quantityToDeduct: number }[]
    ) => {
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
    },
    [recipeId, postId, router]
  );

  const openConfirm = useCallback(async () => {
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
  }, [skipConfirmFromSettings, oneOfGroups.length, consume]);

  const closeConfirm = useCallback(() => {
    setShowConfirm(false);
    setPreviewRows(null);
    setRowOverrides({});
  }, []);

  const setRowOverride = useCallback(
    (ingredientId: string, patch: Partial<RowOverride>) => {
      setRowOverrides((prev) => {
        const cur = prev[ingredientId] ?? { deduct: 0, include: true };
        return { ...prev, [ingredientId]: { ...cur, ...patch } };
      });
    },
    []
  );

  const handleConfirm = useCallback(async () => {
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
    const ids =
      oneOfGroups.length > 0
        ? buildIngredientIdsToConsume(
            recipeIngredients,
            oneOfGroups,
            oneOfChoices
          )
        : undefined;
    const overrides = buildDeductionOverrides(previewRows, rowOverrides);
    await consume(ids, overrides);
  }, [
    dontAskAgain,
    oneOfGroups,
    recipeIngredients,
    oneOfChoices,
    previewRows,
    rowOverrides,
    consume,
  ]);

  useEffect(() => {
    if (!showConfirm) return;
    fetchPreview();
  }, [showConfirm, fetchPreview]);

  const getDeductForRow = useCallback(
    (row: DoneCookingPreviewRow) => getDeductForRowUtil(row, rowOverrides),
    [rowOverrides]
  );
  const getIncludeForRow = useCallback(
    (row: DoneCookingPreviewRow) => getIncludeForRowUtil(row, rowOverrides),
    [rowOverrides]
  );
  const getNewQtyForRow = useCallback(
    (row: DoneCookingPreviewRow) => getNewQtyForRowUtil(row, rowOverrides),
    [rowOverrides]
  );

  return {
    loading,
    error,
    showConfirm,
    openConfirm,
    closeConfirm,
    oneOfGroups,
    oneOfChoices,
    setOneOfChoices,
    previewRows,
    previewLoading,
    previewError,
    rowOverrides,
    setRowOverride,
    getDeductForRow,
    getIncludeForRow,
    getNewQtyForRow,
    dontAskAgain,
    setDontAskAgain,
    handleConfirm,
  };
}
