import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getBookmarkedRecipes } from "@/lib/bookmarks";
import Link from "next/link";
import { RemoveBookmarkButton } from "@/components/remove-bookmark-button";

export const dynamic = "force-dynamic";

export default async function BookmarksPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login?callbackUrl=/bookmarks");

  const items = await getBookmarkedRecipes(session.user.id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Bookmarks</h1>
      <p className="text-muted">
        Recipes you&apos;ve saved. Open a post to cook or remove from bookmarks.
      </p>

      {items.length === 0 ? (
        <div className="p-6 border border-border rounded-lg text-center text-muted">
          <p>No bookmarked recipes yet.</p>
          <p className="mt-2 text-sm">
            Browse the feed and bookmark recipes you like.
          </p>
          <Link
            href="/feed"
            className="inline-block mt-4 text-primary hover:underline"
          >
            Go to Feed
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {items.map(({ recipe, postId }) => (
            <li
              key={recipe.id}
              className="border border-border rounded-lg p-4"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-lg">{recipe.name}</h2>
                  {recipe.description && (
                    <p className="text-muted text-sm mt-1 line-clamp-2">
                      {recipe.description}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2 items-center">
                    <Link
                      href={`/post/${postId}`}
                      className="text-sm text-primary hover:underline"
                    >
                      View post
                    </Link>
                    <RemoveBookmarkButton recipeId={recipe.id} />
                  </div>
                </div>
                {recipe.imageUrl && (
                  <img
                    src={recipe.imageUrl}
                    alt=""
                    className="w-20 h-20 object-cover rounded flex-shrink-0"
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
