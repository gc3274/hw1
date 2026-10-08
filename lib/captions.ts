// Shared by server code and client components, so nothing here may touch
// the server, Supabase or env. Limits match the checks in the captions migration.
export const IMAGE_BUCKET = "images";
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const CONTEXT_MAX = 140;
export const CAPTION_MAX = 200;
// What the prompt asks for; CAPTION_MAX is the hard limit the DB enforces
export const CAPTION_TARGET = 120;
export const CAPTIONS_PER_FLAVOR = 2;
export const DAILY_GENERATION_LIMIT = 5;
export const FEED_PAGE_SIZE = 24;
export const FEED_MAX = 96;

export type VoteValue = -1 | 0 | 1;
export type Flavor = { id: number; slug: string; name: string; description: string };
export type VoteCounts = { upvotes: number; downvotes: number };
export type FeedSort = "top" | "new";
export type CaptionDraft = { flavorId: number; content: string };
export type ParsedCaptions =
  | { ok: true; captions: CaptionDraft[] }
  | { ok: false; reason: "invalid" | "rejected" | "empty" };

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const UUID_RE = new RegExp(`^${UUID}$`, "i");
const IMAGE_PATH_RE = new RegExp(`^(${UUID})/${UUID}\\.jpg$`);

export function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

// Photos live at <user id>/<random uuid>.jpg
export function isOwnImagePath(userId: string, path: unknown): path is string {
  if (typeof path !== "string") return false;
  const match = IMAGE_PATH_RE.exec(path);
  return match !== null && match[1] === userId;
}

export function parseVoteValue(v: unknown): VoteValue | null {
  if (v === 1 || v === -1) return v;
  if (v === 0) return 0;
  return null;
}

// Postgres char_length counts code points, so cut on those and never split an emoji
const charCount = (s: string) => Array.from(s).length;
const clip = (s: string, max: number) => Array.from(s).slice(0, max).join("");

const collapse = (s: string) => s.replace(/\s+/g, " ").trim();

export function readContext(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return clip(collapse(raw), CONTEXT_MAX).trimEnd();
}

// Search params can arrive as a string, a repeated param (array), or not at all
const firstParam = (v: unknown) => (Array.isArray(v) ? v[0] : v);

export function parseFeedSort(v: unknown): FeedSort {
  return firstParam(v) === "new" ? "new" : "top";
}

// Whole pages only, so "Show more" always adds one page
export function parseFeedLimit(v: unknown): number {
  const raw = firstParam(v);
  const n = typeof raw === "number" ? raw : typeof raw === "string" && raw ? Number(raw) : NaN;
  if (!Number.isFinite(n)) return FEED_PAGE_SIZE;
  const pages = Math.floor(n / FEED_PAGE_SIZE) * FEED_PAGE_SIZE;
  return Math.min(Math.max(pages, FEED_PAGE_SIZE), FEED_MAX);
}

const QUOTE_PAIRS: Record<string, string> = { '"': '"', "'": "'", "“": "”", "‘": "’" };
// Word-like tags at the very end. Tags without a letter (#1) are part of the joke.
const TRAILING_HASHTAG = /(?:^|\s+)#[\p{N}_]*\p{L}[\p{L}\p{N}_]*$/u;

function stripQuotes(s: string) {
  const close = QUOTE_PAIRS[s[0]];
  return close && s.length >= 2 && s.endsWith(close) ? s.slice(1, -1).trim() : s;
}

function stripHashtags(s: string) {
  let out = s;
  while (TRAILING_HASHTAG.test(out)) out = out.replace(TRAILING_HASHTAG, "").trimEnd();
  return out;
}

function cleanCaption(text: string) {
  return stripHashtags(stripQuotes(stripHashtags(collapse(text))));
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

// The model is asked for JSON with a schema, but its output is still untrusted
export function parseCaptionResponse(raw: string, flavors: Flavor[]): ParsedCaptions {
  let body: unknown;
  try {
    body = JSON.parse(raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, ""));
  } catch {
    return { ok: false, reason: "invalid" };
  }
  if (!isRecord(body)) return { ok: false, reason: "invalid" };
  if (body.allowed === false) return { ok: false, reason: "rejected" };

  const bySlug = new Map(flavors.map((f) => [f.slug, f.id]));
  const perFlavor = new Map<number, string[]>(flavors.map((f) => [f.id, []]));
  const seen = new Set<string>();

  for (const item of Array.isArray(body.captions) ? body.captions : []) {
    if (!isRecord(item) || typeof item.text !== "string") continue;
    const flavorId = typeof item.flavor_slug === "string" ? bySlug.get(item.flavor_slug) : undefined;
    if (flavorId === undefined) continue;

    const content = cleanCaption(item.text);
    if (!content || charCount(content) > CAPTION_MAX) continue;

    const key = content.toLowerCase();
    const bucket = perFlavor.get(flavorId)!;
    if (seen.has(key) || bucket.length >= CAPTIONS_PER_FLAVOR) continue;
    seen.add(key);
    bucket.push(content);
  }

  const captions = flavors.flatMap((f) =>
    perFlavor.get(f.id)!.map((content) => ({ flavorId: f.id, content })),
  );
  return captions.length > 0 ? { ok: true, captions } : { ok: false, reason: "empty" };
}

// Clicking the arrow you already picked clears it; the other arrow flips it
export function nextVote(current: VoteValue, clicked: 1 | -1): VoteValue {
  return current === clicked ? 0 : clicked;
}

export function applyVote(counts: VoteCounts, from: VoteValue, to: VoteValue): VoteCounts {
  const up = counts.upvotes - (from === 1 ? 1 : 0) + (to === 1 ? 1 : 0);
  const down = counts.downvotes - (from === -1 ? 1 : 0) + (to === -1 ? 1 : 0);
  return { upvotes: Math.max(0, up), downvotes: Math.max(0, down) };
}
