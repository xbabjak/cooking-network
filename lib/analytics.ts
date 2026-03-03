import { prisma } from "@/lib/prisma";

export type CookEventWithDetails = {
  id: string;
  cookedAt: Date;
  recipe: {
    id: string;
    name: string;
    ingredients: Array<{
      quantity: number;
      unit: string;
      groceryItem: { name: string };
    }>;
  };
  post: { id: string; title: string } | null;
};

export type CookEventsOptions = {
  from?: Date;
  to?: Date;
  limit?: number;
};

export async function getCookEventsForUser(
  userId: string,
  options?: CookEventsOptions
): Promise<CookEventWithDetails[]> {
  const { from, to, limit = 100 } = options ?? {};
  const where: { userId: string; cookedAt?: { gte?: Date; lte?: Date } } = {
    userId,
  };
  if (from ?? to) {
    where.cookedAt = {};
    if (from) where.cookedAt.gte = from;
    if (to) where.cookedAt.lte = to;
  }

  const events = await prisma.userCookEvent.findMany({
    where,
    orderBy: { cookedAt: "desc" },
    take: limit,
    include: {
      recipe: {
        select: {
          id: true,
          name: true,
          ingredients: {
            select: {
              quantity: true,
              unit: true,
              groceryItem: { select: { name: true } },
            },
          },
        },
      },
      post: {
        select: { id: true, title: true },
      },
    },
  });

  return events.map((e) => ({
    id: e.id,
    cookedAt: e.cookedAt,
    recipe: {
      id: e.recipe.id,
      name: e.recipe.name,
      ingredients: e.recipe.ingredients.map((i) => ({
        quantity: i.quantity,
        unit: i.unit,
        groceryItem: i.groceryItem,
      })),
    },
    post: e.post,
  }));
}

export type CooksPerDay = { date: string; count: number };

export async function getCookEventsGroupedByDay(
  userId: string,
  from: Date,
  to: Date
): Promise<CooksPerDay[]> {
  const events = await prisma.userCookEvent.findMany({
    where: {
      userId,
      cookedAt: { gte: from, lte: to },
    },
    select: { cookedAt: true },
  });

  const byDay = new Map<string, number>();
  for (const e of events) {
    const key = e.cookedAt.toISOString().slice(0, 10);
    byDay.set(key, (byDay.get(key) ?? 0) + 1);
  }

  const result: CooksPerDay[] = [];
  const cur = new Date(from);
  const end = new Date(to);
  while (cur <= end) {
    const key = cur.toISOString().slice(0, 10);
    result.push({ date: key, count: byDay.get(key) ?? 0 });
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

export type GroceriesUsedPerDay = { date: string; used: number };

export async function getGroceriesUsedPerDay(
  userId: string,
  from: Date,
  to: Date
): Promise<GroceriesUsedPerDay[]> {
  const events = await prisma.userCookEvent.findMany({
    where: {
      userId,
      cookedAt: { gte: from, lte: to },
    },
    include: {
      recipe: {
        select: {
          ingredients: { select: { quantity: true } },
        },
      },
    },
  });

  const byDay = new Map<string, number>();
  for (const e of events) {
    const key = e.cookedAt.toISOString().slice(0, 10);
    const total = e.recipe.ingredients.reduce((sum, i) => sum + i.quantity, 0);
    byDay.set(key, (byDay.get(key) ?? 0) + total);
  }

  const result: GroceriesUsedPerDay[] = [];
  const cur = new Date(from);
  const end = new Date(to);
  while (cur <= end) {
    const key = cur.toISOString().slice(0, 10);
    result.push({ date: key, used: byDay.get(key) ?? 0 });
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

export type TopRecipe = { recipeId: string; recipeName: string; count: number };

export async function getTopCookedRecipes(
  userId: string,
  limit: number
): Promise<TopRecipe[]> {
  const grouped = await prisma.userCookEvent.groupBy({
    by: ["recipeId"],
    where: { userId },
    _count: { id: true },
  });

  const sorted = grouped.sort((a, b) => b._count.id - a._count.id);
  const recipeIds = sorted.slice(0, limit).map((g) => g.recipeId);
  if (recipeIds.length === 0) return [];

  const recipes = await prisma.recipe.findMany({
    where: { id: { in: recipeIds } },
    select: { id: true, name: true },
  });
  const nameById = new Map(recipes.map((r) => [r.id, r.name]));

  return sorted.slice(0, limit).map((g) => ({
    recipeId: g.recipeId,
    recipeName: nameById.get(g.recipeId) ?? "Unknown recipe",
    count: g._count.id,
  }));
}
