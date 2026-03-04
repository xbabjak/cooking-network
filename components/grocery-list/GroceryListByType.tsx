"use client";

import type { Grocery } from "./types";
import { groupGroceriesByType } from "./utils";
import { GroceryRow } from "./GroceryRow";

type Props = {
  groceries: Grocery[];
  useByByGroceryId?: Record<string, string>;
  onDecrement: (id: string) => void;
  onEdit: (grocery: Grocery) => void;
  onDelete: (id: string) => void;
};

export function GroceryListByType({
  groceries,
  useByByGroceryId,
  onDecrement,
  onEdit,
  onDelete,
}: Props) {
  const { byType, typeNames } = groupGroceriesByType(groceries);
  return (
    <ul className="space-y-4 list-none pl-0">
      {typeNames.map((typeName) => (
        <li key={typeName}>
          <h3 className="text-sm font-semibold text-muted mb-2">
            {typeName}
          </h3>
          <ul className="space-y-2 list-none pl-0">
            {byType[typeName].map((g) => (
              <GroceryRow
                key={g.id}
                grocery={g}
                useByLabel={useByByGroceryId?.[g.id]}
                onDecrement={onDecrement}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
