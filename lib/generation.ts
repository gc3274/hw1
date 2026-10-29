import "server-only";
import {
  CALLABLE_PROVIDER,
  CHAIN_SELECT,
  DEFAULT_CHAIN,
  EXAMPLES_MAX,
  TERMS_MAX,
  clipText,
  pickChain,
  responseRow,
  toChain,
  validateChain,
  type Chain,
  type ChainRow,
  type Example,
  type Price,
  type ResponseLog,
  type Term,
} from "@/lib/chains";
import {
  checkLimits,
  DAY_MS,
  DEFAULT_LIMITS,
  type LimitCheck,
  type Limits,
  type PostHistory,
} from "@/lib/limits";
import type { Topic } from "@/lib/roasts";
import { serviceDb } from "@/lib/supabase/service";

// The roast pipeline's settings and logs, through the service key: these
// tables have no grants for signed-in users, so the prompts stay private and
// nobody can write log rows of their own. Callers pass ids the server already
// checked (the session's user id, a request id from startRequest), never a
// value straight from the browser.

export type RequestStatus = "succeeded" | "rejected" | "busy" | "failed" | "limited";

export type ChainConfig = {
  chain: Chain;
  terms: Term[];
  examples: Example[];
  // By model id; models without a price are left out, so their calls have no cost
  prices: Map<string, Price>;
  // Anything that went wrong picking the chain, for the request's log
  problem: string | null;
};

type Db = ReturnType<typeof serviceDb>;

const message = (err: unknown) => (err instanceof Error ? err.message : String(err));

// The request row as the database wrote it; created_at stays the database's
// string, which keeps the microseconds a JS Date would drop
export type StartedRequest = { id: string; createdAt: string };

// Written before the model is called, so failed and parallel runs count
// toward the daily limit. Null when it can't be written: the caller refuses
// to start a run it can't count.
export async function startRequest(input: {
  userId: string;
  imagePath: string;
  topic: Topic;
}): Promise<StartedRequest | null> {
  try {
    const { data, error } = await serviceDb()
      .from("generation_requests")
      .insert({ user_id: input.userId, source: "app", image_path: input.imagePath, topic: input.topic })
      .select("id, created_at")
      .single<{ id: string; created_at: string }>();
    if (error || !data) {
      console.error("Logging the roast request failed:", error?.message ?? "no row");
      return null;
    }
    return { id: data.id, createdAt: data.created_at };
  } catch (err) {
    console.error("Logging the roast request failed:", message(err));
    return null;
  }
}

// Most rows a history read needs: no limit goes above 100
const HISTORY_MAX = 200;

// The user's roast runs in the last 24 hours, failed ones included and
// refused ones (limited) left out, so a refused try never uses up a post or
// restarts the wait. With `before`, only the runs that started before that
// one, so of two posts at once the earlier one goes ahead. Null when the read
// fails, so callers can refuse to spend quota they can't account for.
export async function postHistory(userId: string, before?: StartedRequest): Promise<PostHistory | null> {
  try {
    let query = serviceDb()
      .from("generation_requests")
      .select("created_at")
      .eq("user_id", userId)
      .eq("source", "app")
      .neq("status", "limited")
      .gte("created_at", new Date(Date.now() - DAY_MS).toISOString());
    if (before) {
      query = query.or(`created_at.lt."${before.createdAt}",and(created_at.eq."${before.createdAt}",id.lt.${before.id})`);
    }
    const { data, error } = await query.order("created_at", { ascending: false }).limit(HISTORY_MAX);
    if (error) {
      console.error("Reading recent roast requests failed:", error.message);
      return null;
    }
    const times = ((data ?? []) as { created_at: string }[]).map((r) => Date.parse(r.created_at));
    return {
      used: times.length,
      lastAt: times.length > 0 ? times[0] : null,
      oldestAt: times.length > 0 ? times[times.length - 1] : null,
    };
  } catch (err) {
    console.error("Reading recent roast requests failed:", message(err));
    return null;
  }
}

type SettingsRow = {
  posts_per_day: number;
  seconds_between_posts: number;
  daily_budget_usd: number | string | null;
};

