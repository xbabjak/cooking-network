import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen } from "@/components/test-utils";
import { AddCommentForm } from "./add-comment-form";
import { createComment } from "@/lib/actions/comments";
import { useRouter } from "next13-progressbar";

vi.mock("@/lib/actions/comments", () => ({
  createComment: vi.fn(),
}));

vi.mocked(useRouter).mockReturnValue({ refresh: vi.fn() } as never);

describe("AddCommentForm", () => {
  const postId = "post-1";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders textarea and submit button", () => {
    render(<AddCommentForm postId={postId} />);
    expect(
      screen.getByPlaceholderText(/write a comment/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /post comment/i })
    ).toBeInTheDocument();
  });

  it("shows character count", () => {
    render(<AddCommentForm postId={postId} />);
    expect(screen.getByText(/0 \/ 2000/)).toBeInTheDocument();
  });

  it("submit with empty content does not call createComment", async () => {
    render(<AddCommentForm postId={postId} />);
    const submit = screen.getByRole("button", { name: /post comment/i });
    expect(submit).toBeDisabled();
    await userEvent.click(submit);
    expect(createComment).not.toHaveBeenCalled();
  });

  it("calls createComment and refresh on successful submit", async () => {
    vi.mocked(createComment).mockResolvedValue({ success: true });
    const refresh = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ refresh } as never);

    render(<AddCommentForm postId={postId} />);
    const textarea = screen.getByPlaceholderText(/write a comment/i);
    await userEvent.type(textarea, "Hello world");
    await userEvent.click(screen.getByRole("button", { name: /post comment/i }));

    expect(createComment).toHaveBeenCalledWith(postId, "Hello world");
    expect(refresh).toHaveBeenCalled();
    expect(textarea).toHaveValue("");
  });

  it("shows notification on createComment error", async () => {
    const { notifications } = await import("@mantine/notifications");
    vi.mocked(createComment).mockResolvedValue({ error: "Not found" });

    render(<AddCommentForm postId={postId} />);
    await userEvent.type(
      screen.getByPlaceholderText(/write a comment/i),
      "Hello"
    );
    await userEvent.click(screen.getByRole("button", { name: /post comment/i }));

    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Error",
        message: "Not found",
        color: "red",
      })
    );
  });
});
