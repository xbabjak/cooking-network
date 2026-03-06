"use client";

import { useRouter } from "next13-progressbar";
import { useState } from "react";
import { Button, Textarea } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { createComment } from "@/lib/actions/comments";

const MAX_LENGTH = 2000;

type Props = {
  postId: string;
};

export function AddCommentForm({ postId }: Props) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || submitting) return;
    setSubmitting(true);
    try {
      const result = await createComment(postId, content.trim());
      if ("error" in result) {
        notifications.show({
          title: "Error",
          message: result.error,
          color: "red",
        });
        return;
      }
      setContent("");
      router.refresh();
    } catch {
      notifications.show({
        title: "Error",
        message: "Something went wrong. Please try again.",
        color: "red",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Textarea
        placeholder="Write a comment..."
        value={content}
        onChange={(e) => setContent(e.currentTarget.value)}
        minRows={3}
        maxLength={MAX_LENGTH}
        disabled={submitting}
        className="min-w-0"
      />
      <p className="text-xs text-muted">
        {content.length} / {MAX_LENGTH}
      </p>
      <Button type="submit" loading={submitting} disabled={!content.trim()}>
        Post comment
      </Button>
    </form>
  );
}
