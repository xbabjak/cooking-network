"use server";

import { prisma } from "@/lib/prisma";

function normalize(str: string): string {
  return str.trim().toLowerCase().replace(/\s+/g, " ");
}

export type GroceryItemOption = {
  id: string;
  name: string;
  defaultUnit: string;
  groceryTypeId: string;
  groceryTypeName: string;
};

export async function getGroceryItems(
  search?: string,
  groceryTypeId?: string
): Promise<GroceryItemOption[]> {
  const items = await prisma.groceryItem.findMany({
    where: {
      ...(groceryTypeId ? { groceryTypeId } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              {
                aliases: {
                  some: { alias: { contains: search, mode: "insensitive" } },
                },
              },
            ],
          }
        : {}),
    },
    orderBy: [{ groceryType: { sortOrder: "asc" } }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      defaultUnit: true,
      groceryTypeId: true,
      groceryType: { select: { name: true } },
    },
    take: 50,
  });
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    defaultUnit: item.defaultUnit,
    groceryTypeId: item.groceryTypeId,
    groceryTypeName: item.groceryType.name,
  }));
}

export async function findOrCreateGroceryItem(
  name: string,
  alias?: string
): Promise<{ id: string; name: string; defaultUnit: string }> {
  const normalized = normalize(name);
  if (!normalized) {
    throw new Error("Grocery item name cannot be empty");
  }

  const capitalized =
    normalized.charAt(0).toUpperCase() + normalized.slice(1);

  const existing =
    (await prisma.groceryItem.findFirst({
      where: { name: { equals: capitalized, mode: "insensitive" } },
      select: { id: true, name: true, defaultUnit: true },
    })) ??
    (alias
      ? await prisma.groceryItemAlias
          .findFirst({
            where: {
              alias: { equals: normalize(alias), mode: "insensitive" },
            },
            include: { groceryItem: true },
          })
          .then((a) => a?.groceryItem)
      : null);

  if (existing) {
    return {
      id: existing.id,
      name: existing.name,
      defaultUnit: existing.defaultUnit,
    };
  }

  const otherType = await prisma.groceryType.findUnique({
    where: { name: "Other" },
    select: { id: true },
  });
  if (!otherType) {
    throw new Error("GroceryType 'Other' not found");
  }

  const created = await prisma.groceryItem.create({
    data: {
      name: capitalized,
      groceryTypeId: otherType.id,
      aliases:
        alias && normalize(alias) !== normalized
          ? { create: [{ alias: normalize(alias) }] }
          : undefined,
    },
    select: { id: true, name: true, defaultUnit: true },
  });

  return created;
}
