import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { validateRequest, ValidationError } from "../_shared/validation.ts";
import { FlightSearchSchema } from "../_shared/flightSearchSchema.ts";
import { createTravelpayoutsProvider } from "../_shared/travelpayoutsProvider.ts";
import { TravelpayoutsError } from "../_shared/travelpayouts.ts";
import { toWireFlightSearchResponse } from "../_shared/flightWire.ts";
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
 * BF-FLIGHTS-CACHE-1 — persistent, demand-driven cache layered AROUND the
 * BF1-E FlightProvider contract (createTravelpayoutsProvider().search(...)).
 * See _shared/flightSearchCache.ts for the fresh/stale/miss contract and
 * supabase/migrations/20260824000000_bf_flights_cache_1_flight_search_cache.sql
 * for the persistent cache table schema.
 *
 * BF1-E owns dedupe, fail-closed row validation and exact-date filtering of
 * nearest-date cache substitutes inside provider.search() itself — this
 * layer never duplicates that logic. It only decides fresh/stale/miss and,
 * on miss/stale, caches the validated FlightOffer[] domain result and
 * reconstructs the frozen wire response via toWireFlightSearchResponse().
 *
 * Service-role client — bypasses RLS for the cache table, same pattern as
 * tiqets-public/index.ts. SUPABASE_SERVICE_ROLE_KEY is read only from
 * server-side environment/secrets and never reaches the browser.
 */
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

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

    // Demand tracking runs concurrently with the cache lookup rather than
    // serially (both are short, independent DB operations) and rather than
    // as an untracked fire-and-forget promise — see recordFlightSearchDemand.
    // It stays best-effort/non-fatal and never gates the freshness decision;
    // it is only awaited so the write is allowed to actually complete.
    const [cacheLookup] = await Promise.all([
      getFlightSearchCache(supabaseAdmin, cacheKey),
      recordFlightSearchDemand(supabaseAdmin, cacheKey),
    ]);

    // Fresh cache hit — answer directly, no upstream call, no rate limiter
    // involvement at all (the cache IS the primary defence against repeated
    // frontend renders re-hitting the provider — see Phase I).
    if (cacheLookup.type === "fresh") {
      const payload = cacheLookup.row.payload;
      const wire = toWireFlightSearchResponse({
        offers: payload.offers,
        totalFound: payload.offers.length,
        isComplete: true,
        excludedNearestDateCount: 0,
      });
      console.log(`Flight search cache hit: ${body.origin} -> ${body.destination} (${payload.offers.length} flights)`);
      return jsonResponse({
        flights: wire.flights,
        meta: {
          ...wire.meta,
          cacheStatus: "hit",
          fetchedAt: cacheLookup.row.fetched_at,
          ageSeconds: computeAgeSeconds(cacheLookup.row.fetched_at),
        },
      });
    }

    // Cache miss or stale-and-refreshable — only now do we consider calling
    // the provider, so only now do the rate/abuse guards apply.
    checkRateLimit(clientKey);
    checkIdenticalRequest(clientKey, cacheKey);
    acquireConcurrencySlot();
    slotAcquired = true;

    try {
      console.log(`Starting flight search: ${body.origin} -> ${body.destination} on ${body.depart_date}`);

      // BF1-E: transport call, dedupe, fail-closed row validation and
      // exact-date filtering of nearest-date cache substitutes all live
      // behind the FlightProvider adapter — this layer only decides whether
      // to call it and what to do with the validated domain result.
      const provider = createTravelpayoutsProvider();
      const result = await provider.search({
        origin: body.origin,
        destination: body.destination,
        departureDate: body.depart_date,
        returnDate: body.return_date,
        adults: body.adults,
        currency: body.currency,
      });

      if (result.excludedNearestDateCount > 0) {
        console.log(
          `Excluded ${result.excludedNearestDateCount} cached result(s) for a different date than requested (${body.depart_date}${body.return_date ? ` / ${body.return_date}` : ""})`
        );
      }

      console.log(`Search complete: found ${result.totalFound} unique flights for the exact requested date(s)`);

      // Canonical refresh instant — generated ONCE, right after the
      // provider result is in hand, and reused verbatim for both the
      // persisted cache row and this response's meta.fetchedAt. A second,
      // separately-generated timestamp here would let the two drift by
      // however long the DB write takes (BF-FLIGHTS-CACHE-1 consistency fix).
      const fetchedAt = new Date().toISOString();

      // Best-effort on failure (never turns a valid provider result into a
      // user-facing failure), but AWAITED so the write is allowed to
      // complete before the response returns — Edge Function runtime may
      // terminate background work once the response is sent, so this must
      // not be left as an untracked fire-and-forget promise. Applies to
      // zero-result searches too: a successful zero-result search is still
      // cached.
      await upsertFlightSearchCache(supabaseAdmin, {
        cacheKey,
        origin: body.origin,
        destination: body.destination,
        departureDate: body.depart_date,
        returnDate: body.return_date ?? null,
        currency: body.currency,
        payload: { offers: result.offers },
        fetchedAt,
      });

      const wire = toWireFlightSearchResponse(result);
      return jsonResponse({
        flights: wire.flights,
        meta: {
          ...wire.meta,
          cacheStatus: "refreshed",
          fetchedAt,
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
        const wire = toWireFlightSearchResponse({
          offers: payload.offers,
          totalFound: payload.offers.length,
          isComplete: true,
          excludedNearestDateCount: 0,
        });
        return jsonResponse({
          flights: wire.flights,
          meta: {
            ...wire.meta,
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