// The limits the admin set. The defaults when the row is missing; null when
// the read fails, so the caller refuses rather than run without them.
export async function loadLimits(): Promise<Limits | null> {
  try {
    const { data, error } = await serviceDb()
      .from("generation_settings")
      .select("posts_per_day, seconds_between_posts, daily_budget_usd")
      .maybeSingle<SettingsRow>();
    if (error) {
      console.error("Reading the roast limits failed:", error.message);
      return null;
    }
    if (!data) return DEFAULT_LIMITS;
    const budget = data.daily_budget_usd === null ? null : Number(data.daily_budget_usd);
    return {
      postsPerDay: data.posts_per_day,
      secondsBetweenPosts: data.seconds_between_posts,
      dailyBudgetUsd: budget !== null && Number.isFinite(budget) ? budget : null,
    };
  } catch (err) {
    console.error("Reading the roast limits failed:", message(err));
    return null;
  }
}

// What the logged model calls cost in the last 24 hours, admin runs included.
// Unpriced calls count as 0. Null when the read fails.
export async function spentToday(): Promise<number | null> {
  try {
    const { data, error } = await serviceDb().rpc("llm_spend_since", {
      p_since: new Date(Date.now() - DAY_MS).toISOString(),
    });
    if (error) {
      console.error("Adding up the roast spend failed:", error.message);
      return null;
    }
    const spent = Number(data);
    return Number.isFinite(spent) ? spent : null;
  } catch (err) {
    console.error("Adding up the roast spend failed:", message(err));
    return null;
  }
}

// Where the user stands before posting, for the /new page. check and
// remaining are null when a read failed; the post action checks again anyway.
export async function postingStatus(userId: string): Promise<{
  limits: Limits | null;
  remaining: number | null;
  check: LimitCheck | null;
  now: number;
}> {
  const [limits, history, spentUsd] = await Promise.all([loadLimits(), postHistory(userId), spentToday()]);
  const now = Date.now();
  if (!limits || !history) return { limits, remaining: null, check: null, now };
  const remaining = Math.max(0, limits.postsPerDay - history.used);
  if (limits.dailyBudgetUsd !== null && spentUsd === null) return { limits, remaining, check: null, now };
  return { limits, remaining, check: checkLimits({ limits, history, spentUsd, now }), now };
}

type ChainRead = { chain: Chain; problem: null } | { chain: null; problem: string };

async function readChain(db: Db, by: { id: number } | "default"): Promise<ChainRead> {
  const query = db.from("prompt_chains").select(CHAIN_SELECT);
  const { data, error } = await (by === "default" ? query.eq("is_default", true) : query.eq("id", by.id)).maybeSingle<ChainRow>();
  const name = by === "default" ? "the default chain" : `chain ${by.id}`;
  if (error) return { chain: null, problem: `reading ${name} failed: ${error.message}` };
  if (!data) return { chain: null, problem: `${name} not found` };

  const chain = toChain(data);
  if (!chain) return { chain: null, problem: `${data.slug} has a step without a usable model` };
  const problems = validateChain(chain);
  if (problems.length > 0) return { chain: null, problem: `${data.slug}: ${problems.join(" ")}` };
  return { chain, problem: null };
}

async function pickConfiguredChain(db: Db): Promise<{ chain: Chain | null; problems: string[] }> {
  const problems: string[] = [];
  const { data: mix, error } = await db.from("prompt_chain_mix").select("prompt_chain_id, weight");
  let tried: number | null = null;

  if (error) {
    problems.push(`reading the mix failed: ${error.message}`);
  } else {
    tried = pickChain(
      ((mix ?? []) as { prompt_chain_id: number; weight: number }[]).map((m) => ({
        chainId: m.prompt_chain_id,
        weight: m.weight,
      })),
      Math.random(),
    );
    if (tried === null) {
      problems.push("no chain has a weight above 0");
    } else {
      const picked = await readChain(db, { id: tried });
      if (picked.chain) return { chain: picked.chain, problems };
      problems.push(picked.problem);
    }
  }

  // The default chain the admin picked, unless it was the one that just failed
  const fallback = await readChain(db, "default");
  if (fallback.chain && fallback.chain.id !== tried) return { chain: fallback.chain, problems };
  if (!fallback.chain) problems.push(fallback.problem);
  return { chain: null, problems };
}

type PriceRow = {
  provider_model_id: string;
  input_usd_per_million: number | string | null;
  output_usd_per_million: number | string | null;
};

function toPrices(rows: PriceRow[]): Map<string, Price> {
  const prices = new Map<string, Price>();
  for (const row of rows) {
    const inputPerMillion = Number(row.input_usd_per_million);
    const outputPerMillion = Number(row.output_usd_per_million);
    if (row.input_usd_per_million === null || row.output_usd_per_million === null) continue;
    if (!Number.isFinite(inputPerMillion) || !Number.isFinite(outputPerMillion)) continue;
    prices.set(row.provider_model_id, { inputPerMillion, outputPerMillion });
  }
  return prices;
}

