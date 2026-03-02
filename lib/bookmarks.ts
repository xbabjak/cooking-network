import { prisma } from "@/lib/prisma";

export type BookmarkedRecipe = {
  recipe: {
    id: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
  };
  postId: string;
};

export async function getBookmarkedRecipes(userId: string): Promise<BookmarkedRecipe[]> {
  const bookmarks = await prisma.userRecipeBookmark.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      recipe: {
        include: {
          posts: {
            take: 1,
            select: { id: true, isPrivate: true, authorId: true },
          },
        },
      },
    },
  });

  return bookmarks
    .filter((b) => b.recipe.posts[0] != null)
    .filter(
      (b) => !b.recipe.isPrivate || b.recipe.authorId === userId
    )
    .filter(
      (b) => {
        const post = b.recipe.posts[0]!;
        return !post.isPrivate || post.authorId === userId;
      }
    )
    .map((b) => ({
      recipe: {
        id: b.recipe.id,
        name: b.recipe.name,
        description: b.recipe.description,
        imageUrl: b.recipe.imageUrl,
      },
      postId: b.recipe.posts[0]!.id,
    }));
}
