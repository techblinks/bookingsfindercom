/**
 * BF1-D Supplier Registry accessor — fail-closed behaviour tests.
 *
 * Covers registry identity contract + safe failure modes:
 *   - expected seed shape per provider (status/mode/vertical/capabilities)
 *   - unknown provider lookup fails safely (null / false, never throws)
 *   - malformed capabilities / metadata fail closed (strict Zod)
 *   - planned (future) capabilities NEVER satisfy operational support checks
 *   - config_refs accept environment variable NAMES only
 *
 * No network, no Postgres: DB access is a structural stub matching the
 * SuppliersClientLike interface.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import {
  ConfigRefsSchema,
  EXPECTED_SEED_SUPPLIERS,
  getSupplier,
  isSupplierEnabled,
  listSuppliers,
  parseSupplierRow,
  parseSupplierRows,
  supplierHasCapability,
  supplierSupports,
  type SuppliersClientLike,
  type SupplierRecord,
} from "../suppliers.ts";

// ---------------------------------------------------------------------------
// Stub client plumbing
// ---------------------------------------------------------------------------

type QueryResult = { data: unknown[] | null; error: { message: string } | null };

/**
 * Structural stub of the supabase-js query builder used by suppliers.ts:
 * `.from().select("*")` must be awaitable BOTH directly (listSuppliers) and
 * after `.eq(...)` (getSupplier).
 */
function makeBuilder(result: QueryResult | Error): Record<string, unknown> {
  const resolve = () =>
    result instanceof Error ? Promise.reject(result) : Promise.resolve(result);
  return {
    from() {
      return {
        select() {
          return {
            eq() {
              return resolve();
            },
            then(onFulfilled?: unknown, onRejected?: unknown) {
              return resolve().then(onFulfilled as never, onRejected as never);
            },
          };
        },
      };
    },
  };
}

function clientReturning(result: QueryResult): SuppliersClientLike {
  return makeBuilder(result) as unknown as SuppliersClientLike;
}

function clientThrowing(): SuppliersClientLike {
  return makeBuilder(new Error("network down")) as unknown as SuppliersClientLike;
}

