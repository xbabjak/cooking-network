"use client";

import { NumberInput, Checkbox } from "@mantine/core";
import type { DoneCookingPreviewRow } from "./types";

type Props = {
  row: DoneCookingPreviewRow;
  deduct: number;
  include: boolean;
  newQty: number;
  onDeductChange: (value: number) => void;
  onIncludeChange: (checked: boolean) => void;
};

export function DeductionPreviewRow({
  row,
  deduct,
  include,
  newQty,
  onDeductChange,
  onIncludeChange,
}: Props) {
  return (
    <li className="border border-border rounded-md p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{row.groceryItemName}</span>
        <span className="text-muted-foreground text-sm">
          Recipe: {row.recipeQuantity} {row.recipeUnit || ""}
        </span>
      </div>
      {row.inInventory ? (
        <>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="text-muted-foreground">
              Current: {row.userCurrentQuantity} {row.userUnit}
            </span>
            <div className="flex items-center gap-1.5">
              <label className="text-muted-foreground">Deduct:</label>
              <NumberInput
                min={0}
                max={row.userCurrentQuantity}
                step={0.25}
                value={deduct}
                onChange={(v) => {
                  const n = typeof v === "string" ? parseFloat(v) : v;
                  onDeductChange(Number.isFinite(n) ? n : 0);
                }}
                className="w-20"
                size="xs"
              />
              <span className="font-medium text-foreground">{row.userUnit}</span>
            </div>
            <span className="text-muted-foreground">
              New: {newQty} {row.userUnit}
            </span>
          </div>
          <Checkbox
            size="xs"
            label="Include in deduction"
            checked={include}
            onChange={(e) => onIncludeChange(e.currentTarget.checked)}
          />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Not in inventory</p>
      )}
    </li>
  );
}
