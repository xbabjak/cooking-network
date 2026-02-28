"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { notifications } from "@mantine/notifications";
import { consumeRecipeIngredients } from "@/lib/actions/groceries";

type Props = {
  recipeId: string;
  recipeName?: string;
  postId?: string;
  skipConfirmFromSettings?: boolean;
};

export function DoneCookingButton({
  recipeId,
  recipeName,
  postId,
  skipConfirmFromSettings = false,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [dontAskAgain, setDontAskAgain] = useState(false);

  async function consume() {
    setError(null);
    setLoading(true);
    try {
      const result = await consumeRecipeIngredients(recipeId, postId);
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
    await consume();
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
          <div className="mx-4 w-full max-w-md rounded-lg border border-border bg-background p-4 shadow-lg">
            <h2 id="confirm-title" className="font-semibold text-lg">
              Remove ingredients from inventory?
            </h2>
            <p className="mt-2 text-muted-foreground text-sm">
              Quantities will be reduced from your groceries and won&apos;t go
              below zero.
            </p>
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
