import type { Metadata } from "next";
import FootballIcon from "@/components/FootballIcon";
import { card } from "@/components/ui";
import { getPlayers, summarize, type Player } from "@/lib/football";

export const metadata: Metadata = {
  title: "Football stats",
};

// Fetch fresh rows on every request instead of freezing them at build time
export const dynamic = "force-dynamic";

const formatNumber = (n: number) => n.toLocaleString("en-US");

export default async function StatsPage() {
  const { players, error } = await getPlayers();
  const stats = summarize(players);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:p-8">
      <div className="mb-6 flex items-center gap-3">
        <FootballIcon className="size-8 shrink-0 text-emerald-600 dark:text-emerald-500" />
        <h1 className="text-3xl font-bold">Football Players</h1>
      </div>

      {error ? (
        <p className="text-red-500">Couldn’t load players right now. Please try again later.</p>
      ) : players.length === 0 ? (
        <p>No players found.</p>
      ) : (
        <>
          <section aria-labelledby="insights-heading">
            <h2 id="insights-heading" className="text-xl font-semibold">
              Season insights
            </h2>
            <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatTile label="Total yards" value={stats.totalYards} />
              <StatTile label="Touchdowns" value={stats.totalTds} />
              <StatTile label="Teams" value={stats.teamCount} />
              <StatTile label="Players" value={stats.playerCount} />
            </dl>
            <LeadersCard leaders={stats.leaders} />
          </section>

          <section aria-labelledby="roster-heading" className="mt-10">
            <h2 id="roster-heading" className="mb-4 text-xl font-semibold">
              Roster
            </h2>
            <ul className="grid gap-4 sm:grid-cols-2">
              {players.map((p) => (
                <li key={p.id} className={`${card} p-4`}>
                  <h3 className="text-xl font-semibold">{p.player}</h3>
                  <p className="text-sm opacity-75">{p.team}</p>
                  <p className="mt-2">
                    {p.yards?.toLocaleString()} yards · {p.tds} TDs
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </main>
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
