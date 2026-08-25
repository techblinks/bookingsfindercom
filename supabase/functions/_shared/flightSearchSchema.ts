/**
 * Frozen request schema for search-flights (BF1-E).
 *
 * Extracted verbatim from supabase/functions/search-flights/index.ts so the
 * Edge Function and contract tests share ONE definition. Shape, error messages
 * and transforms are unchanged since pre-BF1-E.
 *
 * Location fields accept any 3-letter code uppercased — which includes both
 * airport IATA codes (HND) and BF1-C metro/city provider codes (TYO, LON,
 * NYC, PAR, SFO) after client-side resolution. Unresolved/short inputs are
 * rejected here (fail closed) before reaching the provider adapter.
 */
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

export const FlightSearchSchema = z.object({
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

export type FlightSearchRequest = z.infer<typeof FlightSearchSchema>;
