import { getFeedPosts } from "@/lib/posts";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Feed | Cooking Network",
  description: "Discover cooking posts from the community.",
};

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const posts = await getFeedPosts(50);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Discover</h1>
      <div className="space-y-4">
        {posts.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">
            No posts yet. Be the first to share your cooking!
          </p>
        ) : (
          posts.map((post) => (
            <article
              key={post.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-amber-200 dark:hover:border-amber-800 transition-colors"
            >
              <Link href={`/post/${post.id}`} className="block">
                <h2 className="font-semibold text-lg">{post.title}</h2>
                <p className="text-gray-600 dark:text-gray-400 line-clamp-2 mt-1">
                  {post.content}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <Link
                    href={
                      post.author.username
                        ? `/u/${post.author.username}`
                        : `/u/me?id=${post.author.id}`
                    }
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-amber-600 dark:hover:text-amber-400"
                  >
                    {post.author.image ? (
                      <img
                        src={post.author.image}
                        alt=""
                        className="w-6 h-6 rounded-full"
                      />
                    ) : (
                      <span className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-xs">
                        {(post.author.name ?? post.author.username ?? "?")[0]}
                      </span>
                    )}
                    {post.author.name ?? post.author.username ?? "Anonymous"}
                  </Link>
                  <span className="text-gray-400 text-xs">
                    {new Date(post.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
