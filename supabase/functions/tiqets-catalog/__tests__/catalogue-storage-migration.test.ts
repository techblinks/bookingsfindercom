/**
 * T4A-P2 product storage migration — SQL contract tests.
 *
 * PROOF BOUNDARY — read this before trusting any assertion below.
 *
 * These are STATIC SOURCE-CONTRACT tests. No Postgres was started, no
 * migration was executed, and no row was written anywhere. The repository has
 * no local Postgres/Supabase execution harness, and P2 explicitly forbids
 * spinning one up or touching a remote project, so these tests prove what the
 * migration SQL *says* — not what a running Postgres *does* with it.
 *
 * That distinction is honest but not weak: the assertions are structural
 * rather than incidental. The `DO UPDATE SET` block, the `INSERT` column list
 * and the grant statements are parsed out of the file and checked against the
 * SAME ownership constants the TypeScript adapter exports
 * (`CATALOGUE_SNAPSHOT_OWNED_COLUMNS`, `CATALOGUE_ENRICHMENT_OWNED_COLUMNS`,
 * …). If either side of the storage contract drifts, these fail.
 *
 * What remains unproven until a real non-production database applies this
 * migration: that it executes without error, that the NOT VALID constraints
 * behave as expected against whatever rows already exist, and the observable
 * runtime behaviour of the upsert. Those are a later, genuinely-executed
 * phase.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import {
  CATALOGUE_ROW_IDENTITY_COLUMNS,
  CATALOGUE_SNAPSHOT_OWNED_COLUMNS,
  CATALOGUE_ENRICHMENT_OWNED_COLUMNS,
} from "../catalogue-storage.ts";

const MIGRATIONS_DIR = "supabase/migrations";
const MIGRATION_FILE = "20260819000000_t4a_p2_product_storage_contract.sql";
const LEGACY_FILE = "20260808000000_phase1c_experience_destinations.sql";

const sql = readFileSync(`${MIGRATIONS_DIR}/${MIGRATION_FILE}`, "utf8");
const legacySql = readFileSync(`${MIGRATIONS_DIR}/${LEGACY_FILE}`, "utf8");

/** SQL with `--` comments removed and whitespace collapsed, so prose never satisfies a test. */
function executable(source: string): string {
  return source.replace(/^\s*--.*$/gm, "").replace(/\s+/g, " ").trim();
}

const code = executable(sql);
const legacyCode = executable(legacySql);

/**
 * `code` with the COMMENT ON statements removed. Those statements are
 * documentation stored in the database: they legitimately name the things the
 * schema deliberately does NOT do, so absence assertions run against this.
 */
const ddl = code.replace(/COMMENT ON [^;]*;/g, "");

/** The body of the upsert function, comments stripped. */
const functionBody = (() => {
  const start = code.indexOf("CREATE OR REPLACE FUNCTION public.upsert_experience_products");
  expect(start).toBeGreaterThanOrEqual(0);
  const end = code.indexOf("$$;", start);
  expect(end).toBeGreaterThan(start);
  return code.slice(start, end + 3);
})();

/** The column list of the INSERT INTO public.experience_products statement. */
const insertColumns = (() => {
  const marker = "INSERT INTO public.experience_products (";
  const start = functionBody.indexOf(marker);
  expect(start).toBeGreaterThanOrEqual(0);
  const open = start + marker.length;
  const close = functionBody.indexOf(")", open);
  return functionBody
    .slice(open, close)
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
})();

/** Everything between `DO UPDATE SET` and the statement terminator. */
const updateSet = (() => {
  const marker = "DO UPDATE SET";
  const start = functionBody.indexOf(marker);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = functionBody.indexOf(";", start);
  return functionBody.slice(start + marker.length, end);
})();

/** Column names assigned in the DO UPDATE SET block. */
const updatedColumns = updateSet
  .split(",")
  .map((assignment) => assignment.trim().split("=")[0].trim())
  .filter(Boolean);

// ═══════════════════════════════════════════════════════════════
// A. The migration is forward-only
// ═══════════════════════════════════════════════════════════════

