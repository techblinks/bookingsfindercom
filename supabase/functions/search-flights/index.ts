import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { validateRequest, ValidationError } from "../_shared/validation.ts";
import { getFlightPrices, deduplicateFlights, getConfig, TravelpayoutsError } from "../_shared/travelpayouts.ts";
import { isExactDateMatch } from "../_shared/flightDateMatch.ts";
import {
  computeFlightSearchCacheKey,
  getFlightSearchCache,
  upsertFlightSearchCache,
  recordFlightSearchDemand,
  computeAgeSeconds,
} from "../_shared/flightSearchCache.ts";
import {
  getClientKey,
  checkRateLimit,
  checkIdenticalRequest,
  acquireConcurrencySlot,
  releaseConcurrencySlot,
  RateLimitError,
} from "../_shared/flightSearchRateLimit.ts";

/**
 * BF-FLIGHTS-CACHE-1 — persistent, demand-driven cache in front of the
 * Travelpayouts Data API. See _shared/flightSearchCache.ts for the
 * fresh/stale/miss contract and
 * supabase/migrations/20260824000000_bf_flights_cache_1_flight_search_cache.sql
 * for the table (documentation-only migration — NOT applied in this round).
 *
 * Service-role client — bypasses RLS for the cache table, same pattern as
 * tiqets-public/index.ts. SUPABASE_SERVICE_ROLE_KEY is read only from
 * server-side environment/secrets and never reaches the browser.
 */
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// Zod schema for flight search request — unchanged request contract, so no
// frontend change is required by this cache layer.
const FlightSearchSchema = z.object({
  origin: z.string().min(3, "Origin must be a 3-letter airport code").max(3).toUpperCase(),
  destination: z.string().min(3, "Destination must be a 3-letter airport code").max(3).toUpperCase(),
  depart_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  return_date: z.union([
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
    z.literal(""),
    z.null(),
    z.undefined(),
  ]).optional().transform(val => val || undefined),
  adults: z.number().int().min(1).max(9).default(1),
  currency: z.string().length(3).default('USD'),
});

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  const clientKey = getClientKey(req);
  let slotAcquired = false;

  try {
    // Validate request body with Zod
    const body = await validateRequest(req, FlightSearchSchema);

    // Cache key intentionally excludes adults/cabin — see
    // computeFlightSearchCacheKey's doc comment.
    const cacheKey = computeFlightSearchCacheKey({
      origin: body.origin,
      destination: body.destination,
      departureDate: body.depart_date,
      returnDate: body.return_date,
      currency: body.currency,
    });

    // Best-effort demand signal — never blocks or gates the response.
    void recordFlightSearchDemand(supabaseAdmin, cacheKey);

    const cacheLookup = await getFlightSearchCache(supabaseAdmin, cacheKey);

    // Fresh cache hit — answer directly, no upstream call, no rate limiter
    // involvement at all (the cache IS the primary defence against repeated
    // frontend renders re-hitting Travelpayouts — see Phase I).
    if (cacheLookup.type === "fresh") {
      const payload = cacheLookup.row.payload;
      console.log(`Flight search cache hit: ${body.origin} -> ${body.destination} (${payload.flights.length} flights)`);
      return jsonResponse({
        flights: payload.flights,
        meta: {
          total_found: payload.flights.length,
          is_complete: true,
          cacheStatus: "hit",
          fetchedAt: cacheLookup.row.fetched_at,
          ageSeconds: computeAgeSeconds(cacheLookup.row.fetched_at),
        },
      });
    }

    // Cache miss or stale-and-refreshable — only now do we consider calling
    // upstream, so only now do the rate/abuse guards apply.
    checkRateLimit(clientKey);
    checkIdenticalRequest(clientKey, cacheKey);
    acquireConcurrencySlot();
    slotAcquired = true;

    try {
      const config = getConfig();

      console.log(`Starting flight search: ${body.origin} -> ${body.destination} on ${body.depart_date}`);

      const { flights } = await getFlightPrices(
        {
          origin: body.origin,
          destination: body.destination,
          departureDate: body.depart_date,
          returnDate: body.return_date,
          adults: body.adults,
          currency: body.currency,
        },
        config,
      );

      const uniqueFlights = deduplicateFlights(flights);

      // BF-0R-7 Phase D: Travelpayouts documents that prices_for_dates may
      // return the nearest available cached date when no result exists for
      // the exact requested dates. A result whose provider-stated calendar
      // date doesn't match what was actually searched is not a match for
      // this search and must not be displayed under the requested date —
      // exclude it rather than silently show a different date's price.
      const exactMatches = uniqueFlights.filter((flight) =>
        isExactDateMatch({
          requestedDepartureDate: body.depart_date,
          requestedReturnDate: body.return_date,
          providerDepartureAt: flight.provider_departure_at,
          providerReturnAt: flight.provider_return_at,
        })
      );

      const filteredOutCount = uniqueFlights.length - exactMatches.length;
      if (filteredOutCount > 0) {
        console.log(
          `Excluded ${filteredOutCount} cached result(s) for a different date than requested (${body.depart_date}${body.return_date ? ` / ${body.return_date}` : ""})`
        );
      }

      console.log(`Search complete: found ${exactMatches.length} unique flights for the exact requested date(s)`);

      // Best-effort — never blocks the response.
      void upsertFlightSearchCache(supabaseAdmin, {
        cacheKey,
        origin: body.origin,
        destination: body.destination,
        departureDate: body.depart_date,
        returnDate: body.return_date ?? null,
        currency: body.currency,
        payload: { flights: exactMatches },
      });

      const now = new Date().toISOString();
      return jsonResponse({
        flights: exactMatches,
        meta: {
          total_found: exactMatches.length,
          is_complete: true,
          cacheStatus: "refreshed",
          fetchedAt: now,
          ageSeconds: 0,
        },
      });
    } catch (upstreamError) {
      console.error('Flight search upstream error:', upstreamError instanceof Error ? upstreamError.message : upstreamError);

      // Stale-if-error (Phase H): only a same-request-scope stale row
      // already looked up above — never a fresh extra query, and never a
      // row past the 24h ceiling (getFlightSearchCache already excludes
      // those, classifying them as "miss").
      if (cacheLookup.type === "stale") {
        const payload = cacheLookup.row.payload;
        return jsonResponse({
          flights: payload.flights,
          meta: {
            total_found: payload.flights.length,
            is_complete: true,
            cacheStatus: "stale",
            fetchedAt: cacheLookup.row.fetched_at,
            ageSeconds: computeAgeSeconds(cacheLookup.row.fetched_at),
          },
        });
      }

      // No cache, or cache too old to trust — truthful empty/unavailable
      // state. Never fabricate results, never serve expired data as if
      // it were current.
      return jsonResponse({
        flights: [],
        meta: {
          total_found: 0,
          is_complete: true,
          cacheStatus: "unavailable",
        },
      });
    }
  } catch (error) {
    console.error('Flight search error:', error);

    if (error instanceof ValidationError) {
      return errorResponse('Validation failed', 400, error.errors);
    }

    if (error instanceof RateLimitError) {
      return errorResponse(error.message, 429);
    }

    if (error instanceof TravelpayoutsError) {
      return errorResponse(error.message, error.statusCode);
    }

    return errorResponse(
      error instanceof Error ? error.message : 'Flight search failed',
      500
    );
  } finally {
    if (slotAcquired) releaseConcurrencySlot();
  }
});
