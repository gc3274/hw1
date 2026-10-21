"use client";

import Link from "next/link";
import { useId, useOptimistic, useRef, useState, useTransition, type MouseEvent } from "react";
import { castVote } from "@/app/captions/actions";
import { applyVote, nextVote, type VoteValue } from "@/lib/captions";
import RollingNumber from "./fx/RollingNumber";
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
const arrowClass = `inline-flex size-9 cursor-pointer items-center justify-center rounded-full text-base leading-none transition-[background-color,color,scale] active:scale-90 motion-reduce:transition-none motion-reduce:active:scale-100 ${focusRing}`;
const arrowIdle = "text-muted hover:bg-white/5";

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
  // The arrow just clicked, so only a press pops, not a vote loaded with the page
  const [pressed, setPressed] = useState<1 | -1 | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const bodyId = useId();

  function onVote(clicked: 1 | -1) {
    if (!signedIn) {
      dialogRef.current?.showModal();
      return;
    }

    setPressed(clicked);
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
      <div role="group" aria-label="Vote on this roast" className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => onVote(1)}
          aria-pressed={up}
          aria-label={up ? "Remove upvote" : "Upvote"}
          className={`${arrowClass} ${
            up ? "bg-lime/15 text-lime hover:bg-lime/25" : `${arrowIdle} hover:text-lime`
          }`}
        >
          <span aria-hidden="true" key={up ? "on" : "off"} className={up && pressed === 1 ? "animate-pop motion-reduce:animate-none" : ""}>▲</span>
        </button>
        <span
          className={`min-w-8 text-center font-mono text-sm font-semibold tabular-nums ${
            up ? "text-lime" : down ? "text-rose" : "text-fg"
          }`}
        >
          <span aria-live="polite" aria-atomic="true" className="sr-only">
            Score {score}
          </span>
          <RollingNumber value={score} />
        </span>
        <button
          type="button"
          onClick={() => onVote(-1)}
          aria-pressed={down}
          aria-label={down ? "Remove downvote" : "Downvote"}
          className={`${arrowClass} ${
            down ? "bg-rose/15 text-rose hover:bg-rose/25" : `${arrowIdle} hover:text-rose`
          }`}
        >
          <span aria-hidden="true" key={down ? "on" : "off"} className={down && pressed === -1 ? "animate-pop motion-reduce:animate-none" : ""}>▼</span>
        </button>
      </div>

      {error && (
        <p role="alert" className="max-w-56 text-right text-xs text-rose">
          {error}
        </p>
      )}

      {!signedIn && (
        <dialog
          ref={dialogRef}
          aria-labelledby={titleId}
          aria-describedby={bodyId}
          onClick={onDialogClick}
          className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-line bg-ink p-0 text-fg shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
        >
          <div className="p-6">
            <h2 id={titleId} className="text-lg font-semibold">
              Log in to vote
            </h2>
            <p id={bodyId} className="mt-2 text-sm text-muted">
              Sign in with Google to vote on which roasts land.
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
