"use client";

import type { DoneCookingPreviewRow } from "./types";
import type { OneOfGroup } from "./utils";
import { OneOfSelector } from "./OneOfSelector";
import { DeductionPreviewRow } from "./DeductionPreviewRow";

type Props = {
  oneOfGroups: OneOfGroup[];
  oneOfChoices: Record<string, string>;
  setOneOfChoices: (updater: (prev: Record<string, string>) => Record<string, string>) => void;
  previewRows: DoneCookingPreviewRow[] | null;
  previewLoading: boolean;
  previewError: string | null;
  setRowOverride: (ingredientId: string, patch: { deduct?: number; include?: boolean }) => void;
  getDeductForRow: (row: DoneCookingPreviewRow) => number;
  getIncludeForRow: (row: DoneCookingPreviewRow) => boolean;
  getNewQtyForRow: (row: DoneCookingPreviewRow) => number;
  dontAskAgain: boolean;
  setDontAskAgain: (value: boolean) => void;
  onClose: () => void;
  onConfirm: () => void;
  confirmLoading: boolean;
};

export function DoneCookingModal({
  oneOfGroups,
  oneOfChoices,
  setOneOfChoices,
  previewRows,
  previewLoading,
  previewError,
  setRowOverride,
  getDeductForRow,
  getIncludeForRow,
  getNewQtyForRow,
  dontAskAgain,
  setDontAskAgain,
  onClose,
  onConfirm,
  confirmLoading,
}: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <div className="mx-4 w-full max-w-md rounded-lg border border-border bg-background p-4 shadow-lg max-h-[90vh] overflow-y-auto">
        <h2 id="confirm-title" className="font-semibold text-lg">
          Remove ingredients from inventory?
        </h2>

        {oneOfGroups.length > 0 && (
          <OneOfSelector
            oneOfGroups={oneOfGroups}
            oneOfChoices={oneOfChoices}
            onChoiceChange={(groupId, ingredientId) =>
              setOneOfChoices((prev) => ({ ...prev, [groupId]: ingredientId }))
            }
          />
        )}

        {previewLoading && (
          <p className="mt-3 text-sm text-muted-foreground">Loading preview…</p>
        )}
        {previewError && (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {previewError}
          </p>
        )}
        {!previewLoading && previewRows && previewRows.length > 0 && (
          <div className="mt-3 space-y-3">
            <p className="text-sm font-medium">Changes to your inventory</p>
            <ul className="space-y-3">
              {previewRows.map((row) => (
                <DeductionPreviewRow
                  key={row.ingredientId}
                  row={row}
                  deduct={getDeductForRow(row)}
                  include={getIncludeForRow(row)}
                  newQty={getNewQtyForRow(row)}
                  onDeductChange={(value) =>
                    setRowOverride(row.ingredientId, { deduct: value })
                  }
                  onIncludeChange={(checked) =>
                    setRowOverride(row.ingredientId, { include: checked })
                  }
                />
              ))}
            </ul>
          </div>
        )}
        {!previewLoading && previewRows && previewRows.length === 0 && (
          <p className="mt-3 text-sm text-muted-foreground">
            No ingredients to show.
          </p>
        )}

        <label className="mt-4 flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            id="done-cooking-dont-ask"
            className="h-4 w-4 rounded border-border"
            checked={dontAskAgain}
            onChange={(e) => setDontAskAgain(e.target.checked)}
          />
          <span className="text-sm">Don&apos;t ask me again</span>
        </label>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirmLoading}
            className="px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary-hover disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
