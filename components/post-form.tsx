"use client";

import {
  TextInput,
  Textarea,
  NumberInput,
  Select,
} from "@mantine/core";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPost, updatePost, deletePost } from "@/lib/actions/posts";

type Ingredient = { ingredientName: string; quantity: number; unit: string };

type Props = {
  postId?: string;
  initialTitle?: string;
  initialContent?: string;
  initialImageUrls?: string[];
  initialType?: "story" | "recipe";
  initialRecipe?: {
    name: string;
    description: string;
    ingredients: Ingredient[];
  };
};

export function PostForm({
  postId,
  initialTitle = "",
  initialContent = "",
  initialImageUrls = [],
  initialType = "story",
  initialRecipe,
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
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    initialRecipe?.ingredients ?? [{ ingredientName: "", quantity: 1, unit: "" }]
  );
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
      { ingredientName: "", quantity: 1, unit: "" },
    ]);
  }

  function updateIngredient(i: number, field: keyof Ingredient, value: string | number) {
    setIngredients((prev) =>
      prev.map((ing, idx) =>
        idx === i ? { ...ing, [field]: value } : ing
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
          ingredients.filter((i) => i.ingredientName.trim())
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
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
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
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800"
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
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs"
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
        <div className="space-y-3 p-4 border border-amber-200 dark:border-amber-800 rounded-lg">
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
                className="text-sm text-amber-600 hover:underline"
              >
                + Add
              </button>
            </div>
            {ingredients.map((ing, i) => (
              <div key={i} className="flex gap-2 mt-2 items-end">
                <TextInput
                  placeholder="Ingredient name"
                  value={ing.ingredientName}
                  onChange={(e) =>
                    updateIngredient(i, "ingredientName", e.currentTarget.value)
                  }
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
                  className="text-red-500 hover:underline"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-medium rounded-md"
        >
          {postId ? "Save" : "Publish"}
        </button>
        {postId && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={submitting}
            className="px-4 py-2 border border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
          >
            Delete
          </button>
        )}
      </div>
    </form>
  );
}
