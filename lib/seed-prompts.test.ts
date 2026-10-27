import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_CHAIN,
  ONE_PASS_SYSTEM,
  ONE_PASS_USER,
  validateChain,
  type Chain,
  type ChainStep,
} from "./chains";
import { SIGNUP_BLOCKED_MESSAGE } from "./signup";

// The seeds live in SQL the owner pastes into Supabase, so a typo there would
// only show up in production. These checks read the migration file itself.
const sql = readFileSync(
  new URL("../supabase/migrations/20261028120000_prompt_chains_and_observability.sql", import.meta.url),
  "utf8",
);

function dollarQuoted(tag: string): string {
  const match = new RegExp(`\\$${tag}\\$([\\s\\S]*?)\\$${tag}\\$`).exec(sql);
  if (!match) throw new Error(`No $${tag}$ block in the migration`);
  return match[1];
}

const step = (order: number, outputType: ChainStep["outputType"], system: string, user: string): ChainStep => ({
  ...DEFAULT_CHAIN.steps[0],
  order,
  outputType,
  systemPrompt: system,
  userPrompt: user,
});

describe("the seeded one-pass chain", () => {
  it("matches the built-in default chain exactly", () => {
    expect(dollarQuoted("one_pass_system")).toBe(ONE_PASS_SYSTEM);
    expect(dollarQuoted("one_pass_user")).toBe(ONE_PASS_USER);
  });
});

describe("the seeded look-then-roast chain", () => {
  const chain: Chain = {
    id: 2,
    slug: "look-then-roast",
    steps: [
      step(1, "text", dollarQuoted("look_system"), dollarQuoted("look_user")),
      step(2, "roast_json", dollarQuoted("look_roast_system"), dollarQuoted("look_roast_user")),
    ],
  };

  it("passes the chain checks", () => {
    expect(validateChain(chain)).toEqual([]);
  });

  it("hands the notes to the roast step", () => {
    expect(chain.steps[1].userPrompt).toContain("{{previous}}");
  });

  it("keeps the one-pass rules, changing only the closing paragraph", () => {
    const body = (s: string) => s.slice(0, s.lastIndexOf("\n\n"));
    expect(body(chain.steps[1].systemPrompt)).toBe(body(ONE_PASS_SYSTEM));
  });
});

describe("the sign-up hook", () => {
  it("returns the message the auth callback looks for", () => {
    expect(sql).toContain(`'message', '${SIGNUP_BLOCKED_MESSAGE}'`);
  });
});
