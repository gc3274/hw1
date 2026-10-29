import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The owner pastes this file into Supabase, so a missing grant or guard would
// only show up in production. These checks read the file itself.
const sql = readFileSync(
  new URL("../supabase/migrations/20261104120000_editable_chains_limits_costs.sql", import.meta.url),
  "utf8",
);

// Code only: the header and the quick checks at the end are comments
const code = sql
  .split("\n")
  .filter((line) => !line.trimStart().startsWith("--"))
  .join("\n");

const FUNCTIONS = [
  "copy_prompt_chain(bigint, text, text, text)",
  "insert_prompt_chain_step(bigint, integer, jsonb)",
  "move_prompt_chain_step(bigint, integer)",
  "delete_prompt_chain_step(bigint)",
  "set_default_prompt_chain(bigint)",
  "llm_spend_since(timestamptz)",
];

function body(name: string): string {
  const start = code.indexOf(`create or replace function public.${name}(`);
  if (start < 0) throw new Error(`No function ${name} in the migration`);
  const end = code.indexOf("\n$$;", start);
  return code.slice(start, end);
}

describe("the editable chains migration", () => {
  it("runs as one transaction", () => {
    expect(code.trimStart().startsWith("begin;")).toBe(true);
    expect(code.trimEnd().endsWith("commit;")).toBe(true);
  });

  it.each(FUNCTIONS)("only lets the service role call %s", (signature) => {
    expect(code).toContain(`revoke execute on function public.${signature} from public, anon, authenticated;`);
    expect(code).toContain(`grant execute on function public.${signature} to service_role;`);
  });

  it.each(FUNCTIONS.map((f) => f.slice(0, f.indexOf("("))))("runs %s as the caller with an empty search path", (name) => {
    const fn = body(name);
    expect(fn).toContain("security invoker");
    expect(fn).toContain("set search_path = ''");
  });

  it("keeps the settings table away from the API roles", () => {
    expect(code).toContain("revoke all on public.generation_settings from anon, authenticated;");
    expect(code).toContain("alter table public.generation_settings enable row level security;");
  });

  it("refuses an 11th step before shifting, since step_order is checked row by row", () => {
    const fn = body("insert_prompt_chain_step");
    expect(fn.indexOf("raise exception 'chain_full'")).toBeGreaterThan(-1);
    expect(fn.indexOf("raise exception 'chain_full'")).toBeLessThan(fn.indexOf("set step_order = step_order + 1"));
  });

  it("makes the step order deferrable so one update can swap steps", () => {
    expect(code).toMatch(/unique \(prompt_chain_id, step_order\) deferrable initially immediate/);
  });

  it("clears the old default before setting the new one", () => {
    const fn = body("set_default_prompt_chain");
    expect(fn.indexOf("set is_default = false")).toBeLessThan(fn.indexOf("set is_default = true"));
  });
});
