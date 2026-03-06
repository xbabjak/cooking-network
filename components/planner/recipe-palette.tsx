"use client";

import { useDraggable } from "@dnd-kit/core";
import type { RecipeForPlanner } from "@/lib/recipes";

function DraggableRecipeCard({ recipe }: { recipe: RecipeForPlanner }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `recipe-${recipe.id}`,
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`p-2 rounded-lg border border-border bg-surface-alt cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-center gap-2">
        {recipe.imageUrl ? (
          <img
            src={recipe.imageUrl}
            alt=""
            className="w-12 h-12 object-cover rounded"
          />
        ) : (
          <span className="w-12 h-12 rounded bg-border flex items-center justify-center text-xs text-muted">
            —
          </span>
        )}
        <span className="font-medium text-sm line-clamp-2">{recipe.name}</span>
      </div>
    </div>
  );
}

type Props = { recipes: RecipeForPlanner[] };

export function RecipePalette({ recipes }: Props) {
  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold text-muted">Recipes</h2>
      <p className="text-xs text-muted">Drag onto a day to add.</p>
      <div className="space-y-2 max-h-[60vh] overflow-y-auto">
        {recipes.length === 0 ? (
          <p className="text-sm text-muted">No recipes available.</p>
        ) : (
          recipes.map((r) => <DraggableRecipeCard key={r.id} recipe={r} />)
        )}
      </div>
    </div>
  );
}
