import type { Metadata } from "next";
import Link from "next/link";
import AnimatedContent from "@/components/bits/AnimatedContent";
import GooeyNav from "@/components/bits/GooeyNav";
import PageTransition from "@/components/PageTransition";
import RoastCard from "@/components/RoastCard";
import { button, card, errorBox, focusRing } from "@/components/ui";
import {
  FEED_MAX,
  FEED_PAGE_SIZE,
  firstOfEachImage,
  parseFeedLimit,
  parseFeedSort,
  type FeedSort,
} from "@/lib/captions";
import { getProfile, getUser } from "@/lib/dal";
import { getMyVotes, getRoastFeed } from "@/lib/images";
import { parseTopic, TOPICS, type Topic } from "@/lib/roasts";

export const metadata: Metadata = {
  title: "Deconstructive Criticism",
  description: "Post what you made. AI critics roast it, score it and leave one real tip.",
};

export const dynamic = "force-dynamic";

const TABS: { sort: FeedSort; label: string }[] = [
  { sort: "top", label: "Top this week" },
  { sort: "new", label: "New" },
];

function roastHref(sort: FeedSort, topic: Topic | null, n?: number) {
  const params = new URLSearchParams();
  if (sort !== "top") params.set("sort", sort);
  if (topic) params.set("topic", topic);
  if (n) params.set("n", String(n));
  const query = params.toString();
  return query ? `/roast?${query}` : "/roast";
}

const chip = `inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors motion-reduce:transition-none ${focusRing}`;

export default async function RoastPage({ searchParams }: PageProps<"/roast">) {
  const params = await searchParams;
  const sort = parseFeedSort(params.sort);
  const topic = parseTopic(params.topic);
  const limit = parseFeedLimit(params.n);

  const [feed, user] = await Promise.all([getRoastFeed(sort, limit, topic), getUser()]);
  const [votes, profile] = await Promise.all([
    getMyVotes(feed.roasts.map((r) => r.id)),
    user ? getProfile().catch(() => null) : null,
  ]);
  const signedIn = Boolean(user);
  const postHref = profile?.isComplete ? "/roast/new" : signedIn ? "/onboarding" : "/login";
  const morphFlags = firstOfEachImage(feed.roasts);

  return (
    <PageTransition>
      <main className="flex-1">
        <section className="mx-auto w-full max-w-5xl px-4 pt-10 sm:px-8">
          <p className="font-mono text-xs tracking-[0.2em] text-lime uppercase">New · Roast mode</p>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-tight sm:text-5xl">
            Deconstructive Criticism
          </h1>
          <p className="mt-3 max-w-2xl text-fg/80">
            Post something you made: a meal, a drawing, your room, your fit. A panel of AI critics
            roasts it in character, scores it out of 10, and leaves you one real tip. Vote on the
            roasts that land.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={postHref} className={button("primary")}>
              🔥 Get roasted
            </Link>
          </div>
        </section>

        <section aria-labelledby="roast-feed-heading" className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 id="roast-feed-heading" className="font-display text-3xl font-bold tracking-tight">
              Roasts
            </h2>
            <GooeyNav
              label="Sort roasts"
              scroll={false}
              items={TABS.map((tab) => ({ label: tab.label, href: roastHref(tab.sort, topic) }))}
              activeIndex={TABS.findIndex((tab) => tab.sort === sort)}
              className="rounded-full border border-line bg-surface p-1"
            />
          </div>

          <nav aria-label="Filter by topic" className="mt-5 flex flex-wrap gap-2">
            <Link
              href={roastHref(sort, null)}
              aria-current={topic === null ? "page" : undefined}
              className={`${chip} ${topic === null ? "border-lime bg-lime text-ink" : "border-line bg-white/5 text-fg/80 hover:text-fg"}`}
            >
              All
            </Link>
            {TOPICS.map((t) => (
              <Link
                key={t.slug}
                href={roastHref(sort, t.slug)}
                aria-current={topic === t.slug ? "page" : undefined}
                className={`${chip} ${topic === t.slug ? "border-lime bg-lime text-ink" : "border-line bg-white/5 text-fg/80 hover:text-fg"}`}
              >
                <span aria-hidden="true">{t.emoji}</span>
                {t.label}
              </Link>
            ))}
          </nav>

          {feed.error ? (
            <p role="alert" className={`${errorBox} mt-6`}>
              We couldn’t load the roasts right now. Please refresh to try again.
            </p>
          ) : feed.roasts.length === 0 ? (
            <div className={`${card} mt-6 border-dashed p-6 text-center`}>
              <p className="font-semibold">
                {sort === "top" ? "No roasts this week yet." : "Nothing roasted yet."}
              </p>
              <p className="mt-1 text-sm text-muted">Cook something, draw something, and be the first.</p>
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                {sort === "top" && (
                  <Link href={roastHref("new", topic)} className={button("secondary", "sm")}>
                    See New
                  </Link>
                )}
                <Link href={postHref} className={button("primary", "sm")}>
                  Get roasted
                </Link>
              </div>
            </div>
          ) : (
            <>
              <ul className="mt-8 grid gap-6 sm:grid-cols-2">
                {feed.roasts.map((roast, i) => (
                  <li key={roast.id}>
                    <AnimatedContent delay={(i % 2) * 0.08} className="h-full">
                      <RoastCard
                        roast={roast}
                        myVote={votes[roast.id] ?? 0}
                        signedIn={signedIn}
                        eager={i < 2}
                        morph={morphFlags[i]}
                      />
                    </AnimatedContent>
                  </li>
                ))}
              </ul>
              {feed.hasMore && limit < FEED_MAX && (
                <div className="mt-8 flex justify-center">
                  <Link href={roastHref(sort, topic, limit + FEED_PAGE_SIZE)} scroll={false} className={button("secondary")}>
                    Show more
                  </Link>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </PageTransition>
  );
}
