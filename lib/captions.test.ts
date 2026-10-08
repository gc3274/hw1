import { describe, expect, it } from "vitest";
import {
  CAPTION_MAX,
  CAPTIONS_PER_FLAVOR,
  CONTEXT_MAX,
  FEED_MAX,
  FEED_PAGE_SIZE,
  applyVote,
  isOwnImagePath,
  isUuid,
  nextVote,
  parseCaptionResponse,
  parseFeedLimit,
  parseFeedSort,
  parseVoteValue,
  readContext,
  type Flavor,
  type VoteValue,
} from "@/lib/captions";

const USER = "0b6f3a52-1c2d-4e5f-8a9b-0c1d2e3f4a5b";
const OTHER = "9f8e7d6c-5b4a-4321-8fed-cba987654321";
const FILE = "3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e6f";

const FLAVORS: Flavor[] = [
  { id: 1, slug: "midwest-transplant", name: "Midwest transplant", description: "polite" },
  { id: 2, slug: "jaded-new-yorker", name: "Jaded New Yorker", description: "deadpan" },
  { id: 3, slug: "chronically-online", name: "Chronically online", description: "lowercase" },
];

const response = (captions: unknown, allowed: unknown = true) =>
  JSON.stringify({ allowed, captions });

describe("nextVote", () => {
  it.each<[VoteValue, 1 | -1, VoteValue]>([
    [0, 1, 1], // none -> up
    [0, -1, -1], // none -> down
    [1, 1, 0], // up -> none
    [-1, -1, 0], // down -> none
    [1, -1, -1], // up -> down
    [-1, 1, 1], // down -> up
  ])("from %i clicking %i gives %i", (current, clicked, expected) => {
    expect(nextVote(current, clicked)).toBe(expected);
  });
});

describe("applyVote", () => {
  const base = { upvotes: 5, downvotes: 3 };

  it.each<[VoteValue, VoteValue, { upvotes: number; downvotes: number }]>([
    [0, 1, { upvotes: 6, downvotes: 3 }], // none -> up
    [0, -1, { upvotes: 5, downvotes: 4 }], // none -> down
    [1, 0, { upvotes: 4, downvotes: 3 }], // up -> none
    [-1, 0, { upvotes: 5, downvotes: 2 }], // down -> none
    [1, -1, { upvotes: 4, downvotes: 4 }], // up -> down
    [-1, 1, { upvotes: 6, downvotes: 2 }], // down -> up
    [1, 1, { upvotes: 5, downvotes: 3 }], // unchanged
  ])("from %i to %i", (from, to, expected) => {
    expect(applyVote(base, from, to)).toEqual(expected);
  });

  it("never goes negative", () => {
    expect(applyVote({ upvotes: 0, downvotes: 0 }, 1, -1)).toEqual({ upvotes: 0, downvotes: 1 });
    expect(applyVote({ upvotes: 0, downvotes: 0 }, -1, 0)).toEqual({ upvotes: 0, downvotes: 0 });
  });

  it("does not mutate the input", () => {
    const counts = { upvotes: 1, downvotes: 1 };
    applyVote(counts, 0, 1);
    expect(counts).toEqual({ upvotes: 1, downvotes: 1 });
  });
});

describe("isUuid", () => {
  it("accepts uuids", () => {
    expect(isUuid(USER)).toBe(true);
    expect(isUuid(USER.toUpperCase())).toBe(true);
  });

  it("rejects everything else", () => {
    expect(isUuid("not-a-uuid")).toBe(false);
    expect(isUuid(`${USER}x`)).toBe(false);
    expect(isUuid("")).toBe(false);
    expect(isUuid(42)).toBe(false);
    expect(isUuid(null)).toBe(false);
  });
});

describe("isOwnImagePath", () => {
  it("accepts a jpg in the user's own folder", () => {
    expect(isOwnImagePath(USER, `${USER}/${FILE}.jpg`)).toBe(true);
  });

  it("rejects another user's folder", () => {
    expect(isOwnImagePath(USER, `${OTHER}/${FILE}.jpg`)).toBe(false);
  });

  it("rejects other extensions", () => {
    expect(isOwnImagePath(USER, `${USER}/${FILE}.png`)).toBe(false);
    expect(isOwnImagePath(USER, `${USER}/${FILE}.jpeg`)).toBe(false);
    expect(isOwnImagePath(USER, `${USER}/${FILE}.JPG`)).toBe(false);
    expect(isOwnImagePath(USER, `${USER}/${FILE}`)).toBe(false);
  });

  it("rejects traversal and extra segments", () => {
    expect(isOwnImagePath(USER, `${USER}/../${OTHER}/${FILE}.jpg`)).toBe(false);
    expect(isOwnImagePath(USER, `../${USER}/${FILE}.jpg`)).toBe(false);
    expect(isOwnImagePath(USER, `/${USER}/${FILE}.jpg`)).toBe(false);
    expect(isOwnImagePath(USER, `${USER}/${USER}/${FILE}.jpg`)).toBe(false);
    expect(isOwnImagePath(USER, `${USER}/${FILE}.jpg\n`)).toBe(false);
  });

  it("rejects non-strings", () => {
    expect(isOwnImagePath(USER, undefined)).toBe(false);
    expect(isOwnImagePath(USER, 7)).toBe(false);
  });
});

