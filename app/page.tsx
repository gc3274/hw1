import Link from "next/link";
import AnimatedContent from "@/components/bits/AnimatedContent";
import GooeyNav from "@/components/bits/GooeyNav";
import JoinBar from "@/components/JoinBar";
import PageTransition from "@/components/PageTransition";
import RoastCard from "@/components/RoastCard";
import { button, card, errorBox, focusRing } from "@/components/ui";
import WelcomeBand from "@/components/WelcomeBand";
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
import { postHref } from "@/lib/nav";
import { feedHref, parseTopic, TOPICS, type Topic } from "@/lib/roasts";

// Fetch fresh rows on every request instead of freezing them at build time
export const dynamic = "force-dynamic";

const TABS: { sort: FeedSort; label: string }[] = [
  { sort: "top", label: "Top this week" },
  { sort: "new", label: "New" },
];
const JOIN_BAR_AFTER = 6;

const chip = `inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors motion-reduce:transition-none ${focusRing}`;
const chipState = (active: boolean) =>
  active ? "border-lime bg-lime text-ink" : "border-line bg-white/5 text-fg/80 hover:text-fg";

export default async function Home({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const sort = parseFeedSort(params.sort);
  const topic = parseTopic(params.topic);
  const limit = parseFeedLimit(params.n);

  const [feed, user] = await Promise.all([getRoastFeed(sort, limit, topic), getUser()]);
  const [votes, profile] = await Promise.all([
    getMyVotes(feed.roasts.map((r) => r.id)),
    // A profile hiccup shouldn't take the public feed down with it
    user ? getProfile().catch(() => null) : null,
  ]);
  const signedIn = Boolean(user);
  const canPost = Boolean(profile?.isComplete);
  // Signed-in with a failed profile load gets no banner, so the feed keeps the h1
  const banner = !user ? <WelcomeBand profile={null} /> : profile ? <WelcomeBand profile={profile} /> : null;
  const FeedHeading = banner ? "h2" : "h1";
  const morphFlags = firstOfEachImage(feed.roasts);

  return (
    <PageTransition>
      <main className="flex-1">
        {banner}
        <section
          id="feed"
          aria-labelledby="feed-heading"
          className="mx-auto w-full max-w-5xl scroll-mt-20 px-4 py-10 sm:px-8"
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              {/* Focusable from script only: the join bar hands focus here when it closes */}
              <FeedHeading
                id="feed-heading"
                tabIndex={-1}
                className="font-display text-3xl font-bold tracking-tight focus:outline-none"
              >
                Roasts
              </FeedHeading>
              <p className="mt-1 text-sm text-muted">
                Meals, art, rooms and fits from Columbia and Barnard, roasted by AI critics and
                ranked by your votes.
              </p>
            </div>
            <GooeyNav
              label="Sort roasts"
              scroll={false}
              items={TABS.map((tab) => ({ label: tab.label, href: feedHref(tab.sort, topic) }))}
              activeIndex={TABS.findIndex((tab) => tab.sort === sort)}
              className="rounded-full border border-line bg-surface p-1"
            />
          </div>

          <nav aria-label="Filter by topic" className="mt-5 flex flex-wrap gap-2">
            <Link
              href={feedHref(sort, null)}
              aria-current={topic === null ? "page" : undefined}
              className={`${chip} ${chipState(topic === null)}`}
            >
              All
            </Link>
            {TOPICS.map((t) => (
              <Link
                key={t.slug}
                href={feedHref(sort, t.slug)}
                aria-current={topic === t.slug ? "page" : undefined}
                className={`${chip} ${chipState(topic === t.slug)}`}
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
            <EmptyFeed sort={sort} topic={topic} postTo={postHref(signedIn, canPost)} />
          ) : (
            <>
              <ul className="mt-8 grid gap-6 sm:grid-cols-2">
                {feed.roasts.map((roast, i) => (
                  <li key={roast.id} id={`feed-item-${i}`}>
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
                  <Link
                    href={feedHref(sort, topic, limit + FEED_PAGE_SIZE)}
                    scroll={false}
                    className={button("secondary")}
                  >
                    Show more
                  </Link>
                </div>
              )}
              {!user && (
                <JoinBar targetId={`feed-item-${Math.min(JOIN_BAR_AFTER, feed.roasts.length) - 1}`} />
              )}
            </>
          )}
        </section>
      </main>
    </PageTransition>
  );
}

function EmptyFeed({ sort, topic, postTo }: { sort: FeedSort; topic: Topic | null; postTo: ReturnType<typeof postHref> }) {
  return (
    <div className={`${card} mt-6 border-dashed p-6 text-center`}>
      {sort === "top" ? (
        <>
          <p className="font-semibold">No roasts this week yet.</p>
          <p className="mt-1 text-sm text-muted">Check New, or give the critics something to chew on.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Link href={feedHref("new", topic)} className={button("secondary", "sm")}>
              See New
            </Link>
            <Link href={postTo} className={button("primary", "sm")}>
              Get roasted
            </Link>
          </div>
        </>
      ) : (
        <>
          <p className="font-semibold">Nothing roasted yet.</p>
          <p className="mt-1 text-sm text-muted">Cook something, draw something, and be the first.</p>
          <div className="mt-4 flex justify-center">
            <Link href={postTo} className={button("primary", "sm")}>
              Get roasted
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
