"use client";

import { useDoneCooking } from "./use-done-cooking";
import { DoneCookingModal } from "./DoneCookingModal";
import type { DoneCookingButtonProps } from "./types";

export function DoneCookingButton(props: DoneCookingButtonProps) {
  const {
    loading,
    error,
    showConfirm,
    openConfirm,
    closeConfirm,
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
    handleConfirm,
  } = useDoneCooking(props);

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={openConfirm}
        disabled={loading}
        className="px-4 py-2 bg-primary hover:bg-primary-hover text-primary-foreground font-medium rounded-md disabled:opacity-50"
      >
        {loading ? "Removing…" : "I'm done cooking"}
      </button>
      {error && (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {showConfirm && (
        <DoneCookingModal
          oneOfGroups={oneOfGroups}
          oneOfChoices={oneOfChoices}
          setOneOfChoices={setOneOfChoices}
          previewRows={previewRows}
          previewLoading={previewLoading}
          previewError={previewError}
          setRowOverride={setRowOverride}
          getDeductForRow={getDeductForRow}
          getIncludeForRow={getIncludeForRow}
          getNewQtyForRow={getNewQtyForRow}
          dontAskAgain={dontAskAgain}
          setDontAskAgain={setDontAskAgain}
          onClose={closeConfirm}
          onConfirm={handleConfirm}
          confirmLoading={loading || previewLoading}
        />
      )}
    </div>
  );
}
