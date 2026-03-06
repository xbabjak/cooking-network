import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen } from "@/components/test-utils";
import { BookmarkButton } from "./bookmark-button";
import { toggleRecipeBookmark } from "@/lib/actions/bookmarks";
import { useRouter } from "next13-progressbar";

vi.mock("@/lib/actions/bookmarks", () => ({
  toggleRecipeBookmark: vi.fn(),
}));

vi.mocked(useRouter).mockReturnValue({ refresh: vi.fn() } as never);

describe("BookmarkButton", () => {
  const recipeId = "recipe-1";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders with Bookmark recipe label when not bookmarked", () => {
    render(<BookmarkButton recipeId={recipeId} initialBookmarked={false} />);
    expect(
      screen.getByRole("button", { name: /bookmark recipe/i })
    ).toBeInTheDocument();
  });

  it("renders with Bookmarked label when bookmarked", () => {
    render(<BookmarkButton recipeId={recipeId} initialBookmarked={true} />);
    expect(
      screen.getByRole("button", { name: /bookmarked/i })
    ).toBeInTheDocument();
  });

  it("calls toggleRecipeBookmark and router.refresh on success", async () => {
    vi.mocked(toggleRecipeBookmark).mockResolvedValue({ bookmarked: true });
    const refresh = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ refresh } as never);

    render(<BookmarkButton recipeId={recipeId} initialBookmarked={false} />);
    await userEvent.click(screen.getByRole("button", { name: /bookmark recipe/i }));

    expect(toggleRecipeBookmark).toHaveBeenCalledWith(recipeId);
    expect(refresh).toHaveBeenCalled();
  });

  it("shows loading state while request is in flight", async () => {
    let resolve: (value: { bookmarked: true }) => void;
    vi.mocked(toggleRecipeBookmark).mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r;
        }) as Promise<{ bookmarked: boolean }>
    );

    render(<BookmarkButton recipeId={recipeId} initialBookmarked={false} />);
    const button = screen.getByRole("button", { name: /bookmark recipe/i });
    await userEvent.click(button);

    expect(button).toBeDisabled();
    (resolve! as (v: { bookmarked: true }) => void)({ bookmarked: true });
  });

  it("calls notifications.show on action error", async () => {
    const { notifications } = await import("@mantine/notifications");
    vi.mocked(toggleRecipeBookmark).mockResolvedValue({
      error: "Something went wrong",
    });

    render(<BookmarkButton recipeId={recipeId} initialBookmarked={false} />);
    await userEvent.click(screen.getByRole("button", { name: /bookmark recipe/i }));

    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Error",
        message: "Something went wrong",
        color: "red",
      })
    );
  });
});
