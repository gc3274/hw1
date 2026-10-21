// Shared by server code and client components, so nothing here may touch
// the server, Supabase or env. Limits match the checks in the roast migration.
import { CAPTION_MAX, cleanCaption, type FeedSort } from "@/lib/captions";

// What the prompt asks for; CAPTION_MAX is the hard limit the DB enforces
export const ROAST_TARGET = 140;
export const TIP_TARGET = 90;
export const TIP_MAX = 200;
export const RATING_MAX = 10;

export const TOPICS = [
  { slug: "food", label: "Food", emoji: "🍳", hint: "a meal you cooked" },
  { slug: "art", label: "Art", emoji: "🎨", hint: "a drawing or painting" },
  { slug: "room", label: "Room", emoji: "🛏️", hint: "your dorm or desk setup" },
  { slug: "fit", label: "Fit", emoji: "👕", hint: "today’s outfit" },
  { slug: "anything", label: "Anything", emoji: "✨", hint: "anything else you made" },
] as const;

export type Topic = (typeof TOPICS)[number]["slug"];
export type Critic = { id: number; slug: string; name: string; emoji: string; description: string };
export type CriticTag = { slug: string; name: string; emoji: string };
export type RoastDraft = { criticId: number; content: string; tip: string | null; rating: number | null };
export type ParsedRoasts =
  | { ok: true; roasts: RoastDraft[] }
  | { ok: false; reason: "invalid" | "rejected" | "empty" };

const firstParam = (v: unknown) => (Array.isArray(v) ? v[0] : v);

export function parseTopic(v: unknown): Topic | null {
  const raw = firstParam(v);
  return TOPICS.find((t) => t.slug === raw)?.slug ?? null;
}

export function topicInfo(slug: string | null) {
  return TOPICS.find((t) => t.slug === slug) ?? null;
}

// The feed lives at "/"; Top with no topic stays the bare home page
export function feedHref(sort: FeedSort, topic: Topic | null, n?: number): string {
  const params = new URLSearchParams();
  if (sort !== "top") params.set("sort", sort);
  if (topic) params.set("topic", topic);
  if (n) params.set("n", String(n));
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

// Names match the critics seed. The general critics sit on every panel, so
// their lines fit any topic; each topic adds only its own expert.
const TOPIC_LINES: Record<Topic, string[]> = {
  food: ["Chef Scorch is tasting it…", "Checking the seasoning…"],
  art: ["Vivienne Vex is sighing loudly…", "Squinting at the brushwork…"],
  room: ["Reno Randy is eyeing the walls…", "Counting the cables…"],
  fit: ["Margaux is checking the hem…", "Judging the color story…"],
  anything: ["Working out what this even is…", "Turning it over for a better angle…"],
};

const PANEL_LINES = [
  "Midwest Mom is finding something nice to say…",
  "The Jaded New Yorker has seen worse…",
  "Chronically Online is typing…",
  "Sharpening the red pens…",
];

export function writingLines(topic: Topic): string[] {
  return [...TOPIC_LINES[topic], ...PANEL_LINES];
}

export type CriticGroup<T> = { id: number; name: string; roasts: T[] };

// Groups by critic in the order they first appear, so the input order doesn't matter
export function groupByCritic<T extends { criticId: number; critic: CriticTag }>(
  items: T[],
): CriticGroup<T>[] {
  const groups = new Map<number, CriticGroup<T>>();
  for (const item of items) {
    const group = groups.get(item.criticId);
    if (group) group.roasts.push(item);
    else
      groups.set(item.criticId, {
        id: item.criticId,
        name: `${item.critic.emoji} ${item.critic.name}`,
        roasts: [item],
      });
  }
  return [...groups.values()];
}

// Average of the critics' scores, one decimal; null when nobody scored it
export function panelScore(ratings: (number | null)[]): number | null {
  const scored = ratings.filter((r): r is number => r !== null);
  if (scored.length === 0) return null;
  return Math.round((scored.reduce((sum, r) => sum + r, 0) / scored.length) * 10) / 10;
}

const charCount = (s: string) => Array.from(s).length;

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function readRating(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() ? Number(v) : NaN;
  if (!Number.isFinite(n)) return null;
  return Math.min(RATING_MAX, Math.max(0, Math.round(n)));
}

// The model is asked for JSON with a schema, but its output is still untrusted.
// One roast per critic; a bad tip or score is dropped, not the whole roast.
export function parseRoastResponse(raw: string, critics: Critic[]): ParsedRoasts {
  let body: unknown;
  try {
    body = JSON.parse(raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, ""));
  } catch {
    return { ok: false, reason: "invalid" };
  }
  if (!isRecord(body)) return { ok: false, reason: "invalid" };
  if (body.allowed === false) return { ok: false, reason: "rejected" };

  const bySlug = new Map(critics.map((c) => [c.slug, c.id]));
  const byCritic = new Map<number, RoastDraft>();

  for (const item of Array.isArray(body.reviews) ? body.reviews : []) {
    if (!isRecord(item) || typeof item.roast !== "string") continue;
    const criticId = typeof item.critic_slug === "string" ? bySlug.get(item.critic_slug) : undefined;
    if (criticId === undefined || byCritic.has(criticId)) continue;

    const content = cleanCaption(item.roast);
    if (!content || charCount(content) > CAPTION_MAX) continue;
    const tip = typeof item.tip === "string" ? cleanCaption(item.tip) : "";

    byCritic.set(criticId, {
      criticId,
      content,
      tip: tip && charCount(tip) <= TIP_MAX ? tip : null,
      rating: readRating(item.score),
    });
  }

  const roasts = critics.flatMap((c) => byCritic.get(c.id) ?? []);
  return roasts.length > 0 ? { ok: true, roasts } : { ok: false, reason: "empty" };
}