describe("A. forward-only migration", () => {
  it("exists under the repository's timestamped naming convention", () => {
    const files = readdirSync(MIGRATIONS_DIR);
    expect(files).toContain(MIGRATION_FILE);
    expect(MIGRATION_FILE).toMatch(/^\d{14}_[a-z0-9_]+\.sql$/);
  });

  it("sorts after every existing migration, so it applies last", () => {
    const others = readdirSync(MIGRATIONS_DIR).filter((f) => f !== MIGRATION_FILE);
    for (const other of others) {
      expect(MIGRATION_FILE > other).toBe(true);
    }
  });

  it("leaves the historical Phase 1C migration unedited", () => {
    // The legacy contract is still exactly what the audit described: a
    // NOT NULL product_url, an upsert that overwrites the enrichment-owned
    // `images` column, and no home for genuine image metadata.
    expect(legacySql).toContain("product_url         text NOT NULL");
    expect(legacyCode).toContain("images = EXCLUDED.images");
    expect(legacyCode).toContain("v_row->>'description'");
    expect(legacyCode).not.toContain("image_alt");
  });
});

// ═══════════════════════════════════════════════════════════════
// B. No data rewrite, no out-of-scope table
// ═══════════════════════════════════════════════════════════════

describe("B. no destructive or out-of-scope statement", () => {
  it("rewrites no existing row: no UPDATE, DELETE or TRUNCATE at migration level", () => {
    // Row-level DML would be a claim about production data nobody has looked at.
    const migrationLevel = code.replace(functionBody, "");
    for (const destructive of ["UPDATE public.", "DELETE FROM", "TRUNCATE"]) {
      expect(migrationLevel).not.toContain(destructive);
    }
  });

  it("drops nothing except the product_url NOT NULL constraint", () => {
    const drops = [...code.matchAll(/DROP [A-Z]+(?: [A-Z]+)*/g)].map((m) => m[0]);
    expect(drops).toEqual(["DROP NOT NULL"]);
    expect(code).toContain(
      "ALTER TABLE public.experience_products ALTER COLUMN product_url DROP NOT NULL;",
    );
  });

  it("does not touch experience_destinations (deferred to a later phase)", () => {
    expect(code).not.toContain("experience_destinations");
    expect(code).not.toContain("refresh_experience_destinations");
    expect(code).not.toContain("observed_product_count");
  });

  it("does not touch experience_catalog_sync_state (deferred to T4A-P3)", () => {
    expect(code).not.toContain("experience_catalog_sync_state");
    for (const p3 of ["next_page", "pages_scanned", "products_observed", "run_id", "lease"]) {
      expect(code).not.toContain(p3);
    }
  });

  it("does not weaken RLS or redesign read policies", () => {
    for (const rls of [
      "DISABLE ROW LEVEL SECURITY",
      "DROP POLICY",
      "CREATE POLICY",
      "ALTER POLICY",
      "FORCE ROW LEVEL SECURITY",
    ]) {
      expect(code).not.toContain(rls);
    }
  });

  it("does not touch the canonical activity identity tables", () => {
    expect(code).not.toContain("things_activities");
    expect(code).not.toContain("things_activity_offers");
  });
});

// ═══════════════════════════════════════════════════════════════
// C. product_url becomes nullable
// ═══════════════════════════════════════════════════════════════

describe("C. product_url nullability", () => {
  it("drops NOT NULL from product_url", () => {
    expect(code).toMatch(
      /ALTER TABLE public\.experience_products ALTER COLUMN product_url DROP NOT NULL/,
    );
  });

  it("never re-adds a NOT NULL or a fabricated default for product_url", () => {
    expect(code).not.toMatch(/product_url\s+SET NOT NULL/);
    expect(code).not.toMatch(/product_url\s+SET DEFAULT/);
    // No URL is ever synthesised in SQL.
    expect(code).not.toContain("tiqets.com");
    expect(code).not.toContain("https://");
  });
});

// ═══════════════════════════════════════════════════════════════
// D. Genuine new columns
// ═══════════════════════════════════════════════════════════════

