/**
 * BF-FLIGHTS-LIVE-4 Phase D — server-side live flight search.
 *
 * Handles both the initial search (Phase H/I step 1) and, when the caller
 * supplies departureToken, the round-trip return-leg search (Phase H step
 * 2). SERPAPI_API_KEY never leaves this function: it is read only inside
 * serpapiFlights.ts, appended to the upstream URL only inside that same
 * module's own fetch call, and never included in any log line or response
 * body (see redactedUrl() there).
 *
 * NOT DEPLOYED as part of BF-FLIGHTS-LIVE-4 — see the task's explicit
 * instruction. This file is written and tested against mocks only.
 */
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { validateRequest, ValidationError } from "../_shared/validation.ts";
import { LiveFlightSearchRequestSchema } from "../_shared/liveFlightValidation.ts";
import { getSerpApiConfig, searchFlights, SerpApiError } from "../_shared/serpapiFlights.ts";
import {
  getClientKey,
  checkRateLimit,
  checkIdenticalRequest,
  acquireConcurrencySlot,
  releaseConcurrencySlot,
  RateLimitError,
} from "../_shared/liveFlightRateLimit.ts";

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  const clientKey = getClientKey(req);
  let slotAcquired = false;

  try {
    const body = await validateRequest(req, LiveFlightSearchRequestSchema);

    checkRateLimit(clientKey);
    checkIdenticalRequest(
      clientKey,
      JSON.stringify({
        o: body.origin, d: body.destination, dep: body.departureDate, ret: body.returnDate,
        t: body.tripType, a: body.adults, c: body.children, i: body.infants,
        cab: body.cabinClass, cur: body.currency, tok: body.departureToken ?? null,
      }),
    );
    acquireConcurrencySlot();
    slotAcquired = true;

    // Passenger/route/date logging only — never a full payload dump, and
    // never anything that could contain a token (Phase V).
    console.log(
      `Live flight search: ${body.origin} -> ${body.destination} on ${body.departureDate}` +
        `${body.returnDate ? ` / ${body.returnDate}` : ""} (${body.tripType}, ${body.cabinClass})` +
        `${body.departureToken ? " [return-leg lookup]" : ""}`,
    );

    const config = getSerpApiConfig();
    const result = await searchFlights(
      {
        origin: body.origin,
        destination: body.destination,
        departureDate: body.departureDate,
        returnDate: body.returnDate,
        tripType: body.tripType,
        adults: body.adults,
        children: body.children,
        infants: body.infants,
        cabinClass: body.cabinClass,
        currency: body.currency,
        departureToken: body.departureToken,
      },
      config,
    );

    console.log(`Live flight search complete: ${result.itineraries.length} itineraries (${result.status})`);

    return jsonResponse(result);
  } catch (error) {
    console.error("Live flight search error:", error instanceof Error ? error.message : error);

    if (error instanceof ValidationError) {
      return errorResponse("Validation failed", 400, error.errors);
    }
    if (error instanceof RateLimitError) {
      return errorResponse(error.message, 429);
    }
    if (error instanceof SerpApiError) {
      // kind "config"/"timeout"/"network"/"upstream" all map to a generic
      // 502/504 the frontend renders as "temporarily unavailable" — never
      // the raw upstream error text (Phase V/S).
      const status = error.kind === "timeout" ? 504 : error.statusCode >= 400 && error.statusCode < 600 ? error.statusCode : 502;
      return errorResponse("Live flight search is temporarily unavailable", status);
    }

    return errorResponse("Live flight search is temporarily unavailable", 500);
  } finally {
    if (slotAcquired) releaseConcurrencySlot();
  }
});
