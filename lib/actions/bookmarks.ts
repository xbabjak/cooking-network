"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function toggleRecipeBookmark(recipeId: string): Promise<
  | { bookmarked: boolean }
  | { error: string }
> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  const userId = session.user.id;
  const existing = await prisma.userRecipeBookmark.findUnique({
    where: {
      userId_recipeId: { userId, recipeId },
    },
  });

  if (existing) {
    await prisma.userRecipeBookmark.delete({
      where: { userId_recipeId: { userId, recipeId } },
    });
    revalidatePath("/bookmarks");
    revalidatePath(`/post/[id]`, "page");
    return { bookmarked: false };
  }

  await prisma.userRecipeBookmark.create({
    data: { userId, recipeId },
  });
  revalidatePath("/bookmarks");
  revalidatePath(`/post/[id]`, "page");
  return { bookmarked: true };
}