// The chain this run uses (picked by the mix), plus the topic's terms and
// examples. Never throws: when the database has no usable chain, the run uses
// the built-in DEFAULT_CHAIN and says so in `problem`.
export async function loadChainConfig(topic: Topic): Promise<ChainConfig> {
  let db: Db;
  try {
    db = serviceDb();
  } catch (err) {
    return {
      chain: DEFAULT_CHAIN,
      terms: [],
      examples: [],
      prices: new Map(),
      problem: clipText(`config_fallback: ${message(err)}`),
    };
  }

  const problems: string[] = [];
  let chain: Chain;
  try {
    const picked = await pickConfiguredChain(db);
    problems.push(...picked.problems);
    if (picked.chain) {
      chain = picked.chain;
    } else {
      chain = DEFAULT_CHAIN;
      problems.unshift("config_fallback");
    }
  } catch (err) {
    chain = DEFAULT_CHAIN;
    problems.unshift("config_fallback", message(err));
  }

  const forTopic = `topic.is.null,topic.eq.${topic}`;
  const [termsRead, examplesRead, pricesRead] = await Promise.all([
    db
      .from("terms")
      .select("term, definition, example")
      .or(forTopic)
      .order("priority", { ascending: false })
      .order("term")
      .limit(TERMS_MAX),
    db
      .from("generation_examples")
      .select("image_description, roast, tip, score, explanation")
      .or(forTopic)
      .order("priority", { ascending: false })
      .order("id")
      .limit(EXAMPLES_MAX),
    // Every priced model the app can call, so the fallback and the built-in
    // chain are priced too
    db
      .from("llm_models")
      .select("provider_model_id, input_usd_per_million, output_usd_per_million, llm_providers!inner(slug)")
      .eq("llm_providers.slug", CALLABLE_PROVIDER)
      .not("input_usd_per_million", "is", null),
  ]).catch((err: unknown) => {
    problems.push(`reading terms, examples and prices failed: ${message(err)}`);
    return [null, null, null] as const;
  });

  if (termsRead?.error) problems.push(`reading terms failed: ${termsRead.error.message}`);
  if (examplesRead?.error) problems.push(`reading examples failed: ${examplesRead.error.message}`);
  if (pricesRead?.error) problems.push(`reading prices failed: ${pricesRead.error.message}`);

  const terms = ((termsRead && !termsRead.error ? termsRead.data : null) ?? []) as Term[];
  const examples = (
    ((examplesRead && !examplesRead.error ? examplesRead.data : null) ?? []) as {
      image_description: string;
      roast: string;
      tip: string | null;
      score: number;
      explanation: string;
    }[]
  ).map((e) => ({
    imageDescription: e.image_description,
    roast: e.roast,
    tip: e.tip,
    score: e.score,
    explanation: e.explanation,
  }));

  const prices = toPrices(
    ((pricesRead && !pricesRead.error ? pricesRead.data : null) ?? []) as PriceRow[],
  );

  const unique = [...new Set(problems)];
  return { chain, terms, examples, prices, problem: unique.length > 0 ? clipText(unique.join("; ")) : null };
}

// Best effort: a lost log row never breaks a roast
export async function logResponse(requestId: string, log: ResponseLog): Promise<void> {
  try {
    const { error } = await serviceDb().from("llm_responses").insert(responseRow(requestId, log));
    if (error) console.warn("Logging a model response failed:", error.message);
  } catch (err) {
    console.warn("Logging a model response failed:", message(err));
  }
}

// Best effort, and only from pending, so a finished run is never rewritten
export async function finishRequest(
  requestId: string,
  outcome: {
    status: RequestStatus;
    error: string | null;
    chainId: number | null;
    imageId: string | null;
    roastCount: number;
    durationMs: number;
  },
): Promise<void> {
  try {
    const { error } = await serviceDb()
      .from("generation_requests")
      .update({
        status: outcome.status,
        error: outcome.error === null ? null : clipText(outcome.error),
        prompt_chain_id: outcome.chainId,
        image_id: outcome.imageId,
        roast_count: outcome.roastCount,
        duration_ms: Math.max(0, Math.round(outcome.durationMs)),
        finished_at: new Date().toISOString(),
      })
      .eq("id", requestId)
      .eq("status", "pending");
    if (error) console.warn("Finishing the roast request log failed:", error.message);
  } catch (err) {
    console.warn("Finishing the roast request log failed:", message(err));
  }
}
