"use client";

import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition, type MouseEvent, type ReactNode } from "react";
import { saveCaptionChoices } from "@/app/captions/actions";
import { RatingBadge, RoastTip } from "@/components/RoastBits";
import Spinner from "@/components/Spinner";
import VoteButtons from "@/components/VoteButtons";
import { button, card, focusRing } from "@/components/ui";
import { diffCaptionChoices, doneButtonLabel, doneHref, type VoteValue } from "@/lib/captions";
import type { ImageCaption } from "@/lib/images";
import type { CriticGroup } from "@/lib/roasts";

const SAVE_FAILED = "Couldn’t save your choices. Please try again.";

// The back link and Discard both leave for the same place
const BACK_HREF = "/";

// The owner's view of a photo: every roast starts private, switches are
// local until Done saves them all at once.
export default function CaptionReview({
  imageId,
  photo,
  groups,
  votes,
  signedIn,
  panel = null,
}: {
  imageId: string;
  photo: ReactNode;
  groups: CriticGroup<ImageCaption>[];
  votes: Record<string, VoteValue>;
  signedIn: boolean;
  panel?: ReactNode;
}) {
  const captions = groups.flatMap((g) => g.roasts);
  const saved = Object.fromEntries(captions.map((c) => [c.id, c.isPublic]));
  const [staged, setStaged] = useState<Record<string, boolean>>(saved);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dialogTitleId = useId();

  const diff = diffCaptionChoices(saved, staged);
  const changed = diff.toPost.length + diff.toHide.length;
  const dirty = changed > 0;
  const isStagedPublic = (c: ImageCaption) => staged[c.id] ?? c.isPublic;
  const postedCount = captions.filter(isStagedPublic).length;

  // Reloading or closing the tab with unsaved switches asks first
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Older browsers only ask when returnValue is set
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  function setChoice(id: string, isPublic: boolean) {
    setError(null);
    setStaged((prev) => ({ ...prev, [id]: isPublic }));
  }

  function onSave() {
    setError(null);
    startTransition(async () => {
      try {
        // Redirects on success; only failures come back
        const result = await saveCaptionChoices(imageId, diff.toPost, diff.toHide);
        startTransition(() => setError(result.error));
      } catch (err) {
        unstable_rethrow(err);
        startTransition(() => setError(SAVE_FAILED));
      }
    });
  }

  function onBack(event: MouseEvent<HTMLAnchorElement>) {
    if (!dirty) return;
    event.preventDefault();
    dialogRef.current?.showModal();
  }

  // A click on the dialog element itself (not its contents) is a click on the backdrop
  function onDialogClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) event.currentTarget.close();
  }

  return (
    <>
      <Link
        href={BACK_HREF}
        onClick={onBack}
        className={`mb-6 inline-flex items-center gap-1 rounded text-sm text-muted underline-offset-4 hover:text-fg hover:underline ${focusRing}`}
      >
        <span aria-hidden="true">←</span> Back to roasts
      </Link>

      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-start">
        <div className="md:sticky md:top-24">{photo}</div>

        <div className="min-w-0">
          <h1 className="font-display text-3xl font-bold tracking-tight">Your roasts</h1>
          {panel}
          <p className="mt-2 text-sm text-muted">
            Everything starts private. Switch the roasts you can handle to Post, then save with the
            button at the bottom.
          </p>

          {groups.length === 0 ? (
            <p className={`${card} mt-6 border-dashed p-4 text-sm text-muted`}>No roasts here yet.</p>
          ) : (
            <div className="mt-8 space-y-8">
              {groups.map((group) => (
                <section key={group.id} aria-labelledby={`critic-${group.id}`}>
                  <h2
                    id={`critic-${group.id}`}
                    className="text-xs font-semibold tracking-[0.18em] text-muted uppercase"
                  >
                    {group.name || "Critic"}
                  </h2>
                  <ul className="mt-3 space-y-3">
                    {group.roasts.map((roast) => (
                      <CaptionRow
                        key={roast.id}
                        caption={roast}
                        isPublic={isStagedPublic(roast)}
                        disabled={pending}
                        onChange={(next) => setChoice(roast.id, next)}
                        myVote={votes[roast.id] ?? 0}
                        signedIn={signedIn}
                      />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}

          {groups.length > 0 && (
            // Edge to edge on phones (-mx-4 cancels the page padding); at the end of the list it
            // settles in place, so the footer below stays reachable
            <div className="sticky bottom-0 z-30 -mx-4 mt-8 border-t border-line bg-ink/85 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:bottom-4 sm:mx-0 sm:rounded-2xl sm:border sm:pb-3">
              <div className="flex items-center justify-between gap-4">
                <p className="min-w-0 text-sm text-muted" aria-live="polite">
                  <span className="font-mono font-semibold text-fg tabular-nums">{postedCount}</span>{" "}
                  {dirty ? "will be posted" : "posted"}
                  {dirty && (
                    <span className="ml-2 rounded-full bg-amber-300/15 px-2 py-0.5 text-xs font-medium text-amber-300">
                      Unsaved
                    </span>
                  )}
                </p>
                {dirty ? (
                  <button type="button" onClick={onSave} disabled={pending} className={button("primary", "sm")}>
                    {pending && <Spinner />}
                    {pending ? "Saving…" : doneButtonLabel(diff)}
                  </button>
                ) : (
                  <Link href={doneHref(postedCount > 0)} className={button("primary", "sm")}>
                    Done
                  </Link>
                )}
              </div>
              {/* Only while there's something left to save */}
              {dirty && error && (
                <p role="alert" className="mt-2 text-sm text-rose">
                  {error}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <dialog
        ref={dialogRef}
        aria-labelledby={dialogTitleId}
        onClick={onDialogClick}
        className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-line bg-ink p-0 text-fg shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
      >
        <div className="p-6">
          <h2 id={dialogTitleId} className="text-lg font-semibold">
            Discard your choices?
          </h2>
          <p className="mt-2 text-sm text-muted">
            You switched {changed} {changed === 1 ? "roast" : "roasts"} but haven’t saved. Leaving now
            keeps everything as it was.
          </p>
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <form method="dialog">
              <button type="submit" className={button("primary", "sm")}>
                Keep editing
              </button>
            </form>
            <Link href={BACK_HREF} className={`${button("ghost", "sm")} text-rose hover:text-rose`}>
              Discard
            </Link>
          </div>
        </div>
      </dialog>
    </>
  );
}

function CaptionRow({
  caption,
  isPublic,
  disabled,
  onChange,
  myVote,
  signedIn,
}: {
  caption: ImageCaption;
  isPublic: boolean;
  disabled: boolean;
  onChange: (isPublic: boolean) => void;
  myVote: VoteValue;
  signedIn: boolean;
}) {
  const textId = useId();
  const changed = isPublic !== caption.isPublic;

  return (
    <li
      data-posting={isPublic}
      className={`${card} p-4 transition-[border-color,box-shadow] duration-300 motion-reduce:transition-none sm:p-5 data-[posting=true]:border-lime/60 data-[posting=true]:shadow-[0_0_0_1px_rgb(196_255_61/0.3),0_0_28px_-6px_rgb(196_255_61/0.45)]`}
    >
      <div className="flex items-start justify-between gap-3">
        <p id={textId} className="font-display text-lg leading-snug font-bold text-pretty break-words">
          {caption.content}
        </p>
        <RatingBadge rating={caption.rating} />
      </div>
      <RoastTip tip={caption.tip} className="mt-3" />
      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <VisibilitySwitch isPublic={isPublic} disabled={disabled} captionId={textId} onChange={onChange} />
          {changed && <span className="text-xs font-medium text-amber-300">Unsaved</span>}
        </div>
        {/* Votes only exist for captions that are saved as public */}
        {caption.isPublic && (
          <VoteButtons
            captionId={caption.id}
            upvotes={caption.upvotes}
            downvotes={caption.downvotes}
            myVote={myVote}
            signedIn={signedIn}
          />
        )}
      </div>
    </li>
  );
}

const OPTIONS = [
  { value: false, label: "Private", icon: <LockIcon />, checked: "peer-checked:bg-white/10 peer-checked:text-fg" },
  { value: true, label: "Post", icon: <CheckIcon />, checked: "peer-checked:bg-lime peer-checked:text-ink" },
] as const;

// Native radios, so arrow keys and screen readers work without extra code
function VisibilitySwitch({
  isPublic,
  disabled,
  captionId,
  onChange,
}: {
  isPublic: boolean;
  disabled: boolean;
  captionId: string;
  onChange: (isPublic: boolean) => void;
}) {
  const name = useId();
  const legendId = useId();

  return (
    <fieldset
      disabled={disabled}
      aria-labelledby={`${legendId} ${captionId}`}
      className="inline-flex rounded-full border border-line bg-ink/60 p-1 disabled:opacity-60"
    >
      <legend id={legendId} className="sr-only">
        Who can see this roast
      </legend>
      {OPTIONS.map((option) => (
        <label key={option.label} className="relative">
          <input
            type="radio"
            name={name}
            checked={isPublic === option.value}
            onChange={() => onChange(option.value)}
            className="peer sr-only"
          />
          <span
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-muted transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-lime motion-reduce:transition-none ${option.checked}`}
          >
            {option.icon}
            {option.label}
          </span>
        </label>
      ))}
    </fieldset>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className="size-3.5">
      <path d="M8 1a3.5 3.5 0 0 0-3.5 3.5V6H4a1.5 1.5 0 0 0-1.5 1.5v6A1.5 1.5 0 0 0 4 15h8a1.5 1.5 0 0 0 1.5-1.5v-6A1.5 1.5 0 0 0 12 6h-.5V4.5A3.5 3.5 0 0 0 8 1Zm2 5V4.5a2 2 0 1 0-4 0V6h4Z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className="size-3.5">
      <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
    </svg>
  );
}
