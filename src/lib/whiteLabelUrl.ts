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
 * ## Rollout Modes
 *
 * Controlled by VITE_TRAVEL_WHITE_LABEL_MODE env var:
 *
 *   "disabled" (default) — builder returns failure; callers must fall back
 *                          to internal /flights or the Aviasales builder
 *   "test"               — builder succeeds only when VITE_TRAVEL_WHITE_LABEL_HOST
 *                          is also set. Produces real White Label URLs but
 *                          should only be used for non-production testing
 *   "enabled"            — builder succeeds for all verified parameters when
 *                          White Label host is configured. Production-ready
 *
 * When VITE_TRAVEL_WHITE_LABEL_HOST is unset, the builder always returns
 * failure regardless of mode.
 */

import { PARTNERS, type TravelPartnerId, type ValidatedFlightParams, type ValidationFieldError } from "./travelConfig";

// ── Types ──

export type WhiteLabelRolloutMode = "disabled" | "test" | "enabled";

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

// ── Rollout Mode ──

/**
 * Resolve the current White Label rollout mode from the build-time env var.
 * Cached at module load — VITE_ env vars are build-time constants.
 */
let _rolloutModeCache: WhiteLabelRolloutMode | undefined;

export function getWhiteLabelRolloutMode(): WhiteLabelRolloutMode {
  if (_rolloutModeCache !== undefined) return _rolloutModeCache;
  const raw = import.meta.env.VITE_TRAVEL_WHITE_LABEL_MODE;
  if (raw === "test" || raw === "enabled") {
    _rolloutModeCache = raw;
    return raw;
  }
  _rolloutModeCache = "disabled";
  return "disabled";
}

// ── Helpers ──

/**
 * Convert "YYYY-MM-DD" to "DDMM".
 * Example: "2026-08-20" → "2008"
 */
function toDDMM(isoDate: string): string {
  return isoDate.slice(8, 10) + isoDate.slice(5, 7);
}

/**
 * Get the White Label base URL, or null if not configured.
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
 * ## Verified Parameters (always encoded)
 *   - origin (IATA)
 *   - destination (IATA)
 *   - outbound date (YYYY-MM-DD)
 *   - return date (YYYY-MM-DD, optional — one-way when absent)
 *
 * ## Blocked Parameters (reported, never encoded — requires live verification)
 *   - adults > 1
 *   - children > 0
 *   - infants > 0
 *   - cabinClass != "economy"
 *   - currency (any)
 *
 * ## Failure Conditions
 *   - White Label host not configured → { success: false }
 *   - Rollout mode is "disabled" → { success: false }
 *   - IATA codes missing or invalid → { success: false }
 *   - Same origin and destination → { success: false }
 *   - Outbound date missing → { success: false }
 *   - Return before outbound → { success: false }
 *   - Any blocked parameter is requested with a non-default value
 *     → { success: false, reason: "..." } with unverifiedParams list
 *
 * Callers must fall back to internal flight search when this returns failure.
 */
export function buildWhiteLabelFlightUrl(params: {
  origin: string;
  destination: string;
  outboundDate: string;     // "YYYY-MM-DD"
  returnDate?: string;      // "YYYY-MM-DD"
  adults?: number;          // BLOCKED (unverified)
  children?: number;        // BLOCKED (unverified)
  infants?: number;         // BLOCKED (unverified)
  cabinClass?: string;      // BLOCKED (unverified)
  currency?: string;        // BLOCKED (unverified)
}): WhiteLabelUrlResult {
  // Rollout check
  const mode = getWhiteLabelRolloutMode();
  if (mode === "disabled") {
    return { success: false, url: null, reason: "White Label is not enabled (rollout mode: disabled)" };
  }

  // Host check
  const base = getWhiteLabelBase();
  if (!base) {
    return { success: false, url: null, reason: "White Label host is not configured" };
  }

  const errors: string[] = [];
  const unverified: string[] = [];

  // Track and BLOCK unverified params — they MUST be rejected until live-tested
  if (params.adults !== undefined && params.adults !== 1) {
    unverified.push("adults");
    errors.push("Adults count > 1 is not yet supported on White Label");
  }
  if (params.children !== undefined && params.children > 0) {
    unverified.push("children");
    errors.push("Children count is not yet supported on White Label");
  }
  if (params.infants !== undefined && params.infants > 0) {
    unverified.push("infants");
    errors.push("Infants count is not yet supported on White Label");
  }
  if (params.cabinClass !== undefined && params.cabinClass !== "economy") {
    unverified.push("cabinClass");
    errors.push(`Cabin class "${params.cabinClass}" is not yet supported on White Label`);
  }
  if (params.currency !== undefined) {
    unverified.push("currency");
    errors.push("Currency override is not yet supported on White Label");
  }

  // Validate required fields
  if (!params.origin || !IATA_RE.test(params.origin)) {
    errors.push("Origin must be a 3-letter IATA code");
  }
  if (!params.destination || !IATA_RE.test(params.destination)) {
    errors.push("Destination must be a 3-letter IATA code");
  }
  if (params.origin && params.destination && IATA_RE.test(params.origin) && IATA_RE.test(params.destination) && params.origin === params.destination) {
    errors.push("Destination cannot be the same as origin");
  }
  if (!params.outboundDate || !DATE_RE.test(params.outboundDate)) {
    errors.push("Outbound date must be YYYY-MM-DD");
  }
  if (params.returnDate && !DATE_RE.test(params.returnDate)) {
    errors.push("Return date must be YYYY-MM-DD");
  }
  if (params.outboundDate && params.returnDate && DATE_RE.test(params.outboundDate) && DATE_RE.test(params.returnDate) && params.returnDate < params.outboundDate) {
    errors.push("Return date must be on or after outbound date");
  }

  if (errors.length > 0) {
    return {
      success: false,
      url: null,
      reason: errors.join("; "),
      unverifiedParams: unverified.length > 0 ? unverified : undefined,
    };
  }

  // Build verified minimum: flightSearch=ORIGDDMMDEST[DDMM]
  let flightSearch = params.origin + toDDMM(params.outboundDate) + params.destination;
  if (params.returnDate) {
    flightSearch += toDDMM(params.returnDate);
  }

  const qs = new URLSearchParams();
  qs.set("flightSearch", flightSearch);
  qs.set("origin_airports", "1");
  qs.set("destination_airports", "0");

  const url = new URL("/", base);
  url.search = qs.toString();

  return {
    success: true,
    url: url.toString(),
    unverifiedParams: unverified.length > 0 ? unverified : undefined,
  };
}
