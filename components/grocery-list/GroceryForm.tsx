"use client";

import { Autocomplete, Button } from "@mantine/core";
import { GroceryQuantityUnitFields } from "./GroceryQuantityUnitFields";

type UnitOption = { value: string; label: string };

type AutocompleteData = Array<{ group: string; items: string[] }>;

type Props = {
  error: string;
  groceryItemSearch: string;
  autocompleteData: AutocompleteData;
  onAutocompleteChange: (value: string) => void;
  onAutocompleteOptionSubmit: (value: string) => void;
  unit: string;
  setUnit: (value: string) => void;
  quantity: number;
  setQuantity: (value: number) => void;
  lowThreshold: number;
  setLowThreshold: (value: number) => void;
  unitSelectData: UnitOption[];
  unitsLoading: boolean;
  submitDisabled: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
};

export function GroceryForm({
  error,
  groceryItemSearch,
  autocompleteData,
  onAutocompleteChange,
  onAutocompleteOptionSubmit,
  unit,
  setUnit,
  quantity,
  setQuantity,
  lowThreshold,
  setLowThreshold,
  unitSelectData,
  unitsLoading,
  submitDisabled,
  onSubmit,
  onCancel,
}: Props) {
  return (
    <form
      onSubmit={onSubmit}
      className="mb-6 p-4 border border-border rounded-lg space-y-3"
    >
      {error && <p className="text-sm text-error">{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <Autocomplete
          label="Item"
          placeholder="Search or type to add new"
          data={autocompleteData}
          styles={{
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
          }}
          value={groceryItemSearch}
          onChange={(value) => onAutocompleteChange(value ?? "")}
          onOptionSubmit={(value) =>
            onAutocompleteOptionSubmit(value ?? "")
          }
          filter={({ options }) => options}
          required
        />
        <GroceryQuantityUnitFields
          unit={unit}
          onUnitChange={setUnit}
          quantity={quantity}
          onQuantityChange={setQuantity}
          lowThreshold={lowThreshold}
          onLowThresholdChange={setLowThreshold}
          unitSelectData={unitSelectData}
          unitsDisabled={submitDisabled}
        />
      </div>
      <div className="flex gap-2 items-center">
        <Button
          type="submit"
          className="bg-primary hover:bg-primary-hover text-primary-foreground px-4 py-2 rounded-md"
          disabled={submitDisabled}
        >
          Add
        </Button>
        <Button
          type="button"
          variant="default"
          className="px-4 py-2 rounded-md border border-border hover:bg-hover"
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
