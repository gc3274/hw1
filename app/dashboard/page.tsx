import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import BlurText from "@/components/bits/BlurText";
import GlareTile from "@/components/fx/GlareTile";
import StatNumber from "@/components/fx/StatNumber";
import PageTransition from "@/components/PageTransition";
import PhotoMorph from "@/components/PhotoMorph";
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
    <PageTransition>
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:p-8">
        <div className="flex items-center gap-4">
          <Avatar src={profile.avatarUrl} name={profile.displayName} size={64} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-lime">Members area</p>
            <BlurText
              as="h1"
              text={`Welcome back, ${profile.firstName}`}
              delay={80}
              className="font-display text-3xl font-bold tracking-tight break-words"
            />
          </div>
        </div>

        <dl className="mt-8 grid grid-cols-3 gap-3">
          {[
            { label: "Photos", value: photos.length },
            { label: "Captions posted", value: photos.reduce((n, p) => n + p.postedCaptions, 0) },
            { label: "Total score", value: photos.reduce((n, p) => n + p.totalScore, 0) },
          ].map((stat) => (
            <div key={stat.label} className={`${card} p-4`}>
              <dt className="text-xs text-muted sm:text-sm">{stat.label}</dt>
              <dd className="mt-1 font-mono text-2xl font-semibold tabular-nums sm:text-3xl">
                <StatNumber value={stat.value} />
              </dd>
            </div>
          ))}
        </dl>

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
                <p className="mt-1 text-sm text-muted">
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
    </PageTransition>
  );
}

function BioCard({ bio }: { bio: Profile["bio"] }) {
  if (bio) {
    return (
      <section aria-labelledby="about-heading" className={`${card} mt-6 p-4`}>
        <div className="flex items-center justify-between gap-4">
          <h2
            id="about-heading"
            className="text-sm font-semibold tracking-wide text-muted uppercase"
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
      className="mt-6 flex flex-col gap-3 rounded-lg border border-dashed border-line p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <h2 id="bio-prompt-heading" className="font-semibold">
          Add a short bio
        </h2>
        <p className="mt-1 text-sm text-muted">
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
    <Link href={`/images/${photo.id}`} className={`group block rounded-2xl ${focusRing}`}>
      <GlareTile>
        <div className="w-full">
          <PhotoMorph imageId={photo.id}>
            <div className="relative aspect-square bg-white/5">
              <Image
                src={photo.url}
                alt=""
                fill
                sizes="(min-width: 1024px) 320px, (min-width: 640px) 33vw, 50vw"
                className="object-cover"
              />
            </div>
          </PhotoMorph>
          <div className="px-3 py-2 text-sm">
            <p className="font-mono text-xs text-muted">{formatDate(new Date(photo.createdAt))}</p>
            <p className="mt-0.5 font-medium tabular-nums">
              {photo.postedCaptions} of {photo.totalCaptions} posted · score {photo.totalScore}
            </p>
          </div>
        </div>
      </GlareTile>
    </Link>
  );
}
