/**
 * suppliers.ts — server-side Supplier Registry accessor (BF1-D).
 *
 * The registry lives in the `suppliers` table (see migration
 * 20260825213000_bf1d_supplier_registry.sql). This module is deliberately SMALL:
 * typed lookups + strict validation + fail-closed semantics. No service layer,
 * no caching, no health polling (BF1-M), no provider routing (BF1-E).
 *
 * Fail-closed contract (enforced everywhere):
 *   - unknown id            -> null / false
 *   - transport error       -> null / false
 *   - malformed row         -> null / false  (strict Zod validation, unknown keys rejected)
 *   - status !== "active"   -> not enabled, regardless of capabilities
 *   - capability check      -> enabled AND capability present in configured set
 *
 * planned_capabilities is roadmap metadata ONLY and never satisfies supplierSupports().
 *
 * SECRET-SAFETY: config_refs may only ever contain environment variable NAMES.
 * EnvVarNameSchema rejects anything that is not an UPPER_SNAKE_CASE name, so a
 * pasted token value cannot survive validation. This module must never log or
 * persist credential material.
 */

import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

export const SUPPLIER_TABLE = "suppliers" as const;

/** Stable machine identifiers — NEVER mutable marketing names. */
export const SUPPLIER_IDS = ["travelpayouts", "tiqets", "viator", "duffel"] as const;
export type SupplierId = (typeof SUPPLIER_IDS)[number];

export const SUPPLIER_VERTICALS = ["flight", "hotel", "activity", "multi"] as const;
export type SupplierVertical = (typeof SUPPLIER_VERTICALS)[number];

export const SUPPLIER_STATUSES = ["active", "sandbox", "disabled", "deprecated"] as const;
export type SupplierStatus = (typeof SUPPLIER_STATUSES)[number];

export const SUPPLIER_MODES = ["affiliate", "transactional"] as const;
export type SupplierMode = (typeof SUPPLIER_MODES)[number];

/**
 * The closed capability vocabulary. Extending it is an additive code+schema change,
 * never a free-form string dump from the database.
 */
export const SUPPLIER_CAPABILITIES = [
  // flight vertical
  "flightSearch",
  "priceCalendar",
  "routeSuggestions",
  "specialOffers",
  "affiliateRedirect",
  // activity vertical
  "activitySearch",
  "activityDetail",
  // transactional booking lifecycle (future / planned)
  "offerReprice",
  "booking",
  "cancellation",
  "refund",
] as const;
export type SupplierCapability = (typeof SUPPLIER_CAPABILITIES)[number];

// ---------------------------------------------------------------------------
// Zod schemas — strict everywhere so unknown/malformed metadata fails closed.
// ---------------------------------------------------------------------------

/** Accepts only ENV_VAR_NAMES. A pasted secret value can never pass this shape. */
const EnvVarNameSchema = z
  .string()
  .regex(/^[A-Z][A-Z0-9_]*$/, "must be an ENV_VAR_NAME (names only, never values)");

export const ConfigRefsSchema = z
  .object({
    tokenEnv: EnvVarNameSchema.optional(),
    tokenAltEnv: EnvVarNameSchema.optional(),
    markerEnv: EnvVarNameSchema.optional(),
    apiKeyEnv: EnvVarNameSchema.optional(),
    baseUrlEnv: EnvVarNameSchema.optional(),
    enabledFlagEnv: EnvVarNameSchema.optional(),
  })
  .strict();

export const CommissionSchema = z
  .object({
    model: z.enum(["affiliate", "revenue_share", "cpa", "unknown"]),
    attributionMechanism: z.string().max(300).optional(),
    notes: z.string().max(500).optional(),
  })
  .strict();

const CapabilitySchema = z.enum(SUPPLIER_CAPABILITIES);
const CapabilitiesArraySchema = z.array(CapabilitySchema);

const IsoTimestampishSchema = z.union([z.string(), z.null()]);

/**
 * Row shape produced by `select *` on public.suppliers.
 * `.strict()` rejects rows carrying unexpected columns/values (fail closed).
 */
