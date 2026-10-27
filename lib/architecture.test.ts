import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// The service key bypasses RLS, so where it can be reached is checked here
// rather than left to review. Comments count too.
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SCANNED = ["app", "components", "lib", "proxy.ts", "next.config.ts"];
const SOURCE = /\.(?:ts|tsx|mts|js|mjs)$/;

function walk(path: string): string[] {
  if (!statSync(path).isDirectory()) return [path];
  return readdirSync(path).flatMap((name) => walk(join(path, name)));
}

const files = SCANNED.flatMap((p) => walk(join(ROOT, p)))
  .map((p) => relative(ROOT, p).split("\\").join("/"))
  .filter((p) => SOURCE.test(p) && !/\.test\.[a-z]+$/.test(p));

const read = (p: string) => readFileSync(join(ROOT, p), "utf8");
const containing = (pattern: RegExp) => files.filter((p) => pattern.test(read(p)));

describe("the service key", () => {
  it("is read only in lib/supabase/service.ts", () => {
    expect(containing(/SUPABASE_SERVICE_ROLE_KEY/)).toEqual(["lib/supabase/service.ts"]);
  });

  it("never gets a browser-visible name", () => {
    expect(containing(/NEXT_PUBLIC_SUPABASE_SERVICE/)).toEqual([]);
  });

  it("is reached only through lib/generation.ts", () => {
    expect(containing(/["'][^"'\n]*supabase\/service(?:\.ts)?["']/)).toEqual(["lib/generation.ts"]);
  });

  it.each(["lib/supabase/service.ts", "lib/generation.ts"])("%s starts with server-only", (p) => {
    expect(read(p).startsWith('import "server-only";')).toBe(true);
  });
});
