
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { validateRequest, ValidationError } from "../_shared/validation.ts";
import { FlightSearchSchema } from "../_shared/flightSearchSchema.ts";
import { createTravelpayoutsProvider } from "../_shared/travelpayoutsProvider.ts";
import { TravelpayoutsError } from "../_shared/travelpayouts.ts";
import { toWireFlightSearchResponse } from "../_shared/flightWire.ts";



Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    // Validate request body with Zod
    const body = await validateRequest(req, FlightSearchSchema);

    console.log(`Starting flight search: ${body.origin} -> ${body.destination} on ${body.depart_date}`);

    // BF1-E: all Travelpayouts specifics (transport call, dedupe, fail-closed
    // row validation, exact-date filtering of nearest-date cache substitutes,
    // raw->domain mapping) now live behind the FlightProvider adapter. The
    // HTTP request/response contract below is unchanged.
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

    // Honest empty state: if every cached result was for a different date,
    // this returns zero flights rather than silently substituting a
    // nearest-date price under the requested search.
    return jsonResponse(toWireFlightSearchResponse(result));
  } catch (error) {
    console.error('Flight search error:', error);

    if (error instanceof ValidationError) {
      return errorResponse('Validation failed', 400, error.errors);
    }

    if (error instanceof TravelpayoutsError) {
      return errorResponse(error.message, error.statusCode);
    }

    return errorResponse(
      error instanceof Error ? error.message : 'Flight search failed',
      500
    );
  }
});
