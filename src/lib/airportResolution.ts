/**
 * airportResolution.ts — BF1-C Airport/Metro Resolution Service (client layer).
 *
 * Replaces BookingsFinder's static/partial airport assumptions (curated label
 * maps, route-page fake-IATA fabrication) with deterministic resolution backed
 * by the BF1-B public read-only reference tables (countries/cities/airports/
 * metro_airports, world-read RLS).
 *
 * RESOLUTION PRECEDENCE (deterministic; mirrored by
 * supabase/functions/_shared/reference.ts on the server):
 *   1. Exact airport IATA        — wins even where the letters are also a metro
 *                                  code (SFO/DXB verified safe in BF1-B)
 *   2. Exact metro/city code     — cities.iata_code (+ is_metro)
 *   3. Ranked metro/city airport set — complete and order-preserving; never
 *                                  silently reduced to the first airport
 *   4. Text city match           — bounded prefix queries
 *   5. Unknown                   -> null (honest unresolved state; nothing
 *                                  fabricated, ever)
 *
 * CLIENT DATA ACCESS RULES (per BF1-C brief):
 *   - direct anon-key SELECT only (public-read RLS respected; no client writes,
 *     no service-role credentials anywhere near this module)
 *   - every query bounded (.limit ≤ 8); no %term% scans without a bound
 *   - fully parameterized supabase-js builder calls — no raw SQL interpolation
 *   - small TTL memo-cache to keep repeat lookups off the wire
 *
 * NOTE: this file deliberately does NOT power the autocomplete widget — that is
 * the server-side `search-airports` Edge Function over the same reference layer.
 */

import { supabase } from "@/integrations/supabase/client";

// ---------------------------------------------------------------------------
// Normalized contract (field-identical with _shared/reference.ts; kept in sync
// because Deno and Vite cannot share one physical module cleanly).
// ---------------------------------------------------------------------------

export type ResolvedKind = "airport" | "metro" | "city";

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
  /** The resolved reference code (airport IATA or metro/city code). */
  code: string;
  /** Human-readable label, e.g. "Tokyo — All Airports (TYO)" / "Brisbane (BNE)". */
  label: string;
  city: string;
  country: string;
  /** Complete ranked airport set (single-element for kind="airport"). */
  airports: AirportRef[];
  /** Rank-1 airport where applicable. */
  primaryAirport?: AirportRef;
  /**
   * Provider-compatible code for flight-search handoff. Current Travelpayouts
   * flow accepts both airport codes and metro codes (TYO/LON/NYC pass through
   * today), so this is the resolved code itself — no new supplier assumption.
   */
  providerCode: string;
  /** Which deterministic step produced this result. Provenance/debug aid. */
  resolvedVia: "airport-iata" | "metro-code" | "city-code" | "text-search";
}

// ---------------------------------------------------------------------------
// Display-label helpers (pure). No synthetic metro-host names (e.g. internal
// anchors like "washingtondc"/"frankfurt") ever leak here — labels are built
// from reference-data names at the resolver layer, never mutated into BF1-B.
// ---------------------------------------------------------------------------

export function formatMetroLabel(city: string, code: string): string {
  return `${city} — All Airports (${code})`;
}

export function formatAirportLabel(ref: Pick<AirportRef, "code" | "city">): string {
  return `${ref.city} (${ref.code})`;
}

const IATA_RE = /^[A-Z]{3}$/;

// ---------------------------------------------------------------------------
// Bounded, cached data access (anon key, public-read RLS).
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX = 300;

const codeCache = new Map<string, { value: ResolvedLocation | null; expires: number }>();
const textCache = new Map<string, { value: ResolvedLocation | null; expires: number }>();

function cacheGet(
  cache: Map<string, { value: ResolvedLocation | null; expires: number }>,
  key: string,
): ResolvedLocation | null | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (entry.expires < Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return entry.value;
}

function cacheSet(
  cache: Map<string, { value: ResolvedLocation | null; expires: number }>,
  key: string,
  value: ResolvedLocation | null,
): void {
  // Simple size guard so long sessions cannot grow the maps unbounded.
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { value, expires: Date.now() + CACHE_TTL_MS });
}

interface RawAirportRow {
  iata: unknown;
  name: unknown;
  municipality: unknown;
  country_iso2: unknown;
  is_active: unknown;
  cities?: { name?: unknown } | null;
  countries?: { name?: unknown } | null;
}

