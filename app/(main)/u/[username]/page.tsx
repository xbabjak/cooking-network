import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPostsByAuthorId } from "@/lib/posts";
import { stripHtml } from "@/lib/html-utils";
import Link from "next/link";

type Props = { params: Promise<{ username: string }> };

export default async function UserBlogPage({ params }: Props) {
  const { username } = await params;
  const session = await getServerSession(authOptions);

  let user: { id: string; name: string | null; username: string | null; image: string | null; bio: string | null } | null;

  if (username === "me") {
    if (!session?.user?.id) {
      return (
        <div className="text-center py-12">
          <p className="text-muted">Sign in to view your blog.</p>
          <Link href="/login" className="text-primary hover:underline mt-2 inline-block">
            Sign in
          </Link>
        </div>
      );
    }
    user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, username: true, image: true, bio: true },
    });
  } else {
    user = await prisma.user.findUnique({
      where: { username },
      select: { id: true, name: true, username: true, image: true, bio: true },
    });
  }

  if (!user) notFound();

  const posts = await getPostsByAuthorId(user.id);

  const isOwnBlog = session?.user?.id === user.id;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {user.image ? (
            <img
              src={user.image}
              alt=""
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-surface-alt flex items-center justify-center text-2xl font-semibold text-primary">
              {(user.name ?? user.username ?? "?")[0]}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold">
              {user.name ?? user.username ?? "Chef"}
            </h1>
            {user.username && (
              <p className="text-muted">@{user.username}</p>
            )}
            {user.bio && (
              <p className="text-muted mt-1">{user.bio}</p>
            )}
          </div>
        </div>
        {isOwnBlog && (
          <Link
            href="/post/new"
            className="px-4 py-2 bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-medium rounded-md"
          >
            New post
          </Link>
        )}
      </div>

      <h2 className="text-lg font-semibold">Posts</h2>
      <div className="space-y-4">
        {posts.length === 0 ? (
          <p className="text-muted">
            No posts yet.
            {isOwnBlog && " Create your first post!"}
          </p>
        ) : (
          posts.map((post) => (
            <article
              key={post.id}
              className="border border-border rounded-lg p-4"
            >
              <Link href={`/post/${post.id}`} className="block">
                <h3 className="font-semibold">{post.title}</h3>
                <p className="text-muted line-clamp-2 mt-1 text-sm">
                  {stripHtml(post.content)}
                </p>
                <p className="text-muted text-xs mt-2">
                  {new Date(post.createdAt).toLocaleDateString()}
                </p>
              </Link>
              {isOwnBlog && (
                <Link
                  href={`/post/${post.id}/edit`}
                  className="text-sm text-primary hover:underline mt-2 inline-block"
                >
                  Edit
                </Link>
              )}
            </article>
          ))
        )}
      </div>
    </div>
  );
}