/** A fully valid row shaped exactly like the production seed. */
function validRow(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    id: "travelpayouts",
    display_name: "Travelpayouts",
    vertical: "flight",
    status: "active",
    mode: "affiliate",
    capabilities: ["flightSearch", "priceCalendar"],
    planned_capabilities: [],
    commission: { model: "affiliate" },
    config_refs: { tokenEnv: "TRAVELPAYOUTS_API_KEY" },
    health_last_ok_at: null,
    health_last_error_at: null,
    health_latency_ms: null,
    health_note: null,
    created_at: "2026-08-25T00:00:00Z",
    updated_at: "2026-08-25T00:00:00Z",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// A. Registry identity contract (expected seed shapes)
// ---------------------------------------------------------------------------

describe("A. expected seed contract", () => {
  it("travelpayouts is active / flight / affiliate with its five built capabilities", () => {
    expect(EXPECTED_SEED_SUPPLIERS.travelpayouts.status).toBe("active");
    expect(EXPECTED_SEED_SUPPLIERS.travelpayouts.vertical).toBe("flight");
    expect(EXPECTED_SEED_SUPPLIERS.travelpayouts.mode).toBe("affiliate");
    expect([...EXPECTED_SEED_SUPPLIERS.travelpayouts.capabilities]).toEqual([
      "flightSearch",
      "priceCalendar",
      "routeSuggestions",
      "specialOffers",
      "affiliateRedirect",
    ]);
    expect(EXPECTED_SEED_SUPPLIERS.travelpayouts.plannedCapabilities).toEqual([]);
  });

  it("tiqets is active / activity / affiliate with search/detail/redirect", () => {
    expect(EXPECTED_SEED_SUPPLIERS.tiqets.status).toBe("active");
    expect(EXPECTED_SEED_SUPPLIERS.tiqets.vertical).toBe("activity");
    expect(EXPECTED_SEED_SUPPLIERS.tiqets.mode).toBe("affiliate");
    expect([...EXPECTED_SEED_SUPPLIERS.tiqets.capabilities]).toEqual([
      "activitySearch",
      "activityDetail",
      "affiliateRedirect",
    ]);
  });

  it("viator is NOT enabled (kill-switched off server-side), capabilities built but dormant", () => {
    expect(EXPECTED_SEED_SUPPLIERS.viator.status).not.toBe("active");
    expect(EXPECTED_SEED_SUPPLIERS.viator.status).toBe("disabled");
    expect(EXPECTED_SEED_SUPPLIERS.viator.vertical).toBe("activity");
    expect(EXPECTED_SEED_SUPPLIERS.viator.mode).toBe("affiliate");
  });

  it("duffel is a disabled future placeholder — nothing operational, roadmap only", () => {
    expect(EXPECTED_SEED_SUPPLIERS.duffel.status).toBe("disabled");
    expect(EXPECTED_SEED_SUPPLIERS.duffel.vertical).toBe("flight");
    expect(EXPECTED_SEED_SUPPLIERS.duffel.mode).toBe("transactional");
    expect(EXPECTED_SEED_SUPPLIERS.duffel.capabilities).toEqual([]);
    expect([...EXPECTED_SEED_SUPPLIERS.duffel.plannedCapabilities]).toEqual([
      "flightSearch",
      "offerReprice",
      "booking",
      "cancellation",
      "refund",
    ]);
  });
});

// ---------------------------------------------------------------------------
// B. Unknown provider lookup fails safely
// ---------------------------------------------------------------------------

describe("B. unknown provider lookup fails safely", () => {
  it("returns null for an unknown id", async () => {
    const client = clientReturning({ data: [], error: null });
    await expect(getSupplier(client, "not-a-supplier")).resolves.toBeNull();
  });

  it("isSupplierEnabled resolves false for an unknown id", async () => {
    const client = clientReturning({ data: [], error: null });
    await expect(isSupplierEnabled(client, "not-a-supplier")).resolves.toBe(false);
  });

  it("supplierSupports resolves false for an unknown id", async () => {
    const client = clientReturning({ data: [], error: null });
    await expect(
      supplierSupports(client, "not-a-supplier", "flightSearch"),
    ).resolves.toBe(false);
  });

  it("transport errors resolve false/null instead of throwing", async () => {
    const client = clientThrowing();
    await expect(getSupplier(client, "travelpayouts")).resolves.toBeNull();
    await expect(isSupplierEnabled(client, "travelpayouts")).resolves.toBe(false);
    await expect(
      supplierSupports(client, "travelpayouts", "flightSearch"),
    ).resolves.toBe(false);
    await expect(listSuppliers(client)).resolves.toEqual([]);
  });

  it("database-reported errors resolve false/null instead of throwing", async () => {
    const client = clientReturning({ data: null, error: { message: "permission denied" } });
    await expect(getSupplier(client, "travelpayouts")).resolves.toBeNull();
    await expect(isSupplierEnabled(client, "travelpayouts")).resolves.toBe(false);
  });
});

// ---------------------------------------------------------------------------
// C. Malformed capabilities / metadata fail closed
// ---------------------------------------------------------------------------

describe("C. malformed metadata fails closed", () => {
  const malformedCapabilityValues: unknown[] = [
    "flightSearch", // bare string, not array
    { flightSearch: true }, // object, not array
    [42], // wrong element type
    ["madeUpCapability"], // outside closed vocabulary
    null, // null where array required
  ];

  for (const bad of malformedCapabilityValues) {
    it(`rejects capabilities = ${JSON.stringify(bad)}`, () => {
      expect(parseSupplierRow(validRow({ capabilities: bad }))).toBeNull();
    });
  }

  it("rejects a completely malformed row", () => {
    expect(parseSupplierRow("garbage")).toBeNull();
    expect(parseSupplierRow(null)).toBeNull();
    expect(parseSupplierRow(undefined)).toBeNull();
    expect(parseSupplierRow({ id: "travelpayouts" })).toBeNull(); // missing everything else
  });

  it("rejects rows carrying unexpected top-level keys (strict schema)", () => {
    expect(parseSupplierRow(validRow({ sneaky_extra: "x" }))).toBeNull();
  });

  it("rejects commission payloads that invent rates (strict schema)", () => {
    expect(parseSupplierRow(validRow({ commission: { model: "affiliate", rate: 0.7 } }))).toBeNull();
  });

  it("rejects config_refs whose values are not ENV_VAR_NAMES (e.g. pasted secrets)", () => {
    expect(parseSupplierRow(validRow({ config_refs: { tokenEnv: "sk-live-abc123def456" } }))).toBeNull();
    expect(parseSupplierRow(validRow({ config_refs: { tokenEnv: "some secret value" } }))).toBeNull();
  });

  it("malformed stored rows never satisfy supplierSupports/isSupplierEnabled", async () => {
    const client = clientReturning({
      data: [
        validRow({
          id: "viator",
          status: "active",
          vertical: "activity",
          display_name: "Viator",
          commission: null,
          config_refs: {},
          capabilities: "corrupted",
        }),
      ],
      error: null,
    });
    await expect(isSupplierEnabled(client, "viator")).resolves.toBe(false);
    await expect(supplierSupports(client, "viator", "activitySearch")).resolves.toBe(false);
  });

  it("listSuppliers drops malformed rows and keeps well-formed ones", async () => {
    const client = clientReturning({
      data: [validRow(), validRow({ id: "broken", capabilities: { nope: 1 }, status: "sandbox" })],
      error: null,
    });
    const parsed = await listSuppliers(client);
    expect(parsed.length).toBe(1);
    expect(parsed[0].id).toBe("travelpayouts");
  });
});

// ---------------------------------------------------------------------------
// D. Planned (future) capabilities are never operational
// ---------------------------------------------------------------------------

describe("D. planned capabilities never satisfy operational support", () => {
  const activeWithOnlyPlannedBooking = (): SuppliersClientLike =>
    clientReturning({
      data: [
        validRow({
          id: "duffel_hypothetical_active",
          display_name: "Duffel Hypothetical Active",
          mode: "transactional",
          capabilities: [],
          planned_capabilities: ["booking", "offerReprice"],
          commission: null,
          config_refs: {},
        }),
      ],
      error: null,
    }) as SuppliersClientLike;

  it("isSupplierEnabled is true for an active row, but", async () => {
    await expect(isSupplierEnabled(activeWithOnlyPlannedBooking(), "duffel_hypothetical_active")).resolves.toBe(true);
  });

  it("supplierSupports is false because booking is only PLANNED", async () => {
    await expect(
      supplierSupports(activeWithOnlyPlannedBooking(), "duffel_hypothetical_active", "booking"),
    ).resolves.toBe(false);
  });

  it("non-active statuses always fail closed even with matching capabilities", () => {
    const record = parseSupplierRow(validRow({ status: "sandbox" })) as SupplierRecord;
    expect(record).not.toBeNull();
    expect(supplierHasCapability(record, "flightSearch")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// E. config_refs accept env var NAMES only
// ---------------------------------------------------------------------------

describe("E. config_refs env-name discipline", () => {
  it("accepts legitimate env var names", () => {
    expect(
      ConfigRefsSchema.safeParse({
        tokenEnv: "TRAVELPAYOUTS_API_KEY",
        markerEnv: "MARKER_ID",
        enabledFlagEnv: "VIATOR_PUBLIC_ENABLED",
      }).success,
    ).toBe(true);
  });

  it("rejects values that look like credential material", () => {
    expect(ConfigRefsSchema.safeParse({ tokenEnv: "eyJhbGciOiJIUzI1NiJ9.payload.sig" }).success).toBe(false);
    expect(ConfigRefsSchema.safeParse({ apiKeyEnv: "pk_live_51HxyzABC" }).success).toBe(false);
    expect(ConfigRefsSchema.safeParse({ baseUrlEnv: "https://user:pass@example.com" }).success).toBe(false);
  });

  it("rejects unknown config_ref keys (strict)", () => {
    expect(ConfigRefsSchema.safeParse({ freeformNote: "anything" }).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// F. The accessor itself must not embed secret material
// ---------------------------------------------------------------------------

describe("F. accessor source contains no obvious secrets", () => {
  const src = readFileSync("supabase/functions/_shared/suppliers.ts", "utf8");

  it("has no JWT / sk-pk keys / long hex / long base64 literals", () => {
    expect(src).not.toMatch(/eyJ[A-Za-z0-9_-]{8,}\./); // JWT
    expect(src).not.toMatch(/\b(sk|pk|rk)_[A-Za-z0-9]{10,}/); // Stripe-style keys
    expect(src).not.toMatch(new RegExp("\\b[a-f0-9]{32,}\\b", "i")); // long hex
    expect(src).not.toMatch(/\b[A-Za-z0-9+/]{40,}={0,2}\b/); // long base64
  });
});
