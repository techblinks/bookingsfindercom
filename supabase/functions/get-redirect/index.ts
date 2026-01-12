import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { validateQuery, ValidationError } from "../_shared/validation.ts";

// Travelpayouts affiliate base URLs
const AVIASALES_BASE = "https://www.aviasales.com";
const HOTELLOOK_BASE = "https://search.hotellook.com";

// Zod schema for redirect query parameters
const RedirectQuerySchema = z.object({
  id: z.string().min(1, "ID is required"),
  type: z.enum(["flight", "hotel"]).optional(),
  origin: z.string().optional(),
  destination: z.string().optional(),
  departureDate: z.string().optional(),
  returnDate: z.string().optional(),
  airline: z.string().optional(),
  hotelId: z.string().optional(),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  guests: z.string().optional(),
  link: z.string().optional(),
});

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "GET") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const markerId = Deno.env.get("MARKER_ID") || "";
    const url = new URL(req.url);

    // Validate query parameters with Zod
    const params = validateQuery(url, RedirectQuerySchema);

    let redirectUrl = "";
    let partner = "";

    // If a direct link was provided (from API response), use it
    if (params.link) {
      redirectUrl = decodeURIComponent(params.link);
      partner = params.type === "hotel" ? "Hotellook" : "Aviasales";
    } else if (params.type === "flight" || params.id.startsWith("redir-fl")) {
      // Build Aviasales search URL
      const flightParams = new URLSearchParams();
      if (params.origin) flightParams.append("origin_iata", params.origin);
      if (params.destination) flightParams.append("destination_iata", params.destination);
      if (params.departureDate) flightParams.append("depart_date", params.departureDate);
      if (params.returnDate) flightParams.append("return_date", params.returnDate);
      if (markerId) flightParams.append("marker", markerId);

      const depDate = params.departureDate?.replace(/-/g, "") || "";
      const retDate = params.returnDate?.replace(/-/g, "") || "";
      redirectUrl = `${AVIASALES_BASE}/search/${params.origin}${depDate}${params.destination}${retDate}1?${flightParams.toString()}`;
      partner = "Aviasales";
    } else if (params.type === "hotel" || params.id.startsWith("redir-ht")) {
      // Build Hotellook search URL
      const hotelParams = new URLSearchParams();
      if (params.destination) hotelParams.append("destination", params.destination);
      if (params.checkIn) hotelParams.append("checkIn", params.checkIn);
      if (params.checkOut) hotelParams.append("checkOut", params.checkOut);
      if (params.guests) hotelParams.append("adults", params.guests);
      if (params.hotelId) hotelParams.append("hotelId", params.hotelId);
      if (markerId) hotelParams.append("marker", markerId);

      redirectUrl = `${HOTELLOOK_BASE}/hotels?${hotelParams.toString()}`;
      partner = "Hotellook";
    } else {
      return errorResponse("Unable to determine redirect type", 400);
    }

    // Log the click for analytics
    console.log(`Redirect click: ${params.id} -> ${partner} | ${redirectUrl}`);

    return jsonResponse({
      success: true,
      id: params.id,
      redirectUrl,
      partner,
      type: params.type || (params.id.startsWith("redir-fl") ? "flight" : "hotel"),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Redirect error:", error);

    if (error instanceof ValidationError) {
      return errorResponse("Validation failed", 400, error.errors);
    }

    return errorResponse(
      error instanceof Error ? error.message : "Unknown error",
      500
    );
  }
});