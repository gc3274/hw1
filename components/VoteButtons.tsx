"use client";

import Link from "next/link";
import { useId, useOptimistic, useRef, useState, useTransition, type MouseEvent } from "react";
import { castVote } from "@/app/captions/actions";
import { applyVote, nextVote, type VoteValue } from "@/lib/captions";
import { button, focusRing } from "./ui";

type VoteButtonsProps = {
  captionId: string;
  upvotes: number;
  downvotes: number;
  myVote: VoteValue;
  signedIn: boolean;
};

type VoteState = { myVote: VoteValue; upvotes: number; downvotes: number };

// Colors live only in the per-state strings below so no two classes fight over a property
const arrowClass = `inline-flex size-9 cursor-pointer items-center justify-center rounded-md text-base leading-none transition-colors motion-reduce:transition-none ${focusRing}`;
const arrowIdle = "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-900";

export default function VoteButtons({
  captionId,
  upvotes,
  downvotes,
  myVote,
  signedIn,
}: VoteButtonsProps) {
  // Shows the click right away; falls back to the server's numbers when the
  // transition ends, which also rolls back a vote that failed to save.
  const [vote, setVote] = useOptimistic<VoteState>({ myVote, upvotes, downvotes });
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const bodyId = useId();

  function onVote(clicked: 1 | -1) {
    if (!signedIn) {
      dialogRef.current?.showModal();
      return;
    }

    setError(null);
    startTransition(async () => {
      // Read the optimistic value so quick repeat clicks build on each other
      const next = nextVote(vote.myVote, clicked);
      setVote({ myVote: next, ...applyVote(vote, vote.myVote, next) });

      // A rejected call (network drop, stale deploy) rolls back inline too
      const result = await castVote(captionId, next).catch(() => ({
        ok: false as const,
        error: "Couldn't save your vote. Please try again.",
      }));
      if (!result.ok) startTransition(() => setError(result.error));
    });
  }

  // A click on the dialog element itself (not its contents) is a click on the backdrop
  function onDialogClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) event.currentTarget.close();
  }

  const score = vote.upvotes - vote.downvotes;
  const up = vote.myVote === 1;
  const down = vote.myVote === -1;

  return (
    <div className="flex flex-col items-end gap-1">
      <div role="group" aria-label="Vote on this caption" className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => onVote(1)}
          aria-pressed={up}
          aria-label={up ? "Remove upvote" : "Upvote"}
          className={`${arrowClass} ${
            up
              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/60 dark:text-emerald-300 dark:hover:bg-emerald-900"
              : `${arrowIdle} hover:text-emerald-700 dark:hover:text-emerald-400`
          }`}
        >
          <span aria-hidden="true">▲</span>
        </button>
        <span
          aria-live="polite"
          aria-atomic="true"
          className={`min-w-8 text-center text-sm font-semibold tabular-nums ${
            up
              ? "text-emerald-700 dark:text-emerald-400"
              : down
                ? "text-rose-700 dark:text-rose-400"
                : ""
          }`}
        >
          <span className="sr-only">Score </span>
          {score}
        </span>
        <button
          type="button"
          onClick={() => onVote(-1)}
          aria-pressed={down}
          aria-label={down ? "Remove downvote" : "Downvote"}
          className={`${arrowClass} ${
            down
              ? "bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:hover:bg-rose-950"
              : `${arrowIdle} hover:text-rose-700 dark:hover:text-rose-400`
          }`}
        >
          <span aria-hidden="true">▼</span>
        </button>
      </div>

      {error && (
        <p role="alert" className="max-w-56 text-right text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {!signedIn && (
        <dialog
          ref={dialogRef}
          aria-labelledby={titleId}
          aria-describedby={bodyId}
          onClick={onDialogClick}
          className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-lg border border-gray-300 bg-background p-0 text-foreground shadow-xl backdrop:bg-black/50 dark:border-gray-700"
        >
          <div className="p-6">
            <h2 id={titleId} className="text-lg font-semibold">
              Log in to vote
            </h2>
            <p id={bodyId} className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Sign in with your Google account to vote on captions.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              {/* method="dialog" closes the dialog natively, no script needed */}
              <form method="dialog">
                <button type="submit" className={button("secondary", "sm")}>
                  Cancel
                </button>
              </form>
              <Link href="/login" className={button("primary", "sm")}>
                Log in
              </Link>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}