describe("D. new columns map genuine normalized fields", () => {
  const expected: Array<[string, string]> = [
    ["image_alt", "text"],
    ["image_credit", "text"],
    ["smartphone_ticket", "boolean"],
    ["instant_ticket_delivery", "boolean"],
    ["duration", "text"],
    ["cancellation", "text"],
    ["product_checkout_url", "text"],
  ];

  for (const [column, type] of expected) {
    it(`adds ${column} ${type}, nullable and idempotent`, () => {
      expect(code).toMatch(
        new RegExp(`ADD COLUMN IF NOT EXISTS ${column}\\s+${type}(,|\\s*;)`),
      );
    });
  }

  it("adds no speculative column invented from nothing", () => {
    const added = [...code.matchAll(/ADD COLUMN IF NOT EXISTS (\w+)/g)].map((m) => m[1]);
    expect(added.sort()).toEqual(expected.map(([c]) => c).sort());
    for (const invented of [
      "meeting_point",
      "availability_state",
      "free_cancellation",
      // A booking-confirmation claim the provider contract never makes.
      "instant_confirmation",
    ]) {
      expect(added).not.toContain(invented);
    }
  });

  it("keeps the cancellation TEXT rather than a free_cancellation boolean", () => {
    expect(code).toContain("ADD COLUMN IF NOT EXISTS cancellation text");
    expect(ddl).not.toMatch(/cancellation\s+boolean/);
    // `free_cancellation` may appear only in the COMMENT ON that records the
    // decision — never as a column, and never derived from the provider text.
    expect(ddl).not.toContain("free_cancellation");
  });

  it("preserves the rating column type — no unproven scale change", () => {
    expect(code).not.toMatch(/ALTER COLUMN rating\s+TYPE/i);
    expect(code).toContain("COMMENT ON COLUMN public.experience_products.rating");
  });
});

// ═══════════════════════════════════════════════════════════════
// D2. Instant ticket delivery is NOT instant confirmation
// ═══════════════════════════════════════════════════════════════

