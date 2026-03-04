"use client";

import { useGroceryList } from "./use-grocery-list";
import { GroceryForm } from "./GroceryForm";
import { EditGroceryModal } from "./EditGroceryModal";
import { GroceryListByType } from "./GroceryListByType";
import type { GroceryListProps } from "./types";

export function GroceryList(props: GroceryListProps) {
  const {
    groceries,
    showForm,
    setShowForm,
    editingId,
    editModalOpened,
    openEditModal,
    closeEditModal,
    groceryItemSearch,
    selectedGroceryItemId,
    unit,
    setUnit,
    quantity,
    setQuantity,
    lowThreshold,
    setLowThreshold,
    error,
    unitSelectData,
    unitsLoading,
    autocompleteData,
    resetForm,
    startEdit,
    onAutocompleteChange,
    onAutocompleteOptionSubmit,
    handleAdd,
    handleUpdate,
    handleDelete,
    handleDecrement,
  } = useGroceryList(props);

  return (
    <section>
      <h2 className="text-lg font-semibold mb-3">All items</h2>
      {!showForm && !editingId && (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="mb-4 px-4 py-2 border border-border rounded-md hover:bg-hover"
        >
          + Add grocery
        </button>
      )}

      {showForm && !editingId && (
        <GroceryForm
          error={error}
          groceryItemSearch={groceryItemSearch}
          autocompleteData={autocompleteData}
          onAutocompleteChange={onAutocompleteChange}
          onAutocompleteOptionSubmit={onAutocompleteOptionSubmit}
          unit={unit}
          setUnit={setUnit}
          quantity={quantity}
          setQuantity={setQuantity}
          lowThreshold={lowThreshold}
          setLowThreshold={setLowThreshold}
          unitSelectData={unitSelectData}
          unitsLoading={unitsLoading}
          submitDisabled={!!(selectedGroceryItemId && unitsLoading)}
          onSubmit={handleAdd}
          onCancel={resetForm}
        />
      )}

      <EditGroceryModal
        opened={editModalOpened}
        onClose={() => {
          closeEditModal();
          resetForm();
        }}
        itemName={groceryItemSearch}
        unit={unit}
        setUnit={setUnit}
        quantity={quantity}
        setQuantity={setQuantity}
        lowThreshold={lowThreshold}
        setLowThreshold={setLowThreshold}
        unitSelectData={unitSelectData}
        unitsLoading={unitsLoading}
        error={error}
        onSubmit={handleUpdate}
        onCancel={() => {
          closeEditModal();
          resetForm();
        }}
      />

      <GroceryListByType
        groceries={groceries}
        onDecrement={handleDecrement}
        onEdit={(g) => {
          startEdit(g);
          openEditModal();
        }}
        onDelete={handleDelete}
      />

      {groceries.length === 0 && !showForm && (
        <p className="text-muted">
          No groceries yet. Add items to track and get low-stock reminders.
        </p>
      )}
    </section>
  );
}
