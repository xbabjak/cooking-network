"use client";

import {
  Autocomplete,
  Checkbox,
  NumberInput,
  Select,
} from "@mantine/core";
import type { GroceryItemOption } from "@/lib/grocery-items";
import { groupGroceryItemsForAutocomplete } from "@/lib/grocery-autocomplete";
import type { Unit } from "@/lib/units";
import type { Ingredient } from "./types";

const autocompleteStyles = {
  groupLabel: {
    fontWeight: 600,
    fontSize: "var(--mantine-font-size-xs)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "var(--mantine-color-dimmed)",
    paddingBlock: "var(--mantine-spacing-xs)",
    paddingInline: "var(--mantine-spacing-sm)",
    borderBottom: "1px solid var(--mantine-color-default-border)",
    backgroundColor: "var(--mantine-color-default-hover)",
  },
};

type OneOfOption = { value: string; label: string };

type IngredientRowProps = {
  ingredient: Ingredient;
  index: number;
  items: GroceryItemOption[];
  allowedUnitsCache: Record<string, Unit[]>;
  defaultUnitOptions: Unit[];
  oneOfGroupOptions: OneOfOption[];
  onFetchGroceryItems: (rowId: string, search: string) => Promise<GroceryItemOption[]>;
  onSetGroceryItem: (
    i: number,
    item: GroceryItemOption | null,
    typedValue?: string
  ) => Promise<void>;
  onUpdate: (
    i: number,
    field: keyof Omit<Ingredient, "rowId">,
    value: string | number | boolean | undefined | null
  ) => void;
  onRemove: (i: number) => void;
};

export function IngredientRow({
  ingredient,
  index,
  items,
  allowedUnitsCache,
  defaultUnitOptions,
  oneOfGroupOptions,
  onFetchGroceryItems,
  onSetGroceryItem,
  onUpdate,
  onRemove,
}: IngredientRowProps) {
  const autocompleteData = groupGroceryItemsForAutocomplete(items);
  const unitData =
    ingredient.groceryItemId && allowedUnitsCache[ingredient.groceryItemId]
      ? allowedUnitsCache[ingredient.groceryItemId].map((u) => ({
          value: u.symbol,
          label: u.label,
        }))
      : defaultUnitOptions.length > 0
        ? defaultUnitOptions.map((u) => ({
            value: u.symbol,
            label: u.label,
          }))
        : [{ value: "items", label: "Items" }];

  return (
    <div className="flex gap-2 mt-2 items-center flex-wrap">
      <Autocomplete
        placeholder="Search or type to add new"
        data={autocompleteData}
        styles={autocompleteStyles}
        value={ingredient.groceryItemName ?? ""}
        maxLength={200}
        onChange={async (value) => {
          onUpdate(index, "groceryItemName", value);
          if (value.length >= 1) {
            const fetched = await onFetchGroceryItems(ingredient.rowId, value);
            const match = fetched.find(
              (it) => it.name.toLowerCase() === value.toLowerCase()
            );
            await onSetGroceryItem(index, match ?? null, value);
          } else {
            onSetGroceryItem(index, null, value);
          }
        }}
        onOptionSubmit={async (value) => {
          const match = items.find(
            (it) => it.name.toLowerCase() === (value ?? "").toLowerCase()
          );
          if (match) await onSetGroceryItem(index, match);
        }}
        filter={({ options }) => options}
        className="flex-1"
      />
      <NumberInput
        min={0}
        step={0.5}
        value={ingredient.quantity}
        onChange={(value) =>
          onUpdate(
            index,
            "quantity",
            typeof value === "string" ? parseFloat(value) || 0 : value ?? 0
          )
        }
        w={80}
      />
      <Select
        placeholder="Unit"
        data={unitData}
        value={ingredient.unit || "items"}
        onChange={(v) => onUpdate(index, "unit", v ?? "items")}
        allowDeselect={false}
        w={120}
        searchable
      />
      <Select
        placeholder="One of"
        data={oneOfGroupOptions}
        value={ingredient.oneOfGroupId ?? ""}
        onChange={(v) => {
          if (v === "__new__") onUpdate(index, "oneOfGroupId", crypto.randomUUID());
          else if (v === "" || v === null) onUpdate(index, "oneOfGroupId", undefined);
          else onUpdate(index, "oneOfGroupId", v);
        }}
        allowDeselect={false}
        w={140}
        size="sm"
      />
      <Checkbox
        size="sm"
        label="Optional"
        checked={ingredient.optional ?? false}
        onChange={(e) => onUpdate(index, "optional", e.currentTarget.checked)}
      />
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="shrink-0 px-3 py-1.5 text-sm border border-border text-error hover:bg-hover rounded-md"
      >
        Remove
      </button>
    </div>
  );
}
