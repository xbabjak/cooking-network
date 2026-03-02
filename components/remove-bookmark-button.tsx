"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { notifications } from "@mantine/notifications";
import { toggleRecipeBookmark } from "@/lib/actions/bookmarks";

type Props = {
  recipeId: string;
};

export function RemoveBookmarkButton({ recipeId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const result = await toggleRecipeBookmark(recipeId);
      if ("error" in result) {
        notifications.show({
          title: "Error",
          message: result.error,
          color: "red",
        });
        return;
      }
      router.refresh();
    } catch {
      notifications.show({
        title: "Error",
        message: "Something went wrong. Please try again.",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="text-sm text-muted hover:text-foreground hover:underline disabled:opacity-50"
    >
      {loading ? "Removing…" : "Remove from bookmarks"}
    </button>
  );
}
