"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_CONTENT_LENGTH = 2000;

const commentContentSchema = z
  .string()
  .trim()
  .min(1, "Comment cannot be empty.")
  .max(MAX_CONTENT_LENGTH, `Comment cannot exceed ${MAX_CONTENT_LENGTH} characters.`);

const createCommentSchema = z.object({
  postId: z.string().cuid("Invalid post."),
  content: commentContentSchema,
});

const updateCommentSchema = z.object({
  commentId: z.string().cuid("Invalid comment."),
  content: commentContentSchema,
});

const deleteCommentSchema = z.object({
  commentId: z.string().cuid("Invalid comment."),
});

export async function createComment(
  postId: string,
  content: string
): Promise<{ error?: string } | { success: true }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  const parsed = createCommentSchema.safeParse({ postId, content });
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message;
    return { error: msg ?? "Invalid input." };
  }

  const { postId: validPostId, content: trimmed } = parsed.data;

  const post = await prisma.post.findUnique({
    where: { id: validPostId },
    select: { id: true, isPrivate: true, authorId: true },
  });
  if (!post) return { error: "Not found" };
  const canView = !post.isPrivate || post.authorId === session.user.id;
  if (!canView) return { error: "Not found" };

  await prisma.comment.create({
    data: {
      postId: validPostId,
      authorId: session.user.id,
      content: trimmed,
    },
  });

  revalidatePath(`/post/${validPostId}`);
  revalidatePath("/post/[id]", "page");
  return { success: true };
}

export async function updateComment(
  commentId: string,
  content: string
): Promise<{ error?: string } | { success: true }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  const parsed = updateCommentSchema.safeParse({ commentId, content });
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message;
    return { error: msg ?? "Invalid input." };
  }

  const { commentId: validCommentId, content: trimmed } = parsed.data;

  const comment = await prisma.comment.findUnique({
    where: { id: validCommentId },
    select: { id: true, authorId: true, postId: true },
  });
  if (!comment) return { error: "Not found" };
  if (comment.authorId !== session.user.id) return { error: "Not found" };

  await prisma.comment.update({
    where: { id: validCommentId },
    data: { content: trimmed },
  });

  revalidatePath(`/post/${comment.postId}`);
  revalidatePath("/post/[id]", "page");
  return { success: true };
}

export async function deleteComment(
  commentId: string
): Promise<{ error?: string } | { success: true }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  const parsed = deleteCommentSchema.safeParse({ commentId });
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message;
    return { error: msg ?? "Invalid input." };
  }

  const { commentId: validCommentId } = parsed.data;

  const comment = await prisma.comment.findUnique({
    where: { id: validCommentId },
    select: { id: true, authorId: true, postId: true },
  });
  if (!comment) return { error: "Not found" };
  if (comment.authorId !== session.user.id) return { error: "Not found" };

  await prisma.comment.delete({
    where: { id: validCommentId },
  });

  revalidatePath(`/post/${comment.postId}`);
  revalidatePath("/post/[id]", "page");
  return { success: true };
}
