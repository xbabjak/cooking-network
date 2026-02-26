"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { findOrCreateGroceryItem } from "@/lib/grocery-items";
import { sanitizeHtml } from "@/lib/html-utils";
import { z } from "zod";

const recipeIngredientSchema = z.object({
  groceryItemId: z.string().min(1).optional(),
  name: z.string().min(1).max(100).optional(),
  quantity: z.number().min(0),
  unit: z.string().optional(),
}).refine((data) => data.groceryItemId || data.name, {
  message: "Either groceryItemId or name is required",
});

const createSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  imageUrls: z.array(z.string().url()).max(5).optional(),
  type: z.enum(["story", "recipe"]).optional(),
  recipeName: z.string().optional(),
  recipeDescription: z.string().optional(),
  recipeImageUrl: z.union([z.string().url(), z.literal("")]).optional(),
  recipeIngredients: z.array(recipeIngredientSchema).optional(),
});

const updateSchema = createSchema.partial().extend({
  id: z.string().cuid(),
});

export async function createPost(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  const raw = {
    title: formData.get("title"),
    content: formData.get("content"),
    imageUrls: formData.get("imageUrls")
      ? JSON.parse(formData.get("imageUrls") as string)
      : [],
    type: formData.get("type") || "story",
    recipeName: formData.get("recipeName") || undefined,
    recipeDescription: formData.get("recipeDescription") || undefined,
    recipeImageUrl: formData.get("recipeImageUrl") || undefined,
    recipeIngredients: formData.get("recipeIngredients")
      ? JSON.parse(formData.get("recipeIngredients") as string)
      : undefined,
  };
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) return { error: "Invalid data" };

  const { title, content, imageUrls, type, recipeName, recipeDescription, recipeImageUrl, recipeIngredients } =
    parsed.data;

  let recipeId: string | null = null;
  if (type === "recipe" && recipeName && recipeIngredients?.length) {
    const ingredientData = await Promise.all(
      recipeIngredients.map(async (i) => {
        let groceryItemId: string;
        if (i.groceryItemId) {
          groceryItemId = i.groceryItemId;
        } else if (i.name) {
          const item = await findOrCreateGroceryItem(i.name);
          groceryItemId = item.id;
        } else {
          throw new Error("Invalid ingredient");
        }
        return {
          groceryItemId,
          quantity: i.quantity,
          unit: i.unit ?? "",
        };
      })
    );
    const recipe = await prisma.recipe.create({
      data: {
        name: recipeName,
        description: recipeDescription ?? null,
        imageUrl: recipeImageUrl || null,
        authorId: session.user.id,
        ingredients: { create: ingredientData },
      },
    });
    recipeId = recipe.id;
  }

  await prisma.post.create({
    data: {
      title,
      content: sanitizeHtml(content),
      imageUrls: imageUrls ?? [],
      type: type ?? "story",
      recipeId,
      authorId: session.user.id,
    },
  });

  revalidatePath("/feed");
  revalidatePath(`/u/${session.user.username ?? "me"}`);
  return { success: true };
}

export async function updatePost(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  const id = formData.get("id") as string;
  if (!id) return { error: "Missing post id" };

  const existing = await prisma.post.findUnique({ where: { id } });
  if (!existing || existing.authorId !== session.user.id)
    return { error: "Not found or not allowed" };

  const raw = {
    id,
    title: formData.get("title") ?? existing.title,
    content: formData.get("content") ?? existing.content,
    imageUrls: formData.get("imageUrls")
      ? JSON.parse(formData.get("imageUrls") as string)
      : existing.imageUrls,
    type: formData.get("type") ?? existing.type,
    recipeName: formData.get("recipeName") || undefined,
    recipeDescription: formData.get("recipeDescription") || undefined,
    recipeImageUrl: formData.get("recipeImageUrl") || undefined,
    recipeIngredients: formData.get("recipeIngredients")
      ? JSON.parse(formData.get("recipeIngredients") as string)
      : undefined,
  };
  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) return { error: "Invalid data" };

  const { title, content, imageUrls, type, recipeName, recipeDescription, recipeImageUrl, recipeIngredients } =
    parsed.data;

  let recipeId = existing.recipeId;
  if (type === "recipe" && recipeName && recipeIngredients?.length) {
    const ingredientData = await Promise.all(
      recipeIngredients.map(async (i) => {
        let groceryItemId: string;
        if (i.groceryItemId) {
          groceryItemId = i.groceryItemId;
        } else if (i.name) {
          const item = await findOrCreateGroceryItem(i.name);
          groceryItemId = item.id;
        } else {
          throw new Error("Invalid ingredient");
        }
        return {
          groceryItemId,
          quantity: i.quantity,
          unit: i.unit ?? "",
        };
      })
    );
    if (existing.recipeId) {
      await prisma.recipe.update({
        where: { id: existing.recipeId },
        data: {
          name: recipeName,
          description: recipeDescription ?? null,
          imageUrl: recipeImageUrl || null,
          ingredients: {
            deleteMany: {},
            create: ingredientData,
          },
        },
      });
    } else {
      const recipe = await prisma.recipe.create({
        data: {
          name: recipeName,
          description: recipeDescription ?? null,
          imageUrl: recipeImageUrl || null,
          authorId: session.user.id,
          ingredients: { create: ingredientData },
        },
      });
      recipeId = recipe.id;
    }
  }

  await prisma.post.update({
    where: { id },
    data: {
      title: title!,
      content: sanitizeHtml(content!),
      imageUrls: imageUrls ?? [],
      type: type ?? "story",
      recipeId,
    },
  });

  revalidatePath("/feed");
  revalidatePath(`/post/${id}`);
  revalidatePath(`/u/${session.user.username ?? "me"}`);
  return { success: true };
}

export async function deletePost(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  const post = await prisma.post.findUnique({ where: { id } });
  if (!post || post.authorId !== session.user.id) return { error: "Not allowed" };

  await prisma.post.delete({ where: { id } });
  revalidatePath("/feed");
  revalidatePath(`/u/${session.user.username ?? "me"}`);
  return { success: true };
}
