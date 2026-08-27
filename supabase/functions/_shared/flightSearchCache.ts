/**
 * BF-FLIGHTS-CACHE-1 — persistent, service-role-only cache for search-flights.
 *
 * Mirrors the established DB-cache pattern in tiqets-public/index.ts
 * (fresh/stale/miss lookup, best-effort upsert, stale-if-error). See
 * supabase/migrations/20260824000000_bf_flights_cache_1_flight_search_cache.sql
 * for the persistent cache table schema.
 *
 * Freshness contract (Phase G/H):
 *   fresh   — age < FRESH_TTL_SEC (6h): served directly, never calls upstream.
 *   stale   — FRESH_TTL_SEC <= age < STALE_MAX_SEC (6-24h): only ever
 *             returned if a same-request upstream refresh attempt fails —
 *             never served in place of a genuine refresh attempt.
 *   miss    — no row, or row older than STALE_MAX_SEC: forces an upstream
 *             call; if that fails too, the caller must return a truthful
 *             empty/unavailable result, never this expired data.
 *
 * TTL choice (Phase 5): Travelpayouts' own documentation recommends
 * caching Data API responses client-side and currently suggests a 24-hour
 * cache lifetime. BookingsFinder deliberately uses a more responsive 6-hour
 * demand-driven TTL instead — fresher for travellers actively searching a
 * route, while STALE_MAX_SEC's 24h ceiling still matches (not exceeds)
 * Travelpayouts' own recommended upper bound for how long a cached
 * observation may reasonably be treated as usable at all. This is a claim
 * about BookingsFinder's OWN cache-refresh cadence, never a claim that the
 * underlying Travelpayouts observation itself was made within the last 6
 * hours — see fetchedAt/cacheStatus in search-flights' response and
 * flightCacheFreshness.ts on the frontend, which state only "BookingsFinder
 * fetched this X ago", not "the airline fare was observed X ago". There is
 * no blanket cron job proactively refreshing every route/date combination
 * on this schedule — see the BF-FLIGHTS-CACHE-REFRESH-1 follow-up in the
 * migration file for why that's a deliberate, separate decision.
 */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { FlightOffer } from "./flightProvider.ts";

/** 6 hours — the default demand-driven freshness window (Phase G). Change this one constant to retune TTL sitewide; the table schema does not need to change. */
export const FRESH_TTL_SEC = 6 * 60 * 60;

/** 24 hours — the outer ceiling for a stale-if-error fallback (Phase H), matching (not exceeding) Travelpayouts' own recommended cache lifetime. Never serve cache data older than this, under any circumstance. */
export const STALE_MAX_SEC = 24 * 60 * 60;

export interface FlightSearchCacheKeyInput {
  origin: string;
  destination: string;
  /** YYYY-MM-DD */
  departureDate: string;
  /** YYYY-MM-DD, or null/undefined for a one-way search. */
  returnDate?: string | null;
  currency: string;
}

/**
 * Deterministic delimited string, not a hash — IATA codes, ISO dates and
 * ISO currency codes can never contain "|", so there is no collision or
 * escaping concern, and the key stays human-readable for debugging.
 *
 * Deliberately excludes adults/children/infants/cabinClass — Travelpayouts'
 * prices_for_dates does not document any of them as pricing parameters (see
 * travelpayouts.ts), so keying by them would only fragment the cache
 * without ever changing the upstream response.
 */
export function computeFlightSearchCacheKey(input: FlightSearchCacheKeyInput): string {
  const origin = input.origin.toUpperCase();
  const destination = input.destination.toUpperCase();
  const currency = input.currency.toUpperCase();
  const returnPart = input.returnDate || "";
  return `${origin}|${destination}|${input.departureDate}|${returnPart}|${currency}`;
}

/**
 * payload_version 2 (BF1 main-integration reconciliation): caches the BF1-E
 * normalized FlightOffer[] domain result — the same shape provider.search()
 * returns and toWireFlightSearchResponse() serializes — rather than the
 * pre-BF1-E travelpayouts.ts FlightResult wire-ish shape (payload_version 1,
 * never applied/deployed). This keeps ONE source of truth for the wire
 * contract: a cache hit/stale-if-error response is rebuilt by feeding the
 * cached offers back through toWireFlightSearchResponse(), never by
 * duplicating field mapping here.
 */
export interface FlightSearchCachePayload {
  offers: FlightOffer[];
}

export interface FlightSearchCacheRow {
  cache_key: string;
  payload: FlightSearchCachePayload;
  fetched_at: string;
  expires_at: string;
}

export type FlightSearchCacheLookup =
  | { type: "fresh"; row: FlightSearchCacheRow }
  | { type: "stale"; row: FlightSearchCacheRow }
  | { type: "miss" };

/** Logs a sanitized cache-layer warning — message/code only, never payload/keys/tokens. */
function logCacheWarning(operation: string, detail: string): void {
  console.warn(`Flight search cache ${operation} warning: ${detail}`);
}

/**
 * Looks up a cache row, fresh first, then stale (only if fresh missed) —
 * matching tiqets-public's two-query pattern so a fresh hit costs exactly
 * one DB round trip. supabase-js returns { data, error } rather than
 * throwing on a DB-level failure, so both are checked explicitly. Any
 * lookup error (returned OR thrown) is treated as a miss — fail open to
 * upstream, never fail the whole request over a cache-layer problem.
 */
