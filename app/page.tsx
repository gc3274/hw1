import Link from "next/link";
import AnimatedContent from "@/components/bits/AnimatedContent";
import GooeyNav from "@/components/bits/GooeyNav";
import CaptionCard from "@/components/CaptionCard";
import JoinBar from "@/components/JoinBar";
import PageTransition from "@/components/PageTransition";
import { button, card, errorBox } from "@/components/ui";
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
import { getFeed, getMyVotes } from "@/lib/images";

// Fetch fresh rows on every request instead of freezing them at build time
export const dynamic = "force-dynamic";

const TABS: { sort: FeedSort; label: string }[] = [
  { sort: "top", label: "Top this week" },
  { sort: "new", label: "New" },
];
const JOIN_BAR_AFTER = 6;

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
  // Signed-in with a failed profile load gets no banner, so the feed keeps the h1
  const banner = !user ? <WelcomeBand profile={null} /> : profile ? <WelcomeBand profile={profile} /> : null;
  const FeedHeading = banner ? "h2" : "h1";
  const morphFlags = firstOfEachImage(feed.captions);

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
              <FeedHeading id="feed-heading" className="font-display text-3xl font-bold tracking-tight">
                Feed
              </FeedHeading>
              <p className="mt-1 text-sm text-muted">
                Campus and city photos with AI-written captions, ranked by your votes.
              </p>
            </div>
            <GooeyNav
              label="Sort posts"
              scroll={false}
              items={TABS.map((tab) => ({ label: tab.label, href: feedHref(tab.sort) }))}
              activeIndex={TABS.findIndex((tab) => tab.sort === sort)}
              className="rounded-full border border-line bg-surface p-1"
            />
          </div>

          {feed.error ? (
            <p role="alert" className={`${errorBox} mt-6`}>
              We couldn’t load the feed right now. Please refresh to try again.
            </p>
          ) : feed.captions.length === 0 ? (
            <EmptyFeed sort={sort} canPost={canPost} signedIn={signedIn} />
          ) : (
            <>
              <ul className="mt-8 grid gap-6 sm:grid-cols-2">
                {feed.captions.map((caption, i) => (
                  <li key={caption.id} id={`feed-item-${i}`}>
                    <AnimatedContent delay={(i % 2) * 0.08} className="h-full">
                      <CaptionCard
                        caption={caption}
                        myVote={votes[caption.id] ?? 0}
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
                    href={feedHref(sort, limit + FEED_PAGE_SIZE)}
                    scroll={false}
                    className={button("secondary")}
                  >
                    Show more
                  </Link>
                </div>
              )}
              {!user && (
                <JoinBar targetId={`feed-item-${Math.min(JOIN_BAR_AFTER, feed.captions.length) - 1}`} />
              )}
            </>
          )}
        </section>
      </main>
    </PageTransition>
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
          <p className="mt-1 text-sm text-muted">
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
