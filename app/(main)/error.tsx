"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="text-center py-12">
      <h2 className="text-lg font-semibold text-error">
        Something went wrong
      </h2>
      <p className="mt-2 text-muted text-sm">
        {error.message}
      </p>
      <div className="mt-4 flex gap-3 justify-center">
        <button
          onClick={reset}
          className="px-4 py-2 bg-primary hover:bg-primary-hover text-primary-foreground rounded-md"
        >
          Try again
        </button>
        <Link
          href="/feed"
          className="px-4 py-2 border border-border rounded-md hover:bg-hover"
        >
          Go to feed
        </Link>
      </div>
    </div>
  );
}
