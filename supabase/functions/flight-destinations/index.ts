// Phase 7G — Public flight-destinations endpoint.
//
// GET → returns ONLY active destinations and safe public fields, ordered by
// display_order. Uses the anon key so the "public can read active" RLS policy
// applies as defense-in-depth; the active filter and field projection are also
// applied explicitly here.
//
// Cache-Control: public, max-age=300, stale-while-revalidate=86400

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const CACHE_CONTROL = "public, max-age=300, stale-while-revalidate=86400";

// Safe, public-facing columns only — never expose internal audit fields.
const PUBLIC_COLUMNS = "id, city, country, iata_code, slug, description, alt_text, image_path, focal_x, focal_y, display_order";

interface PublicDestination {
  id: string;
  city: string;
  country: string;
  iata_code: string;
  slug: string;
  description: string | null;
  alt_text: string | null;
  image_path: string | null;
  image_url: string | null;
  focal_x: number;
  focal_y: number;
  display_order: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Allow": "GET, OPTIONS" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data, error } = await supabase
      .from("flight_destinations")
      .select(PUBLIC_COLUMNS)
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (error) {
      console.error("[flight-destinations] query error:", error.message);
      return new Response(JSON.stringify({ error: "Failed to load destinations" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const publicBase = `${supabaseUrl}/storage/v1/object/public/flight-destinations/`;

    const destinations: PublicDestination[] = (data ?? []).map((row) => ({
      id: row.id,
      city: row.city,
      country: row.country,
      iata_code: row.iata_code,
      slug: row.slug,
      description: row.description ?? null,
      alt_text: row.alt_text ?? null,
      image_path: row.image_path ?? null,
      image_url: row.image_path ? publicBase + row.image_path : null,
      focal_x: Number(row.focal_x),
      focal_y: Number(row.focal_y),
      display_order: row.display_order,
    }));

    return new Response(JSON.stringify({ destinations }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": CACHE_CONTROL,
      },
    });
  } catch (err) {
    console.error("[flight-destinations] unexpected error:", err);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
