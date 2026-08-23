/**
 * Travelpayouts White Label deep-link URL builder.
 *
 * Uses the verified `?flightSearch=` query-parameter protocol.
 * SEPARATE from buildFlightSearchUrl() — the White Label format is
 * entirely different from standard Aviasales /search/ paths.
 *
 * ## Rollout Modes
 *
 * Controlled by VITE_TRAVEL_WHITE_LABEL_MODE:
 *   "disabled" (default) — returns failure; caller must fall back
 *   "test" / "enabled"  — builds White Label URLs when host is configured
 *
 * Production remains disabled until VITE_TRAVEL_WHITE_LABEL_MODE=enabled.
 */

import { PARTNERS } from "./travelConfig";
import { SUPPORTED_CABIN_CLASSES, isSupportedCabinClass } from "./cabinClasses";
import { isValidCurrencyCode, isWhiteLabelSupportedCurrency } from "./currency";

// ── Types ──

export type WhiteLabelRolloutMode = "disabled" | "test" | "enabled";

export interface WhiteLabelUrlResult {
  success: boolean;
  url: string | null;
  reason?: string;
  /**
   * BF-FLIGHTS-LIVE-2 Round 2 Phase B: the explicit currency contract a
   * caller checks before redirecting.
   *
   *   requestedCurrency — the valid currency code the caller asked for,
   *     if any (undefined when no currency, or an invalid one, was passed).
   *   currencyApplied   — true only when requestedCurrency was actually
   *     added to the URL as `&currency=...`. False both when no currency
   *     was requested and when one was requested but isn't
   *     White-Label-verified (see WHITE_LABEL_SUPPORTED_CURRENCIES).
   *
   * A caller must treat `requestedCurrency set && currencyApplied === false`
   * as "the White Label will NOT honor this currency" and warn the
   * traveller before redirecting — never silently proceed as if it was
   * preserved. See UnsupportedCurrencyDialog.tsx / FlightResults.tsx.
   */
  currencyApplied?: boolean;
  requestedCurrency?: string;
}

// ── Constants ──

const IATA_RE = /^[A-Z]{3}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// ── Rollout Mode ──

let _rolloutModeCache: WhiteLabelRolloutMode | undefined;

export function getWhiteLabelRolloutMode(): WhiteLabelRolloutMode {
  if (_rolloutModeCache !== undefined) return _rolloutModeCache;
  const raw = import.meta.env.VITE_TRAVEL_WHITE_LABEL_MODE;
  if (raw === "test" || raw === "enabled") { _rolloutModeCache = raw; return raw; }
  _rolloutModeCache = "disabled";
  return "disabled";
}

/**
 * Reset the rollout mode cache — for testing only.
 * After calling this, the next getWhiteLabelRolloutMode() re-reads
 * import.meta.env (which can be stubbed via vi.stubEnv in tests).
 */
export function resetWhiteLabelCache(): void {
  _rolloutModeCache = undefined;
}

// ── Helpers ──

function toDDMM(isoDate: string): string {
  return isoDate.slice(8, 10) + isoDate.slice(5, 7);
}

function getWhiteLabelBase(): string | null {
  const host = PARTNERS.aviasales.whiteLabelHost;
  if (!host) return null;
  return `https://${host}`;
}

/**
 * Build a verified passenger suffix.
 *
 * Live-verified encoding:
 *   1 adult                                            → "1"
 *   2 adults                                           → "2"
 *   1 adult + 1 child                                  → "11"
 *   2 adults + 1 child                                 → "21"
 *   1 adult + 0 children + 1 infant                    → "101"
 *   (zero-child position is preserved when infant > 0)
 */
function buildPassengerSuffix(adults: number, children: number, infants: number): string {
  const a = String(adults);
  if (infants === 0 && children === 0) return a;
  if (infants === 0) return a + String(children);
  // Preserve zero-child position: adults + "0" + infants
  return a + String(children) + String(infants);
}

// ── Builder ──

