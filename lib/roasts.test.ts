import { describe, expect, it } from "vitest";
import {
  TOPICS,
  feedHref,
  groupByCritic,
  panelScore,
  parseRoastResponse,
  parseTopic,
  writingLines,
  type Critic,
  type CriticTag,
} from "./roasts";

const critics: Critic[] = [
  { id: 1, slug: "chef-scorch", name: "Chef Scorch", emoji: "🔥", description: "" },
  { id: 5, slug: "jaded-new-yorker", name: "Jaded New Yorker", emoji: "🗽", description: "" },
];

const review = (critic_slug: string, extra: Record<string, unknown> = {}) => ({
  critic_slug,
  roast: "This pasta is so soggy it filed for unemployment.",
  tip: "Salt the water and pull it a minute early.",
  score: 3,
  ...extra,
});

const parse = (body: unknown) => parseRoastResponse(JSON.stringify(body), critics);

describe("parseRoastResponse", () => {
  it("keeps one roast per critic in panel order", () => {
    const result = parse({
      allowed: true,
      reviews: [review("jaded-new-yorker"), review("chef-scorch"), review("chef-scorch", { roast: "Again?" })],
    });
    expect(result.ok && result.roasts.map((r) => r.criticId)).toEqual([1, 5]);
    expect(result.ok && result.roasts[0]).toMatchObject({ tip: "Salt the water and pull it a minute early.", rating: 3 });
  });

  it("rejects when the model says the photo isn't allowed", () => {
    expect(parse({ allowed: false, reviews: [] })).toEqual({ ok: false, reason: "rejected" });
  });

  it("ignores unknown critics and reports empty", () => {
    expect(parse({ allowed: true, reviews: [review("gordon")] })).toEqual({ ok: false, reason: "empty" });
  });

  it("clamps and rounds scores, and drops unreadable ones", () => {
    const result = parse({
      allowed: true,
      reviews: [review("chef-scorch", { score: 14 }), review("jaded-new-yorker", { score: "meh" })],
    });
    expect(result.ok && result.roasts.map((r) => r.rating)).toEqual([10, null]);
  });

  it("keeps the roast when the tip is missing", () => {
    const result = parse({ allowed: true, reviews: [review("chef-scorch", { tip: "" })] });
    expect(result.ok && result.roasts[0].tip).toBeNull();
  });

  it("returns invalid for non-JSON", () => {
    expect(parseRoastResponse("nope", critics)).toEqual({ ok: false, reason: "invalid" });
  });
});

describe("parseTopic", () => {
  it("accepts known topics only", () => {
    expect(parseTopic("food")).toBe("food");
    expect(parseTopic(["art"])).toBe("art");
    expect(parseTopic("selfies")).toBeNull();
  });
});

describe("panelScore", () => {
  it("averages scored critics to one decimal", () => {
    expect(panelScore([3, 4, null, 4])).toBe(3.7);
    expect(panelScore([null])).toBeNull();
  });
});

describe("feedHref", () => {
  it("keeps Top with no topic on the bare home page", () => {
    expect(feedHref("top", null)).toBe("/");
  });

  it("adds only the params that are set", () => {
    expect(feedHref("new", null)).toBe("/?sort=new");
    expect(feedHref("top", "food")).toBe("/?topic=food");
    expect(feedHref("new", "art", 48)).toBe("/?sort=new&topic=art&n=48");
  });

  it("never points at the old /roast feed", () => {
    for (const sort of ["top", "new"] as const) {
      for (const topic of [null, ...TOPICS.map((t) => t.slug)]) {
        expect(feedHref(sort, topic).startsWith("/roast")).toBe(false);
        expect(feedHref(sort, topic, 48).startsWith("/roast")).toBe(false);
      }
    }
  });
});

describe("writingLines", () => {
  const EXPERTS = { food: "Chef Scorch", art: "Vivienne Vex", room: "Reno Randy", fit: "Margaux" };

  it("gives every topic short lines that trail off", () => {
    for (const { slug } of TOPICS) {
      const lines = writingLines(slug);
      expect(lines.length).toBeGreaterThanOrEqual(2);
      for (const line of lines) {
        expect(line.endsWith("…")).toBe(true);
        expect(line.length).toBeLessThanOrEqual(48);
      }
    }
  });

  it("names each topic's own expert and no other topic's", () => {
    for (const [topic, expert] of Object.entries(EXPERTS)) {
      const text = writingLines(topic as keyof typeof EXPERTS).join("\n");
      expect(text).toContain(expert);
      for (const other of Object.values(EXPERTS)) {
        if (other !== expert) expect(text).not.toContain(other);
      }
    }
  });

  it("names no expert for anything", () => {
    const text = writingLines("anything").join("\n");
    for (const expert of Object.values(EXPERTS)) expect(text).not.toContain(expert);
  });

  it("opens with a different line per topic", () => {
    expect(writingLines("food")[0]).not.toBe(writingLines("art")[0]);
  });
});

describe("groupByCritic", () => {
  const scorch: CriticTag = { slug: "chef-scorch", name: "Chef Scorch", emoji: "🔥" };
  const jaded: CriticTag = { slug: "jaded-new-yorker", name: "Jaded New Yorker", emoji: "🗽" };
  const roast = (id: string, criticId: number, critic: CriticTag) => ({ id, criticId, critic });

  it("merges roasts that are not next to each other, in first-seen order", () => {
    const items = [roast("a", 5, jaded), roast("b", 1, scorch), roast("c", 5, jaded)];
    expect(groupByCritic(items)).toEqual([
      { id: 5, name: "🗽 Jaded New Yorker", roasts: [items[0], items[2]] },
      { id: 1, name: "🔥 Chef Scorch", roasts: [items[1]] },
    ]);
  });

  it("returns no groups for no roasts", () => {
    expect(groupByCritic([])).toEqual([]);
  });
});
