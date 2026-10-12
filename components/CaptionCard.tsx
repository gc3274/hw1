import Image from "next/image";
import Link from "next/link";
import SpotlightCard from "@/components/bits/SpotlightCard";
import type { VoteValue } from "@/lib/captions";
import type { FeedCaption } from "@/lib/images";
import PhotoMorph from "./PhotoMorph";
import VoteButtons from "./VoteButtons";

type CaptionCardProps = {
  caption: FeedCaption;
  myVote: VoteValue;
  signedIn: boolean;
  // For the first cards on screen, so the likely LCP image isn't lazy-loaded
  eager?: boolean;
  // Only the first card for each photo may carry the shared transition name
  morph?: boolean;
};

const SIZES = "(min-width: 1024px) 464px, (min-width: 640px) 50vw, 100vw";

export const flavorChip =
  "inline-block min-w-0 max-w-full truncate rounded-full border border-line bg-white/5 px-2.5 py-0.5 text-xs font-medium text-fg/80";

// One posted caption over its photo, meme-style. The whole top links to the photo page.
export default function CaptionCard({ caption, myVote, signedIn, eager = false, morph = false }: CaptionCardProps) {
  const loading = eager ? "eager" : "lazy";
  const photo = (
    <div className="relative mt-auto aspect-[4/5] w-full overflow-hidden bg-white/5">
      {/* Blurred copy fills the letterbox around photos that aren't 4:5; same URL, no extra download */}
      <Image src={caption.image.url} alt="" fill sizes={SIZES} loading={loading} className="scale-110 object-cover opacity-40 blur-2xl" />
      <Image src={caption.image.url} alt="" fill sizes={SIZES} loading={loading} className="object-contain" />
    </div>
  );

  return (
    <SpotlightCard
      theme="dark"
      spotlightColor="#c4ff3d"
      intensity={0.14}
      className="flex h-full flex-col rounded-2xl"
    >
      <article className="flex h-full flex-col">
        <Link
          href={`/images/${caption.image.id}`}
          // Inset focus ring, since the card clips anything drawn outside it
          className="group flex flex-1 flex-col rounded-t-2xl focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-lime"
        >
          <p className="px-5 pt-5 pb-4 font-display text-xl leading-snug font-bold tracking-tight text-pretty break-words transition-colors group-hover:text-lime motion-reduce:transition-none">
            {caption.content}
            <span className="sr-only"> (open photo)</span>
          </p>
          {morph ? <PhotoMorph imageId={caption.image.id}>{photo}</PhotoMorph> : photo}
        </Link>
        <footer className="flex items-center justify-between gap-3 border-t border-line px-4 py-2">
          <span className={flavorChip}>{caption.flavor.name}</span>
          <VoteButtons
            captionId={caption.id}
            upvotes={caption.upvotes}
            downvotes={caption.downvotes}
            myVote={myVote}
            signedIn={signedIn}
          />
        </footer>
      </article>
    </SpotlightCard>
  );
}
