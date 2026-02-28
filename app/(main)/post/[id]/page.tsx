import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPostById } from "@/lib/posts";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { DoneCookingButton } from "@/components/done-cooking-button";
import { sanitizeHtml } from "@/lib/html-utils";

type Props = { params: Promise<{ id: string }> };

export default async function PostPage({ params }: Props) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const post = await getPostById(id);
  if (!post) notFound();

  const isAuthor = session?.user?.id === post.authorId;

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
  if (post.recipe) {
    const [aggregate, userCountRow] = await Promise.all([
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
    ]);
    publicCookCount = aggregate._sum.count ?? 0;
    userCookCount = userCountRow?.count ?? 0;
  }

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
      {post.recipe && (
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
          <div className="flex gap-4 items-start">
            {post.recipe.imageUrl && (
              <img
                src={post.recipe.imageUrl}
                alt=""
                className="w-20 h-20 object-cover rounded flex-shrink-0"
              />
            )}
            <div>
              <h2 className="font-semibold text-lg">Recipe: {post.recipe.name}</h2>
          {post.recipe.description && (
            <p className="text-muted mt-1">
              {post.recipe.description}
            </p>
          )}
          <h3 className="font-medium mt-3">Ingredients</h3>
          <ul className="list-disc list-inside mt-1">
            {post.recipe.ingredients.map((ing) => (
              <li key={ing.id}>
                {ing.groceryItem.name}
                {ing.quantity > 0 && ` — ${ing.quantity} ${ing.unit || ""}`}
              </li>
            ))}
          </ul>
          {session?.user && (
            <>
              <p className="mt-1 text-sm text-muted-foreground">
                You&apos;ve made this {userCookCount} time{userCookCount !== 1 ? "s" : ""}.
              </p>
              <DoneCookingButton
              recipeId={post.recipe.id}
              recipeName={post.recipe.name}
              postId={post.id}
              skipConfirmFromSettings={skipDoneCookingConfirm}
            />
            </>
          )}
            </div>
          </div>
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
    </article>
  );
}
