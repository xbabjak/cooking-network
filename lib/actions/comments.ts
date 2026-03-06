"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_CONTENT_LENGTH = 2000;

export async function createComment(
  postId: string,
  content: string
): Promise<{ error?: string } | { success: true }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  const trimmed = content.trim();
  if (trimmed.length === 0) return { error: "Comment cannot be empty." };
  if (trimmed.length > MAX_CONTENT_LENGTH)
    return { error: `Comment cannot exceed ${MAX_CONTENT_LENGTH} characters.` };

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, isPrivate: true, authorId: true },
  });
  if (!post) return { error: "Not found" };
  const canView = !post.isPrivate || post.authorId === session.user.id;
  if (!canView) return { error: "Not found" };

  await prisma.comment.create({
    data: {
      postId,
      authorId: session.user.id,
      content: trimmed,
    },
  });

  revalidatePath(`/post/${postId}`);
  revalidatePath("/post/[id]", "page");
  return { success: true };
}
