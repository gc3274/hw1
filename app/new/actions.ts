"use server";

import { redirect } from "next/navigation";
import { requireCompleteProfile } from "@/lib/dal";
import { generateCaptions } from "@/lib/gemini";
import { countRecentGenerations, getFlavors } from "@/lib/images";
import {
  DAILY_GENERATION_LIMIT,
  IMAGE_BUCKET,
  IMAGE_MAX_BYTES,
  isOwnImagePath,
  readContext,
} from "@/lib/captions";
import { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;
type Failure = { ok: false; error: string };
// keepUpload: the path already belongs to another post, so cleanup must not touch it
type StepResult = { ok: true; id: string } | (Failure & { keepUpload?: boolean });

const GENERIC_ERROR = "Couldn't write captions for that photo. Please try again.";

const REASON_COPY = {
  rejected: "We can't caption that photo. Try a different one.",
  busy: "Caption writer is busy, try again in a minute.",
  not_configured: GENERIC_ERROR,
  failed: GENERIC_ERROR,
} as const;

// JPEG files always start with FF D8 FF
const isJpeg = (bytes: Uint8Array) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;

// Best effort: the images row first (its captions cascade), then the file
async function discard(supabase: Supabase, path: string, imageId: string | null) {
  if (imageId) {
    try {
      const { error } = await supabase.from("images").delete().eq("id", imageId);
      if (error) console.warn("Image row cleanup failed:", error.message);
    } catch (err) {
      console.warn("Image row cleanup failed:", err instanceof Error ? err.message : err);
    }
  }
  try {
    const { error } = await supabase.storage.from(IMAGE_BUCKET).remove([path]);
    if (error) console.warn("Image file cleanup failed:", error.message);
  } catch (err) {
    console.warn("Image file cleanup failed:", err instanceof Error ? err.message : err);
  }
}

// Everything after the upload check. Records the new row's id in `created`
// so the caller can roll it back even if a later step throws.
async function captionUpload(
  supabase: Supabase,
  userId: string,
  path: string,
  context: string,
  created: { imageId: string | null },
): Promise<StepResult> {
  // Log the attempt before counting, so parallel requests and failed runs
  // all count toward the cap
  const { error: attemptError } = await supabase
    .from("generation_attempts")
    .insert({ image_path: path });
  if (attemptError) {
    console.error("Logging generation attempt failed:", attemptError.message);
    return { ok: false, error: "Couldn't start your post. Please try again." };
  }
  const recent = await countRecentGenerations(userId);
  if (recent === null) return { ok: false, error: "Couldn't start your post. Please try again." };
  if (recent > DAILY_GENERATION_LIMIT) {
    return {
      ok: false,
      error: `You've used today's ${DAILY_GENERATION_LIMIT} photo uploads. Come back tomorrow!`,
    };
  }

  const { data: file, error: downloadError } = await supabase.storage
    .from(IMAGE_BUCKET)
    .download(path);
  if (downloadError || !file) {
    console.error("Image download failed:", downloadError?.message ?? "no data");
    return { ok: false, error: "Couldn't read your photo. Please try again." };
  }
  if (file.size > IMAGE_MAX_BYTES) {
    return { ok: false, error: "That photo is too big. Please try a smaller one." };
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!isJpeg(bytes)) {
    return { ok: false, error: "That file isn't a photo we can read. Please try another." };
  }

  const flavors = await getFlavors();
  if (flavors.length === 0) return { ok: false, error: GENERIC_ERROR };

  const result = await generateCaptions({
    image: { data: Buffer.from(bytes).toString("base64"), mimeType: "image/jpeg" },
    context,
    flavors,
  });
  if (!result.ok) return { ok: false, error: REASON_COPY[result.reason] };

  // Column grants only allow image_path and context; id and user_id come from defaults
  const { data: image, error: imageError } = await supabase
    .from("images")
    .insert({ image_path: path, context: context || null })
    .select("id")
    .single<{ id: string }>();
  if (imageError?.code === "23505") {
    return { ok: false, error: "That photo is already posted.", keepUpload: true };
  }
  if (imageError || !image) {
    console.error("Image save failed:", imageError?.message ?? "no row");
    return { ok: false, error: "Couldn't save your post. Please try again." };
  }
  created.imageId = image.id;

  // One statement, identical keys on every row (missing keys would become NULL)
  const { error: captionsError } = await supabase.from("captions").insert(
    result.captions.map((c) => ({
      image_id: image.id,
      humor_flavor_id: c.flavorId,
      content: c.content,
      prompt: result.prompt,
      model: result.model,
    })),
  );
  if (captionsError) {
    console.error("Caption save failed:", captionsError.message);
    return { ok: false, error: "Couldn't save your captions. Please try again." };
  }

  return { ok: true, id: image.id };
}

// The browser uploads straight to Storage; only the object path comes through here.
// On success this redirects to the new photo's page and never returns.
export async function createImage(path: string, context: string): Promise<Failure> {
  // Same gate as the /new page, so a direct POST can't skip onboarding
  const { user } = await requireCompleteProfile();
  if (!isOwnImagePath(user.id, path)) return { ok: false, error: "Invalid upload." };
  const note = readContext(context);

  const supabase = await createClient();

  let found = false;
  try {
    const { data } = await supabase.storage.from(IMAGE_BUCKET).exists(path);
    found = data;
  } catch {
    found = false;
  }
  if (!found) return { ok: false, error: "Upload not found. Please try again." };

  // A repeated submit of the same upload goes to the post it already made
  const { data: existing } = await supabase
    .from("images")
    .select("id")
    .eq("image_path", path)
    .eq("user_id", user.id)
    .maybeSingle<{ id: string }>();
  if (existing) redirect(`/images/${existing.id}`);

  const created: { imageId: string | null } = { imageId: null };
  let outcome: StepResult;
  try {
    outcome = await captionUpload(supabase, user.id, path, note, created);
  } catch (err) {
    console.error("Creating post failed:", err instanceof Error ? err.message : err);
    outcome = { ok: false, error: GENERIC_ERROR };
  }

  if (!outcome.ok) {
    if (!outcome.keepUpload) await discard(supabase, path, created.imageId);
    return { ok: false, error: outcome.error };
  }

  // Outside any try/catch: redirect() works by throwing
  redirect(`/images/${outcome.id}`);
}
