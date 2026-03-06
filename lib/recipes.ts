import { prisma } from "@/lib/prisma";

export type RecipeForPlanner = {
  id: string;
  name: string;
  imageUrl: string | null;
  servings: number | null;
  ingredients: {
    id: string;
    groceryItemId: string;
    quantity: number;
    unit: string;
    groceryItem: { name: string };
  }[];
  postId: string | null;
};

export async function getRecipesForPlanner(
  userId: string | null
): Promise<RecipeForPlanner[]> {
  const recipes = await prisma.recipe.findMany({
    where: {
      OR: [
        { isPrivate: false },
        ...(userId ? [{ authorId: userId }] : []),
      ],
    },
    include: {
      ingredients: {
        include: { groceryItem: { select: { name: true } } },
      },
      posts: { take: 1, select: { id: true } },
    },
    orderBy: { name: "asc" },
  });

  return recipes.map((r) => ({
    id: r.id,
    name: r.name,
    imageUrl: r.imageUrl,
    servings: r.servings,
    ingredients: r.ingredients.map((ing) => ({
      id: ing.id,
      groceryItemId: ing.groceryItemId,
      quantity: ing.quantity,
      unit: ing.unit,
      groceryItem: ing.groceryItem,
    })),
    postId: r.posts[0]?.id ?? null,
  }));
}
