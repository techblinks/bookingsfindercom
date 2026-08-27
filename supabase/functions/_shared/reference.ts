/**
 * reference.ts — BF1-C Airport/Metro Resolution Service (server-side layer).
 *
 * Backed exclusively by the BF1-B public read-only reference tables:
 *   countries / cities / airports / metro_airports (world-readable SELECT RLS).
 *
 * DESIGN CONTRACT (mirrored by src/lib/airportResolution.ts on the client):
 *   Deterministic resolution precedence for a code input:
 *     1. Exact airport IATA      (public.airports.pk — wins even when the same
 *                                letters are a metro code, e.g. SFO/DXB)
 *     2. Exact metro/city code   (public.cities.iata_code, is_metro flag)
 *     3. City expansion          (airports belonging to that city)
 *     4. Text search             (ranked tiers, bounded)
 *     5. Unknown                 -> null / [] — NEVER fabricated
 *
 *   Fail-closed everywhere: transport error, malformed row or unknown input
 *   resolves to null/[] instead of throwing or inventing data.
 *
 *   Queries are always bounded (.limit) and fully parameterized (supabase-js
 *   builder only — never string-interpolated SQL). Public-read RLS respected:
 *   callers pass an ANON-key client; no service-role usage here.
 *
 * The wire contract (AirportRef / ResolvedLocation field-for-field) matches
 * src/lib/airportResolution.ts. A single physical module cannot be imported by
 * both Deno (URL imports) and Vite cleanly, so the contract is duplicated
 * deliberately and kept in sync by tests asserting identical shapes.
 */

import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// ---------------------------------------------------------------------------
// Normalized contract (keep field-identical with src/lib/airportResolution.ts)
// ---------------------------------------------------------------------------

export const RESOLVED_KINDS = ["airport", "metro", "city"] as const;
export type ResolvedKind = (typeof RESOLVED_KINDS)[number];

/** Stable normalized fields consumers may rely on. Never a raw DB row. */
export interface AirportRef {
  code: string;
  /** Official airport name from reference data. */
  name: string;
  /** City shown to travellers (municipality, else host-city name). */
  city: string;
  /** Country ISO-2 code. */
  country: string;
  /** Rank inside a curated metro (1 = primary); undefined outside metros. */
  rank?: number;
}

export interface ResolvedLocation {
  kind: ResolvedKind;
  /** The code the caller asked about (airport IATA or metro/city code). */
  code: string;
  /** Human-readable label, e.g. "Tokyo — All Airports (TYO)" or "Brisbane (BNE)". */
  label: string;
  city: string;
  country: string;
  /** Complete ranked airport set (single-element for kind="airport"). */
  airports: AirportRef[];
  /** Rank-1 airport where applicable; undefined only for empty/degenerate sets. */
  primaryAirport?: AirportRef;
  /**
   * Travelpayouts-compatible code for search handoff. Actual existing behaviour:
   * provider accepts both airport codes and metro codes (TYO/LON/MOW are passed
   * through today), so this is the resolved code itself — no new supplier
   * assumption is made here.
   */
  providerCode: string;
  /** Which deterministic step produced this result. Provenance/debug aid. */
  resolvedVia: "airport-iata" | "metro-code" | "city-code" | "text-search";
}

// ---------------------------------------------------------------------------
// Structural client (subset of supabase-js) — injectable, vitest-friendly.
// ---------------------------------------------------------------------------

export interface RefQuery {
  eq(col: string, value: string): RefQuery;
  ilike(col: string, pattern: string): RefQuery;
  not(col: string, operator: string, value: unknown): RefQuery;
  order(col: string, opts?: { ascending?: boolean }): RefQuery;
  limit(n: number): PromiseLike<RefResult>;
  then: PromiseLike<RefResult>["then"];
}

export interface RefResult {
  data: unknown[] | null;
  error: { message: string } | null;
}

export interface ReferenceClientLike {
  from(table: string): {
    select(columns: string): RefQuery;
  };
}

const fail: RefResult = { data: null, error: { message: "reference query failed" } };

async function run(q: PromiseLike<RefResult>): Promise<unknown[]> {
  try {
    const res = await q;
    return res.error || !res.data ? [] : res.data;
  } catch {
    return []; // fail closed
  }
}

