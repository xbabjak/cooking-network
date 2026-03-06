"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type RecipeReactionValue = "like" | "dislike";

export async function setRecipeReaction(
  recipeId: string,
  reaction: RecipeReactionValue | null
): Promise<
  | { error: string }
  | { likeCount: number; dislikeCount: number; userReaction: RecipeReactionValue | null }
> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  const userId = session.user.id;

  await prisma.$transaction(async (tx) => {
    await tx.recipeReaction.deleteMany({
      where: { userId, recipeId },
    });
    if (reaction !== null) {
      await tx.recipeReaction.create({
        data: { userId, recipeId, reaction },
      });
    }
  });

  const [likeCount, dislikeCount, userRow] = await Promise.all([
    prisma.recipeReaction.count({
      where: { recipeId, reaction: "like" },
    }),
    prisma.recipeReaction.count({
      where: { recipeId, reaction: "dislike" },
    }),
    prisma.recipeReaction.findUnique({
      where: {
        userId_recipeId: { userId, recipeId },
      },
      select: { reaction: true },
    }),
  ]);

  const userReaction: RecipeReactionValue | null =
    userRow?.reaction === "like" || userRow?.reaction === "dislike"
      ? userRow.reaction
      : null;

  revalidatePath("/post/[id]", "page");

  return { likeCount, dislikeCount, userReaction };
}
