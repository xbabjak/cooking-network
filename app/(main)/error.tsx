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
      <h2 className="text-lg font-semibold text-red-600 dark:text-red-400">
        Something went wrong
      </h2>
      <p className="mt-2 text-gray-600 dark:text-gray-400 text-sm">
        {error.message}
      </p>
      <div className="mt-4 flex gap-3 justify-center">
        <button
          onClick={reset}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-md"
        >
          Try again
        </button>
        <Link
          href="/feed"
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          Go to feed
        </Link>
      </div>
    </div>
  );
}
