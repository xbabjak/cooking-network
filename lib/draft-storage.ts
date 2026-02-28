/**
 * Draft storage for forms: persist to localStorage and clear on successful submit.
 */

const POST_DRAFT_PREFIX = "post-draft-";
const PROFILE_DRAFT_KEY = "profile-draft";

export type PostDraftIngredient = {
  groceryItemId?: string;
  name?: string;
  quantity: number;
  unit: string;
};

export type PostDraft = {
  title: string;
  content: string;
  type: "story" | "recipe";
  recipeName?: string;
  recipeDescription?: string;
  recipeImageUrl?: string;
  ingredients?: PostDraftIngredient[];
};

export type ProfileDraft = {
  name: string;
  username: string;
  image: string;
  bio: string;
  skipDoneCookingConfirm: boolean;
};

export function getPostDraftKey(postId?: string): string {
  return postId ? `${POST_DRAFT_PREFIX}${postId}` : `${POST_DRAFT_PREFIX}new`;
}

export function getPostDraft(key: string): PostDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const d = parsed as Record<string, unknown>;
    if (typeof d.title !== "string" || typeof d.content !== "string") return null;
    return {
      title: d.title,
      content: d.content,
      type: d.type === "recipe" ? "recipe" : "story",
      recipeName: typeof d.recipeName === "string" ? d.recipeName : undefined,
      recipeDescription:
        typeof d.recipeDescription === "string" ? d.recipeDescription : undefined,
      recipeImageUrl:
        typeof d.recipeImageUrl === "string" ? d.recipeImageUrl : undefined,
      ingredients: Array.isArray(d.ingredients)
        ? (d.ingredients as PostDraftIngredient[])
        : undefined,
    };
  } catch {
    return null;
  }
}

export function setPostDraft(key: string, draft: PostDraft): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(draft));
  } catch {
    // ignore quota or other errors
  }
}

export function clearPostDraft(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function getProfileDraft(): ProfileDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PROFILE_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const d = parsed as Record<string, unknown>;
    return {
      name: typeof d.name === "string" ? d.name : "",
      username: typeof d.username === "string" ? d.username : "",
      image: typeof d.image === "string" ? d.image : "",
      bio: typeof d.bio === "string" ? d.bio : "",
      skipDoneCookingConfirm: Boolean(d.skipDoneCookingConfirm),
    };
  } catch {
    return null;
  }
}

export function setProfileDraft(draft: ProfileDraft): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PROFILE_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // ignore
  }
}

export function clearProfileDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PROFILE_DRAFT_KEY);
  } catch {
    // ignore
  }
}
