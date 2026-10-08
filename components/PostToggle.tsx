"use client";

import { useOptimistic, useState, useTransition } from "react";
import { setCaptionPosted } from "@/app/captions/actions";
import Spinner from "./Spinner";
import { button } from "./ui";

type PostToggleProps = {
  captionId: string;
  isPublic: boolean;
};

export default function PostToggle({ captionId, isPublic }: PostToggleProps) {
  // Where the caption is headed while the save runs; settles back to the server's value after
  const [posted, setPosted] = useOptimistic(isPublic);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    const next = !posted;
    setError(null);
    startTransition(async () => {
      setPosted(next);
      // A rejected call (network drop, stale deploy) rolls back inline too
      const result = await setCaptionPosted(captionId, next).catch(() => ({
        ok: false as const,
        error: "Couldn't update this caption. Please try again.",
      }));
      if (!result.ok) startTransition(() => setError(result.error));
    });
  }

  let label = posted ? "Unpost" : "Post";
  if (pending) label = posted ? "Posting…" : "Unposting…";

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className={button(posted ? "secondary" : "primary", "sm")}
      >
        {pending && <Spinner />}
        {label}
      </button>
      {error && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
