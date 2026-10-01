import "server-only";
import { createClient } from "@/lib/supabase/server";

export type Player = {
  id: number;
  player: string;
  team: string | null;
  yards: number | null;
  tds: number | null;
};

export async function getPlayers(): Promise<{ players: Player[]; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("football")
    .select("id, player, team, yards, tds")
    .order("id");

  if (error) {
    console.error("Loading players failed:", error.message);
    return { players: [], error: error.message };
  }
  return { players: (data ?? []) as Player[], error: null };
}

export function summarize(players: Player[]) {
  const totalYards = players.reduce((sum, p) => sum + (p.yards ?? 0), 0);
  const totalTds = players.reduce((sum, p) => sum + (p.tds ?? 0), 0);
  const teamCount = new Set(players.map((p) => p.team?.trim()).filter(Boolean)).size;
  const leaders = players
    .filter((p) => p.yards !== null)
    .sort((a, b) => (b.yards ?? 0) - (a.yards ?? 0))
    .slice(0, 5);

  return { playerCount: players.length, totalYards, totalTds, teamCount, leaders };
}
