"use client";

import { useRouter } from "next13-progressbar";
import { useState } from "react";
import Link from "next/link";
import { Button, Textarea } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { updateComment, deleteComment } from "@/lib/actions/comments";

const MAX_LENGTH = 2000;

export type CommentWithAuthor = {
  id: string;
  content: string;
  createdAt: Date;
  author: {
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
  };
};

type CommentCardProps = {
  comment: CommentWithAuthor;
  postId: string;
  currentUserId: string | null;
};

function formatCommentDate(date: Date): string {
  return new Date(date).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CommentCard({
  comment,
  postId,
  currentUserId,
}: CommentCardProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [loading, setLoading] = useState(false);

  const isAuthor =
    currentUserId != null && comment.author.id === currentUserId;

  async function handleSave() {
    if (editContent.trim() === comment.content) {
      setEditing(false);
      return;
    }
    setLoading(true);
    try {
      const result = await updateComment(comment.id, editContent.trim());
      if ("error" in result) {
        notifications.show({
          title: "Error",
          message: result.error,
          color: "red",
        });
        return;
      }
      setEditing(false);
      router.refresh();
    } catch {
      notifications.show({
        title: "Error",
        message: "Something went wrong. Please try again.",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this comment?")) return;
    setLoading(true);
    try {
      const result = await deleteComment(comment.id);
      if ("error" in result) {
        notifications.show({
          title: "Error",
          message: result.error,
          color: "red",
        });
        return;
      }
      router.refresh();
    } catch {
      notifications.show({
        title: "Error",
        message: "Something went wrong. Please try again.",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <li className="p-4 rounded-lg bg-surface-alt border border-border">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <Link
          href={
            comment.author.username
              ? `/u/${comment.author.username}`
              : `/u/me?id=${comment.author.id}`
          }
          className="flex items-center gap-2 hover:text-primary text-foreground"
        >
          {comment.author.image ? (
            <img
              src={comment.author.image}
              alt=""
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <span className="w-8 h-8 rounded-full bg-border flex items-center justify-center text-sm">
              {(comment.author.name ?? comment.author.username ?? "?")[0]}
            </span>
          )}
          <span className="font-medium">
            {comment.author.name ?? comment.author.username ?? "Anonymous"}
          </span>
        </Link>
        <span className="text-muted text-sm">
          {formatCommentDate(comment.createdAt)}
        </span>
        {isAuthor && !editing && (
          <span className="ml-auto flex items-center gap-1 sm:gap-2">
            <Button
              variant="subtle"
              size="xs"
              onClick={() => {
                setEditContent(comment.content);
                setEditing(true);
              }}
              disabled={loading}
              className="min-w-0 text-muted hover:text-primary hover:bg-primary/10 rounded-md"
            >
              Edit
            </Button>
            <Button
              variant="subtle"
              size="xs"
              color="red"
              onClick={handleDelete}
              disabled={loading}
              className="min-w-0 text-error hover:bg-hover rounded-md"
            >
              Delete
            </Button>
          </span>
        )}
      </div>
      {editing ? (
        <div className="space-y-2">
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.currentTarget.value)}
            minRows={3}
            maxLength={MAX_LENGTH}
            disabled={loading}
            className="min-w-0"
          />
          <p className="text-xs text-muted">
            {editContent.length} / {MAX_LENGTH}
          </p>
            <div className="flex gap-4 justify-end">
              <Button
                size="sm"
                onClick={handleSave}
                loading={loading}
                className="px-4 py-2 bg-primary hover:bg-primary-hover text-primary-foreground font-medium rounded-md disabled:opacity-50"
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="default"
                onClick={() => {
                  setEditing(false);
                  setEditContent(comment.content);
                }}
                disabled={loading}
                className="px-4 py-2 border border-border bg-surface-alt text-foreground hover:bg-hover font-medium rounded-md disabled:opacity-50"
              >
                Cancel
              </Button>
          </div>
        </div>
      ) : (
        <p className="text-foreground whitespace-pre-wrap break-words">
          {comment.content}
        </p>
      )}
    </li>
  );
}
