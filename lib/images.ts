import "server-only";
import { cache } from "react";
import { getUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import {
  IMAGE_BUCKET,
  isUuid,
  type FeedSort,
  type VoteValue,
} from "@/lib/captions";
import type { Critic, CriticTag, Topic } from "@/lib/roasts";

type Supabase = Awaited<ReturnType<typeof createClient>>;

const DAY_MS = 24 * 60 * 60 * 1000;
const TOP_WINDOW_MS = 7 * DAY_MS;

export type FeedCaption = {
  id: string;
  content: string;
  upvotes: number;
  downvotes: number;
  score: number;
  postedAt: string;
  flavor: { slug: string; name: string };
  image: { id: string; url: string };
};

export type FeedRoast = FeedCaption & {
  critic: CriticTag;
  rating: number | null;
  tip: string | null;
  topic: string;
};

export type ImageCaption = {
  id: string;
  content: string;
  criticId: number;
  critic: CriticTag;
  rating: number | null;
  tip: string | null;
  upvotes: number;
  downvotes: number;
  score: number;
  postedAt: string | null;
  isPublic: boolean;
};

export type ImageDetail = {
  id: string;
  url: string;
  topic: string | null;
  createdAt: string;
  isOwner: boolean;
  captions: ImageCaption[];
};

export type MyImage = {
  id: string;
  url: string;
  createdAt: string;
  totalRoasts: number;
  postedRoasts: number;
  totalScore: number;
};

// Rows as PostgREST returns them. Many-to-one embeds come back as an object,
// or null when RLS hides the parent row.
type FeedRow = {
  id: string;
  content: string;
  upvotes: number;
  downvotes: number;
  score: number;
  posted_at: string;
  humor_flavors: { slug: string; name: string } | null;
  images: { id: string; image_path: string } | null;
};

type ImageCaptionRow = {
  id: string;
  content: string;
  is_public: boolean;
  upvotes: number;
  downvotes: number;
  score: number;
  posted_at: string | null;
  created_at: string;
  critic_id: number | null;
  rating: number | null;
  tip: string | null;
  critics: { slug: string; name: string; emoji: string; sort_order: number } | null;
};

type RoastCaptionRow = ImageCaptionRow & {
  critic_id: number;
  critics: NonNullable<ImageCaptionRow["critics"]>;
};

// Only roasts have a critic; anything else is a legacy caption
const isRoast = (c: ImageCaptionRow): c is RoastCaptionRow => c.critic_id !== null && c.critics !== null;

type ImageRow = {
  id: string;
  user_id: string;
  image_path: string;
  topic: string | null;
  created_at: string;
  captions: ImageCaptionRow[] | null;
};

type MyImageRow = {
  id: string;
  image_path: string;
  created_at: string;
  captions: { is_public: boolean; score: number }[] | null;
};

export function publicImageUrl(supabase: Supabase, path: string): string {
  return supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function getFeed(
  sort: FeedSort,
  limit: number,
): Promise<{ captions: FeedCaption[]; hasMore: boolean; error: string | null }> {
  const supabase = await createClient();
  let query = supabase
    .from("captions")
    .select(
      "id, content, upvotes, downvotes, score, posted_at, humor_flavors(slug, name), images(id, image_path)",
    )
    .eq("is_public", true)
    // Roasts have their own tab
    .not("humor_flavor_id", "is", null);

  if (sort === "top") {
    const since = new Date(Date.now() - TOP_WINDOW_MS).toISOString();
    query = query
      .gte("posted_at", since)
      .order("score", { ascending: false })
      .order("posted_at", { ascending: false });
  } else {
    query = query.order("posted_at", { ascending: false });
  }

  // One extra row tells us whether "Show more" has anything to show
  const { data, error } = await query.order("id").limit(limit + 1);
  if (error) {
    console.error("Loading the feed failed:", error.message);
    return { captions: [], hasMore: false, error: error.message };
  }

  const rows = (data ?? []) as unknown as FeedRow[];
  const captions = rows.slice(0, limit).flatMap((row): FeedCaption[] => {
    if (!row.images || !row.humor_flavors) return [];
    return [
      {
        id: row.id,
        content: row.content,
        upvotes: row.upvotes,
        downvotes: row.downvotes,
        score: row.score,
        postedAt: row.posted_at,
        flavor: { slug: row.humor_flavors.slug, name: row.humor_flavors.name },
        image: { id: row.images.id, url: publicImageUrl(supabase, row.images.image_path) },
      },
    ];
  });
  return { captions, hasMore: rows.length > limit, error: null };
}

// The panel for a topic: its expert (if it has one) plus the general critics
export async function getCritics(topic: Topic): Promise<Critic[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("critics")
    .select("id, slug, name, emoji, description")
    .or(`topic.is.null,topic.eq.${topic}`)
    .order("sort_order");

  if (error) {
    console.error("Loading critics failed:", error.message);
    return [];
  }
  return (data ?? []) as Critic[];
}

type RoastRow = Omit<FeedRow, "humor_flavors" | "images"> & {
  rating: number | null;
  tip: string | null;
  critics: CriticTag | null;
  images: { id: string; image_path: string; topic: string | null } | null;
};

export async function getRoastFeed(
  sort: FeedSort,
  limit: number,
  topic: Topic | null,
): Promise<{ roasts: FeedRoast[]; hasMore: boolean; error: string | null }> {
  const supabase = await createClient();
  let query = supabase
    .from("captions")
    .select(
      "id, content, upvotes, downvotes, score, posted_at, rating, tip, critics(slug, name, emoji), images!inner(id, image_path, topic)",
    )
    .eq("is_public", true)
    .not("critic_id", "is", null)
    // Legacy caption posts have no topic and are never shown
    .not("images.topic", "is", null);
  if (topic) query = query.eq("images.topic", topic);

  if (sort === "top") {
    const since = new Date(Date.now() - TOP_WINDOW_MS).toISOString();
    query = query
      .gte("posted_at", since)
      .order("score", { ascending: false })
      .order("posted_at", { ascending: false });
  } else {
    query = query.order("posted_at", { ascending: false });
  }

  const { data, error } = await query.order("id").limit(limit + 1);
  if (error) {
    console.error("Loading the roast feed failed:", error.message);
    return { roasts: [], hasMore: false, error: error.message };
  }

  const rows = (data ?? []) as unknown as RoastRow[];
  const roasts = rows.slice(0, limit).flatMap((row): FeedRoast[] => {
    if (!row.images || !row.critics) return [];
    return [
      {
        id: row.id,
        content: row.content,
        upvotes: row.upvotes,
        downvotes: row.downvotes,
        score: row.score,
        postedAt: row.posted_at,
        flavor: { slug: row.critics.slug, name: row.critics.name },
        critic: row.critics,
        rating: row.rating,
        tip: row.tip,
        topic: row.images.topic ?? "anything",
        image: { id: row.images.id, url: publicImageUrl(supabase, row.images.image_path) },
      },
    ];
  });
  return { roasts, hasMore: rows.length > limit, error: null };
}

// RLS decides what comes back: owners get every roast, everyone else only
// posted ones, and a photo with nothing posted is hidden from non-owners.
// Legacy caption posts (no topic) come back null, so they 404.
export const getImage = cache(async (id: string): Promise<ImageDetail | null> => {
  if (!isUuid(id)) return null;

  const supabase = await createClient();
  const [user, { data, error }] = await Promise.all([
    getUser(),
    supabase
      .from("images")
      .select(
        "id, user_id, image_path, topic, created_at, captions(id, content, is_public, upvotes, downvotes, score, posted_at, created_at, critic_id, rating, tip, critics(slug, name, emoji, sort_order))",
      )
      .eq("id", id)
      .not("topic", "is", null)
      .maybeSingle(),
  ]);

  // A database error goes to the error page; only a missing or hidden photo is a 404
  if (error) throw new Error(`Could not load photo: ${error.message}`);
  if (!data) return null;

  const row = data as unknown as ImageRow;
  const captions = (row.captions ?? [])
    .filter(isRoast)
    .sort(
      (a, b) =>
        a.critics.sort_order - b.critics.sort_order ||
        b.score - a.score ||
        a.created_at.localeCompare(b.created_at),
    )
    .map(
      (c): ImageCaption => ({
        id: c.id,
        content: c.content,
        upvotes: c.upvotes,
        downvotes: c.downvotes,
        score: c.score,
        postedAt: c.posted_at,
        isPublic: c.is_public,
        criticId: c.critic_id,
        critic: { slug: c.critics.slug, name: c.critics.name, emoji: c.critics.emoji },
        rating: c.rating,
        tip: c.tip,
      }),
    );

  return {
    id: row.id,
    url: publicImageUrl(supabase, row.image_path),
    topic: row.topic,
    createdAt: row.created_at,
    isOwner: user?.id === row.user_id,
    captions,
  };
});

export async function getMyImages(): Promise<MyImage[]> {
  const user = await getUser();
  if (!user) return [];

  const supabase = await createClient();
  // images select also returns other people's posted photos, so filter to mine
  const { data, error } = await supabase
    .from("images")
    .select("id, image_path, created_at, captions(is_public, score)")
    .eq("user_id", user.id)
    .not("topic", "is", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Loading your photos failed:", error.message);
    return [];
  }

  return ((data ?? []) as unknown as MyImageRow[]).map((row) => {
    const captions = row.captions ?? [];
    return {
      id: row.id,
      url: publicImageUrl(supabase, row.image_path),
      createdAt: row.created_at,
      totalRoasts: captions.length,
      postedRoasts: captions.filter((c) => c.is_public).length,
      totalScore: captions.reduce((sum, c) => sum + c.score, 0),
    };
  });
}

// The signed-in user's own votes, keyed by caption id, so arrows can show as pressed
export async function getMyVotes(captionIds: string[]): Promise<Record<string, VoteValue>> {
  const ids = [...new Set(captionIds.filter(isUuid))];
  if (ids.length === 0) return {};

  const user = await getUser();
  if (!user) return {};

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("caption_votes")
    .select("caption_id, value")
    .eq("user_id", user.id)
    .in("caption_id", ids);

  if (error) {
    console.error("Loading your votes failed:", error.message);
    return {};
  }

  const votes: Record<string, VoteValue> = {};
  for (const row of (data ?? []) as { caption_id: string; value: number }[]) {
    if (row.value === 1 || row.value === -1) votes[row.caption_id] = row.value;
  }
  return votes;
}

// Roast runs the user started in the last 24 hours, failed ones included.
// Null when the count fails, so callers can refuse to spend quota they can't
// account for.
export async function countRecentGenerations(userId: string): Promise<number | null> {
  const supabase = await createClient();
  const since = new Date(Date.now() - DAY_MS).toISOString();
  const { count, error } = await supabase
    .from("generation_attempts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);

  if (error) {
    console.error("Counting recent generations failed:", error.message);
    return null;
  }
  return count ?? 0;
}
