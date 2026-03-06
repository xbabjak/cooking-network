import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { getUnitBySymbol, convertQuantity } from "./units";

describe("getUnitBySymbol", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null for empty or whitespace symbol", async () => {
    vi.mocked(prisma.unit.findUnique).mockResolvedValue(null);
    expect(await getUnitBySymbol("")).toBeNull();
    expect(await getUnitBySymbol("  ")).toBeNull();
  });

  it("returns unit when found", async () => {
    const unit = {
      id: "u1",
      unitCategoryId: "cat1",
      symbol: "g",
      label: "gram",
      factorToBase: 1,
    };
    vi.mocked(prisma.unit.findUnique).mockResolvedValue(unit as never);
    const result = await getUnitBySymbol("g");
    expect(result).toEqual(unit);
    expect(prisma.unit.findUnique).toHaveBeenCalledWith({
      where: { symbol: "g" },
      select: expect.any(Object),
    });
  });

  it("returns null when not found", async () => {
    vi.mocked(prisma.unit.findUnique).mockResolvedValue(null);
    const result = await getUnitBySymbol("unknown");
    expect(result).toBeNull();
  });
});

describe("convertQuantity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns same quantity when from and to symbols are equal", async () => {
    const result = await convertQuantity(5, "g", "g");
    expect(result).toBe(5);
    expect(prisma.unit.findUnique).not.toHaveBeenCalled();
  });

  it("returns null when from unit is unknown", async () => {
    vi.mocked(prisma.unit.findUnique)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "u2",
        unitCategoryId: "cat1",
        symbol: "kg",
        label: "kilogram",
        factorToBase: 1000,
      } as never);
    const result = await convertQuantity(1, "unknown", "kg");
    expect(result).toBeNull();
  });

  it("returns null when to unit is unknown", async () => {
    vi.mocked(prisma.unit.findUnique)
      .mockResolvedValueOnce({
        id: "u1",
        unitCategoryId: "cat1",
        symbol: "g",
        label: "gram",
        factorToBase: 1,
      } as never)
      .mockResolvedValueOnce(null);
    const result = await convertQuantity(1, "g", "unknown");
    expect(result).toBeNull();
  });

  it("returns null when units are in different categories", async () => {
    vi.mocked(prisma.unit.findUnique)
      .mockResolvedValueOnce({
        id: "u1",
        unitCategoryId: "cat1",
        symbol: "g",
        label: "gram",
        factorToBase: 1,
      } as never)
      .mockResolvedValueOnce({
        id: "u2",
        unitCategoryId: "cat2",
        symbol: "L",
        label: "litre",
        factorToBase: 1,
      } as never);
    const result = await convertQuantity(1000, "g", "L");
    expect(result).toBeNull();
  });

  it("converts quantity when same category", async () => {
    // 1 kg = 1000 g: kg factorToBase 1000, g factorToBase 1
    vi.mocked(prisma.unit.findUnique)
      .mockResolvedValueOnce({
        id: "u1",
        unitCategoryId: "cat1",
        symbol: "kg",
        label: "kilogram",
        factorToBase: 1000,
      } as never)
      .mockResolvedValueOnce({
        id: "u2",
        unitCategoryId: "cat1",
        symbol: "g",
        label: "gram",
        factorToBase: 1,
      } as never);
    const result = await convertQuantity(2, "kg", "g");
    expect(result).toBe(2000);
  });

  it("converts quantity from smaller to larger unit", async () => {
    vi.mocked(prisma.unit.findUnique)
      .mockResolvedValueOnce({
        id: "u1",
        unitCategoryId: "cat1",
        symbol: "g",
        label: "gram",
        factorToBase: 1,
      } as never)
      .mockResolvedValueOnce({
        id: "u2",
        unitCategoryId: "cat1",
        symbol: "kg",
        label: "kilogram",
        factorToBase: 1000,
      } as never);
    const result = await convertQuantity(1500, "g", "kg");
    expect(result).toBe(1.5);
  });
});
