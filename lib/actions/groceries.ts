"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const grocerySchema = z.object({
  name: z.string().min(1).max(100),
  unit: z.string().max(20).optional(),
  quantity: z.number().min(0),
  lowThreshold: z.number().min(0).optional(),
});

export async function addGrocery(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  const raw = {
    name: formData.get("name"),
    unit: formData.get("unit") || "items",
    quantity: parseFloat((formData.get("quantity") as string) || "0"),
    lowThreshold: parseFloat((formData.get("lowThreshold") as string) || "0"),
  };
  const parsed = grocerySchema.safeParse(raw);
  if (!parsed.success) return { error: "Invalid data" };

  await prisma.grocery.create({
    data: {
      userId: session.user.id,
      name: parsed.data.name,
      unit: parsed.data.unit ?? "items",
      quantity: parsed.data.quantity,
      lowThreshold: parsed.data.lowThreshold ?? 0,
    },
  });

  revalidatePath("/groceries");
  return { success: true };
}

export async function updateGrocery(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  const id = formData.get("id") as string;
  if (!id) return { error: "Missing id" };

  const raw = {
    name: formData.get("name"),
    unit: formData.get("unit") || "items",
    quantity: parseFloat((formData.get("quantity") as string) || "0"),
    lowThreshold: parseFloat((formData.get("lowThreshold") as string) || "0"),
  };
  const parsed = grocerySchema.safeParse(raw);
  if (!parsed.success) return { error: "Invalid data" };

  await prisma.grocery.updateMany({
    where: { id, userId: session.user.id },
    data: {
      name: parsed.data.name,
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
