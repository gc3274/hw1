import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import PageTransition from "@/components/PageTransition";
import PhotoMorph from "@/components/PhotoMorph";
import { RatingBadge, RoastTip } from "@/components/RoastBits";
import VoteButtons from "@/components/VoteButtons";
import { card, focusRing } from "@/components/ui";
import type { VoteValue } from "@/lib/captions";
import { getUser } from "@/lib/dal";
import { getImage, getMyVotes, type ImageCaption } from "@/lib/images";
import { panelScore, RATING_MAX } from "@/lib/roasts";
import CaptionReview from "./CaptionReview";

const TITLE_MAX = 60;

// Cut on code points so an emoji is never split in half
function truncate(text: string, max: number) {
  const chars = Array.from(text);
  if (chars.length <= max) return text;
  return `${chars
    .slice(0, max - 1)
    .join("")
    .trimEnd()}…`;
}

function topPublicCaption(captions: ImageCaption[]) {
  return captions
    .filter((c) => c.isPublic)
    .reduce<ImageCaption | null>((best, c) => (!best || c.score > best.score ? c : best), null);
}

// Captions arrive sorted by flavor, so consecutive runs make the groups
function groupByFlavor(captions: ImageCaption[]) {
  const groups: { id: number; name: string; captions: ImageCaption[] }[] = [];
  for (const caption of captions) {
    const last = groups[groups.length - 1];
    if (last && last.id === caption.flavorId) last.captions.push(caption);
    else
      groups.push({
        id: caption.flavorId,
        name: caption.critic ? `${caption.critic.emoji} ${caption.critic.name}` : caption.flavorName,
        captions: [caption],
      });
  }
  return groups;
}

export async function generateMetadata({ params }: PageProps<"/images/[id]">): Promise<Metadata> {
  const { id } = await params;
  // Cached, so the page below reuses this read
  const image = await getImage(id);
  const top = image ? topPublicCaption(image.captions) : null;
  if (!image || !top) return { title: "Photo" };

  return {
    title: truncate(top.content, TITLE_MAX),
    description: top.content,
    // Only shared once something on it is public; private drafts never get a preview card
    openGraph: { title: top.content, images: [{ url: image.url }] },
  };
}

export default async function ImagePage({ params }: PageProps<"/images/[id]">) {
  const { id } = await params;
  const image = await getImage(id);
  // RLS hides photos with nothing posted from everyone but their owner
  if (!image) notFound();

  const publicIds = image.captions.filter((c) => c.isPublic).map((c) => c.id);
  const [user, votes] = await Promise.all([getUser(), getMyVotes(publicIds)]);
  const signedIn = Boolean(user);
  const groups = groupByFlavor(image.captions);
  const roast = image.topic !== null;
  // Owners see the whole panel's score; everyone else only what was posted
  const panel = roast
    ? panelScore((image.isOwner ? image.captions : image.captions.filter((c) => c.isPublic)).map((c) => c.rating))
    : null;
  const panelLine =
    panel === null ? null : (
      <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-rose/40 bg-rose/10 px-3 py-1 text-sm">
        The panel gave it{" "}
        <span className="font-mono font-bold text-rose tabular-nums">
          {panel}/{RATING_MAX}
        </span>
      </p>
    );

  const photo = (
    <PhotoMorph imageId={image.id}>
      <div className={`${card} relative aspect-[4/5] w-full overflow-hidden`}>
        <Image src={image.url} alt="" fill sizes={PHOTO_SIZES} loading="eager" className="scale-110 object-cover opacity-40 blur-2xl" />
        <Image
          src={image.url}
          alt={image.isOwner ? "Your uploaded photo" : "Uploaded photo"}
          fill
          sizes={PHOTO_SIZES}
          loading="eager"
          className="object-contain"
        />
      </div>
    </PhotoMorph>
  );

  return (
    <PageTransition>
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:p-8">
        {image.isOwner ? (
          <CaptionReview imageId={image.id} photo={photo} groups={groups} votes={votes} signedIn={signedIn} roast={roast} panel={panelLine} />
        ) : (
          <PublicCaptions photo={photo} groups={groups} votes={votes} signedIn={signedIn} roast={roast} panel={panelLine} />
        )}
      </main>
    </PageTransition>
  );
}

const PHOTO_SIZES = "(min-width: 1024px) 464px, (min-width: 768px) 50vw, 100vw";

function PublicCaptions({
  photo,
  groups,
  votes,
  signedIn,
  roast,
  panel,
}: {
  photo: ReactNode;
  groups: ReturnType<typeof groupByFlavor>;
  votes: Record<string, VoteValue>;
  signedIn: boolean;
  roast: boolean;
  panel: ReactNode;
}) {
  return (
    <>
      <Link
        href={roast ? "/roast" : "/"}
        className={`mb-6 inline-flex items-center gap-1 rounded text-sm text-muted underline-offset-4 hover:text-fg hover:underline ${focusRing}`}
      >
        <span aria-hidden="true">←</span> Back to the feed
      </Link>
      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-start">
        <div className="md:sticky md:top-24">{photo}</div>
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-bold tracking-tight">{roast ? "Roasts" : "Captions"}</h1>
          {panel}
          <div className="mt-8 space-y-8">
            {groups.map((group) => (
              <section key={group.id} aria-labelledby={`flavor-${group.id}`}>
                <h2 id={`flavor-${group.id}`} className="text-xs font-semibold tracking-[0.18em] text-muted uppercase">
                  {group.name || "Captions"}
                </h2>
                <ul className="mt-3 space-y-3">
                  {group.captions.map((caption) => (
                    <li key={caption.id} className={`${card} p-4 sm:p-5`}>
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-display text-lg leading-snug font-bold text-pretty break-words">
                          {caption.content}
                        </p>
                        <RatingBadge rating={caption.rating} />
                      </div>
                      <RoastTip tip={caption.tip} className="mt-3" />
                      <div className="mt-3 flex justify-end">
                        <VoteButtons
                          captionId={caption.id}
                          upvotes={caption.upvotes}
                          downvotes={caption.downvotes}
                          myVote={votes[caption.id] ?? 0}
                          signedIn={signedIn}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
