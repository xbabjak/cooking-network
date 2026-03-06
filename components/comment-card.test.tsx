import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen } from "@/components/test-utils";
import { CommentCard, type CommentWithAuthor } from "./comment-card";
import { updateComment, deleteComment } from "@/lib/actions/comments";
import { useRouter } from "next13-progressbar";

vi.mock("@/lib/actions/comments", () => ({
  updateComment: vi.fn(),
  deleteComment: vi.fn(),
}));

vi.mocked(useRouter).mockReturnValue({ refresh: vi.fn() } as never);

const baseComment: CommentWithAuthor = {
  id: "comment-1",
  content: "A test comment",
  createdAt: new Date("2025-01-15T12:00:00Z"),
  author: {
    id: "author-1",
    name: "Test User",
    username: "testuser",
    image: null,
  },
};

describe("CommentCard", () => {
  const postId = "post-1";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("confirm", vi.fn(() => true));
  });

  it("renders comment content and author name", () => {
    render(
      <CommentCard
        comment={baseComment}
        postId={postId}
        currentUserId={null}
      />
    );
    expect(screen.getByText("A test comment")).toBeInTheDocument();
    expect(screen.getByText("Test User")).toBeInTheDocument();
  });

  it("does not show Edit/Delete when current user is not author", () => {
    render(
      <CommentCard
        comment={baseComment}
        postId={postId}
        currentUserId="other-user"
      />
    );
    expect(screen.queryByRole("button", { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
  });

  it("shows Edit and Delete when current user is author", () => {
    render(
      <CommentCard
        comment={baseComment}
        postId={postId}
        currentUserId="author-1"
      />
    );
    expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
  });

  it("calls updateComment and refresh when Save after edit", async () => {
    vi.mocked(updateComment).mockResolvedValue({ success: true });
    const refresh = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ refresh } as never);

    render(
      <CommentCard
        comment={baseComment}
        postId={postId}
        currentUserId="author-1"
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /edit/i }));
    const textarea = screen.getByRole("textbox");
    await userEvent.clear(textarea);
    await userEvent.type(textarea, "Updated content");
    await userEvent.click(screen.getByRole("button", { name: /^save$/i }));

    expect(updateComment).toHaveBeenCalledWith("comment-1", "Updated content");
    expect(refresh).toHaveBeenCalled();
  });

  it("calls deleteComment and refresh when Delete confirmed", async () => {
    vi.mocked(deleteComment).mockResolvedValue({ success: true });
    const refresh = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ refresh } as never);
    vi.stubGlobal("confirm", vi.fn(() => true));

    render(
      <CommentCard
        comment={baseComment}
        postId={postId}
        currentUserId="author-1"
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /delete/i }));

    expect(deleteComment).toHaveBeenCalledWith("comment-1");
    expect(refresh).toHaveBeenCalled();
  });

  it("does not call deleteComment when confirm is cancelled", async () => {
    vi.stubGlobal("confirm", vi.fn(() => false));

    render(
      <CommentCard
        comment={baseComment}
        postId={postId}
        currentUserId="author-1"
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /delete/i }));

    expect(deleteComment).not.toHaveBeenCalled();
  });
});
