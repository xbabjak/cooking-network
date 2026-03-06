import Link from "next/link";
import { AddCommentForm } from "@/components/add-comment-form";

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

type PostCommentsProps = {
  postId: string;
  comments: CommentWithAuthor[];
  canComment: boolean;
};

function formatCommentDate(date: Date): string {
  return new Date(date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PostComments({
  postId,
  comments,
  canComment,
}: PostCommentsProps) {
  return (
    <section className="mt-10 border-t border-border pt-8" aria-label="Comments">
      <h2 className="text-xl font-semibold mb-4">Comments</h2>
      <ul className="space-y-4 list-none p-0 m-0">
        {comments.map((comment) => (
          <li
            key={comment.id}
            className="p-4 rounded-lg bg-surface-alt border border-border"
          >
            <div className="flex items-center gap-2 mb-2">
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
            </div>
            <p className="text-foreground whitespace-pre-wrap break-words">
              {comment.content}
            </p>
          </li>
        ))}
      </ul>
      {canComment && (
        <div className="mt-6">
          <AddCommentForm postId={postId} />
        </div>
      )}
      {!canComment && comments.length === 0 && (
        <p className="text-muted text-sm">Sign in to leave a comment.</p>
      )}
    </section>
  );
}
