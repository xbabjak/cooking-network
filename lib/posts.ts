import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type FeedPost = Prisma.PostGetPayload<{
  include: {
    author: { select: { id: true; name: true; username: true; image: true } };
    recipe: { select: { imageUrl: true } };
  };
}>;

export async function getPostsByAuthorId(
  authorId: string,
  limit = 20,
  viewerId?: string
) {
  const posts = await prisma.post.findMany({
    where: { authorId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      author: {
        select: { id: true, name: true, username: true, image: true, bio: true },
      },
      recipe: {
        select: { isPrivate: true, authorId: true },
      },
    },
  });
  return posts.filter((post) => {
    const postVisible =
      !post.isPrivate || post.authorId === viewerId;
    const recipeVisible =
      !post.recipe ||
      !post.recipe.isPrivate ||
      post.recipe.authorId === viewerId;
    return postVisible && recipeVisible;
  });
}

export async function getPostById(id: string) {
  return prisma.post.findUnique({
    where: { id },
    include: {
      author: {
        select: { id: true, name: true, username: true, image: true },
      },
      recipe: {
        include: { ingredients: { include: { groceryItem: true } } },
      },
    },
  });
}

export async function getFeedPosts(
  limit = 50,
  viewerId?: string
): Promise<FeedPost[]> {
  return prisma.post.findMany({
    where: {
      AND: [
        {
          OR: [
            { isPrivate: false },
            ...(viewerId != null ? [{ authorId: viewerId }] : []),
          ],
        },
        {
          OR: [
            { recipeId: null },
            {
              recipe: {
                OR: [
                  { isPrivate: false },
                  ...(viewerId != null ? [{ authorId: viewerId }] : []),
                ],
              },
            },
          ],
        },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      author: {
        select: { id: true, name: true, username: true, image: true },
      },
      recipe: {
        select: { imageUrl: true },
      },
    },
  });
}
