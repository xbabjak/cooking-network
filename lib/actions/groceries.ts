"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { findOrCreateGroceryItem } from "@/lib/grocery-items";
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

  const data = {
    userId: session.user.id,
    groceryItemId,
    unit: parsed.data.unit ?? "items",
    quantity: parsed.data.quantity,
    lowThreshold: parsed.data.lowThreshold ?? 0,
    // updatedAt is optional and will default to now()
  } as unknown as Prisma.GroceryUncheckedCreateInput;

  await prisma.grocery.create({ data });

  revalidatePath("/groceries");
  return { success: true };
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

  await prisma.grocery.updateMany({
    where: { id, userId: session.user.id },
    data: {
      unit: parsed.data.unit ?? "items",
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
        await prisma.grocery.create({
          data: {
            userId,
            groceryItemId,
            unit: "items",
            quantity: qty,
            lowThreshold: 0,
          },
        });
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

export async function consumeRecipeIngredients(
  recipeId: string,
  postId?: string
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    include: { ingredients: true },
  });
  if (!recipe) return { error: "Recipe not found" };

  const userId = session.user.id;
  for (const ing of recipe.ingredients) {
    const grocery = await prisma.grocery.findFirst({
      where: { userId, groceryItemId: ing.groceryItemId },
    });
    if (grocery) {
      const newQuantity = Math.max(0, grocery.quantity - ing.quantity);
      await prisma.grocery.update({
        where: { id: grocery.id },
        data: { quantity: newQuantity },
      });
    }
  }

  await prisma.userRecipeCookCount.upsert({
    where: {
      userId_recipeId: { userId, recipeId },
    },
    create: { userId, recipeId, count: 1 },
    update: { count: { increment: 1 } },
  });

  revalidatePath("/groceries");
  if (postId) revalidatePath(`/post/${postId}`);
  return { success: true };
}
