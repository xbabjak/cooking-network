"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Burger, Drawer, Menu } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { ThemeToggle } from "@/components/theme-toggle";

const navLinkClass = "text-foreground hover:text-primary";

export function Nav() {
  const [mounted, setMounted] = useState(false);
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] = useDisclosure(false);
  const { data: session, status } = useSession();

  useEffect(() => {
    setMounted(true);
  }, []);

  const navLinks = (
    <>
      <Link href="/feed" className={navLinkClass} onClick={closeDrawer}>
        Feed
      </Link>
      <ThemeToggle />
      {!mounted || status === "loading" ? (
        <span className="text-muted">...</span>
      ) : session ? (
        <>
          <Link href="/post/new" className={navLinkClass} onClick={closeDrawer}>
            New Post
          </Link>
          <Link href="/groceries" className={navLinkClass} onClick={closeDrawer}>
            Groceries
          </Link>
          <Link href="/recommend" className={navLinkClass} onClick={closeDrawer}>
            What can I cook?
          </Link>
          <Menu
            shadow="md"
            width={200}
            position="bottom-end"
            trigger="click-hover"
            openDelay={100}
            closeDelay={300}
            classNames={{ item: "px-4" }}
          >
            <Menu.Target>
              <button type="button" className="flex items-center gap-2 text-foreground hover:text-primary">
                {session.user?.image ? (
                  <img src={session.user.image} alt="" className="w-7 h-7 rounded-full" />
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
                className="text-error hover:bg-hover hover:text-error"
                onClick={() => signOut({ callbackUrl: "/feed" })}
              >
                Sign out
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </>
      ) : (
        <>
          <Link href="/login" className={navLinkClass} onClick={closeDrawer}>
            Sign in
          </Link>
          <Link href="/register" className="text-primary hover:underline" onClick={closeDrawer}>
            Sign up
          </Link>
        </>
      )}
    </>
  );

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-surface">
      <div className="max-w-4xl mx-auto px-4 flex items-center justify-between h-14 gap-2">
        <Link href="/feed" className="font-semibold text-lg text-primary shrink-0">
          Cooking Network
        </Link>

        {/* Desktop: inline links */}
        <div className="hidden md:flex items-center gap-2 sm:gap-4">{navLinks}</div>

        {/* Mobile: burger opens drawer */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
          <Burger opened={drawerOpened} onClick={openDrawer} aria-label="Open menu" size="sm" />
        </div>
      </div>

      <Drawer
        opened={drawerOpened}
        onClose={closeDrawer}
        position="right"
        title="Menu"
        size="xs"
        classNames={{
          header: "bg-surface border-b border-border",
          body: "bg-surface",
          content: "bg-surface",
        }}
      >
        <div className="flex flex-col gap-4 pt-2">
          <Link href="/feed" className={navLinkClass} onClick={closeDrawer}>
            Feed
          </Link>
          {!mounted || status === "loading" ? (
            <span className="text-muted">...</span>
          ) : session ? (
            <>
              <Link href="/post/new" className={navLinkClass} onClick={closeDrawer}>
                New Post
              </Link>
              <Link href="/groceries" className={navLinkClass} onClick={closeDrawer}>
                Groceries
              </Link>
              <Link href="/recommend" className={navLinkClass} onClick={closeDrawer}>
                What can I cook?
              </Link>
              <Link
                href={session.user?.username ? `/u/${session.user.username}` : "/u/me"}
                className={navLinkClass}
                onClick={closeDrawer}
              >
                My Blog
              </Link>
              <Link href="/profile/edit" className={navLinkClass} onClick={closeDrawer}>
                Edit profile
              </Link>
              <button
                type="button"
                className="text-error hover:text-primary text-left"
                onClick={() => {
                  closeDrawer();
                  signOut({ callbackUrl: "/feed" });
                }}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className={navLinkClass} onClick={closeDrawer}>
                Sign in
              </Link>
              <Link href="/register" className="text-primary hover:underline" onClick={closeDrawer}>
                Sign up
              </Link>
            </>
          )}
        </div>
      </Drawer>
    </nav>
  );
}
