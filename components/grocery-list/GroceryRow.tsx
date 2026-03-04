"use client";

import type { Grocery } from "./types";

type Props = {
  grocery: Grocery;
  onDecrement: (id: string) => void;
  onEdit: (grocery: Grocery) => void;
  onDelete: (id: string) => void;
};

export function GroceryRow({
  grocery,
  onDecrement,
  onEdit,
  onDelete,
}: Props) {
  return (
    <li className="flex items-center justify-between gap-4 py-2 border-b border-border">
      <div className="flex-1 min-w-0">
        <span className="font-medium">{grocery.groceryItem.name}</span>
        <span className="text-muted ml-2">
          {grocery.quantity} {grocery.unit}
          {grocery.lowThreshold > 0 && (
            <span className="text-xs"> (low below {grocery.lowThreshold})</span>
          )}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onDecrement(grocery.id)}
          className="px-2 py-1 text-sm border border-border rounded hover:bg-hover"
          title="Use one"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => onEdit(grocery)}
          className="text-sm text-primary hover:underline rounded"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => onDelete(grocery.id)}
          className="text-sm text-error hover:underline rounded"
        >
          Remove
        </button>
      </div>
    </li>
  );
}
