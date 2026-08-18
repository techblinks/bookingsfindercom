/**
 * tiqets-catalog action contract — T4A-P1 fail-closed hardening.
 *
 * The T4A audit found the deployed function did not compile (14 `deno check`
 * errors), that its `refresh-catalogue` branch referenced an unbound `parsed`
 * and an undefined `supabaseAdmin`, and that the storage/RPC contracts behind
 * that branch are not safe to enable. P1 therefore removes the unsafe body and
 * makes the action explicitly unavailable.
 *
 * These tests are behavioural where possible: `catalogue-core.ts` is imported
 * directly (the repo's edge-function test convention — see
 * sitemap/__tests__/sitemap-core.test.ts) so validation and dispatch are
 * exercised for real, not string-matched. Source assertions are used only for
 * the two things a unit test cannot observe: that the unsafe legacy body is
 * gone from `index.ts`, and that `index.ts` still gates every action behind the
 * admin check. A `deno check` gate proves the whole function type-checks.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "fs";
import { spawnSync } from "node:child_process";
import {
  CATALOGUE_ACTIONS,
  EXECUTABLE_CATALOGUE_ACTIONS,
  CATALOGUE_SYNC_NOT_READY,
  CATALOGUE_SYNC_NOT_READY_STATUS,
  isCatalogueAction,
  parseCatalogueRequest,
  refreshCatalogueSchema,
} from "../catalogue-core.ts";

const indexSrc = readFileSync("supabase/functions/tiqets-catalog/index.ts", "utf8");
const coreSrc = readFileSync("supabase/functions/tiqets-catalog/catalogue-core.ts", "utf8");

/** Identifiers that only a durable catalogue write path would need. */
const PERSISTENCE_IDENTIFIERS = [
  "experience_catalog_sync_state",
  "experience_products",
  "experience_destinations",
  "upsert_experience_products",
  "refresh_experience_destinations",
  "supabaseAdmin",
  "next_page",
  "pages_scanned",
  "products_observed",
  "last_seen_at",
  "loop_detected",
];

/** Every refresh body shape a caller could plausibly send. */
const REFRESH_BODIES: unknown[] = [
  { action: "refresh-catalogue" },
  { action: "refresh-catalogue", max_pages: 5 },
  { action: "refresh-catalogue", destination_id: 266696 },
  { action: "refresh-catalogue", force: true, reset: true },
  { action: "refresh-catalogue", page: 1, page_size: 20 },
];

afterEach(() => {
  vi.restoreAllMocks();
});

// ═══════════════════════════════════════════════════════════════
// A. Declared action contract
// ═══════════════════════════════════════════════════════════════

describe("A. declared action contract", () => {
  it("declares exactly health, products and refresh-catalogue", () => {
    expect([...CATALOGUE_ACTIONS]).toEqual(["health", "products", "refresh-catalogue"]);
  });

  it("recognises each declared action and rejects anything else", () => {
    for (const action of CATALOGUE_ACTIONS) {
      expect(isCatalogueAction(action)).toBe(true);
    }
    for (const notAnAction of ["catalogue-search", "destinations", "sync", "", "HEALTH", 1, null]) {
      expect(isCatalogueAction(notAnAction)).toBe(false);
    }
  });

  it("marks refresh-catalogue declared but NOT executable", () => {
    expect([...EXECUTABLE_CATALOGUE_ACTIONS]).toEqual(["health", "products"]);
    expect(EXECUTABLE_CATALOGUE_ACTIONS).not.toContain("refresh-catalogue");
    expect(CATALOGUE_ACTIONS).toContain("refresh-catalogue");
  });
});

// ═══════════════════════════════════════════════════════════════
// B. Health still validates
// ═══════════════════════════════════════════════════════════════