describe("parseVoteValue", () => {
  it("accepts -1, 0 and 1", () => {
    expect(parseVoteValue(1)).toBe(1);
    expect(parseVoteValue(0)).toBe(0);
    expect(parseVoteValue(-1)).toBe(-1);
  });

  it("rejects anything else", () => {
    expect(parseVoteValue(2)).toBeNull();
    expect(parseVoteValue(0.5)).toBeNull();
    expect(parseVoteValue("1")).toBeNull();
    expect(parseVoteValue(null)).toBeNull();
    expect(parseVoteValue(undefined)).toBeNull();
  });
});

describe("readContext", () => {
  it("trims and collapses whitespace", () => {
    expect(readContext("  first   day \n at  Butler  ")).toBe("first day at Butler");
  });

  it("caps the length", () => {
    const out = readContext("a".repeat(CONTEXT_MAX + 50));
    expect(out).toHaveLength(CONTEXT_MAX);
  });

  it("does not split an emoji at the cut", () => {
    const out = readContext(`${"a".repeat(CONTEXT_MAX - 1)}😭😭`);
    expect(Array.from(out)).toHaveLength(CONTEXT_MAX);
    expect(out.endsWith("😭")).toBe(true);
  });

  it("returns an empty string for non-strings", () => {
    expect(readContext(undefined)).toBe("");
    expect(readContext(null)).toBe("");
    expect(readContext(12)).toBe("");
    expect(readContext("   ")).toBe("");
  });
});

describe("parseFeedSort", () => {
  it("reads new and top", () => {
    expect(parseFeedSort("new")).toBe("new");
    expect(parseFeedSort("top")).toBe("top");
  });

  it("defaults to top", () => {
    expect(parseFeedSort(undefined)).toBe("top");
    expect(parseFeedSort("hot")).toBe("top");
    expect(parseFeedSort(["new", "top"])).toBe("new");
  });
});

describe("parseFeedLimit", () => {
  it("defaults to one page", () => {
    expect(parseFeedLimit(undefined)).toBe(FEED_PAGE_SIZE);
    expect(parseFeedLimit("abc")).toBe(FEED_PAGE_SIZE);
    expect(parseFeedLimit("")).toBe(FEED_PAGE_SIZE);
  });

  it("keeps whole pages", () => {
    expect(parseFeedLimit(String(FEED_PAGE_SIZE * 2))).toBe(FEED_PAGE_SIZE * 2);
    expect(parseFeedLimit(FEED_PAGE_SIZE * 3)).toBe(FEED_PAGE_SIZE * 3);
    expect(parseFeedLimit(String(FEED_PAGE_SIZE * 2 + 5))).toBe(FEED_PAGE_SIZE * 2);
  });

  it("clamps to the allowed range", () => {
    expect(parseFeedLimit("0")).toBe(FEED_PAGE_SIZE);
    expect(parseFeedLimit("-48")).toBe(FEED_PAGE_SIZE);
    expect(parseFeedLimit("1")).toBe(FEED_PAGE_SIZE);
    expect(parseFeedLimit(String(FEED_MAX * 10))).toBe(FEED_MAX);
    expect(parseFeedLimit("Infinity")).toBe(FEED_PAGE_SIZE);
  });

  it("reads the first value of a repeated param", () => {
    expect(parseFeedLimit([String(FEED_PAGE_SIZE * 2), "96"])).toBe(FEED_PAGE_SIZE * 2);
  });
});