/**
 * Build a White Label flight search URL.
 *
 * ## Eligibility
 * All of the following MUST be explicitly provided and valid:
 *   - origin (3-char IATA)
 *   - destination (3-char IATA, not same as origin)
 *   - outboundDate (YYYY-MM-DD, not in past)
 *   - adults (integer, 1-9)
 *   - children (integer, 0-9)
 *   - infants (integer, 0-9)
 *   - cabinClass ("economy" or "business")
 *   - Rollout mode is "test" or "enabled"
 *   - White Label host is configured
 *
 * If ANY condition fails → { success: false }. Caller MUST fall back.
 *
 * `currency` (BF-FLIGHTS-LIVE-2 Phase D) is optional and additive: it is
 * never required for a successful build, and an unsupported/unverified
 * code never fails the build either — it is silently omitted so the White
 * Label falls back to its own configured default (verified: USD) rather
 * than this codebase claiming a currency the White Label cannot actually
 * display. See currency.ts's WHITE_LABEL_SUPPORTED_CURRENCIES for exactly
 * which codes were live-verified. Check result.currencyApplied to know
 * whether the requested currency was actually included.
 */
export function buildWhiteLabelFlightUrl(params: {
  origin: string;
  destination: string;
  outboundDate: string;
  returnDate?: string;
  adults: number;
  children: number;
  infants: number;
  cabinClass: string;
  currency?: string;
}): WhiteLabelUrlResult {
  // Rollout
  if (getWhiteLabelRolloutMode() === "disabled") {
    return { success: false, url: null, reason: "White Label is not enabled" };
  }

  // Host
  const base = getWhiteLabelBase();
  if (!base) {
    return { success: false, url: null, reason: "White Label host is not configured" };
  }

  // IATA
  if (!params.origin || !IATA_RE.test(params.origin)) {
    return { success: false, url: null, reason: "Origin must be a 3-letter IATA code" };
  }
  if (!params.destination || !IATA_RE.test(params.destination)) {
    return { success: false, url: null, reason: "Destination must be a 3-letter IATA code" };
  }
  if (params.origin === params.destination) {
    return { success: false, url: null, reason: "Origin and destination cannot be the same" };
  }

  // Dates
  if (!params.outboundDate || !DATE_RE.test(params.outboundDate)) {
    return { success: false, url: null, reason: "Outbound date must be YYYY-MM-DD" };
  }
  if (params.returnDate && !DATE_RE.test(params.returnDate)) {
    return { success: false, url: null, reason: "Return date must be YYYY-MM-DD" };
  }
  if (params.returnDate && params.returnDate < params.outboundDate) {
    return { success: false, url: null, reason: "Return date must be on or after outbound date" };
  }

  // Passengers — strict integer validation
  for (const [name, val] of [["adults", params.adults], ["children", params.children], ["infants", params.infants]] as const) {
    if (!Number.isInteger(val) || val < 0 || val > 9) {
      return { success: false, url: null, reason: `${name} must be an integer 0–9` };
    }
  }
  if (params.adults < 1) {
    return { success: false, url: null, reason: "At least 1 adult is required" };
  }

  // Cabin class — must be explicitly "economy" or "business"
  if (!isSupportedCabinClass(params.cabinClass)) {
    return { success: false, url: null, reason: `Cabin class must be one of: ${SUPPORTED_CABIN_CLASSES.join(", ")}` };
  }

  // ── Build flightSearch ──

  // Core: ORIGIN + DDMM + DEST
  let flightSearch = params.origin + toDDMM(params.outboundDate) + params.destination;

  // Return date (optional — omit for one-way)
  if (params.returnDate) {
    flightSearch += toDDMM(params.returnDate);
  }

  // Cabin marker: "c" for business, nothing for economy
  if (params.cabinClass === "business") {
    flightSearch += "c";
  }

  // Passenger suffix
  flightSearch += buildPassengerSuffix(params.adults, params.children, params.infants);

  // ── Build URL ──
  const qs = new URLSearchParams();
  qs.set("flightSearch", flightSearch);
  qs.set("origin_airports", "1");
  qs.set("destination_airports", "0");

  const requestedCurrency = isValidCurrencyCode(params.currency) ? params.currency : undefined;
  const currencyApplied = isWhiteLabelSupportedCurrency(requestedCurrency);
  if (currencyApplied) {
    qs.set("currency", requestedCurrency!);
  }

  const url = new URL("/", base);
  url.search = qs.toString();

  return { success: true, url: url.toString(), currencyApplied, requestedCurrency };
}
