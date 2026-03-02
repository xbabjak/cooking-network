"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActionIcon } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { toggleRecipeBookmark } from "@/lib/actions/bookmarks";

type Props = {
  recipeId: string;
  initialBookmarked: boolean;
};

function StarOutline({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function StarFilled({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

export function BookmarkButton({ recipeId, initialBookmarked }: Props) {
  const router = useRouter();
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
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
      setBookmarked(result.bookmarked);
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
    <ActionIcon
      variant={bookmarked ? "filled" : "light"}
      size="lg"
      onClick={handleClick}
      disabled={loading}
      aria-label={bookmarked ? "Bookmarked" : "Bookmark recipe"}
      className="shrink-0"
    >
      {bookmarked ? <StarFilled /> : <StarOutline />}
    </ActionIcon>
  );
}