describe("parseCaptionResponse", () => {
  it("rejects bad JSON", () => {
    expect(parseCaptionResponse("{not json", FLAVORS)).toEqual({ ok: false, reason: "invalid" });
    expect(parseCaptionResponse("", FLAVORS)).toEqual({ ok: false, reason: "invalid" });
    expect(parseCaptionResponse("null", FLAVORS)).toEqual({ ok: false, reason: "invalid" });
    expect(parseCaptionResponse("[1,2]", FLAVORS)).toEqual({ ok: false, reason: "invalid" });
  });

  it("passes on allowed:false", () => {
    const raw = response([{ flavor_slug: "jaded-new-yorker", text: "nope" }], false);
    expect(parseCaptionResponse(raw, FLAVORS)).toEqual({ ok: false, reason: "rejected" });
  });

  it("reads a full response in flavor order", () => {
    const raw = response([
      { flavor_slug: "jaded-new-yorker", text: "Seen worse on the 1 train." },
      { flavor_slug: "midwest-transplant", text: "Back home this costs two dollars." },
      { flavor_slug: "jaded-new-yorker", text: "Tuesday." },
      { flavor_slug: "midwest-transplant", text: "Ope, is this normal here?" },
    ]);
    expect(parseCaptionResponse(raw, FLAVORS)).toEqual({
      ok: true,
      captions: [
        { flavorId: 1, content: "Back home this costs two dollars." },
        { flavorId: 1, content: "Ope, is this normal here?" },
        { flavorId: 2, content: "Seen worse on the 1 train." },
        { flavorId: 2, content: "Tuesday." },
      ],
    });
  });

  it("drops unknown flavors and malformed items", () => {
    const raw = response([
      { flavor_slug: "dad-jokes", text: "Unknown flavor" },
      { flavor_slug: "chronically-online", text: "pov: it's 2am in butler" },
      { flavor_slug: "jaded-new-yorker" },
      { text: "No flavor at all" },
      "just a string",
      null,
    ]);
    expect(parseCaptionResponse(raw, FLAVORS)).toEqual({
      ok: true,
      captions: [{ flavorId: 3, content: "pov: it's 2am in butler" }],
    });
  });

  it("drops captions over the length limit", () => {
    const raw = response([
      { flavor_slug: "jaded-new-yorker", text: "x".repeat(CAPTION_MAX + 1) },
      { flavor_slug: "jaded-new-yorker", text: "y".repeat(CAPTION_MAX) },
    ]);
    expect(parseCaptionResponse(raw, FLAVORS)).toEqual({
      ok: true,
      captions: [{ flavorId: 2, content: "y".repeat(CAPTION_MAX) }],
    });
  });

  it("keeps a partial result", () => {
    const raw = response([{ flavor_slug: "chronically-online", text: "not the dining hall again" }]);
    expect(parseCaptionResponse(raw, FLAVORS)).toEqual({
      ok: true,
      captions: [{ flavorId: 3, content: "not the dining hall again" }],
    });
  });

  it("dedupes case-insensitively, across flavors", () => {
    const raw = response([
      { flavor_slug: "jaded-new-yorker", text: "Classic Tuesday." },
      { flavor_slug: "jaded-new-yorker", text: "classic tuesday." },
      { flavor_slug: "chronically-online", text: "CLASSIC TUESDAY." },
      { flavor_slug: "chronically-online", text: "me when the 1 train" },
    ]);
    expect(parseCaptionResponse(raw, FLAVORS)).toEqual({
      ok: true,
      captions: [
        { flavorId: 2, content: "Classic Tuesday." },
        { flavorId: 3, content: "me when the 1 train" },
      ],
    });
  });

  it(`keeps at most ${CAPTIONS_PER_FLAVOR} per flavor`, () => {
    const raw = response([
      { flavor_slug: "jaded-new-yorker", text: "One." },
      { flavor_slug: "jaded-new-yorker", text: "Two." },
      { flavor_slug: "jaded-new-yorker", text: "Three." },
    ]);
    const result = parseCaptionResponse(raw, FLAVORS);
    expect(result).toEqual({
      ok: true,
      captions: [
        { flavorId: 2, content: "One." },
        { flavorId: 2, content: "Two." },
      ],
    });
  });

  it("strips wrapping quotes, extra whitespace and trailing hashtags", () => {
    const raw = response([
      { flavor_slug: "midwest-transplant", text: '  "Ope,   sorry   about the rat"  ' },
      { flavor_slug: "midwest-transplant", text: "“Twelve dollars for a bagel” #nyc #columbia" },
      { flavor_slug: "jaded-new-yorker", text: "'Tuesday.' #NYC" },
      { flavor_slug: "jaded-new-yorker", text: "We're #1 at waiting for the M4" },
      { flavor_slug: "chronically-online", text: "#tbt #mood" },
      { flavor_slug: "chronically-online", text: "\"\"" },
    ]);
    expect(parseCaptionResponse(raw, FLAVORS)).toEqual({
      ok: true,
      captions: [
        { flavorId: 1, content: "Ope, sorry about the rat" },
        { flavorId: 1, content: "Twelve dollars for a bagel" },
        { flavorId: 2, content: "Tuesday." },
        { flavorId: 2, content: "We're #1 at waiting for the M4" },
      ],
    });
  });

  it("keeps a number tag like #1 at the end", () => {
    const raw = response([{ flavor_slug: "jaded-new-yorker", text: "Still #1" }]);
    expect(parseCaptionResponse(raw, FLAVORS)).toEqual({
      ok: true,
      captions: [{ flavorId: 2, content: "Still #1" }],
    });
  });

  it("reads JSON wrapped in a code fence", () => {
    const raw = "```json\n" + response([{ flavor_slug: "jaded-new-yorker", text: "Fine." }]) + "\n```";
    expect(parseCaptionResponse(raw, FLAVORS)).toEqual({
      ok: true,
      captions: [{ flavorId: 2, content: "Fine." }],
    });
  });

  it("is empty when nothing usable is left", () => {
    expect(parseCaptionResponse(response([]), FLAVORS)).toEqual({ ok: false, reason: "empty" });
    expect(parseCaptionResponse(JSON.stringify({ allowed: true }), FLAVORS)).toEqual({
      ok: false,
      reason: "empty",
    });
    const unknownOnly = response([{ flavor_slug: "dad-jokes", text: "Hi hungry" }]);
    expect(parseCaptionResponse(unknownOnly, FLAVORS)).toEqual({ ok: false, reason: "empty" });
  });
});
