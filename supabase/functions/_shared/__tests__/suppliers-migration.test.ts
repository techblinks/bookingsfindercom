/**
 * BF1-D supplier registry migration — static SQL contract tests.
 *
 * PROOF BOUNDARY (same convention as catalogue-storage-migration.test.ts):
 * these are STATIC SOURCE-CONTRACT tests. No Postgres is started and no
 * migration is executed here; they prove what the migration SQL *says*.
 * The production apply + live verification (rows, RLS, grants, secret scan)
 * happens through scripts/suppliers-registry/apply-migration.ps1 and the
 * Supabase Management API, and generated types are regenerated afterwards.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { EXPECTED_SEED_SUPPLIERS } from "../suppliers.ts";

const MIGRATIONS_DIR = "supabase/migrations";
const MIGRATION_FILE = "20260825213000_bf1d_supplier_registry.sql";
const sql = readFileSync(`${MIGRATIONS_DIR}/${MIGRATION_FILE}`, "utf8");

/** SQL with `--` comments removed and whitespace collapsed. */
function executable(source: string): string {
  return source.replace(/^\s*--.*$/gm, "").replace(/\s+/g, " ").trim();
}
const code = executable(sql);

// ---------------------------------------------------------------------------
// Seed tuple extraction: each VALUES row is `( 'id', field, ... )` where fields
// contain no nested parentheses (JSON uses [] / {}), so a non-greedy match to
// the first ')' is exactly one tuple. Split fields on top-level commas only,
// respecting single-quoted strings (JSON payloads contain commas inside quotes).
// ---------------------------------------------------------------------------

