"use client";

import Link from "next/link";
import { useEffect } from "react";
import { button, card } from "@/components/ui";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-16">
      <div className={`${card} p-6 text-center sm:p-8`}>
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          We couldn’t load this page. It’s usually a temporary hiccup, so give it another try.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => retry()} className={button("primary")}>
            Try again
          </button>
          <Link href="/" className={button("secondary")}>
            Back to the feed
          </Link>
        </div>
      </div>
    </main>
  );
}