export async function getFlightSearchCache(
  client: SupabaseClient,
  cacheKey: string,
): Promise<FlightSearchCacheLookup> {
  try {
    const now = Date.now();
    const freshThreshold = new Date(now - FRESH_TTL_SEC * 1000).toISOString();

    const { data: fresh, error: freshError } = await client
      .from("flight_search_cache")
      .select("cache_key, payload, fetched_at, expires_at")
      .eq("cache_key", cacheKey)
      .gt("fetched_at", freshThreshold)
      .maybeSingle();

    if (freshError) {
      logCacheWarning("lookup", `${freshError.message} (treating as miss)`);
      return { type: "miss" };
    }

    if (fresh) {
      return { type: "fresh", row: fresh as unknown as FlightSearchCacheRow };
    }

    const staleThreshold = new Date(now - STALE_MAX_SEC * 1000).toISOString();

    const { data: stale, error: staleError } = await client
      .from("flight_search_cache")
      .select("cache_key, payload, fetched_at, expires_at")
      .eq("cache_key", cacheKey)
      .lte("fetched_at", freshThreshold)
      .gt("fetched_at", staleThreshold)
      .maybeSingle();

    if (staleError) {
      logCacheWarning("lookup", `${staleError.message} (treating as miss)`);
      return { type: "miss" };
    }

    if (stale) {
      return { type: "stale", row: stale as unknown as FlightSearchCacheRow };
    }

    return { type: "miss" };
  } catch (err) {
    logCacheWarning("lookup", `${err instanceof Error ? err.message : "unknown error"} (treating as miss)`);
    return { type: "miss" };
  }
}

export interface UpsertFlightSearchCacheParams {
  cacheKey: string;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string | null;
  currency: string;
  payload: FlightSearchCachePayload;
  /**
   * Canonical refresh instant, generated ONCE by the caller (after
   * provider.search() succeeds) and reused verbatim as the traveller-facing
   * response's meta.fetchedAt. Persisting this exact value — rather than a
   * second, separately-generated `new Date()` inside this function — is what
   * guarantees response.meta.fetchedAt and the persisted fetched_at row can
   * never diverge (BF-FLIGHTS-CACHE-1 consistency fix).
   */
  fetchedAt: string;
}

/**
 * Best-effort — a cache write failure must never fail the traveller's
 * search (the caller already has a valid Travelpayouts result regardless
 * of whether this succeeds). Still awaited by the caller so the write
 * request is allowed to actually complete before the response returns —
 * Edge Function runtime may terminate work once the response is sent, so
 * an un-awaited ("fire-and-forget") write is not reliable for a primary
 * persistent cache.
 */
export async function upsertFlightSearchCache(
  client: SupabaseClient,
  params: UpsertFlightSearchCacheParams,
): Promise<void> {
  try {
    const expiresAt = new Date(new Date(params.fetchedAt).getTime() + FRESH_TTL_SEC * 1000);

    const { error } = await client.from("flight_search_cache").upsert(
      {
        cache_key: params.cacheKey,
        origin: params.origin.toUpperCase(),
        destination: params.destination.toUpperCase(),
        departure_date: params.departureDate,
        return_date: params.returnDate,
        currency: params.currency.toUpperCase(),
        provider: "travelpayouts",
        payload: params.payload as unknown as Record<string, unknown>,
        payload_version: 2,
        fetched_at: params.fetchedAt,
        expires_at: expiresAt.toISOString(),
        updated_at: params.fetchedAt,
      },
      { onConflict: "cache_key" },
    );

    if (error) {
      logCacheWarning("write", `${error.message} for key ${params.cacheKey} (search result still returned to traveller)`);
    }
  } catch (err) {
    logCacheWarning("write", `${err instanceof Error ? err.message : "unknown error"} for key ${params.cacheKey} (search result still returned to traveller)`);
  }
}

/**
 * Best-effort demand signal (Phase S) — a no-op if the row doesn't exist yet
 * (a genuine first-ever search for this key), since the subsequent
 * upsertFlightSearchCache call sets its initial request_count=1. The
 * caller runs this concurrently with the cache lookup (Promise.all), not
 * serially — it is still non-fatal and never gates the freshness decision
 * or the response; concurrency is only so the request is allowed to
 * complete rather than being left as an untracked fire-and-forget promise.
 */
export async function recordFlightSearchDemand(client: SupabaseClient, cacheKey: string): Promise<void> {
  try {
    const { error } = await client.rpc("bump_flight_search_cache_demand", { p_cache_key: cacheKey });
    if (error) {
      logCacheWarning("demand tracking", `${error.message} for key ${cacheKey} (non-fatal)`);
    }
  } catch (err) {
    logCacheWarning("demand tracking", `${err instanceof Error ? err.message : "unknown error"} for key ${cacheKey} (non-fatal)`);
  }
}

/** BookingsFinder's own cache-fetch age — NEVER a claimed provider observation age (see FlightResults.tsx). */
export function computeAgeSeconds(fetchedAtIso: string, nowMs: number = Date.now()): number {
  const fetchedMs = new Date(fetchedAtIso).getTime();
  if (!Number.isFinite(fetchedMs)) return 0;
  return Math.max(0, Math.floor((nowMs - fetchedMs) / 1000));
}