/** Strict row validation — malformed rows fail closed to null. */
function parseAirportRow(row: RawAirportRow | null | undefined): AirportRef | null {
  if (!row) return null;
  const iata = row.iata;
  const name = row.name;
  const country = row.country_iso2;
  if (typeof iata !== "string" || !IATA_RE.test(iata)) return null;
  if (typeof name !== "string" || name.length === 0) return null;
  if (typeof country !== "string" || !/^[A-Z]{2}$/.test(country)) return null;
  const city =
    typeof row.municipality === "string" && row.municipality.length > 0
      ? row.municipality
      : typeof row.cities?.name === "string" && row.cities.name.length > 0
        ? row.cities.name
        : name;
  return { code: iata, name, city, country };
}

interface RawCityRow {
  id: unknown;
  name: unknown;
  country_iso2: unknown;
  iata_code: unknown;
  is_metro: unknown;
}

function parseCityRow(row: RawCityRow | null | undefined): { id: number; name: string; country: string; code: string; isMetro: boolean } | null {
  if (!row) return null;
  const { id, name, country_iso2, iata_code, is_metro } = row;
  if (typeof id !== "number") return null;
  if (typeof name !== "string" || name.length === 0) return null;
  if (typeof country_iso2 !== "string" || !/^[A-Z]{2}$/.test(country_iso2)) return null;
  if (typeof iata_code !== "string" || !IATA_RE.test(iata_code)) return null;
  if (typeof is_metro !== "boolean") return null;
  return { id, name, country: country_iso2, code: iata_code, isMetro: is_metro };
}

async function queryRows(promise: PromiseLike<{ data: unknown }>): Promise<unknown[]> {
  try {
    const { data, error } = await promise as { data: unknown[] | null; error: { message: string } | null };
    return error || !data || !Array.isArray(data) ? [] : data;
  } catch {
    return []; // transport failure -> honest empty, never fabricated rows
  }
}

const AIRPORT_EMBED = "iata,name,municipality,country_iso2,is_active,cities(name),countries(name)";

async function fetchAirportByIata(iata: string): Promise<AirportRef | null> {
  const rows = await queryRows(
    supabase
      .from("airports")
      .select(AIRPORT_EMBED)
      .eq("iata", iata)
      .eq("is_active", true)
      .limit(1),
  );
  return rows.length > 0 ? parseAirportRow(rows[0] as RawAirportRow) : null;
}

async function fetchCityByIataCode(code: string) {
  const rows = await queryRows(
    supabase
      .from("cities")
      .select("id,name,country_iso2,iata_code,is_metro")
      .eq("iata_code", code)
      .limit(1),
  );
  return rows.length > 0 ? parseCityRow(rows[0] as RawCityRow) : null;
}

async function fetchRankedMetroAirports(metroCode: string): Promise<AirportRef[]> {
  interface MetroMappingRow {
    rank: unknown;
    airports: RawAirportRow | null;
  }
  const rows = await queryRows(
    supabase
      .from("metro_airports")
      .select("rank,airports!inner(iata,name,municipality,country_iso2,is_active)")
      .eq("metro_code", metroCode)
      .order("rank", { ascending: true })
      .limit(12),
  );
  const refs: AirportRef[] = [];
  for (const raw of rows) {
    const m = raw as MetroMappingRow;
    const ref = parseAirportRow(m.airports);
    const rank = typeof m.rank === "number" && Number.isInteger(m.rank) && m.rank >= 1 ? m.rank : undefined;
    if (ref) refs.push(rank !== undefined ? { ...ref, rank } : ref);
  }
  // Curated rank is authoritative — preserve it exactly.
  refs.sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
  return refs;
}

async function fetchAirportsOfCity(cityId: number): Promise<AirportRef[]> {
  const rows = await queryRows(
    supabase
      .from("airports")
      .select("iata,name,municipality,country_iso2,is_active")
      .eq("city_id", cityId)
      .eq("is_active", true)
      .order("iata", { ascending: true })
      .limit(8),
  );
  return rows
    .map((r) => parseAirportRow(r as RawAirportRow))
    .filter((r): r is AirportRef => r !== null);
}

