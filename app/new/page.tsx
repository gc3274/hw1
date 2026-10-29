import type { Metadata } from "next";
import Link from "next/link";
import PageTransition from "@/components/PageTransition";
import { button, card, focusRing } from "@/components/ui";
import { requireCompleteProfile } from "@/lib/dal";
import { postingStatus } from "@/lib/generation";
import { limitMessage } from "@/lib/limits";
import NewPostForm from "./NewPostForm";

export const metadata: Metadata = {
  title: "Get roasted",
};

// The critics can take a while (up to RUN_BUDGET_MS of model calls, see lib/chains.ts). Set on
// the page, this also covers its server actions.
export const maxDuration = 60;

export default async function NewPostPage() {
  const { user } = await requireCompleteProfile();
  // Null parts when a read failed; the form still shows and the action checks again
  const { limits, remaining, check, now } = await postingStatus(user.id);
  // The budget and the daily limit hide the form; a wait between posts only gets a note
  const stopped = check && !check.ok && check.reason !== "wait" ? check : null;
  const waiting = check && !check.ok && check.reason === "wait" ? check : null;

  return (
    <PageTransition>
      <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:p-8">
        <Link
          href="/"
          className={`mb-4 inline-flex items-center gap-1 rounded text-sm text-muted underline-offset-4 hover:underline ${focusRing}`}
        >
          <span aria-hidden="true">←</span> Back to roasts
        </Link>
        <h1 className="font-display text-3xl font-bold tracking-tight">Get roasted</h1>
        <p className="mt-1 text-sm text-muted">
          Post something you made. A panel of AI critics roasts it, scores it out of 10 and leaves
          you one real tip. Nothing is public until you post it.
        </p>

        {stopped && limits ? (
          <section aria-labelledby="limit-heading" className={`${card} mt-8 p-4 sm:p-6`}>
            <h2 id="limit-heading" className="text-lg font-semibold">
              {stopped.reason === "budget" ? "The critics are off the clock" : "That’s all for today"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {limitMessage(stopped, limits, now)} Go vote on everyone else’s in the meantime.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/" className={button("primary", "sm")}>
                See the roasts
              </Link>
              <Link href="/dashboard" className={button("secondary", "sm")}>
                Your posts
              </Link>
            </div>
          </section>
        ) : (
          <section aria-labelledby="upload-heading" className={`${card} mt-8 p-4 sm:p-6`}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 id="upload-heading" className="text-lg font-semibold">
                Pick a topic and a photo
              </h2>
              {remaining !== null && limits && (
                <p className="text-sm text-muted tabular-nums">
                  {remaining} of {limits.postsPerDay} posts left today
                </p>
              )}
            </div>
            {waiting && limits && (
              <p role="status" className="mt-2 text-sm text-muted">
                {limitMessage(waiting, limits, now)}
              </p>
            )}
            <NewPostForm userId={user.id} />
          </section>
        )}
      </main>
    </PageTransition>
  );
}
