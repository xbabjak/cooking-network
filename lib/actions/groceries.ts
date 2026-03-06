"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { findOrCreateGroceryItem } from "@/lib/grocery-items";
import { getAllowedUnitsForItem, convertQuantity } from "@/lib/units";
import type { Prisma } from "@prisma/client";
import { z } from "zod";

const addGrocerySchema = z.object({
  groceryItemId: z.string().min(1).optional(),
  name: z.string().min(1).max(100).optional(),
  unit: z.string().max(20).optional(),
  quantity: z.number().min(0),
  lowThreshold: z.number().min(0).optional(),
}).refine(
  (data) => data.groceryItemId || data.name,
  { message: "Either groceryItemId or name is required" }
);

const updateGrocerySchema = z.object({
  unit: z.string().max(20).optional(),
  quantity: z.number().min(0),
  lowThreshold: z.number().min(0).optional(),
});

export async function addGrocery(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  const groceryItemIdRaw = formData.get("groceryItemId");
  const nameRaw = formData.get("name");
  const raw = {
    groceryItemId:
      groceryItemIdRaw === null || groceryItemIdRaw === ""
        ? undefined
        : String(groceryItemIdRaw),
    name:
      nameRaw === null || nameRaw === "" ? undefined : String(nameRaw).trim(),
    unit: formData.get("unit") || "items",
    quantity: (() => {
      const n = parseFloat((formData.get("quantity") as string) || "0");
      return Number.isFinite(n) ? n : 0;
    })(),
    lowThreshold: (() => {
      const n = parseFloat((formData.get("lowThreshold") as string) || "0");
      return Number.isFinite(n) ? n : 0;
    })(),
  };
  const parsed = addGrocerySchema.safeParse(raw);
  if (!parsed.success) return { error: "Invalid data" };

  let groceryItemId: string;
  if (parsed.data.groceryItemId) {
    groceryItemId = parsed.data.groceryItemId;
  } else if (parsed.data.name) {
    try {
      const item = await findOrCreateGroceryItem(parsed.data.name);
      groceryItemId = item.id;
    } catch {
      return { error: "Invalid grocery item name" };
    }
  } else {
    return { error: "Either grocery item or name is required" };
  }

  const allowedUnits = await getAllowedUnitsForItem(groceryItemId);
  const allowedSymbols = new Set(allowedUnits.map((u) => u.symbol));
  const unit = parsed.data.unit ?? "items";
  const normalizedUnit = allowedSymbols.has(unit)
    ? unit
    : allowedUnits[0]?.symbol ?? "items";

  const quantity = parsed.data.quantity;
  const lowThreshold = parsed.data.lowThreshold ?? 0;

  const existing = await prisma.grocery.findFirst({
    where: { userId: session.user.id, groceryItemId },
    include: { groceryItem: { select: { name: true } } },
  });

  if (!existing) {
    const data = {
      userId: session.user.id,
      groceryItemId,
      unit: normalizedUnit,
      quantity,
      lowThreshold,
      addedAt: new Date(),
    } as unknown as Prisma.GroceryUncheckedCreateInput;
    await prisma.grocery.create({ data });
    revalidatePath("/groceries");
    return { success: true };
  }

  if (existing.unit === normalizedUnit) {
    await prisma.grocery.update({
      where: { id: existing.id },
      data: {
        quantity: existing.quantity + quantity,
        lowThreshold: Math.max(existing.lowThreshold, lowThreshold),
      },
    });
    revalidatePath("/groceries");
    return { success: true };
  }

  return {
    needsUnitResolution: true,
    existing: {
      id: existing.id,
      quantity: existing.quantity,
      unit: existing.unit,
      lowThreshold: existing.lowThreshold,
      groceryItemName: existing.groceryItem.name,
    },
    incoming: { quantity, unit: normalizedUnit, lowThreshold },
    groceryItemId,
  };
}

/** Add one grocery by params (for programmatic use e.g. planner bulk add). */
export async function addGroceryByParams(params: {
  groceryItemId: string;
  unit: string;
  quantity: number;
  lowThreshold?: number;
}): Promise<
  | { success: true }
  | { error: string }
  | { needsUnitResolution: true; groceryItemId: string; [key: string]: unknown }
> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  const { groceryItemId, quantity, lowThreshold = 0 } = params;
  const unit = (params.unit ?? "items").trim() || "items";

  const allowedUnits = await getAllowedUnitsForItem(groceryItemId);
  const allowedSymbols = new Set(allowedUnits.map((u) => u.symbol));
  const normalizedUnit = allowedSymbols.has(unit) ? unit : allowedUnits[0]?.symbol ?? "items";

  const existing = await prisma.grocery.findFirst({
    where: { userId: session.user.id, groceryItemId },
    include: { groceryItem: { select: { name: true } } },
  });

  if (!existing) {
    const data = {
      userId: session.user.id,
      groceryItemId,
      unit: normalizedUnit,
      quantity,
      lowThreshold,
      addedAt: new Date(),
    } as unknown as Prisma.GroceryUncheckedCreateInput;
    await prisma.grocery.create({ data });
    revalidatePath("/groceries");
    return { success: true };
  }

  if (existing.unit === normalizedUnit) {
    await prisma.grocery.update({
      where: { id: existing.id },
      data: {
        quantity: existing.quantity + quantity,
        lowThreshold: Math.max(existing.lowThreshold, lowThreshold),
      },
    });
    revalidatePath("/groceries");
    return { success: true };
  }

  return {
    needsUnitResolution: true,
    existing: {
      id: existing.id,
      quantity: existing.quantity,
      unit: existing.unit,
      lowThreshold: existing.lowThreshold,
      groceryItemName: existing.groceryItem.name,
    },
    incoming: { quantity, unit: normalizedUnit, lowThreshold },
    groceryItemId,
  };
}

export type AddGroceryUnitConflictPayload = {
  needsUnitResolution: true;
  existing: {
    id: string;
    quantity: number;
    unit: string;
    lowThreshold: number;
    groceryItemName: string;
  };
  incoming: { quantity: number; unit: string; lowThreshold: number };
  groceryItemId: string;
};

const mergeGroceryAddSchema = z.object({
  resolution: z.enum(["addInExistingUnit", "switchToNewUnit", "addAsSeparate"]),
  existingGroceryId: z.string().min(1),
  groceryItemId: z.string().min(1),
  quantity: z.number().min(0),
  unit: z.string().max(20),
  lowThreshold: z.number().min(0).optional(),
});

export async function mergeGroceryAdd(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  const raw = {
    resolution: formData.get("resolution") as string,
    existingGroceryId: formData.get("existingGroceryId") as string,
    groceryItemId: formData.get("groceryItemId") as string,
    quantity: parseFloat((formData.get("quantity") as string) || "0"),
    unit: formData.get("unit") as string,
    lowThreshold: parseFloat((formData.get("lowThreshold") as string) || "0"),
  };
  const parsed = mergeGroceryAddSchema.safeParse(raw);
  if (!parsed.success) return { error: "Invalid data" };

  const { resolution, existingGroceryId, groceryItemId, quantity, unit, lowThreshold } =
    parsed.data;

  const existing = await prisma.grocery.findFirst({
    where: { id: existingGroceryId, userId: session.user.id },
  });
  if (!existing) return { error: "Existing grocery not found" };
  if (existing.groceryItemId !== groceryItemId)
    return { error: "Grocery item mismatch" };

  const allowedUnits = await getAllowedUnitsForItem(groceryItemId);
  const allowedSymbols = new Set(allowedUnits.map((u) => u.symbol));
  const normalizedUnit = allowedSymbols.has(unit) ? unit : allowedUnits[0]?.symbol ?? "items";

  if (resolution === "addAsSeparate") {
    const data = {
      userId: session.user.id,
      groceryItemId,
      unit: normalizedUnit,
      quantity,
      lowThreshold: lowThreshold ?? 0,
      addedAt: new Date(),
    } as unknown as Prisma.GroceryUncheckedCreateInput;
    await prisma.grocery.create({ data });
    revalidatePath("/groceries");
    return { success: true };
  }

  if (resolution === "addInExistingUnit") {
    const converted = await convertQuantity(quantity, normalizedUnit, existing.unit);
    if (converted == null)
      return { error: "Cannot convert between these units. Add as separate entry instead." };
    await prisma.grocery.update({
      where: { id: existing.id },
      data: {
        quantity: existing.quantity + converted,
        lowThreshold: Math.max(existing.lowThreshold, lowThreshold ?? 0),
      },
    });
    revalidatePath("/groceries");
    return { success: true };
  }

  if (resolution === "switchToNewUnit") {
    const convertedExisting = await convertQuantity(
      existing.quantity,
      existing.unit,
      normalizedUnit
    );
    const newQuantity =
      convertedExisting != null ? convertedExisting + quantity : quantity;
    await prisma.grocery.update({
      where: { id: existing.id },
      data: {
        quantity: newQuantity,
        unit: normalizedUnit,
        lowThreshold: Math.max(existing.lowThreshold, lowThreshold ?? 0),
      },
    });
    revalidatePath("/groceries");
    return { success: true };
  }

  return { error: "Invalid resolution" };
}

