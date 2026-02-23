"use client";

import { TextInput, NumberInput } from "@mantine/core";
import { useState } from "react";
import {
  addGrocery,
  updateGrocery,
  deleteGrocery,
  decrementGrocery,
} from "@/lib/actions/groceries";

type Grocery = {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  lowThreshold: number;
};

export function GroceryList({ groceries: initial }: { groceries: Grocery[] }) {
  const [groceries, setGroceries] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("items");
  const [quantity, setQuantity] = useState(0);
  const [lowThreshold, setLowThreshold] = useState(0);
  const [error, setError] = useState("");

  function resetForm() {
    setName("");
    setUnit("items");
    setQuantity(0);
    setLowThreshold(0);
    setShowForm(false);
    setEditingId(null);
    setError("");
  }

  function startEdit(g: Grocery) {
    setEditingId(g.id);
    setName(g.name);
    setUnit(g.unit);
    setQuantity(g.quantity);
    setLowThreshold(g.lowThreshold);
    setError("");
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const formData = new FormData();
    formData.set("name", name);
    formData.set("unit", unit);
    formData.set("quantity", String(quantity));
    formData.set("lowThreshold", String(lowThreshold));
    const result = await addGrocery(formData);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setGroceries((prev) => [
      ...prev,
      {
        id: "",
        name,
        unit,
        quantity,
        lowThreshold,
      },
    ]);
    resetForm();
    window.location.reload();
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setError("");
    const formData = new FormData();
    formData.set("id", editingId);
    formData.set("name", name);
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
          ? { ...g, name, unit, quantity, lowThreshold }
          : g
      )
    );
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

      {(showForm || editingId) && (
        <form
          onSubmit={editingId ? handleUpdate : handleAdd}
          className="mb-6 p-4 border border-border rounded-lg space-y-3"
        >
          {error && (
            <p className="text-sm text-error">{error}</p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <TextInput
              label="Name"
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
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
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-primary-foreground rounded-md"
            >
              {editingId ? "Save" : "Add"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 border border-border rounded-md hover:bg-hover"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <ul className="space-y-2">
        {groceries.map((g) => (
          <li
            key={g.id}
            className="flex items-center justify-between gap-4 py-2 border-b border-border"
          >
            <div className="flex-1 min-w-0">
              <span className="font-medium">{g.name}</span>
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
                onClick={() => startEdit(g)}
                className="text-sm text-primary hover:underline"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => handleDelete(g.id)}
                className="text-sm text-error hover:underline"
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
      {groceries.length === 0 && !showForm && (
        <p className="text-muted">
          No groceries yet. Add items to track and get low-stock reminders.
        </p>
      )}
    </section>
  );
}