// ---------------------------------------------------------------------------
// Row schemas — strict enough that garbage fails closed into dropped rows.
// ---------------------------------------------------------------------------

const AirportRowSchema = z.object({
  iata: z.string().regex(/^[A-Z]{3}$/),
  name: z.string().min(1),
  municipality: z.string().nullable().optional(),
  country_iso2: z.string().regex(/^[A-Z]{2}$/),
  is_active: z.boolean(),
  cities: z.object({ name: z.string() }).nullable().optional(),
  countries: z.object({ name: z.string() }).nullable().optional(),
});

const CityRowSchema = z.object({
  id: z.number(),
  name: z.string().min(1),
  country_iso2: z.string().regex(/^[A-Z]{2}$/),
  // Required: every caller queries on iata_code presence; a null here means a
  // malformed/unexpected row -> dropped (fail closed).
  iata_code: z.string().regex(/^[A-Z]{3}$/),
  is_metro: z.boolean(),
  countries: z.object({ name: z.string() }).nullable().optional(),
});

const MetroMappingRowSchema = z.object({
  metro_code: z.string().regex(/^[A-Z]{3}$/),
  rank: z.number().int().min(1),
  airports: z
    .object({
      iata: z.string().regex(/^[A-Z]{3}$/),
      name: z.string().min(1),
      municipality: z.string().nullable().optional(),
      country_iso2: z.string().regex(/^[A-Z]{2}$/),
      is_active: z.boolean(),
    })
    .nullish(),
});

export type ParsedAirport = z.infer<typeof AirportRowSchema>;
export type ParsedCity = z.infer<typeof CityRowSchema>;

function parseOne<T extends z.ZodTypeAny>(schema: T, row: unknown): z.infer<T> | null {
  const r = schema.safeParse(row);
  return r.success ? r.data : null;
}

function airportToRef(a: ParsedAirport, rank?: number): AirportRef {
  return {
    code: a.iata,
    name: a.name,
    city: a.municipality ?? a.cities?.name ?? a.name,
    country: a.country_iso2,
    ...(rank !== undefined ? { rank } : {}),
  };
}

export function formatMetroLabel(city: string, code: string): string {
  return `${city} — All Airports (${code})`;
}

export function formatAirportLabel(ref: AirportRef): string {
  return `${ref.city} (${ref.code})`;
}

// ---------------------------------------------------------------------------
// Resolution — deterministic precedence (see header contract).
// ---------------------------------------------------------------------------

const AIRPORT_SELECT =
  "iata,name,municipality,country_iso2,is_active,cities(name),countries(name)";

/** Step 1 — exact airport IATA. Returns null when the code is not an airport. */
export async function findAirportByIata(
  client: ReferenceClientLike,
  code: string,
): Promise<ParsedAirport | null> {
  const rows = await run(
    client
      .from("airports")
      .select(AIRPORT_SELECT)
      .eq("iata", code)
      .eq("is_active", true)
      .limit(1),
  );
  return rows.length > 0 ? parseOne(AirportRowSchema, rows[0]) : null;
}

/** Curated metro membership for an airport (provenance + future nearby sets). */
export async function findMetroOfAirport(
  client: ReferenceClientLike,
  code: string,
): Promise<string | null> {
  const rows = await run(
    client
      .from("metro_airports")
      .select("metro_code,rank")
      .eq("airport_iata", code)
      .order("rank", { ascending: true })
      .limit(1),
  );
  const parsed = rows.length > 0 ? parseOne(MetroMappingRowSchema, rows[0]) : null;
  return parsed?.metro_code ?? null;
}