export async function updateGrocery(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  const id = formData.get("id") as string;
  if (!id) return { error: "Missing id" };

  const raw = {
    unit: formData.get("unit") || "items",
    quantity: parseFloat((formData.get("quantity") as string) || "0"),
    lowThreshold: parseFloat((formData.get("lowThreshold") as string) || "0"),
  };
  const parsed = updateGrocerySchema.safeParse(raw);
  if (!parsed.success) return { error: "Invalid data" };

  const grocery = await prisma.grocery.findFirst({
    where: { id, userId: session.user.id },
    select: { groceryItemId: true },
  });
  if (!grocery) return { error: "Not found" };

  const allowedUnits = await getAllowedUnitsForItem(grocery.groceryItemId);
  const allowedSymbols = new Set(allowedUnits.map((u) => u.symbol));
  const unit = parsed.data.unit ?? "items";
  const normalizedUnit = allowedSymbols.has(unit)
    ? unit
    : allowedUnits[0]?.symbol ?? "items";

  await prisma.grocery.updateMany({
    where: { id, userId: session.user.id },
    data: {
      unit: normalizedUnit,
      quantity: parsed.data.quantity,
      lowThreshold: parsed.data.lowThreshold ?? 0,
    },
  });

  revalidatePath("/groceries");
  return { success: true };
}

export async function deleteGrocery(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  await prisma.grocery.deleteMany({
    where: { id, userId: session.user.id },
  });

  revalidatePath("/groceries");
  return { success: true };
}

export async function decrementGrocery(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  const g = await prisma.grocery.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!g) return { error: "Not found" };

  await prisma.grocery.update({
    where: { id },
    data: { quantity: Math.max(0, g.quantity - 1) },
  });

  revalidatePath("/groceries");
  return { success: true };
}

const receiptItemSchema = z.object({
  name: z.string().min(1).max(100),
  quantity: z.number().min(0),
});

export async function addGroceriesFromReceipt(
  items: { name: string; quantity: number }[]
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  if (!Array.isArray(items) || items.length === 0) {
    return { error: "No items to add" };
  }

  const userId = session.user.id;
  let added = 0;

  for (const raw of items) {
    const parsed = receiptItemSchema.safeParse({
      name: typeof raw.name === "string" ? raw.name.trim() : "",
      quantity:
        typeof raw.quantity === "number" && Number.isFinite(raw.quantity)
          ? raw.quantity
          : 1,
    });
    if (!parsed.success || !parsed.data.name) continue;

    const { name, quantity } = parsed.data;
    const qty = Math.max(0, quantity);

    try {
      const { id: groceryItemId } = await findOrCreateGroceryItem(name);
      const existing = await prisma.grocery.findFirst({
        where: { userId, groceryItemId },
      });
      if (existing) {
        await prisma.grocery.update({
          where: { id: existing.id },
          data: { quantity: existing.quantity + qty },
        });
      } else {
        const data = {
          userId,
          groceryItemId,
          unit: "items",
          quantity: qty,
          lowThreshold: 0,
          addedAt: new Date(),
        } as unknown as Prisma.GroceryUncheckedCreateInput;
        await prisma.grocery.create({ data });
      }
      added++;
    } catch {
      // skip item on error, continue with rest
    }
  }

  revalidatePath("/groceries");
  if (added === 0) {
    return { error: "No items could be added. Please try again." };
  }
  return { success: true, added };
}

export type DoneCookingPreviewRow = {
  ingredientId: string;
  groceryItemName: string;
  recipeQuantity: number;
  recipeUnit: string;
  inInventory: boolean;
  userCurrentQuantity: number;
  userUnit: string;
  quantityToDeduct: number;
  newQuantity: number;
};