describe("D2. provider semantics are not widened in SQL", () => {
  it("E. never creates or writes an instant_confirmation column", () => {
    // `ddl` excludes the COMMENT ON that documents WHY the column is absent.
    expect(ddl).not.toContain("instant_confirmation");
    expect(insertColumns).not.toContain("instant_confirmation");
    expect(updatedColumns).not.toContain("instant_confirmation");
    expect(functionBody).not.toContain("instant_confirmation");
  });

  it("reads and writes the provider claim under its own exact name", () => {
    expect(code).toContain("ADD COLUMN IF NOT EXISTS instant_ticket_delivery boolean");
    expect(insertColumns).toContain("instant_ticket_delivery");
    expect(functionBody).toContain("(e.item->>'instant_ticket_delivery')::boolean");
    expect(updateSet).toContain("instant_ticket_delivery = EXCLUDED.instant_ticket_delivery");
  });

  it("maps instant_ticket_delivery into no other column", () => {
    // Nothing assigns the delivery value to a differently-named target.
    expect(functionBody).not.toMatch(/instant_confirmation\s*=/);
    expect(functionBody).not.toMatch(/=\s*EXCLUDED\.instant_confirmation/);
  });

  it("records the distinction in the schema itself", () => {
    expect(code).toContain(
      "COMMENT ON COLUMN public.experience_products.instant_ticket_delivery",
    );
    expect(code).toContain("This is NOT booking confirmation");
  });

  it("no earlier migration ever created an instant_confirmation column", () => {
    // So leaving it out means the public instantConfirmation field keeps
    // resolving to null — current behaviour, unchanged.
    // The P2 migration itself is excluded: its only mention is the COMMENT ON
    // recording why the column is deliberately absent (asserted above).
    for (const file of readdirSync(MIGRATIONS_DIR).filter((f) => f !== MIGRATION_FILE)) {
      const other = readFileSync(`${MIGRATIONS_DIR}/${file}`, "utf8");
      expect(other).not.toContain("instant_confirmation");
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// E. JSONB shape guards, added safely
// ═══════════════════════════════════════════════════════════════

describe("E. JSONB constraints are forward-safe", () => {
  it("constrains tag_ids and images to genuine JSON arrays", () => {
    expect(code).toContain("CHECK (jsonb_typeof(tag_ids) = 'array')");
    expect(code).toContain("CHECK (jsonb_typeof(images) = 'array')");
  });

  it("adds both constraints NOT VALID — existing rows are never re-checked", () => {
    // Production row state is unknown, so the migration makes no claim about it.
    const checks = [...code.matchAll(/CHECK \(jsonb_typeof\(\w+\) = 'array'\) (NOT VALID)/g)];
    expect(checks).toHaveLength(2);
    expect(code).not.toContain("VALIDATE CONSTRAINT");
  });

  it("adds them idempotently via a pg_constraint guard", () => {
    expect(code).toContain("FROM pg_constraint");
    expect(code).toContain("ck_experience_products_tag_ids_array");
    expect(code).toContain("ck_experience_products_images_array");
  });
});

// ═══════════════════════════════════════════════════════════════
// F. RPC signature, security and identity
// ═══════════════════════════════════════════════════════════════

describe("F. upsert_experience_products contract", () => {
  it("preserves the exact signature", () => {
    expect(functionBody).toContain(
      "CREATE OR REPLACE FUNCTION public.upsert_experience_products( p_provider text, p_products jsonb ) RETURNS integer",
    );
  });

  it("remains SECURITY DEFINER with a hardened search_path", () => {
    expect(functionBody).toContain("SECURITY DEFINER");
    expect(functionBody).toContain("SET search_path = ''");
    expect(functionBody).not.toContain("SECURITY INVOKER");
  });

  it("keeps the conflict key at provider + provider_product_id", () => {
    expect(functionBody).toContain("ON CONFLICT (provider, provider_product_id) DO UPDATE SET");
    const conflictTargets = [...functionBody.matchAll(/ON CONFLICT \(([^)]*)\)/g)].map(
      (m) => m[1],
    );
    expect(conflictTargets).toEqual(["provider, provider_product_id"]);
  });

  it("never adopts title, slug or URL as identity", () => {
    expect(functionBody).not.toMatch(/ON CONFLICT \([^)]*slug/);
    expect(functionBody).not.toMatch(/ON CONFLICT \([^)]*title/);
    expect(functionBody).not.toMatch(/ON CONFLICT \([^)]*url/);
    // No unique index is created on the generated provider slug.
    expect(code).not.toMatch(/UNIQUE[\s\S]{0,40}slug/);
  });

  it("scopes every row to the p_provider argument, never a per-row provider", () => {
    expect(insertColumns[0]).toBe("provider");
    expect(functionBody).toMatch(/SELECT p_provider,/);
    expect(functionBody).not.toContain("item->>'provider'");
  });

  it("returns an integer row count from the statement itself", () => {
    expect(functionBody).toContain("RETURNS integer");
    expect(functionBody).toContain("GET DIAGNOSTICS v_count = ROW_COUNT");
    expect(functionBody).toContain("RETURN v_count");
  });
});

// ═══════════════════════════════════════════════════════════════
// G. Fail-closed input validation, atomic batch
// ═══════════════════════════════════════════════════════════════

describe("G. RPC input validation", () => {
  it("rejects a blank provider", () => {
    expect(functionBody).toContain("IF p_provider IS NULL OR btrim(p_provider) = '' THEN");
    expect(functionBody).toMatch(/RAISE EXCEPTION 'upsert_experience_products: p_provider/);
  });

  it("rejects a non-array p_products", () => {
    expect(functionBody).toContain("jsonb_typeof(p_products) <> 'array'");
  });

  it("rejects blank provider_product_id and blank title", () => {
    expect(functionBody).toContain("coalesce(btrim(e.item->>'provider_product_id'), '') = ''");
    expect(functionBody).toContain("coalesce(btrim(e.item->>'title'), '') = ''");
  });

  it("rejects non-array tag_ids and images when they are carried", () => {
    for (const key of ["tag_ids", "images"]) {
      expect(functionBody).toContain(
        `jsonb_typeof(e.item->'${key}') NOT IN ('array', 'null')`,
      );
    }
  });

  it("fails the batch instead of silently skipping a malformed row", () => {
    // No filtering: every element of the array is either stored or the whole
    // call raises. Partial-success policy belongs to the P3 sync engine.
    const insertStatement = functionBody.slice(
      functionBody.indexOf("INSERT INTO public.experience_products ("),
      functionBody.indexOf("ON CONFLICT"),
    );
    expect(insertStatement).not.toContain(" WHERE ");
    expect(functionBody).not.toContain("DO NOTHING");
    expect(functionBody).not.toContain("CONTINUE");
    expect(functionBody).not.toContain("EXCEPTION WHEN");
    const raises = [...functionBody.matchAll(/RAISE EXCEPTION/g)];
    expect(raises.length).toBeGreaterThanOrEqual(4);
  });

  it("rejects a duplicate provider_product_id within one batch", () => {
    expect(functionBody).toContain("HAVING count(*) > 1");
    expect(functionBody).toMatch(/appear more than once in the batch/);
  });
});

// ═══════════════════════════════════════════════════════════════
// H. Insert behaviour — enrichment columns are never written
// ═══════════════════════════════════════════════════════════════

describe("H. insert column list", () => {
  it("inserts exactly provider + the adapter's row columns", () => {
    expect(insertColumns.sort()).toEqual(
      [
        "provider",
        ...CATALOGUE_ROW_IDENTITY_COLUMNS,
        ...CATALOGUE_SNAPSHOT_OWNED_COLUMNS,
      ].sort(),
    );
  });

  it("never inserts an enrichment-owned column — defaults apply instead", () => {
    for (const column of CATALOGUE_ENRICHMENT_OWNED_COLUMNS) {
      expect(insertColumns).not.toContain(column);
    }
  });

  it("never inserts provider_updated_at — no proven upstream timestamp exists", () => {
    expect(insertColumns).not.toContain("provider_updated_at");
    expect(functionBody).not.toContain("provider_updated_at");
  });

  it("never inserts created_at, updated_at or the generated slug", () => {
    for (const dbOwned of ["created_at", "slug"]) {
      expect(insertColumns).not.toContain(dbOwned);
    }
    expect(insertColumns).not.toContain("updated_at");
  });
});

// ═══════════════════════════════════════════════════════════════
// I. Conflict behaviour — the heart of the repaired contract
// ═══════════════════════════════════════════════════════════════

describe("I. ON CONFLICT update set", () => {
  it("refreshes EVERY snapshot-owned column", () => {
    for (const column of CATALOGUE_SNAPSHOT_OWNED_COLUMNS) {
      expect(updatedColumns).toContain(column);
      expect(updateSet).toContain(`${column} = EXCLUDED.${column}`);
    }
  });

  it("repairs the legacy omissions that froze after first insert", () => {
    // The audit's four frozen columns.
    for (const repaired of ["tagline", "venue_name", "wheelchair_accessible", "skip_the_line"]) {
      expect(updateSet).toContain(`${repaired} = EXCLUDED.${repaired}`);
      expect(legacySql).not.toContain(`${repaired} = EXCLUDED.${repaired}`);
    }
  });

  it("refreshes the newly stored snapshot columns too", () => {
    for (const added of [
      "image_alt",
      "image_credit",
      "smartphone_ticket",
      "instant_ticket_delivery",
      "duration",
      "cancellation",
      "product_checkout_url",
    ]) {
      expect(updateSet).toContain(`${added} = EXCLUDED.${added}`);
    }
  });

  it("NEVER overwrites description on conflict", () => {
    expect(updatedColumns).not.toContain("description");
    expect(updateSet).not.toContain("description");
    // The legacy function wrote description on INSERT from the list payload;
    // this one never sends it at all, so the column stays enrichment-owned.
    expect(legacyCode).toContain("v_row->>'description'");
    expect(functionBody).not.toContain("'description'");
  });

  it("NEVER overwrites images on conflict", () => {
    expect(updatedColumns).not.toContain("images");
    expect(updateSet).not.toContain("images");
    // The legacy migration did exactly this — a defect being repaired.
    expect(legacyCode).toContain("images = EXCLUDED.images");
  });

  it("lets a null observation replace a stale value — no COALESCE merge", () => {
    // COALESCE(EXCLUDED.col, col) would silently retain stale provider facts.
    expect(updateSet).not.toContain("COALESCE");
    expect(updateSet).not.toContain("coalesce");
    for (const column of CATALOGUE_SNAPSHOT_OWNED_COLUMNS) {
      expect(updateSet).not.toMatch(new RegExp(`${column}\\s*=\\s*coalesce`, "i"));
    }
  });

  it("never reassigns identity or created_at", () => {
    for (const immutable of ["provider", "provider_product_id", "created_at", "slug"]) {
      expect(updatedColumns).not.toContain(immutable);
    }
  });

  it("refreshes updated_at with now()", () => {
    expect(updateSet).toContain("updated_at = now()");
    expect(updatedColumns).toContain("updated_at");
  });

  it("updates exactly the snapshot set plus updated_at — nothing else", () => {
    expect(updatedColumns.sort()).toEqual(
      [...CATALOGUE_SNAPSHOT_OWNED_COLUMNS, "updated_at"].sort(),
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// J. JSONB is consumed as JSONB
// ═══════════════════════════════════════════════════════════════

describe("J. JSONB handling", () => {
  it("reads tag_ids with the jsonb -> operator, never the ->> text operator", () => {
    expect(functionBody).toContain("e.item->'tag_ids'");
    expect(functionBody).not.toContain("e.item->>'tag_ids'");
  });

  it("guarantees a genuine array reaches the jsonb column", () => {
    expect(functionBody).toContain(
      "CASE WHEN jsonb_typeof(e.item->'tag_ids') = 'array' THEN e.item->'tag_ids' ELSE '[]'::jsonb END",
    );
  });

  it("never casts a JSON value to text and back into jsonb", () => {
    expect(functionBody).not.toMatch(/->>\s*'tag_ids'\s*\)::jsonb/);
    expect(functionBody).not.toMatch(/->>\s*'images'\s*\)::jsonb/);
    expect(functionBody).not.toContain("to_jsonb(");
  });
});

// ═══════════════════════════════════════════════════════════════
// K. Zero is real data at the SQL boundary too
// ═══════════════════════════════════════════════════════════════

describe("K. numeric zero survives the SQL cast", () => {
  it("casts numerics straight from ->>, with no truthiness filter", () => {
    for (const [column, cast] of [
      ["rating", "numeric"],
      ["review_count", "integer"],
      ["price_amount", "numeric"],
    ] as const) {
      expect(functionBody).toContain(`(e.item->>'${column}')::${cast}`);
      // NULLIF(x, 0) / "> 0" guards are exactly how a genuine 0 gets lost.
      expect(functionBody).not.toContain(`NULLIF(e.item->>'${column}'`);
      expect(functionBody).not.toMatch(new RegExp(`${column}[^,]*> 0`));
    }
  });

  it("applies coalesce only to last_seen_at, where it is a default, not a merge", () => {
    const coalesces = [...functionBody.matchAll(/coalesce\(([^,]+),/gi)].map((m) => m[1].trim());
    expect(coalesces).toEqual([
      "btrim(e.item->>'provider_product_id')",
      "btrim(e.item->>'title')",
      "(e.item->>'last_seen_at')::timestamptz",
    ]);
  });
});

// ═══════════════════════════════════════════════════════════════
// L. Sale status is stored verbatim
// ═══════════════════════════════════════════════════════════════

describe("L. sale_status verbatim", () => {
  it("stores the raw normalized string with no translation", () => {
    expect(functionBody).toContain("e.item->>'sale_status'");
    for (const invented of ["on_sale", "sold_out", "'available'", "'unavailable'"]) {
      expect(functionBody).not.toContain(invented);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// M. Explicit permission contract
// ═══════════════════════════════════════════════════════════════

describe("M. execute permissions", () => {
  const signature = "ON FUNCTION public.upsert_experience_products(text, jsonb)";

  it("revokes from PUBLIC, anon and authenticated", () => {
    for (const role of ["PUBLIC", "anon", "authenticated"]) {
      expect(code).toContain(`REVOKE ALL ${signature} FROM ${role};`);
    }
  });

  it("grants EXECUTE to service_role, and only to service_role", () => {
    expect(code).toContain(`GRANT EXECUTE ${signature} TO service_role;`);
    const grantees = [...code.matchAll(/GRANT [A-Z ]+ON FUNCTION [^;]*? TO (\w+);/g)].map(
      (m) => m[1],
    );
    expect(grantees).toEqual(["service_role"]);
  });

  it("never grants catalogue write access to a browser role", () => {
    for (const role of ["anon", "authenticated", "PUBLIC"]) {
      expect(code).not.toMatch(new RegExp(`GRANT [A-Z ]+ON FUNCTION [^;]*? TO ${role};`));
    }
  });

  it("makes the revoke explicit rather than relying on Phase 1C's PUBLIC-only revoke", () => {
    expect(legacyCode).toContain("REVOKE ALL ON FUNCTION public.upsert_experience_products");
    // Phase 1C named no executor at all — that is the gap being closed.
    expect(legacyCode).not.toContain("GRANT");
    expect(legacyCode).not.toContain("service_role");
  });
});

// ═══════════════════════════════════════════════════════════════
// N. No index added without a proven query
// ═══════════════════════════════════════════════════════════════

describe("N. indexes", () => {
  it("adds no speculative index — the proven filters are already covered", () => {
    expect(code).not.toContain("CREATE INDEX");
    expect(legacySql).toContain("ix_products_city");
    expect(legacySql).toContain("ix_products_country");
  });
});
