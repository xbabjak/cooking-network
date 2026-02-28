"use client";

import {
  TextInput,
  NumberInput,
  Select,
  Autocomplete,
  Popover,
  Button,
} from "@mantine/core";
import { RichTextEditor, Link } from "@mantine/tiptap";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createPost, updatePost, deletePost } from "@/lib/actions/posts";
import {
  getPostDraftKey,
  getPostDraft,
  setPostDraft,
  clearPostDraft,
} from "@/lib/draft-storage";
import { getGroceryItems, type GroceryItemOption } from "@/lib/grocery-items";
import { groupGroceryItemsForAutocomplete } from "@/lib/grocery-autocomplete";
import { plainToHtml, sanitizeHtml, stripHtml } from "@/lib/html-utils";

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
    imageUrl?: string;
    ingredients: Omit<Ingredient, "rowId">[];
  };
  initialGroceryItems: GroceryItemOption[];
};

function getInitialHtml(content: string, imageUrls: string[]): string {
  if (imageUrls.length > 0) return sanitizeHtml(plainToHtml(content, imageUrls));
  if (/<[a-z][\s\S]*>/i.test(content)) return sanitizeHtml(content);
  return sanitizeHtml(plainToHtml(content, []));
}

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
  const [imageUrlPopoverOpen, setImageUrlPopoverOpen] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [type, setType] = useState<"story" | "recipe">(initialType);

  const initialHtml = useMemo(
    () => getInitialHtml(initialContent ?? "", initialImageUrls ?? []),
    [initialContent, initialImageUrls]
  );

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({ link: false }),
      Link,
      Image,
    ],
    content: initialHtml,
  });
  const [recipeName, setRecipeName] = useState(initialRecipe?.name ?? "");
  const [recipeDescription, setRecipeDescription] = useState(
    initialRecipe?.description ?? ""
  );
  const [recipeImageUrl, setRecipeImageUrl] = useState(
    initialRecipe?.imageUrl ?? ""
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

  const editorContentRef = useRef(initialHtml);
  const restoredContentRef = useRef<string | null>(null);

  // Restore draft from localStorage on mount
  useEffect(() => {
    const key = getPostDraftKey(postId);
    const draft = getPostDraft(key);
    if (!draft) return;
    setTitle(draft.title);
    setType(draft.type);
    setRecipeName(draft.recipeName ?? "");
    setRecipeDescription(draft.recipeDescription ?? "");
    setRecipeImageUrl(draft.recipeImageUrl ?? "");
    if (draft.ingredients?.length) {
      setIngredients(
        draft.ingredients.map((ing) => ({
          ...ing,
          groceryItemName: ing.name ?? "",
          rowId: crypto.randomUUID(),
        }))
      );
    }
    restoredContentRef.current = draft.content;
  }, [postId]);

  // Apply restored content when editor is ready
  useEffect(() => {
    if (!editor || restoredContentRef.current === null) return;
    editor.commands.setContent(restoredContentRef.current);
    restoredContentRef.current = null;
  }, [editor]);

  // Keep editor HTML in ref for debounced save
  useEffect(() => {
    if (!editor) return;
    const handler = () => {
      editorContentRef.current = editor.getHTML();
    };
    editor.on("update", handler);
    return () => {
      editor.off("update", handler);
    };
  }, [editor]);

  // Debounced persist draft to localStorage
  const draftKey = getPostDraftKey(postId);
  useEffect(() => {
    const ms = 1000;
    const id = setTimeout(() => {
      const content =
        editor?.getHTML() ?? editorContentRef.current ?? "";
      setPostDraft(draftKey, {
        title,
        content,
        type,
        recipeName: type === "recipe" ? recipeName : undefined,
        recipeDescription: type === "recipe" ? recipeDescription : undefined,
        recipeImageUrl: type === "recipe" ? recipeImageUrl : undefined,
        ingredients:
          type === "recipe"
            ? ingredients.map((i) => ({
                groceryItemId: i.groceryItemId,
                name: i.groceryItemName?.trim() || undefined,
                quantity: i.quantity,
                unit: i.unit,
              }))
            : undefined,
      });
    }, ms);
    return () => clearTimeout(id);
  }, [
    draftKey,
    title,
    type,
    recipeName,
    recipeDescription,
    recipeImageUrl,
    ingredients,
    editor,
  ]);

  const fetchGroceryItems = useCallback(async (rowId: string, search: string) => {
    const items = await getGroceryItems(search || undefined);
    setGroceryItemsMap((prev) => ({ ...prev, [rowId]: items }));
    return items;
  }, []);

  function insertImage(url: string) {
    if (url && url.startsWith("http") && editor) {
      editor.chain().focus().setImage({ src: url }).run();
      setImageUrlInput("");
      setImageUrlPopoverOpen(false);
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

  function setIngredientGroceryItem(
    i: number,
    item: GroceryItemOption | null,
    /** When no match: use this as display name (e.g. what user typed) so we don’t keep a stale name. */
    typedValue?: string
  ) {
    setIngredients((prev) =>
      prev.map((ing, idx) =>
        idx === i
          ? {
              ...ing,
              groceryItemId: item?.id,
              groceryItemName:
                item != null ? item.name : (typedValue ?? ing.groceryItemName ?? ""),
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
    const htmlContent = editor?.getHTML() ?? "";
    if (!stripHtml(htmlContent).trim()) {
      setError("Content is required");
      return;
    }
    setSubmitting(true);
    const formData = new FormData();
    formData.set("title", title);
    formData.set("content", htmlContent);
    formData.set("imageUrls", JSON.stringify([]));
    formData.set("type", type);
    if (type === "recipe") {
      formData.set("recipeName", recipeName);
      formData.set("recipeDescription", recipeDescription);
      formData.set("recipeImageUrl", recipeImageUrl);
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
    clearPostDraft(getPostDraftKey(postId));
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

  function handleDiscardDraft() {
    if (postId) return;
    if (!confirm("Remove unfinished changes? Your draft will be cleared.")) return;
    clearPostDraft(getPostDraftKey());
    restoredContentRef.current = null;
    setTitle("");
    setType("story");
    setRecipeName("");
    setRecipeDescription("");
    setRecipeImageUrl("");
    setIngredients([
      { rowId: crypto.randomUUID(), groceryItemName: "", quantity: 1, unit: "" },
    ]);
    setError("");
    editor?.commands.setContent("<p></p>");
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
      <div>
        <label className="block text-sm font-medium mb-1">Content</label>
        <RichTextEditor editor={editor}>
          <RichTextEditor.Toolbar>
            <RichTextEditor.ControlsGroup>
              <RichTextEditor.Bold />
              <RichTextEditor.Italic />
              <RichTextEditor.Underline />
              <RichTextEditor.Strikethrough />
              <RichTextEditor.ClearFormatting />
            </RichTextEditor.ControlsGroup>
            <RichTextEditor.ControlsGroup>
              <RichTextEditor.H1 />
              <RichTextEditor.H2 />
              <RichTextEditor.H3 />
            </RichTextEditor.ControlsGroup>
            <RichTextEditor.ControlsGroup>
              <RichTextEditor.BulletList />
              <RichTextEditor.OrderedList />
              <RichTextEditor.Blockquote />
              <RichTextEditor.Hr />
            </RichTextEditor.ControlsGroup>
            <RichTextEditor.ControlsGroup>
              <RichTextEditor.Link />
              <RichTextEditor.Unlink />
              <Popover
                opened={imageUrlPopoverOpen}
                onChange={setImageUrlPopoverOpen}
                position="bottom"
              >
                <Popover.Target>
                  <RichTextEditor.Control
                    onClick={() => setImageUrlPopoverOpen((o) => !o)}
                    title="Insert image"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  </RichTextEditor.Control>
                </Popover.Target>
                <Popover.Dropdown>
                  <div className="flex gap-2 p-2">
                    <TextInput
                      type="url"
                      placeholder="https://..."
                      value={imageUrlInput}
                      onChange={(e) => setImageUrlInput(e.currentTarget.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), insertImage(imageUrlInput))}
                      className="flex-1"
                    />
                    <Button size="sm" onClick={() => insertImage(imageUrlInput)}>
                      Insert
                    </Button>
                  </div>
                </Popover.Dropdown>
              </Popover>
            </RichTextEditor.ControlsGroup>
            <RichTextEditor.ControlsGroup>
              <RichTextEditor.Undo />
              <RichTextEditor.Redo />
            </RichTextEditor.ControlsGroup>
          </RichTextEditor.Toolbar>
          <RichTextEditor.Content />
        </RichTextEditor>
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
            <label className="block text-sm font-medium mb-1">
              Preview picture URL
            </label>
            <TextInput
              type="url"
              value={recipeImageUrl}
              onChange={(e) => setRecipeImageUrl(e.currentTarget.value)}
              placeholder="https://..."
              className="flex-1"
            />
            {recipeImageUrl.startsWith("http") && (
              <div className="mt-2">
                <img
                  src={recipeImageUrl}
                  alt=""
                  className="h-20 w-20 object-cover rounded"
                />
              </div>
            )}
          </div>
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
              const autocompleteData = groupGroceryItemsForAutocomplete(items);
              return (
              <div key={ing.rowId} className="flex gap-2 mt-2 items-end">
                <Autocomplete
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
                  value={ing.groceryItemName ?? ""}
                  onChange={async (value) => {
                    updateIngredient(i, "groceryItemName", value);
                    if (value.length >= 1) {
                      const fetched = await fetchGroceryItems(ing.rowId, value);
                      const match = fetched.find(
                        (it) => it.name.toLowerCase() === value.toLowerCase()
                      );
                      setIngredientGroceryItem(i, match ?? null, value);
                    } else {
                      setIngredientGroceryItem(i, null, value);
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
      <div className="flex gap-3 flex-wrap">
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 bg-primary hover:bg-primary-hover disabled:opacity-50 text-primary-foreground font-medium rounded-md"
        >
          {postId ? "Save" : "Publish"}
        </button>
        {postId ? (
          <button
            type="button"
            onClick={handleDelete}
            disabled={submitting}
            className="px-4 py-2 border border-error text-error hover:bg-hover rounded-md"
          >
            Delete
          </button>
        ) : (
          <button
            type="button"
            onClick={handleDiscardDraft}
            disabled={submitting}
            className="px-4 py-2 border border-border text-muted-foreground hover:bg-hover rounded-md"
          >
            Remove unfinished changes
          </button>
        )}
      </div>
    </form>
  );
}
