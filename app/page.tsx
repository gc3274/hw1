import Link from "next/link";
import type { ReactNode } from "react";
import FootballIcon from "@/components/FootballIcon";
import { button } from "@/components/ui";
import { getProfile, getUser, type Profile } from "@/lib/dal";
import { getPlayers } from "@/lib/football";

// Fetch fresh rows on every request instead of freezing them at build time
export const dynamic = "force-dynamic";

export default async function Home() {
  const [{ players, error }, user] = await Promise.all([getPlayers(), getUser()]);
  // A profile hiccup shouldn't take the public player list down with it
  const profile = user ? await getProfile().catch(() => null) : null;

  return (
    <main className="mx-auto w-full max-w-4xl p-8">
      {(!user || profile) && <MemberCallout profile={profile} />}
      <h1 className="mb-6 text-3xl font-bold">Football Players</h1>
      {error ? (
        <p className="text-red-500">Couldn’t load players right now. Please try again later.</p>
      ) : players.length === 0 ? (
        <p>No players found.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {players.map((p) => (
            <li key={p.id} className="rounded-lg border border-gray-300 p-4 dark:border-gray-700">
              <h2 className="text-xl font-semibold">{p.player}</h2>
              <p className="text-sm opacity-75">{p.team}</p>
              <p className="mt-2">
                {p.yards?.toLocaleString()} yards · {p.tds} TDs
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function MemberCallout({ profile }: { profile: Profile | null }) {
  let title: string;
  let body: string;
  let href: string;
  let cta: ReactNode;

  if (!profile) {
    title = "Sign in with Google to unlock your dashboard";
    body = "Members get season totals, a yards leaderboard, and a profile of their own.";
    href = "/login";
    cta = "Sign in";
  } else if (!profile.isComplete) {
    title = "You’re almost in";
    body = "Add your name to finish setting up your profile.";
    href = "/onboarding";
    cta = "Finish setup";
  } else {
    title = `Welcome back, ${profile.firstName}!`;
    body = "Your dashboard has this season’s insights.";
    href = "/dashboard";
    cta = (
      <>
        Go to dashboard <span aria-hidden="true">→</span>
      </>
    );
  }

  return (
    <aside
      aria-label="Membership"
      className="mb-8 flex flex-col gap-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-emerald-900 dark:bg-emerald-950/40"
    >
      <div className="flex items-start gap-3">
        <FootballIcon className="mt-0.5 size-6 shrink-0 text-emerald-700 dark:text-emerald-400" />
        <div className="min-w-0">
          <p className="font-semibold break-words">{title}</p>
          <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{body}</p>
        </div>
      </div>
      <Link href={href} className={button("primary", "sm")}>
        {cta}
      </Link>
    </aside>
  );
}
