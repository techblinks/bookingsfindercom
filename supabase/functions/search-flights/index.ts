import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { validateRequest, ValidationError } from "../_shared/validation.ts";
import { getFlightPrices, deduplicateFlights, getConfig, TravelpayoutsError } from "../_shared/travelpayouts.ts";

// Zod schema for flight search request
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

type FlightSearchRequest = z.infer<typeof FlightSearchSchema>;

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    // Get API config
    const config = getConfig();

    // Validate request body with Zod
    const body = await validateRequest(req, FlightSearchSchema);

    console.log(`Starting flight search: ${body.origin} -> ${body.destination} on ${body.depart_date}`);

    // Fetch flight prices using shared service
    const { flights } = await getFlightPrices(
      {
        origin: body.origin,
        destination: body.destination,
        departureDate: body.depart_date,
        returnDate: body.return_date,
        adults: body.adults,
        currency: body.currency,
      },
      config
    );

    // Deduplicate flights
    const uniqueFlights = deduplicateFlights(flights);

    console.log(`Search complete: found ${uniqueFlights.length} unique flights`);

    return jsonResponse({
      flights: uniqueFlights,
      meta: {
        total_found: uniqueFlights.length,
        is_complete: true,
      },
    });
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