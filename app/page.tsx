import { supabase } from "../lib/supabase";

// Fetch fresh rows on every request instead of freezing them at build time
export const dynamic = "force-dynamic";

type Player = {
  id: number;
  player: string;
  team: string | null;
  yards: number | null;
  tds: number | null;
};

export default async function Home() {
  const { data, error } = await supabase
    .from("football")
    .select("id, player, team, yards, tds")
    .order("id");

  if (error) {
    return <p className="p-8 text-red-500">Error loading players: {error.message}</p>;
  }

  const players = (data ?? []) as Player[];

  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="mb-6 text-3xl font-bold">Football Players</h1>
      {players.length === 0 ? (
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