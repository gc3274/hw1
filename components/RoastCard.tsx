import Image from "next/image";
import Link from "next/link";
import SpotlightCard from "@/components/bits/SpotlightCard";
import type { VoteValue } from "@/lib/captions";
import type { FeedRoast } from "@/lib/images";
import { topicInfo } from "@/lib/roasts";
import { RatingBadge, RoastTip } from "./RoastBits";
import PhotoMorph from "./PhotoMorph";
import { topicChip } from "./ui";
import VoteButtons from "./VoteButtons";

const SIZES = "(min-width: 1024px) 464px, (min-width: 640px) 50vw, 100vw";

// One posted roast: the critic, their score, the roast, the photo and the tip
export default function RoastCard({
  roast,
  myVote,
  signedIn,
  eager = false,
  morph = false,
}: {
  roast: FeedRoast;
  myVote: VoteValue;
  signedIn: boolean;
  eager?: boolean;
  morph?: boolean;
}) {
  const loading = eager ? "eager" : "lazy";
  const topic = topicInfo(roast.topic);
  const photo = (
    <div className="relative mt-auto aspect-[4/5] w-full overflow-hidden bg-white/5">
      <Image src={roast.image.url} alt="" fill sizes={SIZES} loading={loading} className="scale-110 object-cover opacity-40 blur-2xl" />
      <Image src={roast.image.url} alt="" fill sizes={SIZES} loading={loading} className="object-contain" />
    </div>
  );

  return (
    <SpotlightCard
      theme="dark"
      spotlightColor="#ff3ea5"
      intensity={0.14}
      proximity={0}
      className="flex h-full flex-col rounded-2xl"
    >
      <article className="flex h-full flex-col">
        <Link
          href={`/images/${roast.image.id}`}
          className="group flex flex-1 flex-col rounded-t-2xl focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-lime"
        >
          <div className="flex items-center justify-between gap-3 px-5 pt-5">
            <span className="min-w-0 truncate text-sm font-semibold">
              <span aria-hidden="true">{roast.critic.emoji}</span> {roast.critic.name}
            </span>
            <RatingBadge rating={roast.rating} />
          </div>
          <p className="px-5 pt-2 pb-3 font-display text-xl leading-snug font-bold tracking-tight text-pretty break-words transition-colors group-hover:text-lime motion-reduce:transition-none">
            {roast.content}
            <span className="sr-only"> (open post)</span>
          </p>
          <RoastTip tip={roast.tip} className="mx-5 mb-4" />
          {morph ? <PhotoMorph imageId={roast.image.id}>{photo}</PhotoMorph> : photo}
        </Link>
        <footer className="flex items-center justify-between gap-3 border-t border-line px-4 py-2">
          <span className={topicChip}>
            {topic ? `${topic.emoji} ${topic.label}` : "✨ Anything"}
          </span>
          <VoteButtons
            captionId={roast.id}
            upvotes={roast.upvotes}
            downvotes={roast.downvotes}
            myVote={myVote}
            signedIn={signedIn}
          />
        </footer>
      </article>
    </SpotlightCard>
  );
}
