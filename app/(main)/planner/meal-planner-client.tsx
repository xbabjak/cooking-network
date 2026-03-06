"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next13-progressbar";
import { DndContext, DragEndEvent, DragOverEvent, DragStartEvent } from "@dnd-kit/core";
import { DatesProvider, DatePickerInput } from "@mantine/dates";
import { Button, Checkbox } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import type { RecipeForPlanner } from "@/lib/recipes";
import type { PlannerEntryWithRecipe } from "@/lib/actions/planner";
import { savePlannerEntries, getPlannerEntries, getPlannerGroceriesFromEntries, addPlannerGroceriesToInventory } from "@/lib/actions/planner";
import type { PlannerGroceryRow } from "@/lib/actions/planner";
import { MealPlannerGrid } from "@/components/planner/meal-planner-grid";
import { RecipePalette } from "@/components/planner/recipe-palette";

export type PlannerSlot = {
  id: string;
  recipeId: string;
  recipeName: string;
  imageUrl: string | null;
  servings: number;
  baseServings: number;
  postId: string | null;
};

export type DayRow = {
  date: string;
  label: string;
  slots: PlannerSlot[];
};

const STORAGE_KEY = "planner-draft";

function toLocalYMD(d: Date): string {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseLocalDate(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toDateRange(start: string, end: string): DayRow[] {
  const rows: DayRow[] = [];
  const d = parseLocalDate(start);
  const endD = parseLocalDate(end);
  while (d <= endD) {
    const dateStr = toLocalYMD(d);
    rows.push({
      date: dateStr,
      label: d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }),
      slots: [],
    });
    d.setDate(d.getDate() + 1);
  }
  return rows;
}

function entriesToRows(entries: PlannerEntryWithRecipe[], startDate: string, endDate: string): DayRow[] {
  const rows = toDateRange(startDate, endDate);
  const byDate = new Map(rows.map((r) => [r.date, r]));
  for (const e of entries) {
    const dateStr = e.date;
    const row = byDate.get(dateStr);
    if (!row) continue;
    row.slots.push({
      id: e.id,
      recipeId: e.recipeId,
      recipeName: e.recipe.name,
      imageUrl: e.recipe.imageUrl,
      servings: e.servings,
      baseServings: e.recipe.servings ?? 1,
      postId: e.recipe.postId ?? null,
    });
  }
  return rows;
}

type Props = {
  userId: string;
  recipes: RecipeForPlanner[];
  initialEntries: PlannerEntryWithRecipe[];
  defaultStartDate: string;
  defaultEndDate: string;
};