export const SupplierRecordSchema = z
  .object({
    id: z.string().regex(/^[a-z][a-z0-9_]{1,39}$/),
    display_name: z.string().min(1).max(120),
    vertical: z.enum(SUPPLIER_VERTICALS),
    status: z.enum(SUPPLIER_STATUSES),
    mode: z.enum(SUPPLIER_MODES),
    capabilities: CapabilitiesArraySchema,
    planned_capabilities: CapabilitiesArraySchema,
    commission: CommissionSchema.nullable(),
    config_refs: ConfigRefsSchema,
    health_last_ok_at: IsoTimestampishSchema,
    health_last_error_at: IsoTimestampishSchema,
    health_latency_ms: z.number().int().nonnegative().nullable(),
    health_note: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .strict();

export type SupplierRecord = z.infer<typeof SupplierRecordSchema>;

/**
 * Canonical seed contract (mirrors the BF1-D migration seeds). Single source of
 * truth for tests now; BF1-M health checks and future drift alarms later.
 */
export interface ExpectedSeedSupplier {
  vertical: SupplierVertical;
  status: SupplierStatus;
  mode: SupplierMode;
  capabilities: readonly SupplierCapability[];
  plannedCapabilities: readonly SupplierCapability[];
}

export const EXPECTED_SEED_SUPPLIERS: Record<SupplierId, ExpectedSeedSupplier> = {
  travelpayouts: {
    vertical: "flight",
    status: "active",
    mode: "affiliate",
    capabilities: ["flightSearch", "priceCalendar", "routeSuggestions", "specialOffers", "affiliateRedirect"],
    plannedCapabilities: [],
  },
  tiqets: {
    vertical: "activity",
    status: "active",
    mode: "affiliate",
    capabilities: ["activitySearch", "activityDetail", "affiliateRedirect"],
    plannedCapabilities: [],
  },
  viator: {
    // Kill-switched off server-side (VIATOR_PUBLIC_ENABLED) and sandbox-grade client:
    // registry mirrors reality — built, but NOT operational.
    vertical: "activity",
    status: "disabled",
    mode: "affiliate",
    capabilities: ["activitySearch", "activityDetail", "affiliateRedirect"],
    plannedCapabilities: [],
  },
  duffel: {
    // Future placeholder only. Nothing is wired up; nothing may claim operational support.
    vertical: "flight",
    status: "disabled",
    mode: "transactional",
    capabilities: [],
    plannedCapabilities: ["flightSearch", "offerReprice", "booking", "cancellation", "refund"],
  },
};

// ---------------------------------------------------------------------------
// Pure parsing helpers (no I/O) — safe to unit test directly under vitest.
// ---------------------------------------------------------------------------

/** Parse one raw DB row. Returns null on ANY deviation from the schema. */
export function parseSupplierRow(row: unknown): SupplierRecord | null {
  const result = SupplierRecordSchema.safeParse(row);
  return result.success ? result.data : null;
}

/** Parse a raw row list; malformed entries are dropped (never thrown). */
export function parseSupplierRows(rows: unknown): SupplierRecord[] {
  if (!Array.isArray(rows)) return [];
  const out: SupplierRecord[] = [];
  for (const row of rows) {
    const parsed = parseSupplierRow(row);
    if (parsed) out.push(parsed);
  }
  return out;
}

/** Enabled means explicitly 'active'. Sandbox/experimental/deprecated fail closed. */
export function isSupplierActive(record: SupplierRecord | null): boolean {
  return record?.status === "active";
}

/** Operational support = active status AND capability in the CONFIGURED set. */
export function supplierHasCapability(
  record: SupplierRecord | null,
  capability: SupplierCapability,
): boolean {
  return isSupplierActive(record) && record!.capabilities.includes(capability);
}

// ---------------------------------------------------------------------------
// DB-backed accessors. Client is injected (structural supabase-js subset), so
// this module imports cleanly in both Deno Edge Functions and vitest.
// ---------------------------------------------------------------------------

export interface SuppliersClientLike {
  from(table: string): {
    select(columns: string): {
      eq(
        column: string,
        value: string,
      ): PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>;
    };
  };
}

/** All parsed supplier rows. Malformed rows are silently dropped; errors -> []. */
export async function listSuppliers(client: SuppliersClientLike): Promise<SupplierRecord[]> {
  try {
    const { data, error } = await client.from(SUPPLIER_TABLE).select("*");
    if (error || !data) return [];
    return parseSupplierRows(data);
  } catch {
    return []; // fail closed
  }
}

/** Lookup by stable machine id. Unknown id / error / malformed row -> null. */
export async function getSupplier(
  client: SuppliersClientLike,
  id: string,
): Promise<SupplierRecord | null> {
  try {
    const { data, error } = await client.from(SUPPLIER_TABLE).select("*").eq("id", id);
    if (error || !data || data.length === 0) return null;
    return parseSupplierRow(data[0]);
  } catch {
    return null; // fail closed
  }
}

/**
 * True iff the supplier exists, parses cleanly and is explicitly active.
 * Unknown/malformed/error all resolve false — never throw.
 */
export async function isSupplierEnabled(
  client: SuppliersClientLike,
  id: string,
): Promise<boolean> {
  return isSupplierActive(await getSupplier(client, id));
}

/**
 * True iff the supplier is enabled AND its CONFIGURED capabilities include
 * `capability`. Planned/future capabilities never satisfy this. Any failure
 * resolves false — never throw.
 */
export async function supplierSupports(
  client: SuppliersClientLike,
  id: string,
  capability: SupplierCapability,
): Promise<boolean> {
  return supplierHasCapability(await getSupplier(client, id), capability);
}
