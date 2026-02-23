"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export function Nav() {
  const { data: session, status } = useSession();

  return (
    <nav className="border-b border-border bg-surface">
      <div className="max-w-4xl mx-auto px-4 flex items-center justify-between h-14 flex-wrap gap-2 py-2">
        <Link href="/feed" className="font-semibold text-lg text-primary shrink-0">
          Cooking Network
        </Link>
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          <Link
            href="/feed"
            className="text-foreground hover:text-primary"
          >
            Feed
          </Link>
          {status === "loading" ? (
            <span className="text-muted">...</span>
          ) : session ? (
            <>
              <Link
                href={session.user?.username ? `/u/${session.user.username}` : "/u/me"}
                className="text-foreground hover:text-primary"
              >
                My Blog
              </Link>
              <Link
                href="/post/new"
                className="text-foreground hover:text-primary"
              >
                New Post
              </Link>
              <Link
                href="/groceries"
                className="text-foreground hover:text-primary"
              >
                Groceries
              </Link>
              <Link
                href="/recommend"
                className="text-foreground hover:text-primary"
              >
                What can I cook?
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/feed" })}
                className="text-muted hover:text-error text-sm"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-foreground hover:text-primary"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="text-primary hover:underline"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
