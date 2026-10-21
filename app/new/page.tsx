import type { Metadata } from "next";
import Link from "next/link";
import PageTransition from "@/components/PageTransition";
import { button, card, focusRing } from "@/components/ui";
import { DAILY_GENERATION_LIMIT } from "@/lib/captions";
import { requireCompleteProfile } from "@/lib/dal";
import { countRecentGenerations } from "@/lib/images";
import NewPostForm from "./NewPostForm";

export const metadata: Metadata = {
  title: "Get roasted",
};

// The critics can take a while (two Gemini attempts of up to 25s). Set on the page, this also
// covers its server actions.
export const maxDuration = 60;

export default async function NewPostPage() {
  const { user } = await requireCompleteProfile();
  const used = await countRecentGenerations(user.id);
  // Null when the count failed; the form still shows and the action re-checks the limit
  const remaining = used === null ? null : Math.max(0, DAILY_GENERATION_LIMIT - used);

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
          Post something you made. A panel of critics tears it apart, scores it out of 10, and leaves
          you one real tip. Nothing is public until you post it.
        </p>

        {remaining === 0 ? (
          <section aria-labelledby="limit-heading" className={`${card} mt-8 p-4 sm:p-6`}>
            <h2 id="limit-heading" className="text-lg font-semibold">
              That’s all for today
            </h2>
            <p className="mt-1 text-sm text-muted">
              You’ve used all {DAILY_GENERATION_LIMIT} uploads for the last 24 hours. Come back
              tomorrow for more. In the meantime, go vote on everyone else’s roasts.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/" className={button("primary", "sm")}>
                See roasts
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
              {remaining !== null && (
                <p className="text-sm text-muted tabular-nums">
                  {remaining} of {DAILY_GENERATION_LIMIT} left today
                </p>
              )}
            </div>
            <NewPostForm userId={user.id} />
          </section>
        )}
      </main>
    </PageTransition>
  );
}
