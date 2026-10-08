import Image from "next/image";
import Link from "next/link";
import type { VoteValue } from "@/lib/captions";
import type { FeedCaption } from "@/lib/images";
import VoteButtons from "./VoteButtons";
import { card } from "./ui";

type CaptionCardProps = {
  caption: FeedCaption;
  myVote: VoteValue;
  signedIn: boolean;
  // For the first cards on screen, so the likely LCP image isn't lazy-loaded
  eager?: boolean;
};

export const flavorChip =
  "inline-block min-w-0 max-w-full truncate rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200";

// One posted caption over its photo, meme-style. The whole top links to the photo page.
export default function CaptionCard({
  caption,
  myVote,
  signedIn,
  eager = false,
}: CaptionCardProps) {
  return (
    <article className={`${card} flex h-full flex-col overflow-hidden`}>
      <Link
        href={`/images/${caption.image.id}`}
        // Inset focus ring, since the card clips anything drawn outside it
        className="group flex flex-1 flex-col rounded-t-lg focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-emerald-600"
      >
        <p className="px-4 pt-4 pb-3 text-xl leading-snug font-extrabold tracking-tight text-pretty break-words group-hover:underline group-hover:decoration-emerald-500 group-hover:underline-offset-4">
          {caption.content}
          <span className="sr-only"> (open photo)</span>
        </p>
        <div className="relative mt-auto aspect-[4/5] w-full bg-gray-100 dark:bg-gray-900">
          <Image
            src={caption.image.url}
            alt=""
            fill
            sizes="(min-width: 896px) 416px, (min-width: 640px) 50vw, 100vw"
            loading={eager ? "eager" : "lazy"}
            className="object-contain"
          />
        </div>
      </Link>
      <footer className="flex items-center justify-between gap-3 border-t border-gray-300 px-4 py-2 dark:border-gray-700">
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
  );
}
