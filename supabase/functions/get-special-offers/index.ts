import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { createTravelpayoutsProvider } from "../_shared/travelpayoutsProvider.ts";
import { TravelpayoutsError } from "../_shared/travelpayouts.ts";
import { toWireSpecialOffer } from "../_shared/flightWire.ts";

Deno.serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const { origin = "LHR", currency = "USD", limit = 8 } = await req.json();

    // BF1-E: upstream call, fail-closed validation, affiliate deep-link
    // building and raw->domain mapping now live behind the FlightProvider
    // adapter.
    //
    // SANCTIONED BF1-E HONESTY FIX: offers whose provider row carried no
    // found_at timestamp now serialize found_at: null. The previous code
    // fabricated `new Date().toISOString()` here, falsely implying the offer
    // had been observed "just now". Nothing generates timestamps from the
    // current time anymore; the frontend already renders absent stamps
    // honestly (no "Found X ago" line).
    const provider = createTravelpayoutsProvider();
    const result = await provider.getSpecialOffers({
      origin,
      currency,
      limit,
    });

    // CONTRACT-PARITY CLOSEOUT (Fix 1): source selection restored verbatim
    // from pre-BF1-E get-special-offers. The upstream envelope's empty state
    // (not the resulting array length) decides between "empty" and
    // "travelpayouts_latest"; a populated envelope that validates/filters
    // down to zero offers still reports "travelpayouts_latest", exactly as
    // before. Frontend behaviour is untouched (useSpecialOffers never read
    // `source`).
    return jsonResponse({
      offers: result.offers.map(toWireSpecialOffer),
      currency,
      source: result.upstreamEmpty ? "empty" : "travelpayouts_latest",
    });
  } catch (error) {
    console.error("Error in get-special-offers:", error);

    if (error instanceof TravelpayoutsError) {
      return errorResponse(error.message || "Failed to fetch offers", error.statusCode);
    }

    return errorResponse(
      error instanceof Error ? error.message : "Internal error",
      500
    );
  }
});
