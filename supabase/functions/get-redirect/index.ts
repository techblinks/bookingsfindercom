import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { validateQuery, ValidationError } from "../_shared/validation.ts";

// Travelpayouts affiliate base URLs
// White Label host is read from environment; falls back to standard Aviasales
const WHITE_LABEL_HOST = (() => {
  const raw = Deno.env.get("WHITE_LABEL_HOST");
  if (!raw || raw === "") return null;
  // Normalise: strip protocol if present
  let host = raw.trim();
  if (host.startsWith("https://")) host = host.slice("https://".length);
  else if (host.startsWith("http://")) host = host.slice("http://".length);
  if (host.endsWith("/")) host = host.slice(0, -1);
  if (host.includes("/") || host.includes("?") || !host) return null;
  return host;
})();

const AVIASALES_BASE = WHITE_LABEL_HOST
  ? `https://${WHITE_LABEL_HOST}`
  : "https://www.aviasales.com";

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
      // Build Aviasales search URL (uses White Label base when configured)
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
      // Hotellook affiliate program was discontinued 20 October 2025.
      // Reject hotel redirects until a new active provider is configured.
      return errorResponse(
        "Hotel partner program is discontinued. No active hotel affiliate provider is configured.",
        410
      );
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
