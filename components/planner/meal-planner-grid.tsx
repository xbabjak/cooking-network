"use client";

import Link from "next/link";
import { useDroppable } from "@dnd-kit/core";
import { Button } from "@mantine/core";
import type { DayRow, PlannerSlot } from "@/app/(main)/planner/meal-planner-client";

type Props = {
  rows: DayRow[];
  onSetSlotServings: (date: string, slotId: string, delta: number) => void;
  onRemoveSlot: (date: string, slotId: string) => void;
};

function SlotCard({
  slot,
  date,
  onSetServings,
  onRemove,
}: {
  slot: PlannerSlot;
  date: string;
  onSetServings: (delta: number) => void;
  onRemove: () => void;
}) {
  const thumb = slot.imageUrl ? (
    <img
      src={slot.imageUrl}
      alt=""
      className="w-10 h-10 object-cover rounded"
    />
  ) : (
    <span className="w-10 h-10 rounded bg-border flex items-center justify-center text-xs text-muted">
      —
    </span>
  );

  const recipeNameEl = slot.postId ? (
    <Link
      href={`/post/${slot.postId}`}
      className="font-medium text-sm truncate hover:text-primary block"
    >
      {slot.recipeName}
    </Link>
  ) : (
    <p className="font-medium text-sm truncate">{slot.recipeName}</p>
  );

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-surface-alt border border-border">
      {slot.postId ? (
        <Link href={`/post/${slot.postId}`} className="flex-shrink-0 hover:opacity-90">
          {thumb}
        </Link>
      ) : (
        thumb
      )}
      <div className="min-w-0 flex-1">
        {recipeNameEl}
        <div className="flex items-center gap-1">
          <Button
            variant="subtle"
            size="xs"
            onClick={() => onSetServings(-0.5)}
            className="min-w-0 h-6 w-6 p-0"
          >
            −
          </Button>
          <span className="text-sm text-muted tabular-nums">{slot.servings} servings</span>
          <Button
            variant="subtle"
            size="xs"
            onClick={() => onSetServings(0.5)}
            className="min-w-0 h-6 w-6 p-0"
          >
            +
          </Button>
        </div>
      </div>
      <Button
        variant="subtle"
        size="xs"
        color="red"
        onClick={onRemove}
        className="min-w-0 text-error hover:bg-hover"
      >
        Remove
      </Button>
    </div>
  );
}

function DayDroppable({
  row,
  onSetSlotServings,
  onRemoveSlot,
}: {
  row: DayRow;
  onSetSlotServings: (date: string, slotId: string, delta: number) => void;
  onRemoveSlot: (date: string, slotId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `day-${row.date}` });
  return (
    <div
      ref={setNodeRef}
      className={`p-3 rounded-lg border min-h-[80px] transition-colors ${
        isOver ? "border-primary bg-primary/5" : "border-border bg-surface"
      }`}
    >
      <p className="text-sm font-medium text-muted mb-2">{row.label}</p>
      <div className="space-y-2">
        {row.slots.map((slot) => (
          <SlotCard
            key={slot.id}
            slot={slot}
            date={row.date}
            onSetServings={(delta) => onSetSlotServings(row.date, slot.id, delta)}
            onRemove={() => onRemoveSlot(row.date, slot.id)}
          />
        ))}
      </div>
    </div>
  );
}

export function MealPlannerGrid({
  rows,
  onSetSlotServings,
  onRemoveSlot,
}: Props) {
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <DayDroppable
          key={row.date}
          row={row}
          onSetSlotServings={onSetSlotServings}
          onRemoveSlot={onRemoveSlot}
        />
      ))}
    </div>
  );
}
