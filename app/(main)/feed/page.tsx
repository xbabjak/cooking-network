import { getFeedPosts } from "@/lib/posts";
import { FeedPostAuthorLink } from "@/components/feed-post-author-link";
import { stripHtml, getFirstImageFromHtml } from "@/lib/html-utils";
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
          <p className="text-muted">
            No posts yet. Be the first to share your cooking!
          </p>
        ) : (
          posts.map((post) => {
            const { author } = post;
            const authorLabel = author.name ?? author.username ?? "Anonymous";
            const authorHref = author.username
              ? `/u/${author.username}`
              : `/u/me?id=${author.id}`;

            const previewImage =
              post.recipe?.imageUrl ??
              post.imageUrls?.[0] ??
              getFirstImageFromHtml(post.content);

            return (
              <article
                key={post.id}
                className="border border-border rounded-lg p-4 hover:border-primary/30 transition-colors"
              >
                <Link href={`/post/${post.id}`} className="block">
                  <div className="flex gap-4">
                    {previewImage && (
                      <img
                        src={previewImage}
                        alt=""
                        className="w-20 h-20 object-cover rounded flex-shrink-0"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <h2 className="font-semibold text-lg">{post.title}</h2>
                      <p className="text-muted line-clamp-2 mt-1">
                        {stripHtml(post.content)}
                      </p>
                    </div>
                  </div>
                </Link>
                <div className="mt-3 flex items-center gap-2">
                  <FeedPostAuthorLink
                    href={authorHref}
                    image={author.image}
                    displayName={authorLabel}
                  />
                  <span className="text-muted text-xs">
                    {new Date(post.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
