"use client";

import {
  Autocomplete,
  Button,
  Modal,
  NumberInput,
  TextInput,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useState, useCallback } from "react";
import {
  addGrocery,
  updateGrocery,
  deleteGrocery,
  decrementGrocery,
} from "@/lib/actions/groceries";
import { getGroceryItems, type GroceryItemOption } from "@/lib/grocery-items";
import { groupGroceryItemsForAutocomplete } from "@/lib/grocery-autocomplete";

type Grocery = {
  id: string;
  groceryItemId: string;
  groceryItem: { name: string; groceryType?: { name: string } };
  unit: string;
  quantity: number;
  lowThreshold: number;
};

type Props = {
  groceries: Grocery[];
  initialGroceryItems: GroceryItemOption[];
};

export function GroceryList({ groceries: initial, initialGroceryItems }: Props) {
  const [groceries, setGroceries] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editModalOpened, { open: openEditModal, close: closeEditModal }] =
    useDisclosure(false);
  const [groceryItemSearch, setGroceryItemSearch] = useState("");
  const [selectedGroceryItemId, setSelectedGroceryItemId] = useState<string | null>(null);
  const [groceryItems, setGroceryItems] = useState(initialGroceryItems);
  const [unit, setUnit] = useState("items");
  const [quantity, setQuantity] = useState(0);
  const [lowThreshold, setLowThreshold] = useState(0);
  const [error, setError] = useState("");

  const fetchGroceryItems = useCallback(async (search: string) => {
    const items = await getGroceryItems(search || undefined);
    setGroceryItems(items);
    return items;
  }, []);

  function resetForm() {
    setGroceryItemSearch("");
    setSelectedGroceryItemId(null);
    setUnit("items");
    setQuantity(0);
    setLowThreshold(0);
    setShowForm(false);
    setEditingId(null);
    setError("");
  }

  function startEdit(g: Grocery) {
    setEditingId(g.id);
    setGroceryItemSearch(g.groceryItem.name);
    setSelectedGroceryItemId(g.groceryItemId);
    setUnit(g.unit);
    setQuantity(g.quantity);
    setLowThreshold(g.lowThreshold);
    setError("");
  }

  const autocompleteData = groupGroceryItemsForAutocomplete(groceryItems);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const formData = new FormData();
    if (selectedGroceryItemId) {
      formData.set("groceryItemId", selectedGroceryItemId);
    } else if (groceryItemSearch.trim()) {
      formData.set("name", groceryItemSearch.trim());
    } else {
      setError("Select or enter a grocery item");
      return;
    }
    formData.set("unit", unit);
    formData.set("quantity", String(quantity));
    formData.set("lowThreshold", String(lowThreshold));
    const result = await addGrocery(formData);
    if (result?.error) {
      setError(result.error);
      return;
    }
    resetForm();
    window.location.reload();
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setError("");
    const formData = new FormData();
    formData.set("id", editingId);
    formData.set("unit", unit);
    formData.set("quantity", String(quantity));
    formData.set("lowThreshold", String(lowThreshold));
    const result = await updateGrocery(formData);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setGroceries((prev) =>
      prev.map((g) =>
        g.id === editingId
          ? { ...g, unit, quantity, lowThreshold }
          : g
      )
    );
    closeEditModal();
    resetForm();
    window.location.reload();
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this item?")) return;
    await deleteGrocery(id);
    setGroceries((prev) => prev.filter((g) => g.id !== id));
    window.location.reload();
  }

  async function handleDecrement(id: string) {
    await decrementGrocery(id);
    setGroceries((prev) =>
      prev.map((g) =>
        g.id === id ? { ...g, quantity: Math.max(0, g.quantity - 1) } : g
      )
    );
    window.location.reload();
  }

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
        <form
          onSubmit={handleAdd}
          className="mb-6 p-4 border border-border rounded-lg space-y-3"
        >
          {error && (
            <p className="text-sm text-error">{error}</p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Autocomplete
              label="Item"
              placeholder="Search or type to add new"
              data={autocompleteData}
              styles={{
                groupLabel: {
                  fontWeight: 600,
                  fontSize: "var(--mantine-font-size-xs)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "var(--mantine-color-dimmed)",
                  paddingBlock: "var(--mantine-spacing-xs)",
                  paddingInline: "var(--mantine-spacing-sm)",
                  borderBottom: "1px solid var(--mantine-color-default-border)",
                  backgroundColor: "var(--mantine-color-default-hover)",
                },
              }}
              value={groceryItemSearch}
              onChange={async (value) => {
                setGroceryItemSearch(value);
                if (value.length >= 1) {
                  const fetched = await fetchGroceryItems(value);
                  const match = fetched.find(
                    (i) => i.name.toLowerCase() === value.toLowerCase()
                  );
                  setSelectedGroceryItemId(match?.id ?? null);
                } else {
                  setGroceryItems(initialGroceryItems);
                  setSelectedGroceryItemId(null);
                }
              }}
              onOptionSubmit={(value) => {
                const item = groceryItems.find(
                  (i) => i.name.toLowerCase() === (value ?? "").toLowerCase()
                );
                if (item) {
                  setGroceryItemSearch(item.name);
                  setSelectedGroceryItemId(item.id);
                }
              }}
              filter={({ options }) => options}
              required
            />
            <TextInput
              label="Unit"
              value={unit}
              onChange={(e) => setUnit(e.currentTarget.value)}
              placeholder="e.g. items, L, kg"
            />
            <NumberInput
              label="Quantity"
              min={0}
              step={0.5}
              value={quantity}
              onChange={(value) => setQuantity(typeof value === "string" ? parseFloat(value) || 0 : value ?? 0)}
            />
            <NumberInput
              label="Remind when below"
              min={0}
              step={0.5}
              value={lowThreshold}
              onChange={(value) =>
                setLowThreshold(typeof value === "string" ? parseFloat(value) || 0 : value ?? 0)
              }
            />
          </div>
          <div className="flex gap-2 items-center">
            <Button
              type="submit"
              className="bg-primary hover:bg-primary-hover text-primary-foreground px-4 py-2 rounded-md"
            >
              Add
            </Button>
            <Button
              type="button"
              variant="default"
              className="px-4 py-2 rounded-md border border-border hover:bg-hover"
              onClick={resetForm}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      <Modal
        opened={editModalOpened}
        onClose={() => {
          closeEditModal();
          resetForm();
        }}
        title="Edit grocery"
        size="sm"
      >
        <form onSubmit={handleUpdate} className="space-y-3">
          {error && (
            <p className="text-sm text-error">{error}</p>
          )}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Item</label>
              <p className="text-foreground py-2">{groceryItemSearch}</p>
            </div>
            <TextInput
              label="Unit"
              value={unit}
              onChange={(e) => setUnit(e.currentTarget.value)}
              placeholder="e.g. items, L, kg"
            />
            <NumberInput
              label="Quantity"
              min={0}
              step={0.5}
              value={quantity}
              onChange={(value) => setQuantity(typeof value === "string" ? parseFloat(value) || 0 : value ?? 0)}
            />
            <NumberInput
              label="Remind when below"
              min={0}
              step={0.5}
              value={lowThreshold}
              onChange={(value) =>
                setLowThreshold(typeof value === "string" ? parseFloat(value) || 0 : value ?? 0)
              }
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="submit"
              className="bg-primary hover:bg-primary-hover text-primary-foreground px-4 py-2"
            >
              Save
            </Button>
            <Button
              type="button"
              variant="default"
              className="px-4 py-2"
              onClick={() => {
                closeEditModal();
                resetForm();
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {(() => {
        const byType = groceries.reduce<Record<string, Grocery[]>>((acc, g) => {
          const typeName = g.groceryItem.groceryType?.name ?? "Other";
          if (!acc[typeName]) acc[typeName] = [];
          acc[typeName].push(g);
          return acc;
        }, {});
        const typeNames = [
          ...new Set(
            groceries.map((g) => g.groceryItem.groceryType?.name ?? "Other")
          ),
        ];
        return (
          <ul className="space-y-4 list-none pl-0">
            {typeNames.map((typeName) => (
              <li key={typeName}>
                <h3 className="text-sm font-semibold text-muted mb-2">
                  {typeName}
                </h3>
                <ul className="space-y-2 list-none pl-0">
                  {byType[typeName].map((g) => (
                    <li
                      key={g.id}
                      className="flex items-center justify-between gap-4 py-2 border-b border-border"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="font-medium">{g.groceryItem.name}</span>
                        <span className="text-muted ml-2">
                          {g.quantity} {g.unit}
                          {g.lowThreshold > 0 && (
                            <span className="text-xs">
                              {" "}
                              (low below {g.lowThreshold})
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDecrement(g.id)}
                          className="px-2 py-1 text-sm border border-border rounded hover:bg-hover"
                          title="Use one"
                        >
                          −
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            startEdit(g);
                            openEditModal();
                          }}
                          className="text-sm text-primary hover:underline rounded"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(g.id)}
                          className="text-sm text-error hover:underline rounded"
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        );
      })()}
      {groceries.length === 0 && !showForm && (
        <p className="text-muted">
          No groceries yet. Add items to track and get low-stock reminders.
        </p>
      )}
    </section>
  );
}
