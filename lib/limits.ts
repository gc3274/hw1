// Shared by server code and tests, so nothing here may touch the server,
// Supabase or env. The limits on roast runs from the app: the admin area edits
// them (generation_settings) and every run checks them before calling a model.
// Admin runs never check them.

const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;

export type Limits = {
  // Runs per user in any 24 hours; refused tries don't count
  postsPerDay: number;
  // 0 = no wait
  secondsBetweenPosts: number;
  // Spend across everyone in any 24 hours; null = no cap
  dailyBudgetUsd: number | null;
};

// The generation_settings defaults, used when its row is missing
export const DEFAULT_LIMITS: Limits = { postsPerDay: 5, secondsBetweenPosts: 0, dailyBudgetUsd: null };

// A user's earlier runs in the last 24 hours, refused ones left out: when
// each started, in epoch ms, newest first
export type PostHistory = { times: number[] };

export type LimitReason = "budget" | "daily" | "wait";
export type LimitCheck = { ok: true } | { ok: false; reason: LimitReason; retryAt: number | null };

// For the request log
export const LIMIT_DETAIL: Record<LimitReason, string> = {
  budget: "Daily budget reached.",
  daily: "Over the daily limit.",
  wait: "Too soon after the last post.",
};

// The budget first: it stops everyone, so the user's own count doesn't matter.
// spentUsd is null when it wasn't read, which only passes with no budget set.
export function checkLimits(input: {
  limits: Limits;
  history: PostHistory;
  spentUsd: number | null;
  now: number;
}): LimitCheck {
  const { limits, history, spentUsd, now } = input;

  if (limits.dailyBudgetUsd !== null && (spentUsd === null || spentUsd >= limits.dailyBudgetUsd)) {
    return { ok: false, reason: "budget", retryAt: null };
  }
  const { times } = history;
  if (times.length >= limits.postsPerDay) {
    // A post frees up once fewer than postsPerDay are left in the window, so
    // when the postsPerDay-th newest turns 24 hours old. That's the oldest only
    // while the count is exactly at the limit; an admin may have lowered it.
    return { ok: false, reason: "daily", retryAt: times[limits.postsPerDay - 1] + DAY_MS };
  }
  if (limits.secondsBetweenPosts > 0 && times.length > 0) {
    const retryAt = times[0] + limits.secondsBetweenPosts * 1000;
    if (now < retryAt) return { ok: false, reason: "wait", retryAt };
  }
  return { ok: true };
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

// "45 seconds", "3 minutes", "about 5 hours"; rounded up, so the wait is never
// shorter than it says
export function waitText(ms: number): string {
  const seconds = Math.max(1, Math.ceil(ms / 1000));
  if (seconds < 60) return plural(seconds, "second");
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return plural(minutes, "minute");
  return `about ${plural(Math.ceil(minutes / 60), "hour")}`;
}

// What the user sees when a limit stops a post
export function limitMessage(check: Extract<LimitCheck, { ok: false }>, limits: Limits, now: number): string {
  const inTime = check.retryAt === null ? null : waitText(check.retryAt - now);
  switch (check.reason) {
    case "budget":
      // The window rolls, so a spent budget reopens as older runs age out; $0 is a pause
      return limits.dailyBudgetUsd === 0
        ? "The critics are off the clock: roasting is paused for now. Try again later."
        : "The critics are off the clock: the roasting budget for the last 24 hours is used up. Try again in a few hours.";
    case "daily":
      return `You’ve used all ${plural(limits.postsPerDay, "post")} for the last 24 hours. ${
        inTime ? `You can post again in ${inTime}.` : "The critics clock back in tomorrow."
      }`;
    case "wait":
      return `The critics need a breather between posts. You can post again in ${inTime ?? "a moment"}.`;
  }
}
