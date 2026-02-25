"use client";

import {
  TextInput,
  Textarea,
  NumberInput,
  Select,
  Autocomplete,
} from "@mantine/core";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createPost, updatePost, deletePost } from "@/lib/actions/posts";
import { getGroceryItems, type GroceryItemOption } from "@/lib/grocery-items";

type Ingredient = {
  rowId: string;
  groceryItemId?: string;
  groceryItemName?: string;
  quantity: number;
  unit: string;
};

type Props = {
  postId?: string;
  initialTitle?: string;
  initialContent?: string;
  initialImageUrls?: string[];
  initialType?: "story" | "recipe";
  initialRecipe?: {
    name: string;
    description: string;
    ingredients: Omit<Ingredient, "rowId">[];
  };
  initialGroceryItems: GroceryItemOption[];
};

export function PostForm({
  postId,
  initialTitle = "",
  initialContent = "",
  initialImageUrls = [],
  initialType = "story",
  initialRecipe,
  initialGroceryItems,
}: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [imageUrls, setImageUrls] = useState<string[]>(initialImageUrls);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [type, setType] = useState<"story" | "recipe">(initialType);
  const [recipeName, setRecipeName] = useState(initialRecipe?.name ?? "");
  const [recipeDescription, setRecipeDescription] = useState(
    initialRecipe?.description ?? ""
  );
  const [ingredients, setIngredients] = useState<Ingredient[]>(() => {
    const list =
      initialRecipe?.ingredients?.length
        ? initialRecipe.ingredients
        : [{ groceryItemName: "", quantity: 1, unit: "" }];
    return list.map((ing) => ({
      ...ing,
      rowId: crypto.randomUUID(),
    }));
  });
  const [groceryItemsMap, setGroceryItemsMap] = useState<Record<string, GroceryItemOption[]>>({});
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchGroceryItems = useCallback(async (rowId: string, search: string) => {
    const items = await getGroceryItems(search || undefined);
    setGroceryItemsMap((prev) => ({ ...prev, [rowId]: items }));
    return items;
  }, []);

  function addImage() {
    if (imageUrlInput.startsWith("http")) {
      setImageUrls((prev) =>
        prev.length < 5 ? [...prev, imageUrlInput] : prev
      );
      setImageUrlInput("");
    }
  }

  function addIngredient() {
    setIngredients((prev) => [
      ...prev,
      { rowId: crypto.randomUUID(), groceryItemName: "", quantity: 1, unit: "" },
    ]);
  }

  function updateIngredient(i: number, field: keyof Omit<Ingredient, "rowId">, value: string | number) {
    setIngredients((prev) =>
      prev.map((ing, idx) =>
        idx === i ? { ...ing, [field]: value } : ing
      )
    );
  }

  function setIngredientGroceryItem(i: number, item: GroceryItemOption | null) {
    setIngredients((prev) =>
      prev.map((ing, idx) =>
        idx === i
          ? {
              ...ing,
              groceryItemId: item?.id,
              groceryItemName: item != null ? item.name : (ing.groceryItemName ?? ""),
            }
          : ing
      )
    );
  }

  function removeIngredient(i: number) {
    setIngredients((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const formData = new FormData();
    formData.set("title", title);
    formData.set("content", content);
    formData.set("imageUrls", JSON.stringify(imageUrls));
    formData.set("type", type);
    if (type === "recipe") {
      formData.set("recipeName", recipeName);
      formData.set("recipeDescription", recipeDescription);
      formData.set(
        "recipeIngredients",
        JSON.stringify(
          ingredients.filter(
            (i) => i.groceryItemId || (i.groceryItemName && i.groceryItemName.trim())
          ).map((i) => ({
            groceryItemId: i.groceryItemId,
            name: i.groceryItemName?.trim() || undefined,
            quantity: i.quantity,
            unit: i.unit,
          }))
        )
      );
    }
    if (postId) formData.set("id", postId);

    const result = postId
      ? await updatePost(formData)
      : await createPost(formData);

    setSubmitting(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    if (postId) router.push(`/post/${postId}`);
    else router.push("/feed");
    router.refresh();
  }

  async function handleDelete() {
    if (!postId || !confirm("Delete this post?")) return;
    setSubmitting(true);
    await deletePost(postId);
    router.push("/feed");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="text-sm text-error">{error}</p>
      )}
      <TextInput
        label="Title"
        value={title}
        onChange={(e) => setTitle(e.currentTarget.value)}
        required
        maxLength={200}
      />
      <Textarea
        label="Content"
        value={content}
        onChange={(e) => setContent(e.currentTarget.value)}
        required
        autosize
        minRows={6}
      />
      <div>
        <label className="block text-sm font-medium mb-1">Image URLs (max 5)</label>
        <div className="flex gap-2">
          <TextInput
            type="url"
            value={imageUrlInput}
            onChange={(e) => setImageUrlInput(e.currentTarget.value)}
            placeholder="https://..."
            className="flex-1"
          />
          <button
            type="button"
            onClick={addImage}
            className="px-4 py-2 border border-border rounded-md hover:bg-hover"
          >
            Add
          </button>
        </div>
        {imageUrls.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2">
            {imageUrls.map((url, i) => (
              <li key={i} className="relative">
                <img
                  src={url}
                  alt=""
                  className="h-20 w-20 object-cover rounded"
                />
                <button
                  type="button"
                  onClick={() =>
                    setImageUrls((prev) => prev.filter((_, j) => j !== i))
                  }
                  className="absolute -top-1 -right-1 w-5 h-5 bg-error text-white rounded-full text-xs"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Select
        label="Type"
        value={type}
        onChange={(v) => setType((v as "story" | "recipe") ?? "story")}
        data={[
          { value: "story", label: "Story" },
          { value: "recipe", label: "Recipe" },
        ]}
      />
      {type === "recipe" && (
        <div className="space-y-3 p-4 border border-border rounded-lg bg-surface-alt">
          <h3 className="font-medium">Recipe details</h3>
          <TextInput
            label="Recipe name"
            value={recipeName}
            onChange={(e) => setRecipeName(e.currentTarget.value)}
          />
          <TextInput
            label="Description"
            value={recipeDescription}
            onChange={(e) => setRecipeDescription(e.currentTarget.value)}
          />
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-sm">Ingredients</label>
              <button
                type="button"
                onClick={addIngredient}
                className="text-sm text-primary hover:underline"
              >
                + Add
              </button>
            </div>
            {ingredients.map((ing, i) => {
              const items = groceryItemsMap[ing.rowId] ?? initialGroceryItems;
              const autocompleteData = items.map((item) => ({
                value: item.name,
                label: item.name,
              }));
              return (
              <div key={ing.rowId} className="flex gap-2 mt-2 items-end">
                <Autocomplete
                  placeholder="Search or type to add new"
                  data={autocompleteData}
                  value={ing.groceryItemName ?? ""}
                  onChange={async (value) => {
                    updateIngredient(i, "groceryItemName", value);
                    if (value.length >= 1) {
                      const fetched = await fetchGroceryItems(ing.rowId, value);
                      const match = fetched.find(
                        (it) => it.name.toLowerCase() === value.toLowerCase()
                      );
                      setIngredientGroceryItem(i, match ?? null);
                    } else {
                      setIngredientGroceryItem(i, null);
                    }
                  }}
                  onOptionSubmit={(value) => {
                    const match = items.find(
                      (it) => it.name.toLowerCase() === (value ?? "").toLowerCase()
                    );
                    if (match) setIngredientGroceryItem(i, match);
                  }}
                  filter={({ options }) => options}
                  className="flex-1"
                />
                <NumberInput
                  min={0}
                  step={0.5}
                  value={ing.quantity}
                  onChange={(value) =>
                    updateIngredient(
                      i,
                      "quantity",
                      typeof value === "string" ? parseFloat(value) || 0 : value ?? 0
                    )
                  }
                  w={80}
                />
                <TextInput
                  placeholder="Unit"
                  value={ing.unit}
                  onChange={(e) => updateIngredient(i, "unit", e.currentTarget.value)}
                  w={100}
                />
                <button
                  type="button"
                  onClick={() => removeIngredient(i)}
                  className="text-error hover:underline"
                >
                  Remove
                </button>
              </div>
            );
            })}
          </div>
        </div>
      )}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 bg-primary hover:bg-primary-hover disabled:opacity-50 text-primary-foreground font-medium rounded-md"
        >
          {postId ? "Save" : "Publish"}
        </button>
        {postId && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={submitting}
            className="px-4 py-2 border border-error text-error hover:bg-hover rounded-md"
          >
            Delete
          </button>
        )}
      </div>
    </form>
  );
}
