import { describe, it, expect, vi, beforeEach } from "vitest";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { createComment, updateComment, deleteComment } from "./comments";

// Valid CUID format (25 chars, starts with c)
const validPostId = "cln8y9z8e0000xyz0000000001";
const validCommentId = "cln8y9z8e0000xyz0000000002";
const userId = "user-1";

describe("createComment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns Unauthorized when not logged in", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const result = await createComment(validPostId, "hello");
    expect(result).toEqual({ error: "Unauthorized" });
    expect(prisma.post.findUnique).not.toHaveBeenCalled();
  });

  it("returns error for invalid postId", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: userId } } as never);
    const result = await createComment("not-a-cuid", "hello");
    expect(result).toEqual({ error: "Invalid post." });
    expect(prisma.post.findUnique).not.toHaveBeenCalled();
  });

  it("returns error for empty content", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: userId } } as never);
    const result = await createComment(validPostId, "   ");
    expect(result).toEqual({ error: "Comment cannot be empty." });
    expect(prisma.post.findUnique).not.toHaveBeenCalled();
  });

  it("returns error when post not found", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: userId } } as never);
    vi.mocked(prisma.post.findUnique).mockResolvedValue(null);
    const result = await createComment(validPostId, "hello");
    expect(result).toEqual({ error: "Not found" });
    expect(prisma.comment.create).not.toHaveBeenCalled();
  });

  it("returns Not found when post is private and user is not author", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: userId } } as never);
    vi.mocked(prisma.post.findUnique).mockResolvedValue({
      id: validPostId,
      isPrivate: true,
      authorId: "other-user",
    } as never);
    const result = await createComment(validPostId, "hello");
    expect(result).toEqual({ error: "Not found" });
    expect(prisma.comment.create).not.toHaveBeenCalled();
  });

  it("creates comment and returns success when authorized", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: userId } } as never);
    vi.mocked(prisma.post.findUnique).mockResolvedValue({
      id: validPostId,
      isPrivate: false,
      authorId: "any",
    } as never);
    vi.mocked(prisma.comment.create).mockResolvedValue({} as never);
    const result = await createComment(validPostId, "hello");
    expect(result).toEqual({ success: true });
    expect(prisma.comment.create).toHaveBeenCalledWith({
      data: {
        postId: validPostId,
        authorId: userId,
        content: "hello",
      },
    });
  });
});

describe("updateComment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns Unauthorized when not logged in", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const result = await updateComment(validCommentId, "updated");
    expect(result).toEqual({ error: "Unauthorized" });
  });

  it("returns error for invalid commentId", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: userId } } as never);
    const result = await updateComment("bad-id", "updated");
    expect(result).toEqual({ error: "Invalid comment." });
  });

  it("returns Not found when comment does not exist", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: userId } } as never);
    vi.mocked(prisma.comment.findUnique).mockResolvedValue(null);
    const result = await updateComment(validCommentId, "updated");
    expect(result).toEqual({ error: "Not found" });
  });

  it("returns Not found when user is not comment author", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: userId } } as never);
    vi.mocked(prisma.comment.findUnique).mockResolvedValue({
      id: validCommentId,
      authorId: "other-user",
      postId: validPostId,
    } as never);
    const result = await updateComment(validCommentId, "updated");
    expect(result).toEqual({ error: "Not found" });
    expect(prisma.comment.update).not.toHaveBeenCalled();
  });

  it("updates comment and returns success when author", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: userId } } as never);
    vi.mocked(prisma.comment.findUnique).mockResolvedValue({
      id: validCommentId,
      authorId: userId,
      postId: validPostId,
    } as never);
    vi.mocked(prisma.comment.update).mockResolvedValue({} as never);
    const result = await updateComment(validCommentId, "updated");
    expect(result).toEqual({ success: true });
    expect(prisma.comment.update).toHaveBeenCalledWith({
      where: { id: validCommentId },
      data: { content: "updated" },
    });
  });
});

describe("deleteComment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns Unauthorized when not logged in", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const result = await deleteComment(validCommentId);
    expect(result).toEqual({ error: "Unauthorized" });
  });

  it("returns error for invalid commentId", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: userId } } as never);
    const result = await deleteComment("bad-id");
    expect(result).toEqual({ error: "Invalid comment." });
  });

  it("returns Not found when comment does not exist", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: userId } } as never);
    vi.mocked(prisma.comment.findUnique).mockResolvedValue(null);
    const result = await deleteComment(validCommentId);
    expect(result).toEqual({ error: "Not found" });
  });

  it("deletes comment and returns success when author", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: userId } } as never);
    vi.mocked(prisma.comment.findUnique).mockResolvedValue({
      id: validCommentId,
      authorId: userId,
      postId: validPostId,
    } as never);
    vi.mocked(prisma.comment.delete).mockResolvedValue({} as never);
    const result = await deleteComment(validCommentId);
    expect(result).toEqual({ success: true });
    expect(prisma.comment.delete).toHaveBeenCalledWith({
      where: { id: validCommentId },
    });
  });
});
