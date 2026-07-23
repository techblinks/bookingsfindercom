/**
 * Travelpayouts White Label deep-link URL builder.
 *
 * SEPARATE from buildFlightSearchUrl() — the White Label uses a completely
 * different URL format (?flightSearch=ORIGDDMMDESTDDMM) than standard
 * Aviasales (/search/ORIGDATEDESTRETDATE1).
 *
 * Only verified parameters are encoded. Unverified parameters are
 * reported but not included in the URL.
 *
 * Rollout is controlled by VITE_TRAVEL_WHITE_LABEL_HOST.
 * When unset, this builder returns failure — callers must fall back
 * to internal flight search or the standard Aviasales builder.
 */

import { PARTNERS, type TravelPartnerId, type ValidatedFlightParams, type ValidationFieldError } from "./travelConfig";

// ── Types ──

export interface WhiteLabelUrlResult {
  success: boolean;
  /** The generated URL, or null on failure. */
  url: string | null;
  /** Human-readable failure reason. */
  reason?: string;
  /** Parameters that were requested but cannot be encoded (unverified). */
  unverifiedParams?: string[];
}

/** IATA code pattern (3 uppercase letters). */
const IATA_RE = /^[A-Z]{3}$/;

/** ISO date pattern (YYYY-MM-DD). */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// ── Helpers ──

/**
 * Convert "YYYY-MM-DD" to "DDMM".
 * Example: "2026-08-20" → "2008"
 */
function toDDMM(isoDate: string): string {
  // "YYYY-MM-DD" → chars 8,9 + 5,6 = "DDMM"
  return isoDate.slice(8, 10) + isoDate.slice(5, 7);
}

/**
 * Get the White Label base URL, or null if not configured.
 * Uses the same env var as travelConfig.ts.
 */
function getWhiteLabelBase(): string | null {
  const host = PARTNERS.aviasales.whiteLabelHost;
  if (!host) return null;
  return `https://${host}`;
}

// ── Builder ──

/**
 * Build a White Label flight search URL using the verified
 * `?flightSearch=` query-parameter protocol.
 *
 * Verified parameters:
 *   - origin (IATA)
 *   - destination (IATA)
 *   - outbound date
 *   - return date (optional)
 *
 * Unverified (reported but not encoded):
 *   - adults, children, infants, cabin class, currency, locale
 *
 * Returns failure when White Label is not configured.
 * Callers must fall back to internal flight search.
 */
export function buildWhiteLabelFlightUrl(params: {
  origin: string;
  destination: string;
  outboundDate: string;     // "YYYY-MM-DD"
  returnDate?: string;      // "YYYY-MM-DD"
  adults?: number;          // UNVERIFIED
  children?: number;        // UNVERIFIED
  infants?: number;         // UNVERIFIED
  cabinClass?: string;      // UNVERIFIED
  currency?: string;        // UNVERIFIED
}): WhiteLabelUrlResult {
  const base = getWhiteLabelBase();
  if (!base) {
    return { success: false, url: null, reason: "White Label is not configured" };
  }

  const errors: string[] = [];
  const unverified: string[] = [];

  // Track unverified params
  if (params.adults !== undefined && params.adults !== 1) unverified.push("adults");
  if (params.children !== undefined && params.children > 0) unverified.push("children");
  if (params.infants !== undefined && params.infants > 0) unverified.push("infants");
  if (params.cabinClass !== undefined && params.cabinClass !== "economy") unverified.push("cabinClass");
  if (params.currency !== undefined) unverified.push("currency");

  // Validate required
  if (!params.origin || !IATA_RE.test(params.origin)) {
    errors.push("Origin must be a 3-letter IATA code");
  }
  if (!params.destination || !IATA_RE.test(params.destination)) {
    errors.push("Destination must be a 3-letter IATA code");
  }
  if (params.origin && params.destination && params.origin === params.destination) {
    errors.push("Destination cannot be the same as origin");
  }
  if (!params.outboundDate || !DATE_RE.test(params.outboundDate)) {
    errors.push("Outbound date must be YYYY-MM-DD");
  }
  if (params.returnDate && !DATE_RE.test(params.returnDate)) {
    errors.push("Return date must be YYYY-MM-DD");
  }
  if (params.outboundDate && params.returnDate && params.returnDate < params.outboundDate) {
    errors.push("Return date must be on or after outbound date");
  }

  if (errors.length > 0) {
    return { success: false, url: null, reason: errors.join("; "), unverifiedParams: unverified.length > 0 ? unverified : undefined };
  }

  // Build flightSearch value: ORIGIN + DDMM + DEST + [DDMM]
  let flightSearch = params.origin + toDDMM(params.outboundDate) + params.destination;
  if (params.returnDate) {
    flightSearch += toDDMM(params.returnDate);
  }
  // One-way: no trailing dash — just origin + DDMM + dest (VERIFIED via live test needed)

  // Build query parameters
  const qs = new URLSearchParams();
  qs.set("flightSearch", flightSearch);
  qs.set("origin_airports", "1");
  qs.set("destination_airports", "0");

  // Construct URL
  const url = new URL("/", base);
  url.search = qs.toString();

  return {
    success: true,
    url: url.toString(),
    unverifiedParams: unverified.length > 0 ? unverified : undefined,
  };
}
