"use client";

import { useRouter } from "next13-progressbar";
import { useState } from "react";
import { ActionIcon, Group, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { setRecipeReaction, type RecipeReactionValue } from "@/lib/actions/recipe-reactions";

type Props = {
  recipeId: string;
  initialLikeCount: number;
  initialDislikeCount: number;
  initialUserReaction: RecipeReactionValue | null;
};

function ThumbUp({ filled }: { filled: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
    </svg>
  );
}

function ThumbDown({ filled }: { filled: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
    </svg>
  );
}

export function RecipeLikeDislike({
  recipeId,
  initialLikeCount,
  initialDislikeCount,
  initialUserReaction,
}: Props) {
  const router = useRouter();
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [dislikeCount, setDislikeCount] = useState(initialDislikeCount);
  const [userReaction, setUserReaction] = useState<RecipeReactionValue | null>(
    initialUserReaction
  );
  const [loading, setLoading] = useState(false);

  async function handleLike() {
    setLoading(true);
    try {
      const result = await setRecipeReaction(
        recipeId,
        userReaction === "like" ? null : "like"
      );
      if ("error" in result) {
        notifications.show({
          title: "Error",
          message: result.error,
          color: "red",
        });
        return;
      }
      setLikeCount(result.likeCount);
      setDislikeCount(result.dislikeCount);
      setUserReaction(result.userReaction);
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

  async function handleDislike() {
    setLoading(true);
    try {
      const result = await setRecipeReaction(
        recipeId,
        userReaction === "dislike" ? null : "dislike"
      );
      if ("error" in result) {
        notifications.show({
          title: "Error",
          message: result.error,
          color: "red",
        });
        return;
      }
      setLikeCount(result.likeCount);
      setDislikeCount(result.dislikeCount);
      setUserReaction(result.userReaction);
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
    <Group gap="xs" wrap="nowrap">
      <Group gap={4} wrap="nowrap">
        <ActionIcon
          variant={userReaction === "like" ? "filled" : "light"}
          size="lg"
          onClick={handleLike}
          disabled={loading}
          aria-label={userReaction === "like" ? "Liked (click to remove)" : "Like recipe"}
          aria-pressed={userReaction === "like"}
          className="shrink-0"
        >
          <ThumbUp filled={userReaction === "like"} />
        </ActionIcon>
        <Text size="sm" c="dimmed" className="tabular-nums">
          {likeCount}
        </Text>
      </Group>
      <Group gap={4} wrap="nowrap">
        <ActionIcon
          variant={userReaction === "dislike" ? "filled" : "light"}
          size="lg"
          onClick={handleDislike}
          disabled={loading}
          aria-label={
            userReaction === "dislike"
              ? "Disliked (click to remove)"
              : "Dislike recipe"
          }
          aria-pressed={userReaction === "dislike"}
          className="shrink-0"
        >
          <ThumbDown filled={userReaction === "dislike"} />
        </ActionIcon>
        <Text size="sm" c="dimmed" className="tabular-nums">
          {dislikeCount}
        </Text>
      </Group>
    </Group>
  );
}
