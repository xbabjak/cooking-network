import { prisma } from "@/lib/prisma";

export type RecipeWithMatch = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  postId: string | null;
  matchCount: number;
  totalIngredients: number;
  matchPercent: number;
  missingIngredients: string[];
};

export async function getRecommendations(userId: string): Promise<RecipeWithMatch[]> {
  const [groceries, recipes] = await Promise.all([
    prisma.grocery.findMany({
      where: { userId },
      select: { groceryItemId: true },
    }),
    prisma.recipe.findMany({
      include: {
        ingredients: { include: { groceryItem: true } },
        posts: { take: 1, select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const userGroceryItemIds = new Set(groceries.map((g) => g.groceryItemId));

  const results: RecipeWithMatch[] = recipes
    .filter((r) => r.ingredients.length > 0)
    .map((recipe) => {
      const total = recipe.ingredients.length;
      const missing: string[] = [];
      let matchCount = 0;
      for (const ing of recipe.ingredients) {
        if (userGroceryItemIds.has(ing.groceryItemId)) {
          matchCount++;
        } else {
          missing.push(ing.groceryItem.name);
        }
      }
      const matchPercent = total > 0 ? Math.round((matchCount / total) * 100) : 0;
      return {
        id: recipe.id,
        name: recipe.name,
        description: recipe.description,
        imageUrl: recipe.imageUrl,
        postId: recipe.posts[0]?.id ?? null,
        matchCount,
        totalIngredients: total,
        matchPercent,
        missingIngredients: missing,
      };
    })
    .filter((r) => r.matchCount > 0)
    .sort((a, b) => b.matchPercent - a.matchPercent);

  return results;
}
