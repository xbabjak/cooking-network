"use client";

import {
  TextInput,
  Select,
  Popover,
  Button,
  Checkbox,
} from "@mantine/core";
import { RichTextEditor, Link } from "@mantine/tiptap";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import CharacterCount from "@tiptap/extension-character-count";
import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next13-progressbar";
import { createPost, updatePost, deletePost } from "@/lib/actions/posts";
import {
  getPostDraftKey,
  getPostDraft,
  setPostDraft,
  clearPostDraft,
} from "@/lib/draft-storage";
import { getGroceryItems, type GroceryItemOption } from "@/lib/grocery-items";
import { getAllowedUnitsForItem } from "@/lib/units";
import { stripHtml } from "@/lib/html-utils";
import type { Ingredient } from "./types";
import type { PostFormProps } from "./types";
import { getInitialHtml } from "./utils";
import { useRecipeUnits } from "./use-recipe-units";
import { RecipeFields } from "./recipe-fields";

export function PostForm({
  postId,
  initialTitle = "",
  initialContent = "",
  initialImageUrls = [],
  initialType = "story",
  initialPostPrivate,
  initialRecipe,
  initialGroceryItems,
}: PostFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [imageUrlPopoverOpen, setImageUrlPopoverOpen] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [type, setType] = useState<"story" | "recipe">(initialType);

  const initialHtml = useMemo(
    () => getInitialHtml(initialContent ?? "", initialImageUrls ?? []),
    [initialContent, initialImageUrls]
  );

  const RTE_CHAR_LIMIT = 5000;

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({ link: false }),
      Link,
      Image,
      CharacterCount.configure({ limit: RTE_CHAR_LIMIT }),
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
  const [recipeServings, setRecipeServings] = useState(
    initialRecipe?.servings ?? 1
  );
  const [postPrivate, setPostPrivate] = useState(
    initialPostPrivate ?? initialRecipe?.isPrivate ?? false
  );
  const [ingredients, setIngredients] = useState<Ingredient[]>(() => {
    const list = initialRecipe?.ingredients?.length
      ? initialRecipe.ingredients
      : [{ groceryItemName: "", quantity: 1, unit: "" }];
    return list.map((ing) => ({
      ...ing,
      optional: ing.optional ?? false,
      oneOfGroupId: ing.oneOfGroupId ?? undefined,
      rowId: crypto.randomUUID(),
    }));
  });
  const [groceryItemsMap, setGroceryItemsMap] = useState<
    Record<string, GroceryItemOption[]>
  >({});
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [charCount, setCharCount] = useState(0);

  const { defaultUnitOptions, allowedUnitsCache, setAllowedUnitsCache } =
    useRecipeUnits(type, ingredients);

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
    setRecipeServings(draft.recipeServings ?? 1);
    setPostPrivate(draft.postPrivate ?? false);
    if (draft.ingredients !== undefined) {
      setIngredients(
        draft.ingredients.length
          ? draft.ingredients.map((ing) => ({
              ...ing,
              groceryItemName: ing.name ?? "",
              optional: ing.optional ?? false,
              oneOfGroupId: ing.oneOfGroupId ?? undefined,
              rowId: crypto.randomUUID(),
            }))
          : [
              {
                rowId: crypto.randomUUID(),
                groceryItemName: "",
                quantity: 1,
                unit: "",
                optional: false,
                oneOfGroupId: undefined,
              },
            ]
      );
    }
    restoredContentRef.current = draft.content;
  }, [postId]);

  // Apply restored content when editor is ready
  useEffect(() => {
    if (!editor || restoredContentRef.current === null) return;
    editor.commands.setContent(restoredContentRef.current);
    restoredContentRef.current = null;
  }, [editor, postId]);

  // Keep editor HTML in ref for debounced save; sync character count
  useEffect(() => {
    if (!editor) return;
    const updateCount = () => {
      const storage = editor.storage as { characterCount?: { characters?: () => number } };
      setCharCount(storage.characterCount?.characters?.() ?? 0);
    };
    const handler = () => {
      editorContentRef.current = editor.getHTML();
      updateCount();
    };
    updateCount();
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
      const content = editor?.getHTML() ?? editorContentRef.current ?? "";
      setPostDraft(draftKey, {
        title,
        content,
        type,
        recipeName: type === "recipe" ? recipeName : undefined,
        recipeDescription: type === "recipe" ? recipeDescription : undefined,
        recipeImageUrl: type === "recipe" ? recipeImageUrl : undefined,
        recipeServings: type === "recipe" ? recipeServings : undefined,
        postPrivate,
        ingredients:
          type === "recipe"
            ? ingredients.map((i) => ({
                groceryItemId: i.groceryItemId,
                name: i.groceryItemName?.trim() || undefined,
                quantity: i.quantity,
                unit: i.unit,
                optional: i.optional,
                oneOfGroupId: i.oneOfGroupId ?? undefined,
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
    recipeServings,
    postPrivate,
    ingredients,
    editor,
  ]);

  const fetchGroceryItems = useCallback(
    async (rowId: string, search: string) => {
      const items = await getGroceryItems(search || undefined);
      setGroceryItemsMap((prev) => ({ ...prev, [rowId]: items }));
      return items;
    },
    []
  );

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
      {
        rowId: crypto.randomUUID(),
        groceryItemName: "",
        quantity: 1,
        unit: "",
        optional: false,
        oneOfGroupId: undefined,
      },
    ]);
  }

  function updateIngredient(
    i: number,
    field: keyof Omit<Ingredient, "rowId">,
    value: string | number | boolean | undefined | null
  ) {
    setIngredients((prev) =>
      prev.map((ing, idx) =>
        idx === i ? { ...ing, [field]: value } : ing
      )
    );
  }

  async function setIngredientGroceryItem(
    i: number,
    item: GroceryItemOption | null,
    typedValue?: string
  ) {
    if (item == null) {
      setIngredients((prev) =>
        prev.map((ing, idx) =>
          idx === i
            ? {
                ...ing,
                groceryItemId: undefined,
                groceryItemName: typedValue ?? ing.groceryItemName ?? "",
              }
            : ing
        )
      );
      return;
    }
    const units = await getAllowedUnitsForItem(item.id);
    setAllowedUnitsCache((prev) => ({ ...prev, [item.id]: units }));
    const allowedSymbols = new Set(units.map((u) => u.symbol));
    const unit = allowedSymbols.has(item.defaultUnit)
      ? item.defaultUnit
      : units[0]?.symbol ?? "items";
    setIngredients((prev) =>
      prev.map((ing, idx) =>
        idx === i
          ? {
              ...ing,
              groceryItemId: item.id,
              groceryItemName: item.name,
              unit,
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
    const count = (editor?.storage as { characterCount?: { characters?: () => number } })?.characterCount?.characters?.() ?? 0;
    if (count > RTE_CHAR_LIMIT) {
      setError(`Content cannot exceed ${RTE_CHAR_LIMIT} characters.`);
      return;
    }
    setSubmitting(true);
    const formData = new FormData();
    formData.set("title", title);
    formData.set("content", htmlContent);
    formData.set("imageUrls", JSON.stringify([]));
    formData.set("type", type);
    formData.set("postPrivate", postPrivate ? "1" : "0");
    if (type === "recipe") {
      formData.set("recipeName", recipeName);
      formData.set("recipeDescription", recipeDescription);
      formData.set("recipeImageUrl", recipeImageUrl);
      formData.set("recipeServings", String(recipeServings));
      formData.set(
        "recipeIngredients",
        JSON.stringify(
          ingredients
            .filter(
              (i) =>
                i.groceryItemId ||
                (i.groceryItemName && i.groceryItemName.trim())
            )
            .map((i) => ({
              groceryItemId: i.groceryItemId,
              name: i.groceryItemName?.trim() || undefined,
              quantity: i.quantity,
              unit: i.unit,
              optional: i.optional ?? false,
              oneOfGroupId: i.oneOfGroupId ?? undefined,
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
    if (
      !confirm("Remove unfinished changes? Your draft will be cleared.")
    )
      return;
    clearPostDraft(getPostDraftKey());
    restoredContentRef.current = null;
    setTitle("");
    setType("story");
    setRecipeName("");
    setRecipeDescription("");
    setRecipeImageUrl("");
    setRecipeServings(1);
    setPostPrivate(false);
    setIngredients([
      {
        rowId: crypto.randomUUID(),
        groceryItemName: "",
        quantity: 1,
        unit: "",
        optional: false,
        oneOfGroupId: undefined,
      },
    ]);
    setError("");
    editor?.commands.setContent("<p></p>");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm text-error">{error}</p>}
      <TextInput
        label="Title"
        value={title}
        onChange={(e) => setTitle(e.currentTarget.value)}
        required
        maxLength={200}
      />
      <div>
        <label className="block text-sm font-medium mb-1">Content</label>
        <RichTextEditor editor={editor} className="rte-editor">
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
                    onClick={() =>
                      setImageUrlPopoverOpen((o) => !o)
                    }
                    title="Insert image"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect
                        x="3"
                        y="3"
                        width="18"
                        height="18"
                        rx="2"
                        ry="2"
                      />
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
                      onChange={(e) =>
                        setImageUrlInput(e.currentTarget.value)
                      }
                      onKeyDown={(e) =>
                        e.key === "Enter" &&
                        (e.preventDefault(),
                        insertImage(imageUrlInput))
                      }
                      className="flex-1"
                      maxLength={200}
                    />
                    <Button
                      size="sm"
                      onClick={() => insertImage(imageUrlInput)}
                    >
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
        <p
          className={`text-xs mt-1 ${charCount > RTE_CHAR_LIMIT ? "text-error" : "text-muted"}`}
          aria-live="polite"
        >
          {charCount.toLocaleString()} / {RTE_CHAR_LIMIT.toLocaleString()} characters
        </p>
      </div>
      <Select
        label="Type"
        value={type}
        onChange={(v) =>
          setType((v as "story" | "recipe") ?? "story")
        }
        data={[
          { value: "story", label: "Story" },
          { value: "recipe", label: "Recipe" },
        ]}
      />
      <Checkbox
        label="Make this private"
        description="Only you will see this in the feed and on your blog."
        checked={postPrivate}
        onChange={(e) => setPostPrivate(e.currentTarget.checked)}
      />
      {type === "recipe" && (
        <RecipeFields
          recipeName={recipeName}
          setRecipeName={setRecipeName}
          recipeDescription={recipeDescription}
          setRecipeDescription={setRecipeDescription}
          recipeImageUrl={recipeImageUrl}
          setRecipeImageUrl={setRecipeImageUrl}
          recipeServings={recipeServings}
          setRecipeServings={setRecipeServings}
          ingredients={ingredients}
          groceryItemsMap={groceryItemsMap}
          initialGroceryItems={initialGroceryItems}
          allowedUnitsCache={allowedUnitsCache}
          defaultUnitOptions={defaultUnitOptions}
          addIngredient={addIngredient}
          updateIngredient={updateIngredient}
          setIngredientGroceryItem={setIngredientGroceryItem}
          removeIngredient={removeIngredient}
          fetchGroceryItems={fetchGroceryItems}
        />
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
