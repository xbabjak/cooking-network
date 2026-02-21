import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getRecommendations } from "@/lib/recommendations";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function RecommendPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login?callbackUrl=/recommend");

  const recipes = await getRecommendations(session.user.id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">What can I cook?</h1>
      <p className="text-gray-600 dark:text-gray-400">
        Recipes you can make with your current groceries. Add items in{" "}
        <Link href="/groceries" className="text-amber-600 hover:underline">
          My Groceries
        </Link>{" "}
        to see more matches.
      </p>

      {recipes.length === 0 ? (
        <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-lg text-center text-gray-500 dark:text-gray-400">
          <p>No recipes match your groceries yet.</p>
          <p className="mt-2 text-sm">
            Add groceries to your list, or browse the feed for recipe posts that
            others have shared.
          </p>
          <Link
            href="/groceries"
            className="inline-block mt-4 text-amber-600 hover:underline"
          >
            Go to My Groceries
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {recipes.map((r) => (
            <li
              key={r.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
            >
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h2 className="font-semibold text-lg">{r.name}</h2>
                  {r.description && (
                    <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                      {r.description}
                    </p>
                  )}
                  <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
                    {r.matchPercent}% match ({r.matchCount}/{r.totalIngredients}{" "}
                    ingredients)
                  </p>
                  {r.missingIngredients.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Missing: {r.missingIngredients.join(", ")}
                    </p>
                  )}
                  {r.postId && (
                    <Link
                      href={`/post/${r.postId}`}
                      className="text-sm text-amber-600 hover:underline mt-2 inline-block"
                    >
                      View post
                    </Link>
                  )}
                </div>
                {r.imageUrl && (
                  <img
                    src={r.imageUrl}
                    alt=""
                    className="w-20 h-20 object-cover rounded"
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
