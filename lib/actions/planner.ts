"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { convertQuantity } from "@/lib/units";
import { addGroceryByParams } from "@/lib/actions/groceries";

const entrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  recipeId: z.string().cuid(),
  servings: z.coerce.number().positive(),
});

const saveSchema = z.object({
  entries: z.array(entrySchema),
});

export type PlannerEntryWithRecipe = {
  id: string;
  date: string;
  recipeId: string;
  servings: number;
  recipe: {
    id: string;
    name: string;
    imageUrl: string | null;
    servings: number | null;
    postId: string | null;
  };
};

export async function getPlannerEntries(
  userId: string,
  startDate: string,
  endDate: string
): Promise<PlannerEntryWithRecipe[]> {
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setUTCHours(0, 0, 0, 0);
  end.setUTCHours(23, 59, 59, 999);

  const entries = await prisma.plannerEntry.findMany({
    where: {
      userId,
      date: { gte: start, lte: end },
    },
    include: {
      recipe: {
        select: {
          id: true,
          name: true,
          imageUrl: true,
          servings: true,
          posts: { take: 1, select: { id: true } },
        },
      },
    },
    orderBy: [{ date: "asc" }, { id: "asc" }],
  });

  return entries.map((e) => ({
    id: e.id,
    date: e.date.toISOString().slice(0, 10),
    recipeId: e.recipeId,
    servings: e.servings,
    recipe: {
      id: e.recipe.id,
      name: e.recipe.name,
      imageUrl: e.recipe.imageUrl,
      servings: e.recipe.servings,
      postId: e.recipe.posts[0]?.id ?? null,
    },
  }));
}

const dateRangeSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function savePlannerEntries(
  entries: { date: string; recipeId: string; servings: number }[],
  dateRange: { startDate: string; endDate: string }
): Promise<{ error?: string } | { success: true }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  const rangeParsed = dateRangeSchema.safeParse(dateRange);
  if (!rangeParsed.success) return { error: "Invalid date range." };

  const parsed = saveSchema.safeParse({ entries });
  if (!parsed.success) {
    return { error: "Invalid input." };
  }

  const { entries: validEntries } = parsed.data;
  const { startDate: startDateStr, endDate: endDateStr } = rangeParsed.data;

  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  start.setUTCHours(0, 0, 0, 0);
  end.setUTCHours(23, 59, 59, 999);
  if (start > end) return { error: "Invalid date range." };

  await prisma.$transaction(async (tx) => {
    await tx.plannerEntry.deleteMany({
      where: {
        userId: session!.user!.id,
        date: { gte: start, lte: end },
      },
    });
    if (validEntries.length > 0) {
      await tx.plannerEntry.createMany({
        data: validEntries.map((e) => ({
          userId: session!.user!.id,
          date: new Date(e.date),
          recipeId: e.recipeId,
          servings: e.servings,
        })),
      });
    }
  });

  revalidatePath("/planner");
  return { success: true };
}

export type PlannerGroceryRow = {
  groceryItemId: string;
  groceryItemName: string;
  unit: string;
  quantityNeeded: number;
  quantityInInventory?: number;
  quantityMissing?: number;
};

async function buildGroceryRowsFromEntries(
  sessionUserId: string,
  entries: { recipeId: string; servings: number; recipe: { servings: number | null; ingredients: { groceryItemId: string; quantity: number; unit: string | null; groceryItem: { name: string; defaultUnit: string | null } }[] } }[],
  options: { subtractInventory: boolean }
): Promise<PlannerGroceryRow[]> {
  type Accum = { name: string; defaultUnit: string; byUnit: Record<string, number> };
  const byItemId = new Map<string, Accum>();

  for (const entry of entries) {
    const recipeServings =
      entry.recipe.servings != null && entry.recipe.servings > 0
        ? entry.recipe.servings
        : 1;
    const scale = entry.servings / recipeServings;

    for (const ing of entry.recipe.ingredients) {
      const qty = ing.quantity * scale;
      const unit = (ing.unit ?? "").trim() || "items";
      const existing = byItemId.get(ing.groceryItemId);
      const name = ing.groceryItem.name;
      const defaultUnit = ing.groceryItem.defaultUnit ?? "items";
      if (!existing) {
        byItemId.set(ing.groceryItemId, {
          name,
          defaultUnit,
          byUnit: { [unit]: qty },
        });
      } else {
        const prev = existing.byUnit[unit] ?? 0;
        existing.byUnit[unit] = prev + qty;
      }
    }
  }

  const rows: PlannerGroceryRow[] = [];

  for (const [groceryItemId, acc] of byItemId) {
    let totalInDefault = 0;
    for (const [unit, qty] of Object.entries(acc.byUnit)) {
      if (unit === acc.defaultUnit) {
        totalInDefault += qty;
      } else {
        const converted = await convertQuantity(qty, unit, acc.defaultUnit);
        totalInDefault += converted ?? 0;
      }
    }
    totalInDefault = Math.round(totalInDefault * 100) / 100;
    if (totalInDefault <= 0) continue;

    const row: PlannerGroceryRow = {
      groceryItemId,
      groceryItemName: acc.name,
      unit: acc.defaultUnit,
      quantityNeeded: totalInDefault,
    };

    if (options.subtractInventory) {
      const userGrocery = await prisma.grocery.findFirst({
        where: {
          userId: sessionUserId,
          groceryItemId,
        },
      });
      if (userGrocery) {
        const userQtyInDefault =
          userGrocery.unit === acc.defaultUnit
            ? userGrocery.quantity
            : (await convertQuantity(
                userGrocery.quantity,
                userGrocery.unit,
                acc.defaultUnit
              )) ?? 0;
        row.quantityInInventory = Math.round(userQtyInDefault * 100) / 100;
        row.quantityMissing = Math.round(
          Math.max(0, totalInDefault - userQtyInDefault) * 100
        ) / 100;
      } else {
        row.quantityMissing = totalInDefault;
      }
    }

    rows.push(row);
  }

  rows.sort((a, b) => a.groceryItemName.localeCompare(b.groceryItemName));
  return rows;
}