function splitTopLevelFields(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let inStr = false;
  let cur = "";
  for (const ch of s) {
    if (inStr) {
      cur += ch;
      if (ch === "'") inStr = false;
      continue;
    }
    if (ch === "'") {
      inStr = true;
      cur += ch;
      continue;
    }
    if (ch === "[" || ch === "{") depth++;
    if (ch === "]" || ch === "}") depth--;
    if (ch === "," && depth === 0) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/** Column order matches the INSERT column list in the migration. */
const SEED_COLUMNS = [
  "display_name",
  "vertical",
  "status",
  "mode",
  "capabilities",
  "planned_capabilities",
  "commission",
  "config_refs",
] as const;

type SeedRow = Record<(typeof SEED_COLUMNS)[number], string>;

/**
 * Quote-aware scan for the seed tuple belonging to `id`: walks characters from
 * the tuple's opening paren and closes at the first ')' that sits OUTSIDE a
 * single-quoted SQL string. Scopes the search to the INSERT statement so
 * CHECK-constraint literals elsewhere in the file are never mistaken for seeds.
 */
function extractTupleFields(id: string): string[] {
  const insertStart = code.indexOf("insert into public.suppliers");
  expect(insertStart).toBeGreaterThanOrEqual(0);
  const anchor = new RegExp(`\\(\\s*'${id}',`).exec(code.slice(insertStart));
  expect(anchor, `seed tuple for '${id}' should exist`).not.toBeNull();
  let i = insertStart + anchor!.index; // at the opening '('
  let inStr = false;
  let depth = 0;
  const start = i;
  for (; i < code.length; i++) {
    const ch = code[i];
    if (inStr) {
      if (ch === "'") inStr = false;
      continue;
    }
    if (ch === "'") {
      inStr = true;
      continue;
    }
    if (ch === "[" || ch === "{") depth++;
    if (ch === "]" || ch === "}") depth--;
    if (ch === ")" && depth === 0) break; // tuple closes here
  }
  expect(code[i]).toBe(")");
  const inner = code.slice(start + 1, i);
  const allFields = splitTopLevelFields(inner);
  return allFields.slice(1); // remove leading 'id' field
}

function extractSeed(id: string): SeedRow {
  const fields = extractTupleFields(id);
  expect(fields.length, `${id} field count`).toBe(SEED_COLUMNS.length);
  const row = {} as Record<string, string>;
  SEED_COLUMNS.forEach((col, i) => {
    row[col] = fields[i];
  });
  return row as SeedRow;
}

/** `'["a", "b"]'::jsonb` -> ["a","b"]; `'{"x":1}'::jsonb` -> {"x":1}; NULL -> null */
function jsonValue(token: string): unknown {
  const m = token.match(/^'(.*)'(?:::jsonb)?$/);
  if (!m) return null; // bare NULL
  return JSON.parse(m[1]);
}

function plainText(token: string): string {
  const m = token.match(/^'(.*)'(?:::jsonb)?$/);
  return m ? m[1] : token; // bare keywords like NULL stay verbatim
}

// ---------------------------------------------------------------------------
// A. Seed rows exist and provider ids are stable & unique
// ---------------------------------------------------------------------------

describe("A. expected supplier seed rows exist; ids stable and unique", () => {
  it("creates the suppliers table", () => {
    expect(code).toContain("create table public.suppliers");
  });

  it("contains verified seed rows for travelpayouts, tiqets, viator, duffel — and no others", () => {
    const insertStart = code.indexOf("insert into public.suppliers");
    const conflictIdx = code.indexOf("on conflict (id)");
    const insertBlock = code.slice(insertStart, conflictIdx);
    const seededIds = [...insertBlock.matchAll(/\(\s*'([a-z][a-z0-9_]*)',/g)].map((m) => m[1]);
    expect(new Set(seededIds)).toEqual(new Set(Object.keys(EXPECTED_SEED_SUPPLIERS)));
    for (const id of Object.keys(EXPECTED_SEED_SUPPLIERS)) {
      for (const col of SEED_COLUMNS) expect(extractSeed(id)[col]).toBeTruthy();
    }
  });

  it("ids are stable machine identifiers matching the enforced format", () => {
    for (const id of Object.keys(EXPECTED_SEED_SUPPLIERS)) {
      expect(id).toMatch(/^[a-z][a-z0-9_]{1,39}$/);
    }
    // The same format is enforced at the database level.
    expect(code).toMatch(/id\s+text\s+primary key\s+constraint\s+suppliers_id_format_check\s+check \(id ~ '\^\[a-z\]\[a-z0-9_\]\{1,39\}\$'\)/);
  });

  it("each provider appears exactly once (primary key, no duplicate seed tuples)", () => {
    for (const id of Object.keys(EXPECTED_SEED_SUPPLIERS)) {
      const occurrences = [...code.matchAll(new RegExp(`\\(\\s*'${id}',`, "g"))].length;
      expect(occurrences).toBe(1);
    }
    expect(code).toContain("on conflict (id)");
  });
});

// ---------------------------------------------------------------------------
// B. Per-provider status / mode / vertical / capability reality
// ---------------------------------------------------------------------------

describe("B. seeded status/mode/vertical/capabilities match current reality", () => {
  it("travelpayouts: active / flight / affiliate with its five configured capabilities", () => {
    const row = extractSeed("travelpayouts");
    expect(plainText(row.vertical)).toBe(EXPECTED_SEED_SUPPLIERS.travelpayouts.vertical);
    expect(plainText(row.status)).toBe(EXPECTED_SEED_SUPPLIERS.travelpayouts.status);
    expect(plainText(row.mode)).toBe(EXPECTED_SEED_SUPPLIERS.travelpayouts.mode);
    expect(jsonValue(row.capabilities)).toEqual([...EXPECTED_SEED_SUPPLIERS.travelpayouts.capabilities]);
    expect(jsonValue(row.planned_capabilities)).toEqual([]);
  });

  it("tiqets: active / activity / affiliate with search/detail/redirect", () => {
    const row = extractSeed("tiqets");
    expect(plainText(row.vertical)).toBe(EXPECTED_SEED_SUPPLIERS.tiqets.vertical);
    expect(plainText(row.status)).toBe(EXPECTED_SEED_SUPPLIERS.tiqets.status);
    expect(plainText(row.mode)).toBe(EXPECTED_SEED_SUPPLIERS.tiqets.mode);
    expect(jsonValue(row.capabilities)).toEqual([...EXPECTED_SEED_SUPPLIERS.tiqets.capabilities]);
  });

  it("viator is NOT accidentally enabled — disabled, kill-switch env name recorded", () => {
    const row = extractSeed("viator");
    expect(plainText(row.status)).toBe("disabled");
    expect(plainText(row.status)).not.toBe("active");
    const refs = jsonValue(row.config_refs) as Record<string, string>;
    expect(refs.enabledFlagEnv).toBe("VIATOR_PUBLIC_ENABLED");
  });

  it("duffel: disabled placeholder — zero operational capabilities, roadmap-only planned set", () => {
    const row = extractSeed("duffel");
    expect(plainText(row.status)).toBe("disabled");
    expect(plainText(row.mode)).toBe("transactional");
    expect(jsonValue(row.capabilities)).toEqual([]);
    expect(jsonValue(row.planned_capabilities)).toEqual([
      "flightSearch",
      "offerReprice",
      "booking",
      "cancellation",
      "refund",
    ]);
  });

  it("status vocabulary is check-constrained and fail-closed values only", () => {
    expect(code).toMatch(/constraint suppliers_status_check check \(status in \('active', 'sandbox', 'disabled', 'deprecated'\)\)/);
  });

  it("mode and vertical vocabularies are check-constrained", () => {
    expect(code).toMatch(/constraint suppliers_mode_check check \(mode in \('affiliate', 'transactional'\)\)/);
    expect(code).toMatch(/constraint suppliers_vertical_check check \(vertical in \('flight', 'hotel', 'activity', 'multi'\)\)/);
  });

  it("re-seeds never overwrite health observations or created_at", () => {
    const conflictBlock = code.slice(code.indexOf("on conflict (id)"));
    expect(conflictBlock).toContain("do update set");
    expect(conflictBlock).not.toMatch(/health_last_ok_at\s*=/);
    expect(conflictBlock).not.toMatch(/health_last_error_at\s*=/);
    expect(conflictBlock).not.toMatch(/health_latency_ms\s*=/);
    expect(conflictBlock).not.toMatch(/created_at\s*=/);
  });
});

// ---------------------------------------------------------------------------
// C. RLS / grants: world-readable SELECT only; clients can never write
// ---------------------------------------------------------------------------

describe("C. RLS and grant matrix", () => {
  it("enables row level security on suppliers", () => {
    expect(code).toContain("alter table public.suppliers enable row level security");
  });

  it("grants SELECT to anon AND authenticated via a single world-read policy", () => {
    expect(code).toMatch(
      /create policy "suppliers_world_read"\s*on public\.suppliers\s*for select\s*to anon, authenticated\s*using \(true\)/,
    );
    expect(code).toContain("grant select on public.suppliers to anon, authenticated");
  });

  it("revokes INSERT/UPDATE/DELETE/TRUNCATE from anon and authenticated", () => {
    expect(code).toContain(
      "revoke insert, update, delete, truncate on public.suppliers from anon, authenticated",
    );
  });

  it("strips inert REFERENCES/TRIGGER privileges so clients hold SELECT only", () => {
    expect(code).toContain(
      "revoke references, trigger on public.suppliers from anon, authenticated",
    );
  });

  it("never grants write privileges on suppliers to anon or authenticated", () => {
    expect(code).not.toMatch(/grant (insert|update|delete|truncate|all)[^;]*public\.suppliers[^;]*(anon|authenticated)/);
  });
});

// ---------------------------------------------------------------------------
// D. Secret-safety: registry contains no credential material
// ---------------------------------------------------------------------------

describe("D. secret-safety of the migration", () => {
  it("contains no JWT / Stripe-style keys / long hex / long base64 literals", () => {
    expect(code).not.toMatch(/eyJ[A-Za-z0-9_-]{8,}\./); // JWT fragments
    expect(code).not.toMatch(new RegExp("\\b[a-f0-9]{32,}\\b", "i")); // long hex
    expect(code).not.toMatch(/\b[A-Za-z0-9+/]{40,}={0,2}\b/); // long base64 blobs
    expect(code).not.toMatch(/\b(sk|pk|rk)_(live|test)_[A-Za-z0-9]{8,}/); // Stripe-style
  });

  it("has no assignment-style secret values (token/key/secret/password = <literal>)", () => {
    // Values in this migration that follow such words are env var NAMES
    // (UPPER_SNAKE_CASE), which cannot contain lowercase/digits mixes — the
    // pattern below demands 16+ chars of mixed credential-like material.
    expect(code).not.toMatch(
      /(token|secret|password|api[_-]?key|bearer)\s*[:=]\s*["'][A-Za-z0-9+/=_-]{16,}["']/i,
    );
  });

  it("documents the no-secrets contract in the schema itself", () => {
    expect(code).toMatch(/comment on table public\.suppliers/i);
    expect(code.toLowerCase()).toContain("never values");
  });
});

// ---------------------------------------------------------------------------
// E. config_refs hold environment variable NAMES only
// ---------------------------------------------------------------------------

describe("E. config_refs discipline", () => {
  const ALLOWED_KEYS = new Set([
    "tokenEnv",
    "tokenAltEnv",
    "markerEnv",
    "apiKeyEnv",
    "baseUrlEnv",
    "enabledFlagEnv",
  ]);

  it("every config_refs value is an UPPER_SNAKE_CASE env var name — never a value", () => {
    for (const id of Object.keys(EXPECTED_SEED_SUPPLIERS)) {
      const refs = jsonValue(extractSeed(id).config_refs) as Record<string, unknown>;
      expect(refs, `${id} config_refs`).toBeTypeOf("object");
      for (const [key, value] of Object.entries(refs)) {
        expect(ALLOWED_KEYS.has(key), `key ${key} of ${id} is an approved ref kind`).toBe(true);
        expect(value, `value of ${key} in ${id}`).toMatch(/^[A-Z][A-Z0-9_]*$/);
      }
    }
  });

  it("config_refs is structurally constrained to a JSON object", () => {
    expect(code).toMatch(
      /constraint suppliers_config_refs_object_check check \(jsonb_typeof\(config_refs\) = 'object'\)/,
    );
  });
});

// ---------------------------------------------------------------------------
// F. Health fields exist but nothing populates them yet (BF1-M reserved)
// ---------------------------------------------------------------------------

describe("F. health fields present and untouched by seeds", () => {
  it("declares all four nullable health columns", () => {
    expect(code).toContain("health_last_ok_at");
    expect(code).toContain("health_last_error_at");
    expect(code).toMatch(/health_latency_ms\s+integer\s+null/);
    expect(code).toContain("health_note");
  });

  it("no seed statement writes health values", () => {
    const insertBlock = code.slice(code.indexOf("insert into public.suppliers"), code.indexOf("on conflict"));
    expect(insertBlock).not.toContain("health_");
  });
});
