"use client";

import Link from "next/link";

type FeedPostAuthorLinkProps = {
  href: string;
  image: string | null;
  displayName: string;
};

export function FeedPostAuthorLink({
  href,
  image,
  displayName,
}: FeedPostAuthorLinkProps) {
  const avatarChar = displayName[0];
  return (
    <Link
      href={href}
      onClick={(e) => e.stopPropagation()}
      className="flex items-center gap-2 text-sm text-muted hover:text-primary"
    >
      {image ? (
        <img src={image} alt="" className="w-6 h-6 rounded-full" />
      ) : (
        <span className="w-6 h-6 rounded-full bg-border flex items-center justify-center text-xs">
          {avatarChar}
        </span>
      )}
      {displayName}
    </Link>
  );
}
