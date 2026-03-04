"use client";

import { NumberInput, Select } from "@mantine/core";

type UnitOption = { value: string; label: string };

type Props = {
  unit: string;
  onUnitChange: (value: string) => void;
  quantity: number;
  onQuantityChange: (value: number) => void;
  lowThreshold: number;
  onLowThresholdChange: (value: number) => void;
  unitSelectData: UnitOption[];
  unitsDisabled?: boolean;
};

export function GroceryQuantityUnitFields({
  unit,
  onUnitChange,
  quantity,
  onQuantityChange,
  lowThreshold,
  onLowThresholdChange,
  unitSelectData,
  unitsDisabled = false,
}: Props) {
  return (
    <>
      <Select
        label="Unit"
        data={unitSelectData}
        value={unit || "items"}
        onChange={(v) => onUnitChange(v ?? "items")}
        allowDeselect={false}
        searchable
        disabled={unitsDisabled}
      />
      <NumberInput
        label="Quantity"
        min={0}
        step={0.5}
        value={quantity}
        onChange={(value) =>
          onQuantityChange(
            typeof value === "string" ? parseFloat(value) || 0 : value ?? 0
          )
        }
      />
      <NumberInput
        label="Remind when below"
        min={0}
        step={0.5}
        value={lowThreshold}
        onChange={(value) =>
          onLowThresholdChange(
            typeof value === "string" ? parseFloat(value) || 0 : value ?? 0
          )
        }
      />
    </>
  );
}
