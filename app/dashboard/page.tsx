import type { Metadata } from "next";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import { button, card } from "@/components/ui";
import { requireCompleteProfile, type Profile } from "@/lib/dal";
import { getPlayers, summarize, type Player } from "@/lib/football";

export const metadata: Metadata = {
  title: "Dashboard",
};

const formatNumber = (n: number) => n.toLocaleString("en-US");

export default async function DashboardPage() {
  const { profile } = await requireCompleteProfile();
  const { players, error } = await getPlayers();
  const stats = summarize(players);

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

      <section aria-labelledby="insights-heading" className="mt-10">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="insights-heading" className="text-xl font-semibold">
            Season insights
          </h2>
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
            Members only
          </span>
        </div>

        {error ? (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            We couldn’t load player stats right now. Please refresh to try again.
          </p>
        ) : stats.playerCount === 0 ? (
          <p className={`${card} mt-4 border-dashed p-4 text-sm text-gray-600 dark:text-gray-400`}>
            No players yet. Season totals will show up here once the roster is added.
          </p>
        ) : (
          <>
            <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatTile label="Total yards" value={stats.totalYards} />
              <StatTile label="Touchdowns" value={stats.totalTds} />
              <StatTile label="Teams" value={stats.teamCount} />
              <StatTile label="Players" value={stats.playerCount} />
            </dl>
            <LeadersCard leaders={stats.leaders} />
          </>
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
          Ex: favorite football team! It will show up right here.
        </p>
      </div>
      <Link href="/profile#bio" className={button("secondary", "sm")}>
        Add a bio
      </Link>
    </section>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className={`${card} p-4`}>
      <dt className="text-sm text-gray-600 dark:text-gray-400">{label}</dt>
      <dd className="mt-1 text-2xl font-bold tabular-nums">{formatNumber(value)}</dd>
    </div>
  );
}

function LeadersCard({ leaders }: { leaders: Player[] }) {
  const top = leaders[0];

  return (
    <div className={`${card} mt-6 p-4 sm:p-6`}>
      <h3 className="font-semibold">Yards leaders</h3>
      {!top ? (
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          No yardage recorded yet.
        </p>
      ) : (
        <>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {top.player}
            {top.team ? ` (${top.team})` : ""} leads the way with{" "}
            {formatNumber(top.yards ?? 0)} yards.
          </p>
          <ol className="mt-4 space-y-4">
            {leaders.map((p, i) => (
              <LeaderRow key={p.id} player={p} rank={i + 1} topYards={top.yards ?? 0} />
            ))}
          </ol>
        </>
      )}
    </div>
  );
}

function LeaderRow({ player, rank, topYards }: { player: Player; rank: number; topYards: number }) {
  const yards = player.yards ?? 0;
  // Clamp so negative or missing yardage can't produce a broken bar
  const percent = topYards > 0 ? Math.min(100, Math.max(0, (yards / topYards) * 100)) : 0;

  return (
    <li>
      <div className="flex items-baseline gap-3">
        <span className="w-5 shrink-0 text-sm font-semibold text-gray-500 tabular-nums dark:text-gray-400">
          {rank}
        </span>
        <span className="min-w-0 flex-1 truncate">
          <span className="font-medium">{player.player}</span>
          {player.team && (
            <span className="text-gray-600 dark:text-gray-400"> · {player.team}</span>
          )}
        </span>
        <span className="shrink-0 text-sm font-medium tabular-nums">
          {formatNumber(yards)}
          <span aria-hidden="true"> yds</span>
          <span className="sr-only"> yards</span>
        </span>
      </div>
      <div aria-hidden="true" className="mt-1.5 ml-8 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800">
        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${percent}%` }} />
      </div>
    </li>
  );
}