/** Get grocery totals for the given entries (e.g. current local planner state). Use this so the list reflects what's on the planner before "Upload to app". */
export async function getPlannerGroceriesFromEntries(
  entries: { date: string; recipeId: string; servings: number }[],
  options: { subtractInventory: boolean }
): Promise<{ error?: string } | { rows: PlannerGroceryRow[] }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  const parsed = saveSchema.safeParse({ entries });
  if (!parsed.success) return { error: "Invalid input." };

  const validEntries = parsed.data.entries;
  if (validEntries.length === 0) return { rows: [] };

  const recipeIds = [...new Set(validEntries.map((e) => e.recipeId))];
  const recipes = await prisma.recipe.findMany({
    where: { id: { in: recipeIds } },
    include: {
      ingredients: {
        include: { groceryItem: { select: { name: true, defaultUnit: true } } },
      },
    },
  });
  const recipeMap = new Map(recipes.map((r) => [r.id, r]));

  const entriesWithRecipe: { recipeId: string; servings: number; recipe: { servings: number | null; ingredients: { groceryItemId: string; quantity: number; unit: string | null; groceryItem: { name: string; defaultUnit: string | null } }[] } }[] = [];
  for (const e of validEntries) {
    const recipe = recipeMap.get(e.recipeId);
    if (!recipe) continue;
    entriesWithRecipe.push({
      recipeId: e.recipeId,
      servings: e.servings,
      recipe: {
        servings: recipe.servings,
        ingredients: recipe.ingredients.map((ing) => ({
          groceryItemId: ing.groceryItemId,
          quantity: ing.quantity,
          unit: ing.unit,
          groceryItem: {
            name: ing.groceryItem.name,
            defaultUnit: ing.groceryItem.defaultUnit,
          },
        })),
      },
    });
  }

  const rows = await buildGroceryRowsFromEntries(session.user.id, entriesWithRecipe, options);
  return { rows };
}

export async function getPlannerGroceries(
  startDate: string,
  endDate: string,
  options: { subtractInventory: boolean }
): Promise<{ error?: string } | { rows: PlannerGroceryRow[] }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setUTCHours(0, 0, 0, 0);
  end.setUTCHours(23, 59, 59, 999);

  const entries = await prisma.plannerEntry.findMany({
    where: {
      userId: session.user.id,
      date: { gte: start, lte: end },
    },
    include: {
      recipe: {
        include: {
          ingredients: {
            include: { groceryItem: { select: { name: true, defaultUnit: true } } },
          },
        },
      },
    },
  });

  const entriesForBuild = entries.map((e) => ({
    recipeId: e.recipeId,
    servings: e.servings,
    recipe: {
      servings: e.recipe.servings,
      ingredients: e.recipe.ingredients.map((ing) => ({
        groceryItemId: ing.groceryItemId,
        quantity: ing.quantity,
        unit: ing.unit,
        groceryItem: { name: ing.groceryItem.name, defaultUnit: ing.groceryItem.defaultUnit },
      })),
    },
  }));

  const rows = await buildGroceryRowsFromEntries(session.user.id, entriesForBuild, options);
  return { rows };
}

/** Add planner grocery list to user's inventory. Uses same entries and options as getPlannerGroceriesFromEntries. */
export async function addPlannerGroceriesToInventory(
  entries: { date: string; recipeId: string; servings: number }[],
  options: { subtractInventory: boolean }
): Promise<
  | { error: string }
  | { success: true; added: number; skippedUnitConflict: number }
> {
  const result = await getPlannerGroceriesFromEntries(entries, options);
  if ("error" in result) return { error: result.error ?? "Failed to load groceries." };
  const rows = "rows" in result ? result.rows : [];

  let added = 0;
  let skippedUnitConflict = 0;

  for (const row of rows) {
    const quantity =
      options.subtractInventory && row.quantityMissing != null
        ? row.quantityMissing
        : row.quantityNeeded;
    if (quantity <= 0) continue;

    const addResult = await addGroceryByParams({
      groceryItemId: row.groceryItemId,
      unit: row.unit,
      quantity,
    });
    if ("success" in addResult && addResult.success) added++;
    else if ("needsUnitResolution" in addResult) skippedUnitConflict++;
  }

  return { success: true, added, skippedUnitConflict };
}
