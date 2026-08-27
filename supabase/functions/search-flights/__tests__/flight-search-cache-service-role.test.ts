/**
 * BF-FLIGHTS-CACHE-1 — SUPABASE_SERVICE_ROLE_KEY must be read only inside
 * search-flights (server-side, for the cache table), and must never appear
 * anywhere in the frontend bundle source.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join, sep } from "path";

function listFilesRecursive(dir: string, exts: string[]): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listFilesRecursive(full, exts));
    } else if (exts.some((ext) => entry.name.endsWith(ext))) {
      out.push(full);
    }
  }
  return out;
}

describe("SUPABASE_SERVICE_ROLE_KEY — server-side only", () => {
  it("is read inside search-flights/index.ts (the only place the flight_search_cache table is written)", () => {
    const source = readFileSync("supabase/functions/search-flights/index.ts", "utf8");
    expect(source).toContain('Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")');
  });

  it("never appears in any frontend RUNTIME file under src/ (the frontend never sees or needs this credential)", () => {
    // Excludes __tests__ directories: several pre-existing test files
    // legitimately quote this env var NAME as a string while asserting an
    // EDGE FUNCTION's own source contract (e.g.
    // things-activity-resolver.test.ts) — that is not the frontend runtime
    // using the credential, just a test reading server-side source text.
    const files = listFilesRecursive("src", [".ts", ".tsx"]).filter((f) => !f.includes(`${sep}__tests__${sep}`));
    for (const file of files) {
      const content = readFileSync(file, "utf8");
      expect(content, `${file} must not reference SUPABASE_SERVICE_ROLE_KEY`).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    }
  });
});
