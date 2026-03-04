"use client";

import type { OneOfGroup } from "./utils";

type Props = {
  oneOfGroups: OneOfGroup[];
  oneOfChoices: Record<string, string>;
  onChoiceChange: (groupId: string, ingredientId: string) => void;
};

export function OneOfSelector({
  oneOfGroups,
  oneOfChoices,
  onChoiceChange,
}: Props) {
  return (
    <>
      <p className="mt-2 text-muted-foreground text-sm">
        Which ingredients did you use?
      </p>
      <div className="mt-3 space-y-3">
        {oneOfGroups.map(({ groupId, ingredients }) => (
          <fieldset key={groupId} className="space-y-1.5">
            <legend className="sr-only">
              One of: {ingredients.map((ing) => ing.groceryItem.name).join(", ")}
            </legend>
            {ingredients.map((ing) => {
              const label = `${ing.groceryItem.name}${ing.quantity > 0 ? ` — ${ing.quantity} ${ing.unit || ""}` : ""}`;
              return (
                <label
                  key={ing.id}
                  className="flex cursor-pointer items-center gap-2"
                >
                  <input
                    type="radio"
                    name={`oneOf-${groupId}`}
                    value={ing.id}
                    checked={
                      (oneOfChoices[groupId] ?? ingredients[0]?.id) === ing.id
                    }
                    onChange={() => onChoiceChange(groupId, ing.id)}
                    className="h-4 w-4 border-border"
                  />
                  <span className="text-sm">{label}</span>
                </label>
              );
            })}
          </fieldset>
        ))}
      </div>
    </>
  );
}
