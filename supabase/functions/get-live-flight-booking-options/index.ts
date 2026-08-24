/**
 * BF-FLIGHTS-LIVE-4 Phase J — server-side booking-options lookup for a
 * previously selected live-flight itinerary (bookingToken from a prior
 * search-live-flights response).
 *
 * Same SERPAPI_API_KEY handling guarantees as search-live-flights — see
 * that file's header. NOT DEPLOYED as part of BF-FLIGHTS-LIVE-4.
 */
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { validateRequest, ValidationError } from "../_shared/validation.ts";
import { LiveFlightBookingOptionsRequestSchema } from "../_shared/liveFlightValidation.ts";
import { getSerpApiConfig, getBookingOptions, SerpApiError } from "../_shared/serpapiFlights.ts";
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
    const body = await validateRequest(req, LiveFlightBookingOptionsRequestSchema);

    checkRateLimit(clientKey);
    checkIdenticalRequest(clientKey, `booking:${body.bookingToken}`);
    acquireConcurrencySlot();
    slotAcquired = true;

    console.log(`Live flight booking options lookup: ${body.origin} -> ${body.destination}`);

    const config = getSerpApiConfig();
    const result = await getBookingOptions(
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
        bookingToken: body.bookingToken,
      },
      config,
    );

    console.log(`Booking options complete: ${result.options.length} option(s)`);

    return jsonResponse(result);
  } catch (error) {
    console.error("Booking options error:", error instanceof Error ? error.message : error);

    if (error instanceof ValidationError) {
      return errorResponse("Validation failed", 400, error.errors);
    }
    if (error instanceof RateLimitError) {
      return errorResponse(error.message, 429);
    }
    if (error instanceof SerpApiError) {
      const status = error.kind === "timeout" ? 504 : error.statusCode >= 400 && error.statusCode < 600 ? error.statusCode : 502;
      return errorResponse("Booking options are temporarily unavailable", status);
    }

    return errorResponse("Booking options are temporarily unavailable", 500);
  } finally {
    if (slotAcquired) releaseConcurrencySlot();
  }
});
