import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPostById } from "@/lib/posts";
import Link from "next/link";

type Props = { params: Promise<{ id: string }> };

export default async function PostPage({ params }: Props) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const post = await getPostById(id);
  if (!post) notFound();

  const isAuthor = session?.user?.id === post.authorId;

  return (
    <article className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold">{post.title}</h1>
      <div className="flex items-center gap-2 mt-2 text-gray-500 dark:text-gray-400">
        <Link
          href={
            post.author.username
              ? `/u/${post.author.username}`
              : `/u/me?id=${post.author.id}`
          }
          className="flex items-center gap-2 hover:text-amber-600 dark:hover:text-amber-400"
        >
          {post.author.image ? (
            <img
              src={post.author.image}
              alt=""
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <span className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-sm">
              {(post.author.name ?? post.author.username ?? "?")[0]}
            </span>
          )}
          {post.author.name ?? post.author.username ?? "Anonymous"}
        </Link>
        <span>{new Date(post.createdAt).toLocaleDateString()}</span>
      </div>
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
      <div className="mt-6 prose dark:prose-invert max-w-none whitespace-pre-wrap">
        {post.content}
      </div>
      {post.recipe && (
        <div className="mt-8 p-4 border border-amber-200 dark:border-amber-800 rounded-lg">
          <h2 className="font-semibold text-lg">Recipe: {post.recipe.name}</h2>
          {post.recipe.description && (
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {post.recipe.description}
            </p>
          )}
          <h3 className="font-medium mt-3">Ingredients</h3>
          <ul className="list-disc list-inside mt-1">
            {post.recipe.ingredients.map((ing) => (
              <li key={ing.id}>
                {ing.ingredientName}
                {ing.quantity > 0 && ` — ${ing.quantity} ${ing.unit || ""}`}
              </li>
            ))}
          </ul>
        </div>
      )}
      {isAuthor && (
        <div className="mt-6">
          <Link
            href={`/post/${post.id}/edit`}
            className="text-amber-600 hover:underline"
          >
            Edit post
          </Link>
        </div>
      )}
    </article>
  );
}
