"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export function Nav() {
  const { data: session, status } = useSession();

  return (
    <nav className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 flex items-center justify-between h-14 flex-wrap gap-2 py-2">
        <Link href="/feed" className="font-semibold text-lg text-amber-700 dark:text-amber-400 shrink-0">
          Cooking Network
        </Link>
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          <Link
            href="/feed"
            className="text-gray-700 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-400"
          >
            Feed
          </Link>
          {status === "loading" ? (
            <span className="text-gray-400">...</span>
          ) : session ? (
            <>
              <Link
                href={session.user?.username ? `/u/${session.user.username}` : "/u/me"}
                className="text-gray-700 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-400"
              >
                My Blog
              </Link>
              <Link
                href="/post/new"
                className="text-gray-700 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-400"
              >
                New Post
              </Link>
              <Link
                href="/groceries"
                className="text-gray-700 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-400"
              >
                Groceries
              </Link>
              <Link
                href="/recommend"
                className="text-gray-700 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-400"
              >
                What can I cook?
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/feed" })}
                className="text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 text-sm"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-gray-700 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-400"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="text-amber-600 dark:text-amber-400 hover:underline"
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
