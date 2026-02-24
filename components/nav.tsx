"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Menu } from "@mantine/core";
import { ThemeToggle } from "@/components/theme-toggle";

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
          <ThemeToggle />
          {status === "loading" ? (
            <span className="text-muted">...</span>
          ) : session ? (
            <>
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
              <Menu
                shadow="md"
                width={200}
                position="bottom-end"
                trigger="click-hover"
                openDelay={100}
                closeDelay={300}
                classNames={{
                  item: "px-4",
                }}
              >
                <Menu.Target>
                  <button
                    type="button"
                    className="flex items-center gap-2 text-foreground hover:text-primary"
                  >
                    {session.user?.image ? (
                      <img
                        src={session.user.image}
                        alt=""
                        className="w-7 h-7 rounded-full"
                      />
                    ) : (
                      <span className="w-7 h-7 rounded-full bg-border flex items-center justify-center text-sm font-medium">
                        {(session.user?.name ?? session.user?.username ?? "?")[0]}
                      </span>
                    )}
                    <span className="hidden sm:inline">
                      {session.user?.name ?? session.user?.username ?? "Account"}
                    </span>
                  </button>
                </Menu.Target>
                <Menu.Dropdown className="py-2 bg-surface border border-border">
                  <Menu.Item
                    component={Link}
                    href={session.user?.username ? `/u/${session.user.username}` : "/u/me"}
                    className="text-foreground hover:bg-hover hover:text-primary"
                  >
                    My Blog
                  </Menu.Item>
                  <Menu.Item
                    component={Link}
                    href="/profile/edit"
                    className="text-foreground hover:bg-hover hover:text-primary"
                  >
                    Edit profile
                  </Menu.Item>
                  <Menu.Divider className="border" />
                  <Menu.Item
                    // mozno staci redirect na logout page
                    className="text-error hover:bg-hover hover:text-error"
                    onClick={() => signOut({ callbackUrl: "/feed" })}
                  >
                    <div className="my-2">
                      Sign out
                    </div>
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
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
