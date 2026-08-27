/**
 * BF-FLIGHTS-CACHE-1 — source-text contract checks for the (NOT applied)
 * flight_search_cache migration. Mirrors the established pattern in
 * tiqets-catalog/__tests__/catalogue-storage-migration.test.ts — this repo
 * has no SQL-parsing test tooling, so these are deliberate text-level
 * assertions on the migration file itself.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";

const MIGRATIONS_DIR = "supabase/migrations";
const MIGRATION_FILE = "20260824000000_bf_flights_cache_1_flight_search_cache.sql";
const sql = readFileSync(`${MIGRATIONS_DIR}/${MIGRATION_FILE}`, "utf8");

describe("flight_search_cache migration — filename convention", () => {
  it("exists and matches the timestamp_description.sql convention", () => {
    const files = readdirSync(MIGRATIONS_DIR);
    expect(files).toContain(MIGRATION_FILE);
    expect(MIGRATION_FILE).toMatch(/^\d{14}_[a-z0-9_]+\.sql$/);
  });

  it("is marked documentation-only / not-applied, matching this repo's convention for unreviewed migrations", () => {
    expect(sql).toMatch(/documentation only.*do not apply automatically/i);
  });
});

describe("flight_search_cache migration — table shape", () => {
  it("defines the cache table with the semantic key columns", () => {
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.flight_search_cache");
    for (const column of ["cache_key", "origin", "destination", "departure_date", "return_date", "currency", "payload", "fetched_at", "expires_at", "last_requested_at", "request_count"]) {
      expect(sql).toContain(column);
    }
  });

  it("return_date is nullable (one-way searches have no return date) — never NOT NULL", () => {
    expect(sql).toMatch(/return_date\s+date,/);
  });
});

describe("flight_search_cache migration — RLS: no anonymous write path", () => {
  it("enables RLS on the cache table", () => {
    expect(sql).toContain("ALTER TABLE public.flight_search_cache ENABLE ROW LEVEL SECURITY");
  });

  it("defines zero policies granting anon/authenticated any access — RLS-enabled + no policies denies all non-service-role access", () => {
    expect(sql).not.toMatch(/CREATE POLICY/i);
    expect(sql).not.toMatch(/GRANT[\s\S]*?ON (public\.)?flight_search_cache[\s\S]*?TO (anon|authenticated)/i);
  });

  it("never grants anon/authenticated INSERT, UPDATE, or DELETE on the table", () => {
    expect(sql).not.toMatch(/GRANT\s+(INSERT|UPDATE|DELETE)/i);
  });
});

describe("flight_search_cache migration — demand-bump and cleanup functions are hardened", () => {
  it("bump_flight_search_cache_demand is SECURITY DEFINER with a hardened search_path", () => {
    const fnMatch = sql.match(/CREATE OR REPLACE FUNCTION public\.bump_flight_search_cache_demand[\s\S]*?\$\$;/);
    expect(fnMatch).not.toBeNull();
    expect(fnMatch![0]).toContain("SECURITY DEFINER");
    expect(fnMatch![0]).toContain("SET search_path = ''");
  });

  it("cleanup_flight_search_cache is SECURITY DEFINER with a hardened search_path", () => {
    const fnMatch = sql.match(/CREATE OR REPLACE FUNCTION public\.cleanup_flight_search_cache[\s\S]*?\$\$;/);
    expect(fnMatch).not.toBeNull();
    expect(fnMatch![0]).toContain("SECURITY DEFINER");
    expect(fnMatch![0]).toContain("SET search_path = ''");
  });

  it("cleanup deletes only rows past the 24h stale-usable ceiling, not merely past the 6h fresh TTL", () => {
    const fnMatch = sql.match(/CREATE OR REPLACE FUNCTION public\.cleanup_flight_search_cache[\s\S]*?\$\$;/)![0];
    expect(fnMatch).toMatch(/interval '24 hours'/);
  });
});

describe("flight_search_cache migration — RPC execution contract (anon/authenticated blocked, service_role explicitly granted)", () => {
  // T4A-P2's own audit (20260819000000_t4a_p2_product_storage_contract.sql,
  // item 7) already documented this exact lesson once: "Only REVOKE ALL ...
  // FROM PUBLIC existed; the intended executor was never stated." PostgreSQL's
  // default PUBLIC execute grant covers every role including service_role —
  // service_role's RLS bypass (used for the table above) is a SEPARATE
  // mechanism from function EXECUTE privilege and does not imply it. So a
  // bare REVOKE ALL FROM PUBLIC, with no explicit GRANT back to
  // service_role, would leave search-flights unable to call
  // bump_flight_search_cache_demand at all — these tests prove the exact,
  // signature-matched GRANT/REVOKE statements exist for both functions.
  const bumpSig = "public.bump_flight_search_cache_demand(text)";
  const cleanupSig = "public.cleanup_flight_search_cache()";

  it.each([bumpSig, cleanupSig])("%s: REVOKEs execute from PUBLIC, anon, and authenticated", (sig) => {
    expect(sql).toContain(`REVOKE ALL ON FUNCTION ${sig} FROM PUBLIC`);
    expect(sql).toContain(`REVOKE ALL ON FUNCTION ${sig} FROM anon`);
    expect(sql).toContain(`REVOKE ALL ON FUNCTION ${sig} FROM authenticated`);
  });

  it.each([bumpSig, cleanupSig])("%s: explicitly GRANTs execute to service_role using its exact signature", (sig) => {
    expect(sql).toContain(`GRANT EXECUTE ON FUNCTION ${sig} TO service_role`);
  });

  it("never grants execute to anon or authenticated on either function", () => {
    expect(sql).not.toMatch(/GRANT EXECUTE ON FUNCTION[\s\S]*?TO (anon|authenticated)/i);
  });

  it("the GRANT to service_role for each function appears after that function's REVOKE ALL FROM PUBLIC (revoke-then-grant order, not grant-then-revoke)", () => {
    for (const sig of [bumpSig, cleanupSig]) {
      const revokeIndex = sql.indexOf(`REVOKE ALL ON FUNCTION ${sig} FROM PUBLIC`);
      const grantIndex = sql.indexOf(`GRANT EXECUTE ON FUNCTION ${sig} TO service_role`);
      expect(revokeIndex).toBeGreaterThan(-1);
      expect(grantIndex).toBeGreaterThan(revokeIndex);
    }
  });
});

describe("flight_search_cache migration — cache key semantics", () => {
  it("documents that the cache key excludes passenger count and cabin class", () => {
    expect(sql).toMatch(/passenger counts and cabin class are NEVER part of the key/i);
  });

  it("documents the BF-FLIGHTS-CACHE-REFRESH-1 follow-up without implementing a cron job in this migration", () => {
    expect(sql).toMatch(/BF-FLIGHTS-CACHE-REFRESH-1/);
    expect(sql).not.toMatch(/cron\.schedule/i);
  });
});
