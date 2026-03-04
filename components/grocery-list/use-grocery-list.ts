"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useDisclosure } from "@mantine/hooks";
import {
  addGrocery,
  mergeGroceryAdd,
  updateGrocery,
  deleteGrocery,
  decrementGrocery,
} from "@/lib/actions/groceries";
import type { AddGroceryUnitConflictPayload } from "@/lib/actions/groceries";
import { getGroceryItems } from "@/lib/grocery-items";
import { getAllowedUnitsForItem, getAllUnits, type Unit } from "@/lib/units";
import { groupGroceryItemsForAutocomplete } from "@/lib/grocery-autocomplete";
import type { Grocery, GroceryListProps } from "./types";
import { unitsToSelectData } from "./utils";

export function useGroceryList({
  groceries: initial,
  initialGroceryItems,
}: GroceryListProps) {
  const [groceries, setGroceries] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editModalOpened, { open: openEditModal, close: closeEditModal }] =
    useDisclosure(false);
  const [unitConflictPayload, setUnitConflictPayload] = useState<AddGroceryUnitConflictPayload | null>(null);
  const [
    unitConflictModalOpened,
    { open: openUnitConflictModal, close: closeUnitConflictModal },
  ] = useDisclosure(false);
  const [mergeLoading, setMergeLoading] = useState(false);
  const [mergeError, setMergeError] = useState("");
  const [groceryItemSearch, setGroceryItemSearch] = useState("");
  const [selectedGroceryItemId, setSelectedGroceryItemId] = useState<
    string | null
  >(null);
  const [groceryItems, setGroceryItems] = useState(initialGroceryItems);
  const [unit, setUnit] = useState("items");
  const [quantity, setQuantity] = useState(0);
  const [lowThreshold, setLowThreshold] = useState(0);
  const [error, setError] = useState("");
  const [allowedUnitsForForm, setAllowedUnitsForForm] = useState<Unit[]>([]);
  const [defaultUnitOptions, setDefaultUnitOptions] = useState<Unit[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const selectedGroceryItemIdRef = useRef<string | null>(null);
  const selectedItemDefaultUnitRef = useRef<string | null>(null);

  const fetchGroceryItems = useCallback(async (search: string) => {
    const items = await getGroceryItems(search || undefined);
    setGroceryItems(items);
    return items;
  }, []);

  useEffect(() => {
    getAllUnits().then(setDefaultUnitOptions);
  }, []);

  selectedGroceryItemIdRef.current = selectedGroceryItemId;

  useEffect(() => {
    if (!selectedGroceryItemId) {
      setAllowedUnitsForForm([]);
      setUnit("items");
      setUnitsLoading(false);
      return;
    }
    setUnitsLoading(true);
    const id = selectedGroceryItemId;
    getAllowedUnitsForItem(id)
      .then((units) => {
        if (id !== selectedGroceryItemIdRef.current) return;
        setAllowedUnitsForForm(units);
        const allowedSymbols = new Set(units.map((u) => u.symbol));
        const defaultUnit = selectedItemDefaultUnitRef.current;
        setUnit(
          defaultUnit && allowedSymbols.has(defaultUnit)
            ? defaultUnit
            : units[0]?.symbol ?? "items"
        );
      })
      .finally(() => {
        if (id === selectedGroceryItemIdRef.current) {
          setUnitsLoading(false);
        }
      });
  }, [selectedGroceryItemId]);

  const resetForm = useCallback(() => {
    setGroceryItemSearch("");
    setSelectedGroceryItemId(null);
    selectedGroceryItemIdRef.current = null;
    selectedItemDefaultUnitRef.current = null;
    setUnit("items");
    setQuantity(0);
    setLowThreshold(0);
    setShowForm(false);
    setEditingId(null);
    setError("");
  }, []);

  const startEdit = useCallback((g: Grocery) => {
    setEditingId(g.id);
    setGroceryItemSearch(g.groceryItem.name);
    setSelectedGroceryItemId(g.groceryItemId);
    selectedItemDefaultUnitRef.current = g.unit;
    setUnit(g.unit);
    setQuantity(g.quantity);
    setLowThreshold(g.lowThreshold);
    setError("");
  }, []);

  const autocompleteData = useMemo(
    () => groupGroceryItemsForAutocomplete(groceryItems),
    [groceryItems]
  );

  const unitSelectData = useMemo(() => {
    if (allowedUnitsForForm.length > 0) {
      return unitsToSelectData(allowedUnitsForForm);
    }
    if (defaultUnitOptions.length > 0) {
      return unitsToSelectData(defaultUnitOptions);
    }
    return [{ value: "items", label: "Items" }];
  }, [allowedUnitsForForm, defaultUnitOptions]);

  const onAutocompleteChange = useCallback(
    async (value: string) => {
      setGroceryItemSearch(value);
      if (value.length >= 1) {
        const fetched = await fetchGroceryItems(value);
        const match = fetched.find(
          (i) => i.name.toLowerCase() === value.toLowerCase()
        );
        setSelectedGroceryItemId(match?.id ?? null);
        if (match) {
          selectedItemDefaultUnitRef.current = match.defaultUnit ?? "items";
        } else {
          selectedItemDefaultUnitRef.current = null;
          setGroceryItems(initialGroceryItems);
        }
      } else {
        setGroceryItems(initialGroceryItems);
        setSelectedGroceryItemId(null);
        selectedItemDefaultUnitRef.current = null;
      }
    },
    [fetchGroceryItems, initialGroceryItems]
  );

  const onAutocompleteOptionSubmit = useCallback(
    (value: string) => {
      const item = groceryItems.find(
        (i) => i.name.toLowerCase() === value.toLowerCase()
      );
      if (item) {
        setGroceryItemSearch(item.name);
        selectedItemDefaultUnitRef.current = item.defaultUnit ?? "items";
        setSelectedGroceryItemId(item.id);
      }
    },
    [groceryItems]
  );

  const handleAdd = useCallback(
    async (e: React.FormEvent) => {
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
      if ("needsUnitResolution" in result && result.needsUnitResolution) {
        setUnitConflictPayload(result as AddGroceryUnitConflictPayload);
        openUnitConflictModal();
        return;
      }
      resetForm();
      window.location.reload();
    },
    [
      selectedGroceryItemId,
      groceryItemSearch,
      unit,
      quantity,
      lowThreshold,
      resetForm,
      openUnitConflictModal,
    ]
  );

  const handleResolveUnitConflict = useCallback(
    async (resolution: "addInExistingUnit" | "switchToNewUnit" | "addAsSeparate") => {
      if (!unitConflictPayload) return;
      setMergeError("");
      setMergeLoading(true);
      const formData = new FormData();
      formData.set("resolution", resolution);
      formData.set("existingGroceryId", unitConflictPayload.existing.id);
      formData.set("groceryItemId", unitConflictPayload.groceryItemId);
      formData.set("quantity", String(unitConflictPayload.incoming.quantity));
      formData.set("unit", unitConflictPayload.incoming.unit);
      formData.set("lowThreshold", String(unitConflictPayload.incoming.lowThreshold));
      const result = await mergeGroceryAdd(formData);
      setMergeLoading(false);
      if (result?.error) {
        setMergeError(result.error);
        return;
      }
      setUnitConflictPayload(null);
      closeUnitConflictModal();
      resetForm();
      window.location.reload();
    },
    [unitConflictPayload, closeUnitConflictModal, resetForm]
  );

  const closeUnitConflictModalAndClear = useCallback(() => {
    setUnitConflictPayload(null);
    setMergeError("");
    closeUnitConflictModal();
  }, [closeUnitConflictModal]);

  const handleUpdate = useCallback(
    async (e: React.FormEvent) => {
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
    },
    [editingId, unit, quantity, lowThreshold, closeEditModal, resetForm]
  );

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Remove this item?")) return;
    await deleteGrocery(id);
    setGroceries((prev) => prev.filter((g) => g.id !== id));
    window.location.reload();
  }, []);

  const handleDecrement = useCallback(async (id: string) => {
    await decrementGrocery(id);
    setGroceries((prev) =>
      prev.map((g) =>
        g.id === id ? { ...g, quantity: Math.max(0, g.quantity - 1) } : g
      )
    );
    window.location.reload();
  }, []);

  return {
    groceries,
    showForm,
    setShowForm,
    editingId,
    editModalOpened,
    openEditModal,
    closeEditModal,
    unitConflictPayload,
    unitConflictModalOpened,
    closeUnitConflictModalAndClear,
    handleResolveUnitConflict,
    mergeLoading,
    mergeError,
    groceryItemSearch,
    setGroceryItemSearch,
    selectedGroceryItemId,
    groceryItems,
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
    initialGroceryItems,
    fetchGroceryItems,
    resetForm,
    startEdit,
    onAutocompleteChange,
    onAutocompleteOptionSubmit,
    handleAdd,
    handleUpdate,
    handleDelete,
    handleDecrement,
  };
}
