"use server";

import { prisma } from "@/lib/prisma";

export type Unit = {
  id: string;
  unitCategoryId: string;
  symbol: string;
  label: string;
  factorToBase: number;
};

export type UnitCategory = {
  id: string;
  name: string;
  baseUnitSymbol: string;
};

const unitSelect = {
  id: true,
  unitCategoryId: true,
  symbol: true,
  label: true,
  factorToBase: true,
} as const;

export async function getUnitBySymbol(symbol: string): Promise<Unit | null> {
  if (!symbol?.trim()) return null;
  const unit = await prisma.unit.findUnique({
    where: { symbol: symbol.trim() },
    select: unitSelect,
  });
  return unit;
}

/**
 * Convert quantity from one unit to another. Returns null if units are in different
 * categories or unknown.
 */
export async function convertQuantity(
  quantity: number,
  fromSymbol: string,
  toSymbol: string
): Promise<number | null> {
  if (fromSymbol === toSymbol) return quantity;
  const fromUnit = await getUnitBySymbol(fromSymbol);
  const toUnit = await getUnitBySymbol(toSymbol);
  if (!fromUnit || !toUnit || fromUnit.unitCategoryId !== toUnit.unitCategoryId) {
    return null;
  }
  const baseQuantity = quantity * fromUnit.factorToBase;
  const converted = baseQuantity / toUnit.factorToBase;
  return Number.isFinite(converted) ? converted : null;
}

export async function getUnitsForCategory(categoryId: string): Promise<Unit[]> {
  const units = await prisma.unit.findMany({
    where: { unitCategoryId: categoryId },
    select: unitSelect,
    orderBy: { symbol: "asc" },
  });
  return units;
}

export async function getAllowedUnitsForGroceryType(
  groceryTypeId: string
): Promise<Unit[]> {
  const links = await prisma.groceryTypeUnitCategory.findMany({
    where: { groceryTypeId },
    select: { unitCategoryId: true },
  });
  const categoryIds = [...new Set(links.map((l) => l.unitCategoryId))];
  if (categoryIds.length === 0) return [];
  const units = await prisma.unit.findMany({
    where: { unitCategoryId: { in: categoryIds } },
    select: unitSelect,
    orderBy: [{ unitCategoryId: "asc" }, { symbol: "asc" }],
  });
  return units;
}

/**
 * Returns allowed units for a grocery item based on its type's unit categories.
 */
export async function getAllowedUnitsForItem(
  groceryItemId: string
): Promise<Unit[]> {
  const item = await prisma.groceryItem.findUnique({
    where: { id: groceryItemId },
    select: { groceryTypeId: true },
  });
  if (!item) return [];
  return getAllowedUnitsForGroceryType(item.groceryTypeId);
}

/** All units (for "no item selected" fallback in recipe form). */
export async function getAllUnits(): Promise<Unit[]> {
  return prisma.unit.findMany({
    select: unitSelect,
    orderBy: [{ unitCategoryId: "asc" }, { symbol: "asc" }],
  });
}