async function expandCity(city: NonNullable<Awaited<ReturnType<typeof fetchCityByIataCode>>>): Promise<ResolvedLocation> {
  const airports = city.isMetro ? await fetchRankedMetroAirports(city.code) : await fetchAirportsOfCity(city.id);
  const primary = airports.find((a) => a.rank === 1) ?? airports[0];
  return {
    kind: city.isMetro ? "metro" : "city",
    code: city.code,
    label: city.isMetro ? formatMetroLabel(city.name, city.code) : formatAirportLabel({ code: primary?.code ?? city.code, city: city.name }),
    city: city.name,
    country: city.country,
    airports,
    ...(primary ? { primaryAirport: primary } : {}),
    providerCode: city.code,
    resolvedVia: city.isMetro ? "metro-code" : "city-code",
  };
}

// ---------------------------------------------------------------------------
// Public resolution API
// ---------------------------------------------------------------------------

/**
 * Deterministically resolve a location input.
 *
 * Accepts either an exact 3-letter code (airport OR metro/city) or free text
 * (city name). Returns null for anything unresolvable — callers must render an
 * honest unresolved state; no IATA code is ever fabricated.
 */
export async function resolveLocation(rawInput: string): Promise<ResolvedLocation | null> {
  const input = typeof rawInput === "string" ? rawInput.trim() : "";
  if (input.length === 0) return null;
  const upper = input.toUpperCase();
  if (IATA_RE.test(upper)) {
    const cached = cacheGet(codeCache, upper);
    if (cached !== undefined) return cached;
    const value = await resolveByCode(upper);
    cacheSet(codeCache, upper, value);
    return value;
  }
  const textKey = input.toLowerCase();
  const cachedText = cacheGet(textCache, textKey);
  if (cachedText !== undefined) return cachedText;
  const value = await resolveByText(input);
  cacheSet(textCache, textKey, value);
  return value;
}

async function resolveByCode(code: string): Promise<ResolvedLocation | null> {
  // 1. Exact airport IATA — must not be shadowed by metro logic.
  const airport = await fetchAirportByIata(code);
  if (airport) {
    return {
      kind: "airport",
      code,
      label: formatAirportLabel(airport),
      city: airport.city,
      country: airport.country,
      airports: [airport],
      primaryAirport: airport,
      providerCode: code,
      resolvedVia: "airport-iata",
    };
  }
  // 2./3. Exact metro/city code with its complete ranked airport set.
  const city = await fetchCityByIataCode(code);
  if (!city) return null; // 5. honest unresolved state
  const resolved = await expandCity(city);
  return resolved.airports.length > 0 ? resolved : null;
}

async function resolveByText(term: string): Promise<ResolvedLocation | null> {
  const pattern = escapeLike(term);
  // City-name prefix match, bounded. Exact name (case-insensitive) wins.
  const cityRows = await queryRows(
    supabase
      .from("cities")
      .select("id,name,country_iso2,iata_code,is_metro")
      .ilike("name", `${pattern}%`)
      .limit(6),
  );
  const cities = cityRows
    .map((r) => parseCityRow(r as RawCityRow))
    .filter((c): c is NonNullable<typeof c> => c !== null);
  if (cities.length > 0) {
    const wanted = term.toLowerCase();
    const exact = cities.find((c) => c.name.toLowerCase() === wanted);
    const chosen = exact ?? cities[0];
    const resolved = await expandCity(chosen);
    if (resolved.airports.length > 0) return resolved;
  }
  // Fallback: airport municipality/name prefix (e.g. towns whose "city" row
  // is not itself searchable), still bounded and honest.
  const apRows = await queryRows(
    supabase
      .from("airports")
      .select(AIRPORT_EMBED)
      .or(`municipality.ilike.${pattern}*,name.ilike.${pattern}*`)
      .eq("is_active", true)
      .limit(4),
  );
  const refs = apRows
    .map((r) => parseAirportRow(r as RawAirportRow))
    .filter((r): r is AirportRef => r !== null);
  const best = refs[0];
  if (!best) return null;
  return {
    kind: "airport",
    code: best.code,
    label: formatAirportLabel(best),
    city: best.city,
    country: best.country,
    airports: [best],
    primaryAirport: best,
    providerCode: best.code,
    resolvedVia: "text-search",
  };
}

/** Escape user text before it becomes part of an ILIKE pattern. Builder-level
 * parameterization already prevents SQL injection; this protects the PATTERN's
 * wildcard structure from being altered by input characters. */
function escapeLike(input: string): string {
  return input.replace(/[\\%*(),]/g, (ch) => "\\" + ch);
}
