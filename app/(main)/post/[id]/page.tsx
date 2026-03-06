import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPostById } from "@/lib/posts";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { RecipeWithServings } from "@/components/recipe-with-servings";
import { PostComments } from "@/components/post-comments";
import { sanitizeHtml } from "@/lib/html-utils";

type Props = { params: Promise<{ id: string }> };

export default async function PostPage({ params }: Props) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const post = await getPostById(id);
  if (!post) notFound();
  if (post.isPrivate && post.authorId !== session?.user?.id) notFound();

  const isAuthor = session?.user?.id === post.authorId;
  const canViewRecipe =
    post.recipe &&
    (!post.recipe.isPrivate || post.recipe.authorId === session?.user?.id);

  let skipDoneCookingConfirm = false;
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { skipDoneCookingConfirm: true },
    });
    skipDoneCookingConfirm = user?.skipDoneCookingConfirm ?? false;
  }

  let publicCookCount = 0;
  let userCookCount = 0;
  let bookmarkExists = false;
  let likeCount = 0;
  let dislikeCount = 0;
  let userReaction: "like" | "dislike" | null = null;
  if (post.recipe && canViewRecipe) {
    const [aggregate, userCountRow, bookmark, likeCountRes, dislikeCountRes, userReactionRow] =
      await Promise.all([
        prisma.userRecipeCookCount.aggregate({
          where: { recipeId: post.recipe.id },
          _sum: { count: true },
        }),
        session?.user?.id
          ? prisma.userRecipeCookCount.findUnique({
              where: {
                userId_recipeId: {
                  userId: session.user.id,
                  recipeId: post.recipe.id,
                },
              },
            })
          : null,
        session?.user?.id
          ? prisma.userRecipeBookmark.findUnique({
              where: {
                userId_recipeId: {
                  userId: session.user.id,
                  recipeId: post.recipe.id,
                },
              },
            })
          : null,
        prisma.recipeReaction.count({
          where: { recipeId: post.recipe.id, reaction: "like" },
        }),
        prisma.recipeReaction.count({
          where: { recipeId: post.recipe.id, reaction: "dislike" },
        }),
        session?.user?.id
          ? prisma.recipeReaction.findUnique({
              where: {
                userId_recipeId: {
                  userId: session.user.id,
                  recipeId: post.recipe.id,
                },
              },
              select: { reaction: true },
            })
          : null,
      ]);
    publicCookCount = aggregate._sum.count ?? 0;
    userCookCount = userCountRow?.count ?? 0;
    bookmarkExists = !!bookmark;
    likeCount = likeCountRes;
    dislikeCount = dislikeCountRes;
    userReaction =
      userReactionRow?.reaction === "like" || userReactionRow?.reaction === "dislike"
        ? userReactionRow.reaction
        : null;
  }

  const comments = await prisma.comment.findMany({
    where: { postId: post.id },
    orderBy: { createdAt: "asc" },
    include: {
      author: {
        select: { id: true, name: true, username: true, image: true },
      },
    },
  });

  return (
    <article className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold">{post.title}</h1>
      <div className="flex items-center gap-2 mt-2 text-muted">
        <Link
          href={
            post.author.username
              ? `/u/${post.author.username}`
              : `/u/me?id=${post.author.id}`
          }
          className="flex items-center gap-2 hover:text-primary"
        >
          {post.author.image ? (
            <img
              src={post.author.image}
              alt=""
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <span className="w-8 h-8 rounded-full bg-border flex items-center justify-center text-sm">
              {(post.author.name ?? post.author.username ?? "?")[0]}
            </span>
          )}
          {post.author.name ?? post.author.username ?? "Anonymous"}
        </Link>
        <span>{new Date(post.createdAt).toLocaleDateString()}</span>
      </div>
      {post.recipe && canViewRecipe && (
        <p className="mt-1 text-xs text-muted-foreground/80">
          Cooked {publicCookCount} time{publicCookCount !== 1 ? "s" : ""}.
        </p>
      )}
      {post.imageUrls.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {post.imageUrls.map((url) => (
            <img
              key={url}
              src={url}
              alt=""
              className="max-h-64 rounded-lg object-cover"
            />
          ))}
        </div>
      )}
      <div
        className="mt-6 prose dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content) }}
      />
      {post.recipe && (
        <div className="mt-8 p-4 border border-border rounded-lg bg-surface-alt">
          {!canViewRecipe ? (
            <p className="text-muted text-sm">This recipe is private.</p>
          ) : (
            <RecipeWithServings
              recipe={{
                id: post.recipe.id,
                name: post.recipe.name,
                description: post.recipe.description,
                imageUrl: post.recipe.imageUrl,
                servings: post.recipe.servings,
                ingredients: post.recipe.ingredients,
              }}
              postId={post.id}
              skipDoneCookingConfirm={skipDoneCookingConfirm}
              userCookCount={userCookCount}
              bookmarkExists={bookmarkExists}
              likeCount={likeCount}
              dislikeCount={dislikeCount}
              userReaction={userReaction}
              hasUser={!!session?.user}
            />
          )}
        </div>
      )}
      {isAuthor && (
        <div className="mt-6">
          <Link
            href={`/post/${post.id}/edit`}
            className="text-primary hover:underline"
          >
            Edit post
          </Link>
        </div>
      )}
      <PostComments
        postId={post.id}
        comments={comments}
        canComment={!!session?.user}
        currentUserId={session?.user?.id ?? null}
      />
    </article>
  );
}
