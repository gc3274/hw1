import type { Metadata } from "next";
import Link from "next/link";
import { button, card, focusRing } from "@/components/ui";
import { DAILY_GENERATION_LIMIT } from "@/lib/captions";
import { requireCompleteProfile } from "@/lib/dal";
import { countRecentGenerations } from "@/lib/images";
import NewPostForm from "./NewPostForm";

export const metadata: Metadata = {
  title: "New post",
};

// Writing captions can take a while. Set on the page, this also covers its server actions.
export const maxDuration = 60;

export default async function NewPostPage() {
  const { user } = await requireCompleteProfile();
  const used = await countRecentGenerations(user.id);
  // Null when the count failed; the form still shows and the action re-checks the limit
  const remaining = used === null ? null : Math.max(0, DAILY_GENERATION_LIMIT - used);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:p-8">
      <Link
        href="/"
        className={`mb-4 inline-flex items-center gap-1 rounded text-sm text-gray-600 underline-offset-4 hover:underline dark:text-gray-400 ${focusRing}`}
      >
        <span aria-hidden="true">←</span> Back to the feed
      </Link>
      <h1 className="text-3xl font-bold">New post</h1>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        Upload a photo and get AI-written captions in four flavors. Nothing is public until you post
        it.
      </p>

      {remaining === 0 ? (
        <section aria-labelledby="limit-heading" className={`${card} mt-8 p-4 sm:p-6`}>
          <h2 id="limit-heading" className="text-lg font-semibold">
            That’s all for today
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            You’ve used all {DAILY_GENERATION_LIMIT} photo uploads for the last 24 hours. Come back
            tomorrow for more. In the meantime, go vote on what everyone else posted.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/" className={button("primary", "sm")}>
              Go to the feed
            </Link>
            <Link href="/dashboard" className={button("secondary", "sm")}>
              Your photos
            </Link>
          </div>
        </section>
      ) : (
        <section aria-labelledby="upload-heading" className={`${card} mt-8 p-4 sm:p-6`}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 id="upload-heading" className="text-lg font-semibold">
              Pick a photo
            </h2>
            {remaining !== null && (
              <p className="text-sm text-gray-600 tabular-nums dark:text-gray-400">
                {remaining} of {DAILY_GENERATION_LIMIT} left today
              </p>
            )}
          </div>
          <NewPostForm userId={user.id} />
        </section>
      )}
    </main>
  );
}
