import Link from "next/link";
import type { ReactNode } from "react";
import CaptionCard from "@/components/CaptionCard";
import CaptionIcon from "@/components/CaptionIcon";
import { button, card, focusRing } from "@/components/ui";
import {
  FEED_MAX,
  FEED_PAGE_SIZE,
  parseFeedLimit,
  parseFeedSort,
  type FeedSort,
} from "@/lib/captions";
import { getProfile, getUser, type Profile } from "@/lib/dal";
import { getFeed, getMyVotes } from "@/lib/images";

// Fetch fresh rows on every request instead of freezing them at build time
export const dynamic = "force-dynamic";

const TABS: { sort: FeedSort; label: string }[] = [
  { sort: "top", label: "Top this week" },
  { sort: "new", label: "New" },
];

// Top is the default, so it keeps the bare "/" URL
function feedHref(sort: FeedSort, n?: number) {
  const params = new URLSearchParams();
  if (sort !== "top") params.set("sort", sort);
  if (n) params.set("n", String(n));
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

export default async function Home({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const sort = parseFeedSort(params.sort);
  const limit = parseFeedLimit(params.n);

  const [feed, user] = await Promise.all([getFeed(sort, limit), getUser()]);
  const [votes, profile] = await Promise.all([
    getMyVotes(feed.captions.map((c) => c.id)),
    // A profile hiccup shouldn't take the public feed down with it
    user ? getProfile().catch(() => null) : null,
  ]);
  const signedIn = Boolean(user);
  const canPost = Boolean(profile?.isComplete);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:p-8">
      {(!user || profile) && <MemberCallout profile={profile} />}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Feed</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Campus and city photos with AI-written captions, ranked by your votes.
          </p>
        </div>
        <nav aria-label="Sort posts">
          <ul className="flex gap-1 rounded-lg border border-gray-300 p-1 dark:border-gray-700">
            {TABS.map((tab) => (
              <li key={tab.sort}>
                <Link
                  href={feedHref(tab.sort)}
                  aria-current={tab.sort === sort ? "page" : undefined}
                  className={`block rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors motion-reduce:transition-none hover:bg-gray-100 hover:text-foreground aria-[current=page]:bg-emerald-50 aria-[current=page]:text-emerald-800 dark:text-gray-400 dark:hover:bg-gray-900 dark:aria-[current=page]:bg-emerald-950/60 dark:aria-[current=page]:text-emerald-300 ${focusRing}`}
                >
                  {tab.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {feed.error ? (
        <p
          role="alert"
          className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
        >
          We couldn’t load the feed right now. Please refresh to try again.
        </p>
      ) : feed.captions.length === 0 ? (
        <EmptyFeed sort={sort} canPost={canPost} signedIn={signedIn} />
      ) : (
        <>
          <ul className="mt-6 grid gap-6 sm:grid-cols-2">
            {feed.captions.map((caption, i) => (
              <li key={caption.id}>
                <CaptionCard
                  caption={caption}
                  myVote={votes[caption.id] ?? 0}
                  signedIn={signedIn}
                  eager={i < 2}
                />
              </li>
            ))}
          </ul>
          {feed.hasMore && limit < FEED_MAX && (
            <div className="mt-8 flex justify-center">
              <Link
                href={feedHref(sort, limit + FEED_PAGE_SIZE)}
                scroll={false}
                className={button("secondary")}
              >
                Show more
              </Link>
            </div>
          )}
        </>
      )}
    </main>
  );
}

function EmptyFeed({
  sort,
  canPost,
  signedIn,
}: {
  sort: FeedSort;
  canPost: boolean;
  signedIn: boolean;
}) {
  const postHref = canPost ? "/new" : signedIn ? "/onboarding" : "/login";

  return (
    <div className={`${card} mt-6 border-dashed p-6 text-center`}>
      {sort === "top" ? (
        <>
          <p className="font-semibold">No posts this week yet — check New or post the first one.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Link href={feedHref("new")} className={button("secondary", "sm")}>
              See New
            </Link>
            <Link href={postHref} className={button("primary", "sm")}>
              New post
            </Link>
          </div>
        </>
      ) : (
        <>
          <p className="font-semibold">Nothing posted yet</p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Snap the Low Library steps, a subway mystery, or your dorm view and be the first.
          </p>
          <div className="mt-4 flex justify-center">
            <Link href={postHref} className={button("primary", "sm")}>
              New post
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

function MemberCallout({ profile }: { profile: Profile | null }) {
  let title: string;
  let body: string;
  let href: string;
  let cta: ReactNode;

  if (!profile) {
    title = "Sign in to vote and post your own photos";
    body = "Use your Google account to vote on captions and turn your photos into posts.";
    href = "/login";
    cta = "Sign in";
  } else if (!profile.isComplete) {
    title = "You’re almost in";
    body = "Add your name to finish setting up, then post your first photo.";
    href = "/onboarding";
    cta = "Finish setup";
  } else {
    title = "Got a photo? Turn it into a post";
    body = "Upload a campus or city photo, then post the captions you like best.";
    href = "/new";
    cta = (
      <>
        New post <span aria-hidden="true">→</span>
      </>
    );
  }

  return (
    <aside
      aria-label="Get started"
      className="mb-8 flex flex-col gap-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-emerald-900 dark:bg-emerald-950/40"
    >
      <div className="flex items-start gap-3">
        <CaptionIcon className="mt-0.5 size-6 shrink-0 text-emerald-700 dark:text-emerald-400" />
        <div className="min-w-0">
          <p className="font-semibold break-words">{title}</p>
          <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{body}</p>
        </div>
      </div>
      <Link href={href} className={button("primary", "sm")}>
        {cta}
      </Link>
    </aside>
  );
}
