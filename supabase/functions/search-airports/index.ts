/**
 * search-airports — BF1-C rewrite.
 *
 * Previously this function searched a hardcoded ~113-entry static array
 * (partial, stale assumptions). It now routes through the BF1-B reference
 * layer (public read-only tables: cities / airports / metro_airports), so
 * autocomplete supports:
 *   - exact airport IATA          (deterministic winner, never shadowed)
 *   - exact metro / city codes    (TYO, LON, NYC, PAR, SFO, …)
 *   - airport name / city prefix  (bounded ILIKE prefix queries)
 *   - broader text contains       (only for terms >= 3 chars)
 *
 * Wire contract preserved for existing consumers (LocationCombobox /
 * NativeLocationPicker expect {code, city, country, name}[]): those fields are
 * unchanged; `kind` and `label` are additive.
 *
 * Bounding: every underlying query carries .limit(); merged results are capped
 * at the request limit (max 20). Clients debounce (150 ms) and send q.length>=2.
 * Responses are cacheable for 60s to keep query volume modest.
 *
 * Fail-closed: reference-layer errors yield [] ("No airports found") rather
 * than fabricated rows; malformed rows are dropped by strict parsing.
 */

import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { validateQuery, validateRequest, ValidationError } from "../_shared/validation.ts";
import {
  searchReferenceLocations,
  formatAirportLabel,
  type ReferenceClientLike,
  type SearchHit,
} from "../_shared/reference.ts";

// Query validation schema — used for both GET query params and POST body.
const AirportSearchSchema = z.object({
  q: z.string().default(""),
  limit: z.coerce.number().min(1).max(20).default(8),
});

interface WireResult {
  code: string;
  city: string;
  country: string;
  name: string;
  kind: "airport" | "metro" | "city";
  /** Additive human-readable label, e.g. "Tokyo — All Airports (TYO)". */
  label: string;
}

/** Map a ranked reference hit onto the established wire shape (additive only). */
function hitToWire(hit: SearchHit): WireResult {
  const loc = hit.location as Record<string, unknown>;
  if (loc.kind === "metro") {
    return {
      code: String(loc.code),
      city: String(loc.city),
      country: String(loc.country),
      // Metro group entry — selecting it searches the whole metro area using
      // the provider-compatible metro code (existing Travelpayouts behaviour).
      name: "All Airports",
      kind: "metro",
      label: String(loc.label),
    };
  }
  const ref = loc as { code: string; name: string; city: string; country: string };
  return {
    code: ref.code,
    city: ref.city,
    country: ref.country,
    name: ref.name,
    kind: "airport",
    label: formatAirportLabel({
      code: ref.code,
      name: ref.name,
      city: ref.city,
      country: ref.country,
    }),
  };
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    let q = "";
    let limit = 8;

    // Support both GET (query params) and POST (JSON body)
    if (req.method === "POST" || req.method === "PUT") {
      const params = await validateRequest(req, AirportSearchSchema);
      q = params.q;
      limit = params.limit;
    } else {
      const url = new URL(req.url);
      const params = validateQuery(url, AirportSearchSchema);
      q = params.q;
      limit = params.limit;
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    // Anon key on purpose: public-read RLS stays the effective access policy
    // (defense-in-depth, same pattern as flight-destinations). No service role.
    const client = createClient(supabaseUrl, supabaseAnonKey) as unknown as ReferenceClientLike;

    const hits = await searchReferenceLocations(client, q, limit);

    return new Response(JSON.stringify(hits.map(hitToWire)), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch (error) {
    console.error("Airport search error:", error);

    if (error instanceof ValidationError) {
      return errorResponse("Validation failed", 400, error.errors);
    }

    return errorResponse("Search failed", 500);
  }
});
