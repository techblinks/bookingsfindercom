/**
 * BF-FLIGHTS-CACHE-1 — persistent, service-role-only cache for search-flights.
 *
 * Mirrors the established DB-cache pattern in tiqets-public/index.ts
 * (fresh/stale/miss lookup, best-effort upsert, stale-if-error). See
 * supabase/migrations/20260824000000_bf_flights_cache_1_flight_search_cache.sql
 * for the table (NOT applied in this round — documentation-only migration).
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
import type { FlightResult } from "./travelpayouts.ts";

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

export interface FlightSearchCachePayload {
  flights: FlightResult[];
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

/**
 * Looks up a cache row, fresh first, then stale (only if fresh missed) —
 * matching tiqets-public's two-query pattern so a fresh hit costs exactly
 * one DB round trip. DB errors are treated as a miss (fail open to
 * upstream, never fail the whole request over a cache-layer problem).
 */
export async function getFlightSearchCache(
  client: SupabaseClient,
  cacheKey: string,
): Promise<FlightSearchCacheLookup> {
  try {
    const now = Date.now();
    const freshThreshold = new Date(now - FRESH_TTL_SEC * 1000).toISOString();

    const { data: fresh } = await client
      .from("flight_search_cache")
      .select("cache_key, payload, fetched_at, expires_at")
      .eq("cache_key", cacheKey)
      .gt("fetched_at", freshThreshold)
      .maybeSingle();

    if (fresh) {
      return { type: "fresh", row: fresh as unknown as FlightSearchCacheRow };
    }

    const staleThreshold = new Date(now - STALE_MAX_SEC * 1000).toISOString();

    const { data: stale } = await client
      .from("flight_search_cache")
      .select("cache_key, payload, fetched_at, expires_at")
      .eq("cache_key", cacheKey)
      .lte("fetched_at", freshThreshold)
      .gt("fetched_at", staleThreshold)
      .maybeSingle();

    if (stale) {
      return { type: "stale", row: stale as unknown as FlightSearchCacheRow };
    }

    return { type: "miss" };
  } catch {
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
}

/** Best-effort — a cache write failure must never fail the traveller's search. */
export async function upsertFlightSearchCache(
  client: SupabaseClient,
  params: UpsertFlightSearchCacheParams,
): Promise<void> {
  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + FRESH_TTL_SEC * 1000);

    await client.from("flight_search_cache").upsert(
      {
        cache_key: params.cacheKey,
        origin: params.origin.toUpperCase(),
        destination: params.destination.toUpperCase(),
        departure_date: params.departureDate,
        return_date: params.returnDate,
        currency: params.currency.toUpperCase(),
        provider: "travelpayouts",
        payload: params.payload as unknown as Record<string, unknown>,
        payload_version: 1,
        fetched_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        updated_at: now.toISOString(),
      },
      { onConflict: "cache_key" },
    );
  } catch {
    // Cache write failure is non-fatal — the traveller still got a real result.
  }
}

/**
 * Best-effort, fire-and-forget demand signal (Phase S) — a no-op if the row
 * doesn't exist yet (a genuine first-ever search for this key), since the
 * subsequent upsertFlightSearchCache call sets its initial request_count=1.
 * Never awaited by the caller for correctness — only for the freshness
 * decision, which does not depend on this.
 */
export async function recordFlightSearchDemand(client: SupabaseClient, cacheKey: string): Promise<void> {
  try {
    await client.rpc("bump_flight_search_cache_demand", { p_cache_key: cacheKey });
  } catch {
    // best-effort
  }
}

/** BookingsFinder's own cache-fetch age — NEVER a claimed provider observation age (see FlightResults.tsx). */
export function computeAgeSeconds(fetchedAtIso: string, nowMs: number = Date.now()): number {
  const fetchedMs = new Date(fetchedAtIso).getTime();
  if (!Number.isFinite(fetchedMs)) return 0;
  return Math.max(0, Math.floor((nowMs - fetchedMs) / 1000));
}
