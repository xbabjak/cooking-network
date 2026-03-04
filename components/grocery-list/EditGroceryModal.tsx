"use client";

import { Modal, Button } from "@mantine/core";
import { GroceryQuantityUnitFields } from "./GroceryQuantityUnitFields";

type UnitOption = { value: string; label: string };

type Props = {
  opened: boolean;
  onClose: () => void;
  itemName: string;
  unit: string;
  setUnit: (value: string) => void;
  quantity: number;
  setQuantity: (value: number) => void;
  lowThreshold: number;
  setLowThreshold: (value: number) => void;
  unitSelectData: UnitOption[];
  unitsLoading: boolean;
  error: string;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
};

export function EditGroceryModal({
  opened,
  onClose,
  itemName,
  unit,
  setUnit,
  quantity,
  setQuantity,
  lowThreshold,
  setLowThreshold,
  unitSelectData,
  unitsLoading,
  error,
  onSubmit,
  onCancel,
}: Props) {
  return (
    <Modal opened={opened} onClose={onClose} title="Edit grocery" size="sm">
      <form onSubmit={onSubmit} className="space-y-3">
        {error && <p className="text-sm text-error">{error}</p>}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Item</label>
            <p className="text-foreground py-2">{itemName}</p>
          </div>
          <GroceryQuantityUnitFields
            unit={unit}
            onUnitChange={setUnit}
            quantity={quantity}
            onQuantityChange={setQuantity}
            lowThreshold={lowThreshold}
            onLowThresholdChange={setLowThreshold}
            unitSelectData={unitSelectData}
            unitsDisabled={unitsLoading}
          />
        </div>
        <div className="flex gap-2">
          <Button
            type="submit"
            className="bg-primary hover:bg-primary-hover text-primary-foreground px-4 py-2"
            disabled={unitsLoading}
          >
            Save
          </Button>
          <Button
            type="button"
            variant="default"
            className="px-4 py-2"
            onClick={onCancel}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