describe("B. health validation", () => {
  it("accepts a valid health request and marks it executable", () => {
    const result = parseCatalogueRequest({ action: "health" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.action).toBe("health");
    expect(result.body.action).toBe("health");
  });

  it("still tolerates unrelated extra fields (unchanged pre-P1 behaviour)", () => {
    expect(parseCatalogueRequest({ action: "health", verbose: true }).ok).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// C. Products still validates
// ═══════════════════════════════════════════════════════════════

describe("C. products validation", () => {
  it("applies the documented defaults", () => {
    const result = parseCatalogueRequest({ action: "products" });
    expect(result.ok).toBe(true);
    if (!result.ok || result.action !== "products") throw new Error("expected products");
    expect(result.body.language).toBe("en");
    expect(result.body.page).toBe(1);
    expect(result.body.page_size).toBe(10);
  });

  it("preserves destination_id and sale_status", () => {
    const result = parseCatalogueRequest({
      action: "products",
      destination_id: 266696,
      sale_status: "on_sale",
      page_size: 20,
    });
    if (!result.ok || result.action !== "products") throw new Error("expected products");
    expect(result.body.destination_id).toBe(266696);
    expect(result.body.sale_status).toBe("on_sale");
    expect(result.body.page_size).toBe(20);
  });

  it("rejects out-of-range and unknown enum values with 400", () => {
    for (const bad of [
      { action: "products", page_size: 21 },
      { action: "products", page: 0 },
      { action: "products", language: "kl" },
      { action: "products", sale_status: "refunded" },
      { action: "products", destination_id: -1 },
    ]) {
      const result = parseCatalogueRequest(bad);
      expect(result.ok).toBe(false);
      if (result.ok) continue;
      expect(result.status).toBe(400);
      expect(result.body.error).toBe("Invalid product request");
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// D. refresh-catalogue is validated explicitly
// ═══════════════════════════════════════════════════════════════

describe("D. refresh-catalogue validation", () => {
  it("accepts only the minimal declared shape", () => {
    expect(refreshCatalogueSchema.safeParse({ action: "refresh-catalogue" }).success).toBe(true);
  });

  it("rejects undeclared sync controls rather than silently ignoring them", () => {
    for (const field of ["max_pages", "destination_id", "resume_token", "force", "reset", "parallelism"]) {
      const parsed = refreshCatalogueSchema.safeParse({ action: "refresh-catalogue", [field]: 1 });
      expect(parsed.success).toBe(false);
    }
  });

  it("returns 400 with a machine-readable code for an invalid refresh body", () => {
    const result = parseCatalogueRequest({ action: "refresh-catalogue", max_pages: 5 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(400);
    expect(result.body.error).toBe("invalid_refresh_catalogue_request");
    expect(result.body.ok).toBe(false);
  });

  it("returns 503 catalogue_sync_not_ready for a valid refresh body", () => {
    const result = parseCatalogueRequest({ action: "refresh-catalogue" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(CATALOGUE_SYNC_NOT_READY_STATUS);
    expect(result.status).toBe(503);
    expect(result.body.error).toBe(CATALOGUE_SYNC_NOT_READY);
    expect(result.body.error).toBe("catalogue_sync_not_ready");
  });

  it("never leaks stack traces, credentials or database detail", () => {
    const result = parseCatalogueRequest({ action: "refresh-catalogue" });
    if (result.ok) throw new Error("refresh must not be executable");
    const serialised = JSON.stringify(result.body);
    for (const leak of ["at ", "Error:", "SERVICE_ROLE", "postgres", "supabase.co", "TIQETS"]) {
      expect(serialised).not.toContain(leak);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// E / F. refresh-catalogue cannot execute and can never report success
// ═══════════════════════════════════════════════════════════════

describe("E. refresh-catalogue cannot enter a persistence path", () => {
  it("is never returned as an executable dispatch, for any body shape", () => {
    for (const body of REFRESH_BODIES) {
      const result = parseCatalogueRequest(body);
      expect(result.ok).toBe(false);
      if (result.ok) continue;
      expect([400, CATALOGUE_SYNC_NOT_READY_STATUS]).toContain(result.status);
    }
  });

  it("has no executable branch in index.ts beyond health and products", () => {
    const branches = [...indexSrc.matchAll(/dispatch\.action === "([a-z-]+)"/g)].map((m) => m[1]);
    expect(branches).not.toContain("refresh-catalogue");
    expect(indexSrc).not.toMatch(/action === "refresh-catalogue"/);
  });

  it("keeps every persistence identifier out of both source files", () => {
    for (const identifier of PERSISTENCE_IDENTIFIERS) {
      expect(indexSrc).not.toContain(identifier);
      expect(coreSrc).not.toContain(identifier);
    }
  });
});

describe("F. refresh-catalogue never returns ok:true", () => {
  it("returns ok:false in the dispatch result and in the response body", () => {
    for (const body of REFRESH_BODIES) {
      const result = parseCatalogueRequest(body);
      expect(result.ok).toBe(false);
      if (result.ok) continue;
      expect(result.body.ok).toBe(false);
      expect(result.status).toBeGreaterThanOrEqual(400);
    }
  });

  it("has no ok:true success payload anywhere in the source", () => {
    expect(indexSrc).not.toMatch(/ok:\s*true/);
    expect(coreSrc).not.toMatch(/ok:\s*true,\s*\n?\s*(pages|products)/);
  });
});

// ═══════════════════════════════════════════════════════════════
// G / H. No provider call, no catalogue write
// ═══════════════════════════════════════════════════════════════

describe("G. refresh-catalogue performs no Tiqets request", () => {
  it("issues no fetch when dispatched", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(() => {
      throw new Error("network access attempted");
    });
    for (const body of REFRESH_BODIES) {
      parseCatalogueRequest(body);
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("keeps the core free of provider clients entirely", () => {
    expect(coreSrc).not.toContain("tiqetsRequest");
    expect(coreSrc).not.toContain("tiqets-client");
    expect(coreSrc).not.toContain("fetch(");
    expect(coreSrc).not.toContain("api.tiqets.com");
  });

  it("calls the Tiqets client in index.ts only after dispatch has succeeded", () => {
    const dispatchGuard = indexSrc.indexOf("if (!dispatch.ok)");
    expect(dispatchGuard).toBeGreaterThan(0);
    for (const call of ["tiqetsHealthCheck()", "tiqetsRequest<TiqetsProductsResponse>"]) {
      expect(indexSrc.indexOf(call)).toBeGreaterThan(dispatchGuard);
    }
  });
});

describe("H. refresh-catalogue performs no catalogue DB write", () => {
  it("leaves no upsert, insert or RPC write in either source file", () => {
    for (const write of [".upsert(", ".insert(", ".update(", ".delete("]) {
      expect(indexSrc).not.toContain(write);
      expect(coreSrc).not.toContain(write);
    }
    // The only RPC the function may call is the admin role check.
    const rpcCalls = [...indexSrc.matchAll(/\.rpc\("([a-z_]+)"/g)].map((m) => m[1]);
    expect(rpcCalls).toEqual(["has_role"]);
    expect(coreSrc).not.toContain(".rpc(");
  });

  it("keeps the core free of any Supabase client", () => {
    expect(coreSrc).not.toContain("createClient");
    expect(coreSrc).not.toContain("supabase-js");
    expect(coreSrc).not.toContain("SERVICE_ROLE");
  });
});

// ═══════════════════════════════════════════════════════════════
// I. Admin boundary preserved
// ═══════════════════════════════════════════════════════════════

describe("I. every action stays admin-protected", () => {
  it("verifies the admin before the body is read or dispatched", () => {
    const verify = indexSrc.indexOf("await verifyAdmin(req)");
    const readBody = indexSrc.indexOf("await req.json()");
    const dispatch = indexSrc.indexOf("parseCatalogueRequest(rawBody)");
    expect(verify).toBeGreaterThan(0);
    expect(verify).toBeLessThan(readBody);
    expect(verify).toBeLessThan(dispatch);
  });

  it("keeps the Bearer token → auth.getUser → has_role(admin) chain intact", () => {
    expect(indexSrc).toContain('req.headers.get("Authorization")');
    expect(indexSrc).toContain('authHeader.replace("Bearer ", "")');
    expect(indexSrc).toContain("supabase.auth.getUser(token)");
    expect(indexSrc).toMatch(/rpc\("has_role",\s*\{[\s\S]*?_role:\s*"admin"/);
    expect(indexSrc).toContain('throw { status: 403, message: "Admin role required" }');
  });

  it("has no unauthenticated escape hatch before the admin gate", () => {
    const verify = indexSrc.indexOf("await verifyAdmin(req)");
    const beforeAuth = indexSrc.slice(0, verify);
    // Only CORS preflight and the 405 method guard may respond before auth.
    const earlyResponses = [...beforeAuth.matchAll(/new Response\(/g)].length;
    expect(earlyResponses).toBe(2);
    expect(beforeAuth).toContain('req.method === "OPTIONS"');
    expect(beforeAuth).toContain("Method not allowed");
  });
});

// ═══════════════════════════════════════════════════════════════
// J / K / L. Unsupported, malformed and missing input fail closed
// ═══════════════════════════════════════════════════════════════

describe("J. unsupported action returns an explicit 400", () => {
  it("rejects undeclared actions", () => {
    for (const action of ["catalogue-search", "destinations", "sync", "refresh", "REFRESH-CATALOGUE"]) {
      const result = parseCatalogueRequest({ action });
      expect(result.ok).toBe(false);
      if (result.ok) continue;
      expect(result.status).toBe(400);
      expect(result.body.error).toBe(`Unknown action: ${action}`);
    }
  });
});

describe("K. malformed bodies fail closed", () => {
  it("rejects non-object payloads with 400", () => {
    for (const body of [null, undefined, "refresh-catalogue", 42, true, []]) {
      const result = parseCatalogueRequest(body);
      expect(result.ok).toBe(false);
      if (result.ok) continue;
      expect(result.status).toBe(400);
    }
  });

  it("returns 400 Invalid JSON body when the request is not JSON", () => {
    expect(indexSrc).toMatch(/rawBody = await req\.json\(\);\s*\n\s*\} catch \{/);
    expect(indexSrc).toContain('error: "Invalid JSON body"');
    const invalidJson = indexSrc.indexOf('error: "Invalid JSON body"');
    expect(indexSrc.slice(invalidJson, invalidJson + 120)).toContain("status: 400");
  });
});

describe("L. missing action fails closed", () => {
  it("returns 400 naming every declared action", () => {
    for (const body of [{}, { action: "" }, { action: null }, { action: 7 }, { Action: "health" }]) {
      const result = parseCatalogueRequest(body);
      expect(result.ok).toBe(false);
      if (result.ok) continue;
      expect(result.status).toBe(400);
    }
    const result = parseCatalogueRequest({});
    if (result.ok) throw new Error("empty body must fail");
    expect(result.body.error).toBe("action is required (health | products | refresh-catalogue)");
  });
});

// ═══════════════════════════════════════════════════════════════
// M / N. The unsafe legacy body is gone
// ═══════════════════════════════════════════════════════════════

describe("M/N. legacy unsafe refresh body removed", () => {
  it("no longer references the unbound `parsed` variable", () => {
    expect(indexSrc).not.toMatch(/\bparsed\b/);
    expect(indexSrc).not.toContain("parsed.data.max_pages");
  });

  it("no longer references the undefined `supabaseAdmin` client", () => {
    expect(indexSrc).not.toContain("supabaseAdmin");
    expect(coreSrc).not.toContain("supabaseAdmin");
  });

  it("carries no `var` declarations forward", () => {
    expect(indexSrc).not.toMatch(/^\s*var\s/m);
    expect(coreSrc).not.toMatch(/^\s*var\s/m);
  });

  it("drops the sync loop, checkpointing and jsonb stringification", () => {
    for (const legacy of [
      "seenFingerprints",
      "pageSize = 20",
      "JSON.stringify(p.images",
      "JSON.stringify(p.tagIds",
      'status: "syncing"',
      'status: "partial"',
      'status: "completed"',
    ]) {
      expect(indexSrc).not.toContain(legacy);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// O. Deno compile gate
// ═══════════════════════════════════════════════════════════════

/**
 * O. Compile gate.
 *
 * Frontend `tsc` does not compile Supabase Edge Functions, which is how the
 * 14-error `refresh-catalogue` branch survived in a deployed function. The gate
 * lives inside the test suite (rather than only in `npm run
 * check:edge:tiqets-catalog`) because this repository has no CI workflow at all
 * — there is no `.github/workflows` directory to extend, and creating one is
 * outside T4A-P1's scope. Wherever `npm test` runs, this gate runs with it; the
 * test skips only when Deno is not installed.
 */
describe("O. deno check compile gate", () => {
  // Windows resolves `deno` through a PATHEXT shim, so it needs a shell; the
  // command is a fixed string with no interpolated input.
  const useShell = process.platform === "win32";
  const runDeno = (args: string[]) =>
    useShell
      ? spawnSync(`deno ${args.join(" ")}`, { shell: true, encoding: "utf8" })
      : spawnSync("deno", args, { encoding: "utf8" });

  const denoAvailable = runDeno(["--version"]).status === 0;

  it.runIf(denoAvailable)("type-checks supabase/functions/tiqets-catalog/index.ts", () => {
    const result = runDeno(["check", "--no-lock", "supabase/functions/tiqets-catalog/index.ts"]);
    const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
    expect(output).not.toMatch(/Found \d+ errors?/);
    expect(result.status).toBe(0);
  }, 180_000);

  it("is wired to a repository script so the gate is runnable by hand", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8"));
    expect(pkg.scripts["check:edge:tiqets-catalog"]).toBe(
      "deno check --no-lock supabase/functions/tiqets-catalog/index.ts",
    );
  });
});
