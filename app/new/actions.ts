"use server";

import { redirect } from "next/navigation";
import { requireCompleteProfile } from "@/lib/dal";
import { RUN_BUDGET_MS } from "@/lib/chains";
import { generateRoasts } from "@/lib/gemini";
import {
  countRecentRequests,
  finishRequest,
  loadChainConfig,
  logResponse,
  startRequest,
  type RequestStatus,
} from "@/lib/generation";
import { getCritics } from "@/lib/images";
import {
  DAILY_GENERATION_LIMIT,
  IMAGE_BUCKET,
  IMAGE_MAX_BYTES,
  isOwnImagePath,
  readContext,
} from "@/lib/captions";
import { parseTopic, type Topic } from "@/lib/roasts";
import { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;
type Failure = { ok: false; error: string };
// status and detail go to the request log; error is what the user sees.
// keepUpload: the path already belongs to another post, so cleanup must not touch it.
type StepFailure = Failure & { status: RequestStatus; detail: string; keepUpload?: boolean };
type StepResult = { ok: true; id: string; roastCount: number } | StepFailure;
// Filled in as the run goes, so the caller can log and roll back even if a later step throws
type Run = {
  imageId: string | null;
  requestId: string | null;
  chainId: number | null;
  configProblem: string | null;
};

const ROAST_ERROR = "The critics couldn't judge that photo. Please try again.";
const START_ERROR = "Couldn't start your post. Please try again.";

const ROAST_REASON_COPY = {
  rejected:
    "The critics only judge things you made: the dish, the drawing, the room or the fit. Try another photo.",
  busy: "The critics are swamped. Try again in a minute.",
  not_configured: ROAST_ERROR,
  failed: ROAST_ERROR,
} as const;

const fail = (error: string, status: RequestStatus, detail: string): StepFailure => ({
  ok: false,
  error,
  status,
  detail,
});

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

// Everything after the upload check
async function processUpload(
  supabase: Supabase,
  userId: string,
  path: string,
  context: string,
  topic: Topic,
  run: Run,
  startedAt: number,
): Promise<StepResult> {
  // Log the request before counting, so parallel requests and failed runs
  // all count toward the cap
  run.requestId = await startRequest({ userId, imagePath: path, topic });
  if (!run.requestId) return fail(START_ERROR, "failed", "The request couldn't be logged.");
  const recent = await countRecentRequests(userId);
  if (recent === null) return fail(START_ERROR, "failed", "Counting recent requests failed.");
  if (recent > DAILY_GENERATION_LIMIT) {
    return fail(
      `You've used all ${DAILY_GENERATION_LIMIT} of today's posts. The critics clock back in tomorrow.`,
      "limited",
      "Over the daily limit.",
    );
  }

  const { data: file, error: downloadError } = await supabase.storage
    .from(IMAGE_BUCKET)
    .download(path);
  if (downloadError || !file) {
    console.error("Image download failed:", downloadError?.message ?? "no data");
    return fail("Couldn't read your photo. Please try again.", "failed", "The photo couldn't be downloaded.");
  }
  if (file.size > IMAGE_MAX_BYTES) {
    return fail("That photo is too big. Please try a smaller one.", "failed", "The photo is over 5 MB.");
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!isJpeg(bytes)) {
    return fail("That file isn't a photo we can read. Please try another.", "failed", "The file isn't a JPEG.");
  }

  const imageData = { data: Buffer.from(bytes).toString("base64"), mimeType: "image/jpeg" as const };
  return roastUpload(supabase, run.requestId, path, context, topic, imageData, run, startedAt);
}

// Column grants only allow image_path, context and topic; id and user_id come from defaults
async function saveImage(
  supabase: Supabase,
  path: string,
  context: string,
  topic: Topic,
  run: Run,
): Promise<{ ok: true; id: string } | StepFailure> {
  const { data: image, error: imageError } = await supabase
    .from("images")
    .insert({ image_path: path, context: context || null, topic })
    .select("id")
    .single<{ id: string }>();
  if (imageError?.code === "23505") {
    return { ...fail("That photo is already posted.", "failed", "The photo path is already posted."), keepUpload: true };
  }
  if (imageError || !image) {
    console.error("Image save failed:", imageError?.message ?? "no row");
    return fail("Couldn't save your post. Please try again.", "failed", "Saving the post failed.");
  }
  run.imageId = image.id;
  return { ok: true, id: image.id };
}

async function roastUpload(
  supabase: Supabase,
  requestId: string,
  path: string,
  context: string,
  topic: Topic,
  image: { data: string; mimeType: "image/jpeg" },
  run: Run,
  startedAt: number,
): Promise<StepResult> {
  const critics = await getCritics(topic);
  if (critics.length === 0) return fail(ROAST_ERROR, "failed", "No critics loaded.");

  // The chain comes from the mix; when the database has no usable one, the
  // built-in chain runs and configProblem says why
  const config = await loadChainConfig(topic);
  run.chainId = config.chain.id;
  run.configProblem = config.problem;

  const result = await generateRoasts({
    chain: config.chain,
    context: { topic, critics, note: context, terms: config.terms, examples: config.examples },
    image,
    deadline: startedAt + RUN_BUDGET_MS,
    onResponse: (log) => logResponse(requestId, log),
  });
  if (!result.ok) {
    return fail(
      ROAST_REASON_COPY[result.reason],
      result.reason === "not_configured" ? "failed" : result.reason,
      result.error,
    );
  }

  const saved = await saveImage(supabase, path, context, topic, run);
  if (!saved.ok) return saved;

  // Every roast keeps the last step's prompt and the model that answered it
  const { error } = await supabase.from("captions").insert(
    result.roasts.map((r) => ({
      image_id: saved.id,
      critic_id: r.criticId,
      content: r.content,
      tip: r.tip,
      rating: r.rating,
      prompt: result.prompt,
      model: result.model,
    })),
  );
  if (error) {
    console.error("Roast save failed:", error.message);
    return fail("Couldn't save your roasts. Please try again.", "failed", `Saving the roasts failed: ${error.message}`);
  }
  return { ok: true, id: saved.id, roastCount: result.roasts.length };
}

// The browser uploads straight to Storage; only the object path comes through here.
// On success this redirects to the new photo's page and never returns.
// The critics on the topic's panel roast the photo.
export async function createImage(path: string, context: string, topicSlug: string): Promise<Failure> {
  // The model calls' time budget counts from here, so slow checks shrink it
  // instead of pushing the route past its limit
  const startedAt = Date.now();
  // Same gate as the /new page, so a direct POST can't skip onboarding
  const { user } = await requireCompleteProfile();
  if (!isOwnImagePath(user.id, path)) return { ok: false, error: "Invalid upload." };
  const note = readContext(context);
  // Also covers a crafted call that leaves the topic out
  const topic = parseTopic(topicSlug);
  if (!topic) return { ok: false, error: "Pick a topic first." };

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

  const run: Run = { imageId: null, requestId: null, chainId: null, configProblem: null };
  let outcome: StepResult;
  try {
    outcome = await processUpload(supabase, user.id, path, note, topic, run, startedAt);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Creating post failed:", message);
    outcome = fail(ROAST_ERROR, "failed", `Unexpected error: ${message}`);
  }

  if (run.requestId) {
    const notes = [outcome.ok ? null : outcome.detail, run.configProblem].filter(Boolean);
    await finishRequest(run.requestId, {
      status: outcome.ok ? "succeeded" : outcome.status,
      error: notes.length > 0 ? notes.join(" ") : null,
      chainId: run.chainId,
      imageId: outcome.ok ? outcome.id : null,
      roastCount: outcome.ok ? outcome.roastCount : 0,
      durationMs: Date.now() - startedAt,
    });
  }

  if (!outcome.ok) {
    if (!outcome.keepUpload) await discard(supabase, path, run.imageId);
    return { ok: false, error: outcome.error };
  }

  // Outside any try/catch: redirect() works by throwing
  redirect(`/images/${outcome.id}`);
}
