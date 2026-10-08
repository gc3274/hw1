"use server";

import { refresh } from "next/cache";
import { getUser } from "@/lib/dal";
import { isUuid, parseVoteValue, type VoteValue } from "@/lib/captions";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };

const VOTE_ERROR = "Couldn't save your vote. Please try again.";
const NOT_POSTED = "You can only vote on posted captions.";

// 0 clears the vote. RLS keeps every vote row private to its owner and only
// lets votes land on posted captions; the counters update through a trigger.
export async function castVote(captionId: string, value: VoteValue): Promise<Result> {
  // Signed-out clicks get a message, not a redirect, so the button can show a login prompt
  const user = await getUser();
  if (!user) return { ok: false, error: "Sign in to vote." };

  const vote = parseVoteValue(value);
  if (!isUuid(captionId) || vote === null) return { ok: false, error: "Invalid vote." };

  const supabase = await createClient();
  const { data: existing, error: readError } = await supabase
    .from("caption_votes")
    .select("value")
    .eq("caption_id", captionId)
    .eq("user_id", user.id)
    .maybeSingle<{ value: number }>();
  if (readError) {
    console.error("Vote lookup failed:", readError.message);
    return { ok: false, error: VOTE_ERROR };
  }

  // Never upsert here: ON CONFLICT DO UPDATE would need an update grant on caption_id
  const update = async (next: 1 | -1): Promise<Result> => {
    const { data, error } = await supabase
      .from("caption_votes")
      .update({ value: next })
      .eq("caption_id", captionId)
      .eq("user_id", user.id)
      .select("caption_id");
    if (error?.code === "42501") return { ok: false, error: NOT_POSTED };
    if (error) {
      console.error("Vote update failed:", error.message);
      return { ok: false, error: VOTE_ERROR };
    }
    // The row vanished between the read and the write (cleared in another tab)
    if (!data?.length) return { ok: false, error: VOTE_ERROR };
    return { ok: true };
  };

  let result: Result = { ok: true };
  if (vote === 0) {
    if (existing) {
      const { error } = await supabase
        .from("caption_votes")
        .delete()
        .eq("caption_id", captionId)
        .eq("user_id", user.id);
      if (error) {
        console.error("Vote delete failed:", error.message);
        result = { ok: false, error: VOTE_ERROR };
      }
    }
  } else if (!existing) {
    const { error } = await supabase
      .from("caption_votes")
      .insert({ caption_id: captionId, value: vote });
    if (error?.code === "23505") {
      // A double click raced us to the insert
      result = await update(vote);
    } else if (error?.code === "42501") {
      result = { ok: false, error: NOT_POSTED };
    } else if (error?.code === "23503") {
      result = { ok: false, error: "Caption not found." };
    } else if (error) {
      console.error("Vote insert failed:", error.message);
      result = { ok: false, error: VOTE_ERROR };
    }
  } else if (existing.value !== vote) {
    result = await update(vote);
  }

  if (!result.ok) return result;
  refresh();
  return { ok: true };
}

// Post makes a caption public (feed + voting); Unpost hides it again.
// RLS limits this to the caption's owner; the posted_at stamp comes from a trigger.
export async function setCaptionPosted(captionId: string, posted: boolean): Promise<Result> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Sign in to post captions." };
  if (!isUuid(captionId) || typeof posted !== "boolean") {
    return { ok: false, error: "Invalid request." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("captions")
    .update({ is_public: posted })
    .eq("id", captionId)
    .eq("user_id", user.id)
    .select("id");

  if (error) {
    console.error("Caption post toggle failed:", error.message);
    return { ok: false, error: "Couldn't update that caption. Please try again." };
  }
  // RLS filters silently: zero rows means it isn't yours or doesn't exist
  if (!data?.length) return { ok: false, error: "Caption not found." };

  refresh();
  return { ok: true };
}
