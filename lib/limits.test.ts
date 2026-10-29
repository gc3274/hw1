import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DAY_MS, DEFAULT_LIMITS, checkLimits, limitMessage, waitText, type Limits, type PostHistory } from "./limits";

const now = Date.UTC(2026, 10, 4, 15, 0, 0);
const none: PostHistory = { used: 0, lastAt: null, oldestAt: null };
const limits = (over: Partial<Limits> = {}): Limits => ({ ...DEFAULT_LIMITS, ...over });

describe("checkLimits", () => {
  it("lets a first post through", () => {
    expect(checkLimits({ limits: limits(), history: none, spentUsd: null, now })).toEqual({ ok: true });
  });

  it("stops the post that would go over the daily limit, and says when one frees up", () => {
    const history = { used: 5, lastAt: now - 1_000, oldestAt: now - 3 * 60 * 60 * 1000 };
    expect(checkLimits({ limits: limits(), history, spentUsd: null, now })).toEqual({
      ok: false,
      reason: "daily",
      retryAt: now - 3 * 60 * 60 * 1000 + DAY_MS,
    });
    expect(checkLimits({ limits: limits(), history: { ...history, used: 4 }, spentUsd: null, now }).ok).toBe(true);
  });

  it("makes a user wait between posts", () => {
    const history = { used: 1, lastAt: now - 20_000, oldestAt: now - 20_000 };
    expect(checkLimits({ limits: limits({ secondsBetweenPosts: 60 }), history, spentUsd: null, now })).toEqual({
      ok: false,
      reason: "wait",
      retryAt: now + 40_000,
    });
    expect(checkLimits({ limits: limits({ secondsBetweenPosts: 20 }), history, spentUsd: null, now }).ok).toBe(true);
    expect(checkLimits({ limits: limits(), history, spentUsd: null, now }).ok).toBe(true);
  });

  it("stops everyone once the budget is spent", () => {
    const capped = limits({ dailyBudgetUsd: 2 });
    expect(checkLimits({ limits: capped, history: none, spentUsd: 2, now })).toEqual({
      ok: false,
      reason: "budget",
      retryAt: null,
    });
    expect(checkLimits({ limits: capped, history: none, spentUsd: 1.99, now }).ok).toBe(true);
    // A $0 budget pauses roasting
    expect(checkLimits({ limits: limits({ dailyBudgetUsd: 0 }), history: none, spentUsd: 0, now }).ok).toBe(false);
  });

  it("refuses when the budget is set but the spend couldn't be read", () => {
    expect(checkLimits({ limits: limits({ dailyBudgetUsd: 5 }), history: none, spentUsd: null, now })).toMatchObject({
      reason: "budget",
    });
  });

  it("checks the budget before the user's own limits", () => {
    const history = { used: 9, lastAt: now, oldestAt: now };
    expect(checkLimits({ limits: limits({ dailyBudgetUsd: 1 }), history, spentUsd: 3, now })).toMatchObject({
      reason: "budget",
    });
  });
});

describe("waitText", () => {
  it.each([
    [400, "1 second"],
    [45_000, "45 seconds"],
    [60_000, "1 minute"],
    [61_000, "2 minutes"],
    [59 * 60_000, "59 minutes"],
    [60 * 60_000, "about 1 hour"],
    [5.2 * 60 * 60_000, "about 6 hours"],
  ])("%d ms reads %s", (ms, text) => {
    expect(waitText(ms)).toBe(text);
  });
});

describe("limitMessage", () => {
  it("names the wait", () => {
    expect(limitMessage({ ok: false, reason: "wait", retryAt: now + 90_000 }, limits(), now)).toContain(
      "You can post again in 2 minutes.",
    );
  });

  it("names the daily limit and when a post frees up", () => {
    const text = limitMessage({ ok: false, reason: "daily", retryAt: now + 2 * 60 * 60_000 }, limits(), now);
    expect(text).toContain("all 5 posts");
    expect(text).toContain("about 2 hours");
  });
});

describe("DEFAULT_LIMITS", () => {
  it("matches the defaults in the migration", () => {
    const sql = readFileSync(
      new URL("../supabase/migrations/20261104120000_editable_chains_limits_costs.sql", import.meta.url),
      "utf8",
    );
    expect(sql).toContain(`posts_per_day         smallint not null default ${DEFAULT_LIMITS.postsPerDay},`);
    expect(sql).toContain(`seconds_between_posts integer not null default ${DEFAULT_LIMITS.secondsBetweenPosts},`);
    expect(DEFAULT_LIMITS.dailyBudgetUsd).toBeNull();
  });
});
