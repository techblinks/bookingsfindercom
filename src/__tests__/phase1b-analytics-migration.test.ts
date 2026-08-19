/**
 * Things V2 (T4A-P2R-F1) — Phase 1B analytics migration source integrity.
 *
 * This migration shipped corrupt in 3057d4b: a valid
 * `public.log_experience_click` implementation was followed by an ORPHAN `$$;`
 * delimiter plus two truncated duplicate tails (fragments starting mid
 * control-flow with ` THEN` / `END IF;` at top-level SQL scope, and repeated
 * copies of the Phase 4 RLS section). PostgreSQL could not parse the file:
 *
 *   syntax error at or near "$$;"   SQLSTATE 42601
 *
 * That aborted a fresh migration replay after 26 of 30 migrations, so every
 * LATER migration — including the T4A-P2 product storage contract — was
 * unreachable on a clean database. A forward repair migration cannot fix this:
 * Postgres never reaches a later file when an earlier one fails to parse, so
 * the historical source itself had to be repaired in place.
 *
 * Following the Phase 2D migration-contract convention (there is no pgTAP
 * runner wired into vitest), this suite reads the LOCAL migration SQL and locks
 * the STRUCTURAL invariants that would catch a recurrence of exactly this
 * corruption.
 *
 * BOUNDARY: this is static source analysis, NOT PostgreSQL execution. It proves
 * the file contains exactly one coherent copy of each logical section; it does
 * not prove the SQL runs. The local `supabase db reset` replay is the runtime
 * proof.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const MIGRATIONS_DIR = join(__dirname, "..", "..", "supabase", "migrations");

function migrationSql(): string {
  const name = readdirSync(MIGRATIONS_DIR).find((f) =>
    /^20260807100000_phase1b_experience_analytics\.sql$/.test(f),
  );
  if (!name) throw new Error("phase1b experience analytics migration not found");
  return readFileSync(join(MIGRATIONS_DIR, name), "utf8");
}

const sql = migrationSql();

function countMatches(pattern: RegExp): number {
  return (sql.match(pattern) ?? []).length;
}

describe("Phase 1B analytics migration — exactly one copy of each section", () => {
  it("declares exactly one log_experience_click function", () => {
    expect(
      countMatches(/CREATE OR REPLACE FUNCTION public\.log_experience_click/gi),
    ).toBe(1);
  });

  it("revokes PUBLIC execute exactly once", () => {
    expect(
      countMatches(
        /REVOKE ALL ON FUNCTION public\.log_experience_click FROM PUBLIC;/gi,
      ),
    ).toBe(1);
  });

  it("grants execute exactly once, to anon + authenticated only", () => {
    expect(
      countMatches(/GRANT EXECUTE ON FUNCTION public\.log_experience_click/gi),
    ).toBe(1);
    expect(sql).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.log_experience_click TO anon, authenticated;/,
    );
  });

  it("enables RLS on experience_click_events exactly once", () => {
    expect(
      countMatches(
        /ALTER TABLE public\.experience_click_events ENABLE ROW LEVEL SECURITY;/gi,
      ),
    ).toBe(1);
  });

  it("declares exactly one insert policy and one admin select policy", () => {
    expect(
      countMatches(/CREATE POLICY "Anon and auth can insert experience clicks"/gi),
    ).toBe(1);
    expect(
      countMatches(/CREATE POLICY "Admin can select experience clicks"/gi),
    ).toBe(1);
    // No third/fourth policy smuggled in by a duplicated tail.
    expect(countMatches(/CREATE POLICY/gi)).toBe(2);
  });

  it("creates the table once and its three indexes once each", () => {
    expect(
      countMatches(
        /CREATE TABLE IF NOT EXISTS public\.experience_click_events/gi,
      ),
    ).toBe(1);
    expect(countMatches(/CREATE INDEX IF NOT EXISTS idx_exp_click_events_/gi)).toBe(3);
  });

  it("adds the extended partner_type constraint exactly once", () => {
    expect(countMatches(/ADD CONSTRAINT ck_click_events_partner_type/gi)).toBe(1);
    expect(sql).toMatch(
      /CHECK \(partner_type IS NULL OR partner_type IN \('flight', 'hotel', 'experience'\)\)/,
    );
  });
});

describe("Phase 1B analytics migration — dollar-quote integrity", () => {
  it("has balanced dollar-quote delimiters for the DO block and the function", () => {
    // One DO $$ ... END $$; block plus one AS $$ ... END; $$; function body.
    expect(countMatches(/\$\$/g)).toBe(4);
  });

  it("has no orphan standalone $$; after the function body", () => {
    // The 42601 signature: `END;` `$$;` immediately followed by another `$$;`.
    expect(sql).not.toMatch(/\$\$;\s*\$\$;/);
    // More generally: a `$$;` line never directly follows another `$$;` line.
    const orphan = sql
      .split(/\r?\n/)
      .some((line, i, all) => line.trim() === "$$;" && all[i - 1]?.trim() === "$$;");
    expect(orphan).toBe(false);
  });

  it("opens the function body with AS $$ and closes it with END; $$;", () => {
    expect(sql).toMatch(/AS \$\$\s*\nBEGIN/);
    expect(sql).toMatch(/RETURN true;\s*\nEND;\s*\n\$\$;/);
  });
});

describe("Phase 1B analytics migration — no truncated duplicate-tail fragments", () => {
  it("has no control-flow fragment at top-level SQL scope", () => {
    // The corrupt tails began mid-IF: a line that is bare ` THEN`, and
    // `END IF;` / `RETURN;` appearing after the function's closing `$$;`.
    const afterFunctionBody = sql.slice(sql.lastIndexOf("$$;") + 3);
    expect(afterFunctionBody).not.toMatch(/^\s*THEN\s*$/m);
    expect(afterFunctionBody).not.toMatch(/^\s*END IF;\s*$/m);
    expect(afterFunctionBody).not.toMatch(/^\s*RETURN\b/m);
    expect(afterFunctionBody).not.toMatch(/^\s*IF\s/m);
    expect(afterFunctionBody).not.toMatch(/INSERT INTO/i);
  });

  it("contains no unterminated regex literal from the truncated fragment", () => {
    // The corrupt copy ended mid-string on an imgix CDN host pattern.
    expect(sql).not.toMatch(/aws-tiqets-cdn\.imgix\.net/);
  });

  it("has exactly one Phase 4 RLS section header", () => {
    expect(countMatches(/4\. RLS on experience_click_events/g)).toBe(1);
  });

  it("ends on the admin select policy — nothing follows it", () => {
    expect(sql.trimEnd()).toMatch(/AND user_roles\.role = 'admin'\s*\n\s*\)\);$/);
  });
});

describe("Phase 1B analytics migration — preserved function contract", () => {
  it("keeps the six-argument signature", () => {
    expect(sql).toMatch(/p_product_id\s+text/);
    expect(sql).toMatch(/p_city\s+text/);
    expect(sql).toMatch(/p_displayed_price\s+numeric/);
    expect(sql).toMatch(/p_currency\s+text/);
    expect(sql).toMatch(/p_page_source\s+text/);
    expect(sql).toMatch(/p_outbound_hostname text/);
  });

  it("returns boolean — never void", () => {
    expect(sql).toMatch(/RETURNS boolean/);
    expect(sql).not.toMatch(/RETURNS void/i);
    expect(sql).toMatch(/RETURN false;/);
    expect(sql).toMatch(/RETURN true;/);
    // A bare `RETURN;` is the truncated-fragment signature, not this contract.
    expect(sql).not.toMatch(/^\s*RETURN;\s*$/m);
  });

  it("stays SECURITY DEFINER with an empty search_path", () => {
    expect(sql).toMatch(/SECURITY DEFINER/);
    expect(sql).toMatch(/SET search_path = ''/);
  });

  it("restricts outbound hosts to tiqets.com and its subdomains only", () => {
    expect(sql).toMatch(
      /p_outbound_hostname != 'tiqets\.com' AND p_outbound_hostname NOT LIKE '%\.tiqets\.com'/,
    );
  });

  it("introduces no public SELECT on the click events table", () => {
    // No privilege or policy is ever granted to the PUBLIC role. (Matched
    // precisely: `INSERT INTO public.<table>` is not a role grant.)
    expect(sql).not.toMatch(/\bGRANT\b[^;]*\bTO\s+PUBLIC\b/i);
    expect(sql).not.toMatch(/^\s*TO\s+PUBLIC\s*$/im);
    expect(sql).not.toMatch(/GRANT SELECT/i);
    // The only SELECT policy is the admin one, gated on user_roles.
    expect(countMatches(/FOR SELECT/gi)).toBe(1);
  });
});
