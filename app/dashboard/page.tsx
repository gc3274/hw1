import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import { button, card, focusRing } from "@/components/ui";
import { requireCompleteProfile, type Profile } from "@/lib/dal";
import { getMyImages, type MyImage } from "@/lib/images";

export const metadata: Metadata = {
  title: "Dashboard",
};

// Server time is UTC; the campus clock is New York's
const formatDate = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "America/New_York",
}).format;

export default async function DashboardPage() {
  const { profile } = await requireCompleteProfile();
  const photos = await getMyImages();

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:p-8">
      <div className="flex items-center gap-4">
        <Avatar src={profile.avatarUrl} name={profile.displayName} size={64} />
        <div className="min-w-0">
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
            Members area
          </p>
          <h1 className="text-3xl font-bold break-words">Welcome back, {profile.firstName}</h1>
        </div>
      </div>

      <BioCard bio={profile.bio} />

      <section aria-labelledby="photos-heading" className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="photos-heading" className="text-xl font-semibold">
            Your photos
          </h2>
          {photos.length > 0 && (
            <Link href="/new" className={button("primary", "sm")}>
              New post
            </Link>
          )}
        </div>

        {photos.length === 0 ? (
          <div
            className={`${card} mt-4 flex flex-col gap-3 border-dashed p-4 sm:flex-row sm:items-center sm:justify-between`}
          >
            <div>
              <p className="font-semibold">No photos yet</p>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Upload one and get captions in four flavors. You pick which ones go public.
              </p>
            </div>
            <Link href="/new" className={button("primary", "sm")}>
              Make your first post
            </Link>
          </div>
        ) : (
          <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {photos.map((photo) => (
              <li key={photo.id}>
                <PhotoTile photo={photo} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function BioCard({ bio }: { bio: Profile["bio"] }) {
  if (bio) {
    return (
      <section aria-labelledby="about-heading" className={`${card} mt-6 p-4`}>
        <div className="flex items-center justify-between gap-4">
          <h2
            id="about-heading"
            className="text-sm font-semibold tracking-wide text-gray-600 uppercase dark:text-gray-400"
          >
            About you
          </h2>
          <Link href="/profile#bio" className={button("ghost", "sm")}>
            Edit bio
          </Link>
        </div>
        <p className="mt-2 break-words whitespace-pre-line">{bio}</p>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="bio-prompt-heading"
      className="mt-6 flex flex-col gap-3 rounded-lg border border-dashed border-gray-300 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-700"
    >
      <div>
        <h2 id="bio-prompt-heading" className="font-semibold">
          Add a short bio
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Ex: where you’re from, your dorm, or your go-to bodega order. It will show up right here.
        </p>
      </div>
      <Link href="/profile#bio" className={button("secondary", "sm")}>
        Add a bio
      </Link>
    </section>
  );
}

function PhotoTile({ photo }: { photo: MyImage }) {
  return (
    <Link
      href={`/images/${photo.id}`}
      className={`${card} group block overflow-hidden hover:border-emerald-500 dark:hover:border-emerald-600 ${focusRing}`}
    >
      <div className="relative aspect-square bg-gray-100 dark:bg-gray-900">
        <Image
          src={photo.url}
          alt=""
          fill
          sizes="(min-width: 896px) 272px, (min-width: 640px) 33vw, 50vw"
          className="object-cover"
        />
      </div>
      <div className="px-3 py-2 text-sm">
        <p className="text-xs text-gray-600 dark:text-gray-400">
          {formatDate(new Date(photo.createdAt))}
        </p>
        <p className="mt-0.5 font-medium tabular-nums">
          {photo.postedCaptions} of {photo.totalCaptions} posted · score {photo.totalScore}
        </p>
      </div>
    </Link>
  );
}
