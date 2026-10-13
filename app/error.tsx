"use client";

import Link from "next/link";
import { useEffect } from "react";
import ErrorHeading from "@/components/fx/ErrorHeading";
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
        <ErrorHeading text="Something broke" />
        <p className="mt-4 text-sm text-muted">
          Not your fault. Probably the Wi-Fi in Butler. Give it another try.
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