/** Step 2/3 — exact city/metro code lookup + complete ranked airport set. */
export async function findCityByCode(
  client: ReferenceClientLike,
  code: string,
): Promise<{ city: ParsedCity; airports: AirportRef[] } | null> {
  const rows = await run(
    client
      .from("cities")
      .select("id,name,country_iso2,iata_code,is_metro,countries(name)")
      .eq("iata_code", code)
      .not("iata_code", "is", null)
      .limit(1),
  );
  const city = rows.length > 0 ? parseOne(CityRowSchema, rows[0]) : null;
  if (!city) return null;

  let refs: AirportRef[];
  if (city.is_metro) {
    // Curated rank order is authoritative — never reduce to the first airport.
    const mappings = await run(
      client
        .from("metro_airports")
        .select("metro_code,rank,airports!inner(iata,name,municipality,country_iso2,is_active)")
        .eq("metro_code", city.iata_code!)
        .order("rank", { ascending: true })
        .limit(12),
    );
    refs = [];
    for (const raw of mappings) {
      const m = parseOne(MetroMappingRowSchema, raw);
      if (!m?.airports || m.airports.is_active !== true) continue;
      refs.push(
        airportToRef(
          { ...m.airports, cities: undefined, countries: undefined },
          m.rank,
        ),
      );
    }
  } else {
    const aps = await run(
      client
        .from("airports")
        .select("iata,name,municipality,country_iso2,is_active")
        .eq("city_id", city.id)
        .eq("is_active", true)
        .order("iata", { ascending: true })
        .limit(8),
    );
    refs = aps
      .map((r) => parseOne(AirportRowSchema, r))
      .filter((a): a is ParsedAirport => a !== null)
      .map((a) => airportToRef(a));
  }

  return { city, airports: refs };
}

/** Full deterministic resolution for a 3-letter code. Null = unresolved. */
export async function resolveLocationByCode(
  client: ReferenceClientLike,
  rawCode: string,
): Promise<ResolvedLocation | null> {
  const code = typeof rawCode === "string" ? rawCode.trim().toUpperCase() : "";
  if (!/^[A-Z]{3}$/.test(code)) return null;

  // 1. Exact airport IATA — must not be shadowed by metro logic (e.g. SFO/DXB).
  const airport = await findAirportByIata(client, code);
  if (airport) {
    const ref = airportToRef(airport);
    return {
      kind: "airport",
      code,
      label: formatAirportLabel(ref),
      city: ref.city,
      country: ref.country,
      airports: [ref],
      primaryAirport: ref,
      providerCode: code,
      resolvedVia: "airport-iata",
    };
  }

  // 2./3. Exact metro/city code.
  const byCity = await findCityByCode(client, code);
  if (byCity && byCity.airports.length > 0) {
    const { city, airports } = byCity;
    const primary = airports.find((a) => a.rank === 1) ?? airports[0];
    return {
      kind: city.is_metro ? "metro" : "city",
      code: city.iata_code!,
      label: city.is_metro
        ? formatMetroLabel(city.name, city.iata_code!)
        : formatAirportLabel(primary ?? { code: city.iata_code!, name: city.name, city: city.name, country: city.country_iso2 }),
      city: city.name,
      country: city.country_iso2,
      airports,
      primaryAirport: primary,
      providerCode: city.iata_code!,
      resolvedVia: city.is_metro ? "metro-code" : "city-code",
    };
  }

  // 5. Honest unresolved state.
  return null;
}

// ---------------------------------------------------------------------------
// Bounded ranked search (autocomplete).
// ---------------------------------------------------------------------------

export interface SearchHit {
  location: ResolvedLocation | ({ kind: "airport"; code: string } & AirportRef);
  /** Lower sorts first. Tiered so ranking is deterministic. */
  tier: number;
}

const TEXT_LIMIT = 6;

/**
 * Ranked search across IATA / airport name / city / country / metro code.
 * Every underlying query is bounded; the merged result is capped at `limit`.
 */
