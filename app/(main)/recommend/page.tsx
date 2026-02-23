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
      <p className="text-muted">
        Recipes you can make with your current groceries. Add items in{" "}
        <Link href="/groceries" className="text-primary hover:underline">
          My Groceries
        </Link>{" "}
        to see more matches.
      </p>

      {recipes.length === 0 ? (
        <div className="p-6 border border-border rounded-lg text-center text-muted">
          <p>No recipes match your groceries yet.</p>
          <p className="mt-2 text-sm">
            Add groceries to your list, or browse the feed for recipe posts that
            others have shared.
          </p>
          <Link
            href="/groceries"
            className="inline-block mt-4 text-primary hover:underline"
          >
            Go to My Groceries
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {recipes.map((r) => (
            <li
              key={r.id}
              className="border border-border rounded-lg p-4"
            >
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h2 className="font-semibold text-lg">{r.name}</h2>
                  {r.description && (
                    <p className="text-muted text-sm mt-1">
                      {r.description}
                    </p>
                  )}
                  <p className="text-sm text-primary mt-2">
                    {r.matchPercent}% match ({r.matchCount}/{r.totalIngredients}{" "}
                    ingredients)
                  </p>
                  {r.missingIngredients.length > 0 && (
                    <p className="text-xs text-muted mt-1">
                      Missing: {r.missingIngredients.join(", ")}
                    </p>
                  )}
                  {r.postId && (
                    <Link
                      href={`/post/${r.postId}`}
                      className="text-sm text-primary hover:underline mt-2 inline-block"
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
