"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/dal";
import { doneHref, isUuid, parseVoteValue, validateCaptionChoices, type VoteValue } from "@/lib/captions";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };

const VOTE_ERROR = "Couldn't save your vote. Please try again.";
const NOT_POSTED = "You can only vote on posted roasts.";

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
      result = { ok: false, error: "That roast no longer exists." };
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

const SAVE_FAILED = "Couldn’t save your choices. Please try again.";

// Done on the caption review screen: makes the switched captions public or
// private in one go, then leaves the page. RLS and the update(is_public) column
// grant limit this to the caption's owner; posted_at comes from a trigger.
export async function saveCaptionChoices(
  imageId: string,
  toPost: string[],
  toHide: string[],
): Promise<{ ok: false; error: string }> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Sign in to post your roasts." };

  const input = validateCaptionChoices(imageId, toPost, toHide);
  if (!input.ok) return input;

  const supabase = await createClient();
  const apply = async (ids: string[], isPublic: boolean) => {
    if (ids.length === 0) return true;
    const { data, error } = await supabase
      .from("captions")
      .update({ is_public: isPublic })
      .in("id", ids)
      .eq("image_id", input.imageId)
      .eq("user_id", user.id)
      .select("id");
    if (error) {
      console.error("Saving caption choices failed:", error.message);
      return false;
    }
    // RLS filters silently: fewer rows means some aren't yours or are gone
    return (data?.length ?? 0) === ids.length;
  };

  const saved = (await apply(input.toPost, true)) && (await apply(input.toHide, false));
  if (!saved) {
    // Re-render with what actually stuck so a retry only sends the rest
    refresh();
    return { ok: false, error: SAVE_FAILED };
  }

  const { count, error } = await supabase
    .from("captions")
    .select("id", { count: "exact", head: true })
    .eq("image_id", input.imageId)
    .eq("is_public", true);
  if (error) console.error("Counting public captions failed:", error.message);
  refresh();
  redirect(doneHref(error ? input.toPost.length > 0 : (count ?? 0) > 0));
}
