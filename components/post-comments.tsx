import { AddCommentForm } from "./add-comment-form";
import { CommentCard } from "./comment-card";

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
  currentUserId: string | null;
};

export function PostComments({
  postId,
  comments,
  canComment,
  currentUserId,
}: PostCommentsProps) {
  return (
    <section className="mt-10 border-t border-border pt-8" aria-label="Comments">
      <h2 className="text-xl font-semibold mb-4">Comments</h2>
      <ul className="space-y-4 list-none p-0 m-0">
        {comments.map((comment) => (
          <CommentCard
            key={comment.id}
            comment={comment}
            postId={postId}
            currentUserId={currentUserId}
          />
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