export async function getDoneCookingPreview(
  recipeId: string,
  chosenIngredientIds?: string[],
  servings?: number
): Promise<{ error?: string; preview?: DoneCookingPreviewRow[] }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    include: {
      ingredients: { include: { groceryItem: { select: { name: true } } } },
    },
  });
  if (!recipe) return { error: "Recipe not found" };

  const recipeServingsValue = (recipe as { servings?: number | null }).servings;
  const recipeServings =
    recipeServingsValue != null && recipeServingsValue > 0
      ? recipeServingsValue
      : 1;
  const userServings =
    servings != null && servings > 0 ? servings : recipeServings;

  const ingredientsToConsume =
    chosenIngredientIds != null && chosenIngredientIds.length > 0
      ? recipe.ingredients.filter((ing) => chosenIngredientIds.includes(ing.id))
      : recipe.ingredients;

  const userId = session.user.id;
  const groceryItemIds = [...new Set(ingredientsToConsume.map((ing) => ing.groceryItemId))];
  const userGroceries = await prisma.grocery.findMany({
    where: { userId, groceryItemId: { in: groceryItemIds } },
  });
  const groceryByItemId = new Map(userGroceries.map((g) => [g.groceryItemId, g]));

  const preview: DoneCookingPreviewRow[] = [];
  for (const ing of ingredientsToConsume) {
    const effectiveQty = ing.quantity * (userServings / recipeServings);
    const grocery = groceryByItemId.get(ing.groceryItemId);
    const name = ing.groceryItem.name;
    if (!grocery) {
      preview.push({
        ingredientId: ing.id,
        groceryItemName: name,
        recipeQuantity: effectiveQty,
        recipeUnit: (ing.unit ?? "").trim() || "items",
        inInventory: false,
        userCurrentQuantity: 0,
        userUnit: "",
        quantityToDeduct: 0,
        newQuantity: 0,
      });
      continue;
    }
    const ingUnit = (ing.unit ?? "").trim() || "items";
    const toDeduct =
      (await convertQuantity(effectiveQty, ingUnit, grocery.unit)) ??
      (ingUnit === grocery.unit ? effectiveQty : null);
    const quantityToDeduct = toDeduct != null ? Math.max(0, toDeduct) : 0;
    const newQuantity =
      Math.round(Math.max(0, grocery.quantity - quantityToDeduct) * 100) / 100;
    preview.push({
      ingredientId: ing.id,
      groceryItemName: name,
      recipeQuantity: effectiveQty,
      recipeUnit: ingUnit,
      inInventory: true,
      userCurrentQuantity: grocery.quantity,
      userUnit: grocery.unit,
      quantityToDeduct,
      newQuantity,
    });
  }
  return { preview };
}

export async function consumeRecipeIngredients(
  recipeId: string,
  postId?: string,
  chosenIngredientIds?: string[],
  deductionOverrides?: { ingredientId: string; quantityToDeduct: number }[],
  servings?: number
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    include: { ingredients: true },
  });
  if (!recipe) return { error: "Recipe not found" };

  const recipeServingsValueConsume = (recipe as { servings?: number | null })
    .servings;
  const recipeServingsConsume =
    recipeServingsValueConsume != null && recipeServingsValueConsume > 0
      ? recipeServingsValueConsume
      : 1;
  const userServingsConsume =
    servings != null && servings > 0 ? servings : recipeServingsConsume;

  const ingredientsToConsume =
    chosenIngredientIds != null && chosenIngredientIds.length > 0
      ? recipe.ingredients.filter((ing) => chosenIngredientIds.includes(ing.id))
      : recipe.ingredients;

  const overrideByIngredientId = new Map(
    (deductionOverrides ?? []).map((o) => [o.ingredientId, o.quantityToDeduct])
  );
  const useOnlyOverrides = deductionOverrides !== undefined;

  const userId = session.user.id;

  await prisma.$transaction(async (tx) => {
    for (const ing of ingredientsToConsume) {
      const grocery = await tx.grocery.findFirst({
        where: { userId, groceryItemId: ing.groceryItemId },
      });
      if (!grocery) continue;
      const overrideQty = overrideByIngredientId.get(ing.id);
      let toDeduct: number;
      if (overrideQty !== undefined) {
        toDeduct = Math.max(0, overrideQty);
      } else if (useOnlyOverrides) {
        continue;
      } else {
        const effectiveQty =
          ing.quantity * (userServingsConsume / recipeServingsConsume);
        const ingUnit = (ing.unit ?? "").trim() || "items";
        const converted =
          (await convertQuantity(effectiveQty, ingUnit, grocery.unit)) ??
          (ingUnit === grocery.unit ? effectiveQty : null);
        if (converted == null) continue;
        toDeduct = converted;
      }
      const newQuantity = Math.max(
        0,
        Math.round((grocery.quantity - toDeduct) * 100) / 100
      );
      await tx.grocery.update({
        where: { id: grocery.id },
        data: { quantity: newQuantity },
      });
    }

    await tx.userRecipeCookCount.upsert({
      where: {
        userId_recipeId: { userId, recipeId },
      },
      create: { userId, recipeId, count: 1 },
      update: { count: { increment: 1 } },
    });

    await tx.userCookEvent.create({
      data: {
        userId,
        recipeId,
        postId: postId ?? null,
      },
    });
  });

  revalidatePath("/groceries");
  revalidatePath("/analytics");
  if (postId) revalidatePath(`/post/${postId}`);
  return { success: true };
}
