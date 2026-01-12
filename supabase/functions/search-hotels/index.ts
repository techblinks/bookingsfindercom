import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Hotellook cached prices endpoint (matches the original Express /v2/cache.json approach)
const HOTELLOOK_ENGINE_BASE = "https://engine.hotellook.com/api/v2";

interface HotelSearchRequest {
  destination: string;
  checkIn: string;
  checkOut: string;
  guests?: number;
  rooms?: number;
  currency?: string;
  limit?: number;
}

function safeJsonParse(text: string): any | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const apiToken = Deno.env.get("TRAVELPAYOUTS_API_KEY");
    const markerId = Deno.env.get("MARKER_ID");

    if (!apiToken || !markerId) {
      throw new Error("TRAVELPAYOUTS_API_KEY or MARKER_ID not configured");
    }

    const body: HotelSearchRequest = await req.json();

    if (!body.destination || !body.checkIn || !body.checkOut) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: destination, checkIn, checkOut",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const params = new URLSearchParams({
      location: body.destination,
      checkIn: body.checkIn,
      checkOut: body.checkOut,
      adults: String(body.guests ?? 2),
      limit: String(body.limit ?? 20),
      currency: body.currency || "USD",
      lang: "en",
      token: apiToken,
      marker: markerId,
    });

    const url = `${HOTELLOOK_ENGINE_BASE}/cache.json?${params.toString()}`;
    console.log(`Fetching hotellook cache: ${url}`);

    const apiResponse = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        // Some providers return HTML unless a UA is set
        "User-Agent": "LovableHotelSearch/1.0",
      },
    });

    const text = await apiResponse.text();
    const data = safeJsonParse(text);

    if (!data) {
      console.error(`Hotellook cache returned non-JSON (status ${apiResponse.status}). Body preview:`, text.slice(0, 120));
      return new Response(
        JSON.stringify({
          success: true,
          message: "Hotel API returned non-JSON response; returning empty results",
          searchParams: {
            destination: body.destination,
            checkIn: body.checkIn,
            checkOut: body.checkOut,
            guests: body.guests || 2,
            rooms: body.rooms || 1,
          },
          results: [],
          totalResults: 0,
          currency: body.currency || "USD",
          timestamp: new Date().toISOString(),
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!apiResponse.ok || data.status === "error") {
      console.error("Hotellook cache error:", data);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Hotel search failed",
          details: data,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const items: any[] = Array.isArray(data)
      ? data
      : Array.isArray(data.result)
        ? data.result
        : Array.isArray(data.results)
          ? data.results
          : [];

    const hotels = items.map((hotel: any, index: number) => {
      const hotelId = hotel.hotelId ?? hotel.id ?? hotel.hotel_id;
      const name = hotel.hotelName ?? hotel.name ?? hotel.hotel_name ?? `Hotel ${index + 1}`;

      // price fields vary by endpoint
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

      // Hotellook returns url/fullUrl sometimes
      const fullUrl = hotel.fullUrl || (hotel.fullBookingURL ? hotel.fullBookingURL : null);
      const urlPath = hotel.url;

      const link =
        fullUrl ||
        (urlPath
          ? `https://search.hotellook.com${urlPath.startsWith("/") ? urlPath : `/${urlPath}`}`
          : `https://search.hotellook.com/hotels?destination=${encodeURIComponent(body.destination)}` +
            `&checkIn=${encodeURIComponent(body.checkIn)}` +
            `&checkOut=${encodeURIComponent(body.checkOut)}` +
            `&adults=${encodeURIComponent(String(body.guests ?? 2))}` +
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
        currency: body.currency || "USD",
        amenities: Array.isArray(hotel.amenities) && hotel.amenities.length ? hotel.amenities : ["wifi"],
        isDeal: Boolean(hotel.discount) || false,
        redirectId: `redir-ht-${hotelId ?? index}`,
        link,
      };
    });

    return new Response(
      JSON.stringify({
        success: true,
        searchParams: {
          destination: body.destination,
          checkIn: body.checkIn,
          checkOut: body.checkOut,
          guests: body.guests || 2,
          rooms: body.rooms || 1,
        },
        results: hotels,
        totalResults: hotels.length,
        currency: body.currency || "USD",
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Hotel search error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