export function MealPlannerClient({
  userId,
  recipes,
  initialEntries,
  defaultStartDate,
  defaultEndDate,
}: Props) {
  const router = useRouter();
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [rows, setRows] = useState<DayRow[]>(() =>
    entriesToRows(initialEntries, defaultStartDate, defaultEndDate)
  );
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [subtractInventory, setSubtractInventory] = useState(false);
  const [groceryRows, setGroceryRows] = useState<PlannerGroceryRow[]>([]);
  const [groceryLoading, setGroceryLoading] = useState(false);
  const [addToGroceriesLoading, setAddToGroceriesLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeRecipeId, setActiveRecipeId] = useState<string | null>(null);
  const isInitialRangeRef = useRef(true);

  const rangeValid =
    Boolean(startDate && endDate) && startDate <= endDate;

  const refreshRowsForRange = useCallback(
    (start: string, end: string) => {
      setRows((prev) => {
        const newRows = toDateRange(start, end);
        const byDate = new Map(prev.map((r) => [r.date, r]));
        for (const nr of newRows) {
          const existing = byDate.get(nr.date);
          if (existing) nr.slots = existing.slots;
        }
        return newRows;
      });
    },
    []
  );

  // Only build/refresh rows when range is valid
  useEffect(() => {
    if (!rangeValid) {
      setRows([]);
      return;
    }
    refreshRowsForRange(startDate, endDate);
  }, [rangeValid, startDate, endDate, refreshRowsForRange]);

  // Refetch saved entries when valid range changes so different ranges show their data
  useEffect(() => {
    if (!rangeValid || !startDate || !endDate) return;
    const isInitial = isInitialRangeRef.current;
    if (isInitial) isInitialRangeRef.current = false;
    if (!isInitial) setEntriesLoading(true);
    getPlannerEntries(userId, startDate, endDate)
      .then((entries) => {
        setRows(entriesToRows(entries, startDate, endDate));
      })
      .finally(() => setEntriesLoading(false));
  }, [userId, rangeValid, startDate, endDate]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ startDate, endDate, rows })
      );
    } catch {
      // ignore
    }
  }, [startDate, endDate, rows]);

  const loadGroceries = useCallback(async () => {
    const entries: { date: string; recipeId: string; servings: number }[] = [];
    for (const row of rows) {
      for (const slot of row.slots) {
        const servings = Number(slot.servings);
        if (!Number.isFinite(servings) || servings <= 0) continue;
        entries.push({ date: row.date, recipeId: slot.recipeId, servings });
      }
    }
    if (entries.length === 0) {
      setGroceryRows([]);
      return;
    }
    setGroceryLoading(true);
    try {
      const result = await getPlannerGroceriesFromEntries(entries, {
        subtractInventory,
      });
      if ("error" in result) {
        notifications.show({ title: "Error", message: result.error, color: "red" });
        return;
      }
      setGroceryRows("rows" in result ? result.rows : []);
    } finally {
      setGroceryLoading(false);
    }
  }, [rows, subtractInventory]);

  const handleAddToGroceries = useCallback(async () => {
    const entries: { date: string; recipeId: string; servings: number }[] = [];
    for (const row of rows) {
      for (const slot of row.slots) {
        const servings = Number(slot.servings);
        if (!Number.isFinite(servings) || servings <= 0) continue;
        entries.push({ date: row.date, recipeId: slot.recipeId, servings });
      }
    }
    if (entries.length === 0) return;
    setAddToGroceriesLoading(true);
    try {
      const result = await addPlannerGroceriesToInventory(entries, { subtractInventory });
      if ("error" in result) {
        notifications.show({ title: "Error", message: result.error, color: "red" });
        return;
      }
      const msg =
        result.skippedUnitConflict > 0
          ? `Added ${result.added} items. ${result.skippedUnitConflict} already in list with different units—adjust on Groceries page.`
          : `Added ${result.added} items to your groceries.`;
      notifications.show({ title: "Done", message: msg, color: "green" });
    } finally {
      setAddToGroceriesLoading(false);
    }
  }, [rows, subtractInventory]);

  // Auto-load groceries when planner has slots (debounced)
  const groceryLoadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const hasSlots = rows.some((r) => r.slots.length > 0);
    if (!hasSlots) {
      setGroceryRows([]);
      return;
    }
    if (groceryLoadTimeoutRef.current) clearTimeout(groceryLoadTimeoutRef.current);
    groceryLoadTimeoutRef.current = setTimeout(() => {
      groceryLoadTimeoutRef.current = null;
      const entries: { date: string; recipeId: string; servings: number }[] = [];
      for (const row of rows) {
        for (const slot of row.slots) {
          const servings = Number(slot.servings);
          if (Number.isFinite(servings) && servings > 0) {
            entries.push({ date: row.date, recipeId: slot.recipeId, servings });
          }
        }
      }
      if (entries.length === 0) return;
      setGroceryLoading(true);
      getPlannerGroceriesFromEntries(entries, { subtractInventory })
        .then((result) => {
          if ("error" in result) {
            notifications.show({ title: "Error", message: result.error, color: "red" });
            return;
          }
          setGroceryRows("rows" in result ? result.rows : []);
        })
        .finally(() => setGroceryLoading(false));
    }, 400);
    return () => {
      if (groceryLoadTimeoutRef.current) clearTimeout(groceryLoadTimeoutRef.current);
    };
  }, [rows, subtractInventory]);

  const handleUpload = useCallback(async () => {
    setUploading(true);
    try {
      const entries: { date: string; recipeId: string; servings: number }[] = [];
      for (const row of rows) {
        for (const slot of row.slots) {
          entries.push({ date: row.date, recipeId: slot.recipeId, servings: slot.servings });
        }
      }
      const result = await savePlannerEntries(entries, { startDate, endDate });
      if ("error" in result) {
        notifications.show({ title: "Error", message: result.error, color: "red" });
        return;
      }
      notifications.show({ title: "Saved", message: "Planner updated.", color: "green" });
      router.refresh();
    } finally {
      setUploading(false);
    }
  }, [rows, startDate, endDate, router]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const id = event.active.id as string;
    if (id.startsWith("recipe-")) {
      setActiveRecipeId(id.replace(/^recipe-/, ""));
    }
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveRecipeId(null);
      const { active, over } = event;
      if (!over) return;
      const overId = String(over.id);
      if (!overId.startsWith("day-")) return;
      const date = overId.replace(/^day-/, "");
      const recipeId = String(active.id).replace(/^recipe-/, "");
      if (!recipeId || !date) return;
      const recipe = recipes.find((r) => r.id === recipeId);
      if (!recipe) return;
      const baseServings = recipe.servings ?? 1;
      const newSlot: PlannerSlot = {
        id: `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        recipeId: recipe.id,
        recipeName: recipe.name,
        imageUrl: recipe.imageUrl,
        servings: baseServings,
        baseServings,
        postId: recipe.postId ?? null,
      };
      setRows((prev) =>
        prev.map((r) =>
          r.date === date
            ? { ...r, slots: [...r.slots, newSlot] }
            : r
        )
      );
    },
    [recipes]
  );

  const handleDragOver = useCallback((_event: DragOverEvent) => {
    // optional: visual feedback
  }, []);

  const setSlotServings = useCallback(
    (date: string, slotId: string, delta: number) => {
      setRows((prev) =>
        prev.map((row) => {
          if (row.date !== date) return row;
          return {
            ...row,
            slots: row.slots
              .map((s) => {
                if (s.id !== slotId) return s;
                const next = Math.max(0.5, s.servings + delta);
                return { ...s, servings: Math.round(next * 100) / 100 };
              })
              .filter((s) => s.servings > 0),
          };
        })
      );
    },
    []
  );

  const removeSlot = useCallback((date: string, slotId: string) => {
    setRows((prev) =>
      prev.map((row) =>
        row.date === date
          ? { ...row, slots: row.slots.filter((s) => s.id !== slotId) }
          : row
      )
    );
  }, []);

  const dateRangeValue: [Date | null, Date | null] = [
    startDate ? parseLocalDate(startDate) : null,
    endDate ? parseLocalDate(endDate) : null,
  ];

  const handleRangeChange = useCallback(
    (range: [Date | string | null, Date | string | null] | [Date | string | null]) => {
      const d0 = Array.isArray(range) ? range[0] : null;
      const d1 = Array.isArray(range) && range.length > 1 ? range[1] : null;
      const toYMD = (d: Date | string) =>
        typeof d === "string" ? d.slice(0, 10) : toLocalYMD(new Date(d));
      if (d0 && d1) {
        const s = toYMD(d0);
        const e = toYMD(d1);
        if (s <= e) {
          setStartDate(s);
          setEndDate(e);
        } else {
          setStartDate(e);
          setEndDate(s);
        }
      } else if (d0) {
        setStartDate(toYMD(d0));
        setEndDate("");
      } else if (d1) {
        setStartDate("");
        setEndDate(toYMD(d1));
      }
    },
    []
  );

  return (
    <DatesProvider settings={{ firstDayOfWeek: 0 }}>
    <div className="space-y-6">
      {!rangeValid ? (
        <>
          <div className="flex flex-wrap items-center gap-4">
            <DatePickerInput
              type="range"
              label="Date range"
              value={dateRangeValue}
              onChange={handleRangeChange}
              valueFormat="MMM D, YYYY"
              clearable={false}
              size="sm"
            />
          </div>
          <p className="text-muted text-sm">
            Select start and end date to view your meal plan.
          </p>
        </>
      ) : (
        <>
          <DndContext
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
          >
            <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-6">
              <RecipePalette recipes={recipes} />
              <div className="space-y-4 min-w-0">
                <div className="flex flex-wrap items-end gap-4">
                  <div className="min-w-[260px]">
                    <DatePickerInput
                      type="range"
                      label="Date range"
                      placeholder="Pick start and end dates"
                      value={dateRangeValue}
                      onChange={handleRangeChange}
                      valueFormat="MMM D, YYYY"
                      clearable={false}
                      size="md"
                    />
                  </div>
                  <Button
                    onClick={handleUpload}
                    loading={uploading}
                    size="md"
                    className="shrink-0 px-5 py-2.5 bg-primary hover:bg-primary-hover text-primary-foreground font-medium rounded-lg shadow-sm transition-colors"
                  >
                    Upload to app
                  </Button>
                </div>
                {entriesLoading ? (
                  <p className="text-muted text-sm">Loading plan…</p>
                ) : (
                  <MealPlannerGrid
                    rows={rows}
                    onSetSlotServings={setSlotServings}
                    onRemoveSlot={removeSlot}
                  />
                )}
              </div>
            </div>
          </DndContext>

          <section className="border-t border-border pt-6">
            <h2 className="text-lg font-semibold mb-2">Groceries for period</h2>
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <Checkbox
                label="Subtract what I have"
                checked={subtractInventory}
                onChange={(e) => setSubtractInventory(e.currentTarget.checked)}
              />
              <Button
                variant="default"
                size="sm"
                onClick={loadGroceries}
                loading={groceryLoading}
              >
                Update list
              </Button>
              {groceryRows.length > 0 && (
                <Button
                  variant="filled"
                  size="sm"
                  onClick={handleAddToGroceries}
                  loading={addToGroceriesLoading}
                  disabled={groceryLoading}
                  className="bg-primary hover:bg-primary-hover text-primary-foreground"
                >
                  Add to my groceries
                </Button>
              )}
            </div>
            {groceryRows.length === 0 && !groceryLoading ? (
              <p className="text-muted text-sm">
                {rows.some((r) => r.slots.length > 0)
                  ? "No ingredients to list for the planned recipes."
                  : "Add meals to the planner to see groceries for the period."}
              </p>
            ) : (
              <>
                <p className="text-sm text-muted mb-2">
                  {groceryRows.length} {groceryRows.length === 1 ? "item" : "items"}
                  {subtractInventory
                    ? " (amount needed after subtracting what you have)"
                    : " (total for planned meals)"}
                </p>
                <ul className="space-y-2">
                  {groceryRows.map((row) => (
                    <li
                      key={row.groceryItemId}
                      className="flex justify-between gap-2 text-sm border-b border-border pb-1"
                    >
                      <span className="font-medium">{row.groceryItemName}</span>
                      <span className="text-muted tabular-nums">
                        {subtractInventory && row.quantityMissing != null
                          ? `${row.quantityMissing} ${row.unit} needed`
                          : `${row.quantityNeeded} ${row.unit}`}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </>
      )}
    </div>
    </DatesProvider>
  );
}
