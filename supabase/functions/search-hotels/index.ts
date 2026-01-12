import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { validateRequest, ValidationError } from "../_shared/validation.ts";
import { safeJsonParse } from "../_shared/helpers.ts";

// Hotellook cached prices endpoint
const HOTELLOOK_ENGINE_BASE = "https://engine.hotellook.com/api/v2";

// Zod schema for hotel search request
const HotelSearchSchema = z.object({
  destination: z.string().min(1, "Destination is required"),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  guests: z.number().int().min(1).max(10).default(2),
  rooms: z.number().int().min(1).max(5).default(1),
  currency: z.string().length(3).default("USD"),
  limit: z.number().int().min(1).max(100).default(20),
});

type HotelSearchRequest = z.infer<typeof HotelSearchSchema>;

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const apiToken = Deno.env.get("TRAVELPAYOUTS_API_KEY");
    const markerId = Deno.env.get("MARKER_ID");

    if (!apiToken || !markerId) {
      throw new Error("TRAVELPAYOUTS_API_KEY or MARKER_ID not configured");
    }

    // Validate request body with Zod
    const body = await validateRequest(req, HotelSearchSchema);

    const params = new URLSearchParams({
      location: body.destination,
      checkIn: body.checkIn,
      checkOut: body.checkOut,
      adults: String(body.guests),
      limit: String(body.limit),
      currency: body.currency,
      lang: "en",
      token: apiToken,
      marker: markerId,
    });

    const url = `${HOTELLOOK_ENGINE_BASE}/cache.json?${params.toString()}`;
    console.log(`Fetching hotellook cache: ${url}`);

    const apiResponse = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "LovableHotelSearch/1.0",
      },
    });

    const text = await apiResponse.text();
    const data = safeJsonParse<any>(text);

    if (!data) {
      console.error(
        `Hotellook cache returned non-JSON (status ${apiResponse.status}). Body preview:`,
        text.slice(0, 120)
      );
      return jsonResponse({
        success: true,
        message: "Hotel API returned non-JSON response; returning empty results",
        searchParams: {
          destination: body.destination,
          checkIn: body.checkIn,
          checkOut: body.checkOut,
          guests: body.guests,
          rooms: body.rooms,
        },
        results: [],
        totalResults: 0,
        currency: body.currency,
        timestamp: new Date().toISOString(),
      });
    }

    if (!apiResponse.ok || (data as any).status === "error") {
      console.error("Hotellook cache error:", data);
      return errorResponse("Hotel search failed", 502, data);
    }

    const items: any[] = Array.isArray(data)
      ? data
      : Array.isArray((data as any).result)
        ? (data as any).result
        : Array.isArray((data as any).results)
          ? (data as any).results
          : [];

    const hotels = items.map((hotel: any, index: number) => {
      const hotelId = hotel.hotelId ?? hotel.id ?? hotel.hotel_id;
      const name = hotel.hotelName ?? hotel.name ?? hotel.hotel_name ?? `Hotel ${index + 1}`;

      const price =
        hotel.minPriceTotal ??
        hotel.min_price_total ??
        hotel.minPrice ??
        hotel.min_price ??
        hotel.priceFrom ??
        hotel.price_from ??
        hotel.price ??
        0;

      const stars = hotel.stars ?? hotel.stars_count ?? 3;
      const rating = hotel.guestScore ?? hotel.guest_score ?? hotel.rating;

      const fullUrl = hotel.fullUrl || (hotel.fullBookingURL ? hotel.fullBookingURL : null);
      const urlPath = hotel.url;

      const link =
        fullUrl ||
        (urlPath
          ? `https://search.hotellook.com${urlPath.startsWith("/") ? urlPath : `/${urlPath}`}`
          : `https://search.hotellook.com/hotels?destination=${encodeURIComponent(body.destination)}` +
            `&checkIn=${encodeURIComponent(body.checkIn)}` +
            `&checkOut=${encodeURIComponent(body.checkOut)}` +
            `&adults=${encodeURIComponent(String(body.guests))}` +
            (hotelId ? `&hotelId=${encodeURIComponent(String(hotelId))}` : "") +
            `&marker=${encodeURIComponent(markerId)}`);

      return {
        id: `ht-${hotelId ?? index + 1}`,
        hotelId: hotelId ? Number(hotelId) : undefined,
        name,
        image:
          hotel.photoUrl ||
          hotel.photo_url ||
          `https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80`,
        location: hotel.address || body.destination,
        stars,
        guestScore: typeof rating === "number" ? (rating > 10 ? rating / 10 : rating) : 7.5,
        reviewCount: hotel.reviews ?? hotel.reviews_count ?? hotel.popularity ?? 0,
        price: typeof price === "number" ? price : Number(price) || 0,
        originalPrice: hotel.maxPricePerNight ?? hotel.max_price_per_night,
        currency: body.currency,
        amenities: Array.isArray(hotel.amenities) && hotel.amenities.length ? hotel.amenities : ["wifi"],
        isDeal: Boolean(hotel.discount) || false,
        redirectId: `redir-ht-${hotelId ?? index}`,
        link,
      };
    });

    return jsonResponse({
      success: true,
      searchParams: {
        destination: body.destination,
        checkIn: body.checkIn,
        checkOut: body.checkOut,
        guests: body.guests,
        rooms: body.rooms,
      },
      results: hotels,
      totalResults: hotels.length,
      currency: body.currency,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Hotel search error:", error);

    if (error instanceof ValidationError) {
      return errorResponse("Validation failed", 400, error.errors);
    }

    return errorResponse(
      error instanceof Error ? error.message : "Unknown error",
      500
    );
  }
});