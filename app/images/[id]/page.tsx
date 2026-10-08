import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import PostToggle from "@/components/PostToggle";
import VoteButtons from "@/components/VoteButtons";
import { button, card, focusRing } from "@/components/ui";
import type { VoteValue } from "@/lib/captions";
import { getUser } from "@/lib/dal";
import { getImage, getMyVotes, type ImageCaption } from "@/lib/images";

const TITLE_MAX = 60;

// Status, not a control: rounded pill with an icon so it never reads as a button
const statusPill =
  "inline-flex shrink-0 cursor-default items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium select-none";

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
    else groups.push({ id: caption.flavorId, name: caption.flavorName, captions: [caption] });
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

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:p-8">
      <Link
        href="/"
        className={`mb-4 inline-flex items-center gap-1 rounded text-sm text-gray-600 underline-offset-4 hover:underline dark:text-gray-400 ${focusRing}`}
      >
        <span aria-hidden="true">←</span> Back to the feed
      </Link>

      <div className="grid gap-8 md:grid-cols-2 md:items-start">
        <div className="md:sticky md:top-8">
          <div
            className={`${card} relative aspect-[4/5] w-full overflow-hidden bg-gray-100 dark:bg-gray-900`}
          >
            <Image
              src={image.url}
              alt={image.isOwner ? "Your uploaded photo" : "Uploaded photo"}
              fill
              sizes="(min-width: 896px) 416px, (min-width: 768px) 50vw, 100vw"
              loading="eager"
              className="object-contain"
            />
          </div>
        </div>

        <div className="min-w-0">
          <h1 className="text-3xl font-bold">{image.isOwner ? "Your captions" : "Captions"}</h1>
          {image.isOwner && (
            <p className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
              Only you can see captions you haven’t posted. Post the ones you like.
            </p>
          )}

          {groups.length === 0 ? (
            <p
              className={`${card} mt-6 border-dashed p-4 text-sm text-gray-600 dark:text-gray-400`}
            >
              No captions here yet.
            </p>
          ) : (
            <div className="mt-6 space-y-8">
              {groups.map((group) => (
                <section key={group.id} aria-labelledby={`flavor-${group.id}`}>
                  <h2
                    id={`flavor-${group.id}`}
                    className="text-sm font-semibold tracking-wide text-gray-600 uppercase dark:text-gray-400"
                  >
                    {group.name || "Captions"}
                  </h2>
                  <ul className="mt-3 space-y-3">
                    {group.captions.map((caption) => (
                      <li
                        key={caption.id}
                        className={`${card} p-4 ${caption.isPublic ? "" : "border-dashed"}`}
                      >
                        <p className="text-lg leading-snug font-bold text-pretty break-words">
                          {caption.content}
                        </p>
                        <CaptionActions
                          caption={caption}
                          isOwner={image.isOwner}
                          myVote={votes[caption.id] ?? 0}
                          signedIn={signedIn}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}

          {image.isOwner && groups.length > 0 && <DoneBar captions={image.captions} />}
        </div>
      </div>
    </main>
  );
}

// Keeps a clear way out in view while the owner scrolls through their captions
function DoneBar({ captions }: { captions: ImageCaption[] }) {
  const posted = captions.filter((c) => c.isPublic).length;

  return (
    <div className="sticky bottom-0 -mx-4 mt-6 border-t border-gray-300 bg-background/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-t-lg sm:border-x dark:border-gray-700">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-gray-600 dark:text-gray-400" aria-live="polite">
          <span className="font-semibold text-foreground tabular-nums">{posted}</span> of{" "}
          <span className="tabular-nums">{captions.length}</span> posted
          {posted === 0 && <span className="hidden sm:inline"> · post one to share it</span>}
        </p>
        {/* Posted captions show up under New; with nothing posted, the photo lives on the dashboard */}
        <Link href={posted > 0 ? "/?sort=new" : "/dashboard"} className={button("primary", "sm")}>
          Done
        </Link>
      </div>
    </div>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className="size-3">
      <path d="M8 1a3.5 3.5 0 0 0-3.5 3.5V6H4a1.5 1.5 0 0 0-1.5 1.5v6A1.5 1.5 0 0 0 4 15h8a1.5 1.5 0 0 0 1.5-1.5v-6A1.5 1.5 0 0 0 12 6h-.5V4.5A3.5 3.5 0 0 0 8 1Zm2 5V4.5a2 2 0 1 0-4 0V6h4Z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className="size-3">
      <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
    </svg>
  );
}

function CaptionActions({
  caption,
  isOwner,
  myVote,
  signedIn,
}: {
  caption: ImageCaption;
  isOwner: boolean;
  myVote: VoteValue;
  signedIn: boolean;
}) {
  const votes = caption.isPublic && (
    <VoteButtons
      captionId={caption.id}
      upvotes={caption.upvotes}
      downvotes={caption.downvotes}
      myVote={myVote}
      signedIn={signedIn}
    />
  );

  if (!isOwner) return <div className="mt-3 flex justify-end">{votes}</div>;

  // Votes take the right side once posted; until then it says who can see it
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <PostToggle captionId={caption.id} isPublic={caption.isPublic} />
        {caption.isPublic && (
          <span
            className={`${statusPill} bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200`}
          >
            <CheckIcon />
            Posted
          </span>
        )}
      </div>
      {votes || (
        <span
          className={`${statusPill} bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400`}
        >
          <LockIcon />
          Only you
        </span>
      )}
    </div>
  );
}