export async function searchReferenceLocations(
  client: ReferenceClientLike,
  term: string,
  limit = 8,
): Promise<SearchHit[]> {
  const q = typeof term === "string" ? term.trim() : "";
  if (q.length < 2 || limit < 1) return [];

  const upper = q.toUpperCase();
  const isCodeish = /^[A-Z]{3}$/.test(upper);

  // Tier 0/1 — deterministic code hits first (exact airport beats everything).
  const hits: SearchHit[] = [];

  if (isCodeish) {
    const airport = await findAirportByIata(client, upper);
    if (airport) {
      const ref = airportToRef(airport);
      hits.push({ tier: 0, location: { kind: "airport", ...ref } });
    }
  }

  const seenAirports = new Set(hits.map((h) => (h.location as AirportRef).code));

  const pushAirportRows = (rows: unknown[], tier: number) => {
    for (const raw of rows) {
      const a = parseOne(AirportRowSchema, raw);
      if (!a || seenAirports.has(a.iata)) continue;
      seenAirports.add(a.iata);
      hits.push({ tier, location: { kind: "airport", ...airportToRef(a) } });
    }
  };

  const like = escapePostgrestPattern(q);
  const prefix = `${like}*`;

  // Tier 2 — metro entries (exact code handled above via tier-0 miss path).
  const cityRows = await run(
    client
      .from("cities")
      .select("id,name,country_iso2,iata_code,is_metro,countries(name)")
      .or(
        [
          `iata_code.eq.${upper}`,
          `name.ilike.${prefix}`,
        ].join(","),
      )
      .not("iata_code", "is", null)
      .limit(TEXT_LIMIT),
  );
  const cities = cityRows
    .map((r) => parseOne(CityRowSchema, r))
    .filter((c): c is ParsedCity => c !== null);

  for (const city of cities) {
    const expanded = await findCityByCode(client, city.iata_code!);
    if (!expanded) continue;
    const isExactMetroCode = city.iata_code === upper;
    const tier = isExactMetroCode ? 1 : 2;
    if (city.is_metro) {
      const primary = expanded.airports.find((a) => a.rank === 1) ?? expanded.airports[0];
      if (primary && !seenAirports.has("__metro__" + city.iata_code)) {
        hits.push({
          tier,
          location: {
            kind: "metro",
            code: city.iata_code,
            label: formatMetroLabel(city.name, city.iata_code),
            city: city.name,
            country: city.country_iso2,
            airports: expanded.airports,
            primaryAirport: primary,
            providerCode: city.iata_code,
            resolvedVia: "metro-code",
          },
        });
      }
      for (const ref of expanded.airports) {
        if (!seenAirports.has(ref.code)) {
          seenAirports.add(ref.code);
          hits.push({ tier: Math.max(tier, 3), location: { kind: "airport", ...ref } });
        }
      }
    } else {
      // Non-metro city match: surface its airports (deduped against other tiers).
      for (const ref of expanded.airports) {
        if (!seenAirports.has(ref.code)) {
          seenAirports.add(ref.code);
          hits.push({ tier: 3, location: { kind: "airport", ...ref } });
        }
      }
    }
  }

  // Tier 3/4 — airport-level prefix then broader text (bounded).
  pushAirportRows(
    await run(
      client.from("airports").select(AIRPORT_SELECT).ilike("iata", prefix).eq("is_active", true).limit(TEXT_LIMIT),
    ),
    3,
  );
  pushAirportRows(
    await run(
      client.from("airports").select(AIRPORT_SELECT).ilike("municipality", prefix).eq("is_active", true).limit(TEXT_LIMIT),
    ),
    4,
  );
  pushAirportRows(
    await run(
      client.from("airports").select(AIRPORT_SELECT).ilike("name", prefix).eq("is_active", true).limit(TEXT_LIMIT),
    ),
    5,
  );
  if (q.length >= 3) {
    const contains = `%${like}%`;
    pushAirportRows(
      await run(
        client.from("airports").select(AIRPORT_SELECT).ilike("name", contains).eq("is_active", true).limit(TEXT_LIMIT),
      ),
      6,
    );
    pushAirportRows(
      await run(
        client.from("airports").select(AIRPORT_SELECT).ilike("municipality", contains).eq("is_active", true).limit(TEXT_LIMIT),
      ),
      7,
    );
  }

  // Deterministic merge: tier asc, then metro rank, then stable insertion order.
  const rankOf = (h: SearchHit) =>
    h.location.kind === "airport" ? (h.location as AirportRef).rank ?? 99 : 0;

  return hits
    .map((h, idx) => ({ h, idx }))
    .sort(
      (a, b) =>
        a.h.tier - b.h.tier ||
        rankOf(a.h) - rankOf(b.h) ||
        a.idx - b.idx,
    )
    .slice(0, limit)
    .map(({ h }) => h);
}

/**
 * Escape PostgREST ILIKE pattern metacharacters so user input can never alter
 * the pattern structure (parameterization happens at the builder level; this
 * protects pattern semantics).
 */
export function escapePostgrestPattern(input: string): string {
  return input.replace(/[\\%*(),]/g, (ch) => "\\" + ch);
}
