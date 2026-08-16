/**
 * Things V2 (T2D-A) — migration source contract.
 *
 * The repo has no automated pgTAP runner wired into vitest (SQL test plans
 * live in supabase/tests/ as documentation), so — following the sitemap edge
 * function source-contract convention — this suite reads the LOCAL migration
 * SQL and locks the guarantees that must hold before it is ever applied:
 *
 *   O. unique(provider, provider_product_id) — one provider product maps to
 *      at most one canonical activity
 *   P. unique(destination_slug, slug) — the final collision authority
 *   Q. no public write access is introduced (RLS enabled, zero
 *      anon/authenticated write policies)
 *   M. publication_status defaults to 'draft'
 *   +  canonical slug is a plain stored column — title changes can never
 *      rewrite the canonical URL
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const MIGRATIONS_DIR = join(__dirname, "..", "..", "supabase", "migrations");

function migrationSql(): string {
  const name = readdirSync(MIGRATIONS_DIR).find((f) =>
    /^20260816000000_phase2d_things_activity_identity\.sql$/.test(f),
  );
  if (!name) throw new Error("phase2d things activity identity migration not found");
  return readFileSync(join(MIGRATIONS_DIR, name), "utf8");
}

const sql = migrationSql();

describe("Phase 2D migration — tables and identity constraints", () => {
  it("creates things_activities with canonical identity columns", () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.things_activities/i);
    expect(sql).toMatch(/id\s+uuid PRIMARY KEY DEFAULT gen_random_uuid\(\)/);
    expect(sql).toMatch(/destination_slug\s+text NOT NULL/);
    expect(sql).toMatch(/slug\s+text NOT NULL/);
    expect(sql).toMatch(/canonical_title\s+text NOT NULL/);
    expect(sql).toMatch(/publication_status\s+text NOT NULL DEFAULT 'draft'/);
    expect(sql).toMatch(/verification\s+jsonb NOT NULL DEFAULT '\{\}'::jsonb/);
    expect(sql).toMatch(/created_at\s+timestamptz NOT NULL DEFAULT now\(\)/);
    expect(sql).toMatch(/updated_at\s+timestamptz NOT NULL DEFAULT now\(\)/);
  });

  it("P. enforces unique (destination_slug, slug) as the final collision authority", () => {
    expect(sql).toMatch(
      /CONSTRAINT ux_things_activities_destination_slug UNIQUE \(destination_slug, slug\)/,
    );
  });

  it("the slug is a plain stored column — NEVER auto-generated from the title", () => {
    // This is the deliberate difference from the provider catalogue cache
    // (experience_products.slug is GENERATED ALWAYS from the provider title).
    // A canonical slug must be immutable: title changes must not churn URLs.
    expect(sql).not.toMatch(/GENERATED ALWAYS AS/i);
    expect(sql).toMatch(/NOTE: unlike the provider catalogue cache/);
  });

  it("M. publication_status defaults to draft and allows draft/published/archived", () => {
    expect(sql).toMatch(/publication_status\s+text NOT NULL DEFAULT 'draft'/);
    expect(sql).toMatch(
      /CHECK \(publication_status IN \('draft', 'published', 'archived'\)\)/,
    );
  });

  it("validates slug shapes with lowercase hyphen-separated CHECK constraints", () => {
    expect(sql).toMatch(/destination_slug ~ '\^\[a-z0-9\]\+\(-\[a-z0-9\]\+\)\*\$'/);
    expect(sql).toMatch(/slug ~ '\^\[a-z0-9\]\+\(-\[a-z0-9\]\+\)\*\$'/);
  });

  it("creates things_activity_offers with provider-scoped fields", () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.things_activity_offers/i);
    expect(sql).toMatch(/activity_id\s+uuid NOT NULL REFERENCES public\.things_activities\(id\)/);
    expect(sql).toMatch(/provider\s+text NOT NULL/);
    expect(sql).toMatch(/provider_product_id\s+text NOT NULL/);
    expect(sql).toMatch(/provider_url\s+text/);
  });

  it("O. enforces unique (provider, provider_product_id) — one offer per provider product", () => {
    expect(sql).toMatch(
      /CONSTRAINT ux_things_activity_offers_provider_product UNIQUE \(provider, provider_product_id\)/,
    );
  });

  it("provider CHECK permits only currently known providers", () => {
    expect(sql).toMatch(/CHECK \(provider IN \('viator', 'tiqets'\)\)/);
  });

  it("offer product id cannot be blank and provider_url must be http(s)", () => {
    expect(sql).toMatch(/char_length\(btrim\(provider_product_id\)\) > 0/);
    expect(sql).toContain("provider_url IS NULL OR provider_url ~ '^https?://'");
  });
});

describe("Phase 2D migration — security / RLS", () => {
  it("Q. enables RLS on both new tables", () => {
    expect(sql).toContain("ALTER TABLE public.things_activities ENABLE ROW LEVEL SECURITY;");
    expect(sql).toContain("ALTER TABLE public.things_activity_offers ENABLE ROW LEVEL SECURITY;");
  });

  it("Q. creates NO anon/authenticated write policies", () => {
    // No CREATE POLICY for INSERT/UPDATE/DELETE at all on the new tables.
    expect(sql).not.toMatch(/CREATE POLICY/i);
    expect(sql).not.toMatch(/FOR INSERT/i);
    expect(sql).not.toMatch(/FOR UPDATE/i);
    expect(sql).not.toMatch(/FOR DELETE/i);
  });

  it("Q. grants no broad PUBLIC privileges on the new tables", () => {
    expect(sql).not.toMatch(/GRANT (SELECT|INSERT|UPDATE|DELETE)/i);
  });

  it("does not weaken any existing table (no DROP POLICY / DROP TABLE on other objects)", () => {
    expect(sql).not.toMatch(/DROP POLICY/i);
    expect(sql).not.toMatch(/DROP TABLE/i);
    expect(sql).not.toMatch(/DROP COLUMN/i);
  });

  it("documents the controlled-production rollout intent: manual application, explicit project ref", () => {
    expect(sql).toMatch(/approved for\s+--\s+a controlled production rollout/i);
    expect(sql).toMatch(/explicit authoritative project ref/i);
    expect(sql).toMatch(/THIS COMMIT DOES NOT APPLY THE MIGRATION/i);
    expect(sql).toMatch(/no\s+--\s+implicit or stale `supabase link` state may be relied upon/i);
  });
});
