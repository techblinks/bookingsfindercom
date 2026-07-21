/**
 * Central travel partner configuration — CLIENT-SAFE.
 *
 * Contains only public metadata and URL builders.
 * API tokens and affiliate markers are in Edge Functions only,
 * never exposed to client-side code.
 *
 * All URL construction uses URL + URLSearchParams — never
 * manual string concatenation of query parameters.
 */

// ── Types ──

/** Supported travel product types. */
export type TravelProductType = "flight" | "hotel";

/** Partner identifier. */
export type TravelPartnerId = "aviasales" | "hotellook";

/** Partner metadata (client-safe — no secrets). */
export interface TravelPartnerMeta {
  id: TravelPartnerId;
  name: string;
  productType: TravelProductType;
  /** Public website for disclosure. */
  website: string;
  /** Base search URL used by the get-redirect Edge Function. */
  searchBaseUrl: string;
  /** White Label subdomain — set when configured by owner. Read from env. */
  whiteLabelHost: string | null;
  /** Trust disclosure sentence for footer/handoff. */
  disclosure: string;
}

/** Validated flight search parameters. */
export interface ValidatedFlightParams {
  origin: string;
  destination: string;
  departureDate: string;          // "YYYY-MM-DD"
  returnDate?: string;            // "YYYY-MM-DD", optional
  adults: number;
  cabinClass?: string;
}

/** Validation error for a single field. */
export interface ValidationFieldError {
  field: string;
  code: string;
  message: string;
}

/** Result of validating search parameters. */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationFieldError[];
}

/** Result of building a search URL. */
export interface UrlBuildResult {
  success: boolean;
  url: string | null;
  partner: TravelPartnerId;
  /** Human-readable reason when url is null. */
  reason?: string;
  /** Validation errors when building failed. */
  errors?: ValidationFieldError[];
}

// ── Partner Configuration ──

function getWhiteLabelHost(): string | null {
  // Read from build-time env. Only set when owner configures the CNAME.
  // Falls back to null → Edge Function uses aviasales.com directly.
  const host = import.meta.env.VITE_TRAVEL_WHITE_LABEL_HOST;
  if (!host || host === "") return null;
  // Validate it's a hostname, not a full URL
  if (host.includes("://") || host.includes("/")) return null;
  return host;
}

export const PARTNERS: Record<TravelPartnerId, TravelPartnerMeta> = {
  aviasales: {
    id: "aviasales",
    name: "Aviasales",
    productType: "flight",
    website: "https://www.aviasales.com",
    searchBaseUrl: "https://www.aviasales.com",
    whiteLabelHost: getWhiteLabelHost(),
    disclosure: "Flights are searched via our travel partner Aviasales. Final prices and availability are confirmed on the partner site.",
  },
  hotellook: {
    id: "hotellook",
    name: "Hotellook",
    productType: "hotel",
    website: "https://search.hotellook.com",
    searchBaseUrl: "https://search.hotellook.com",
    whiteLabelHost: null, // Hotellook does not support White Label
    disclosure: "Hotels are searched via our travel partner Hotellook. Final prices and availability are confirmed on the partner site.",
  },
};

/** Approved outbound host patterns (prevents open redirect). */
const APPROVED_HOSTS: Record<TravelPartnerId, string> = {
  aviasales: "aviasales.com",
  hotellook: "hotellook.com",
};

// ── Helpers ──

function addError(errors: ValidationFieldError[], field: string, code: string, message: string): void {
  errors.push({ field, code, message });
}

/** IATA airport code: 3 uppercase letters. */
const IATA_RE = /^[A-Z]{3}$/;

/** ISO date: YYYY-MM-DD. */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validate departure date is not in the past (date-only comparison).
 * Accepts empty/missing dates (optional field).
 */
function isDateNotPast(dateStr: string): boolean {
  if (!dateStr) return true;
  const today = new Date().toISOString().slice(0, 10);
  return dateStr >= today;
}

/**
 * Check that return date is at or after departure date.
 * Both must be valid dates.
 */
function isReturnAfterDeparture(dep: string, ret: string): boolean {
  return ret >= dep;
}

// ── Public Validation ──

/**
 * Validate flight search parameters.
 * Returns structured errors — never throws.
 */
export function validateFlightParams(params: Partial<ValidatedFlightParams>): ValidationResult {
  const errors: ValidationFieldError[] = [];

  // Origin
  if (!params.origin || !IATA_RE.test(params.origin)) {
    addError(errors, "origin", "invalid_iata", "Enter a valid 3-letter airport code (e.g. SYD)");
  }

  // Destination
  if (!params.destination || !IATA_RE.test(params.destination)) {
    addError(errors, "destination", "invalid_iata", "Enter a valid 3-letter airport code (e.g. DPS)");
  }

  // Same origin and destination
  if (
    params.origin && params.destination &&
    IATA_RE.test(params.origin) && IATA_RE.test(params.destination) &&
    params.origin === params.destination
  ) {
    addError(errors, "destination", "same_as_origin", "Destination cannot be the same as origin");
  }

  // Departure date
  if (!params.departureDate || !DATE_RE.test(params.departureDate)) {
    addError(errors, "departureDate", "invalid_date", "Enter a valid departure date (YYYY-MM-DD)");
  } else if (!isDateNotPast(params.departureDate)) {
    addError(errors, "departureDate", "date_past", "Departure date cannot be in the past");
  }

  // Return date (optional, but if provided must be valid)
  if (params.returnDate) {
    if (!DATE_RE.test(params.returnDate)) {
      addError(errors, "returnDate", "invalid_date", "Enter a valid return date (YYYY-MM-DD)");
    } else if (params.departureDate && DATE_RE.test(params.departureDate) && !isReturnAfterDeparture(params.departureDate, params.returnDate)) {
      addError(errors, "returnDate", "before_departure", "Return date must be on or after departure date");
    }
  }

  // Adults
  const adults = params.adults ?? 1;
  if (!Number.isInteger(adults) || adults < 1) {
    addError(errors, "adults", "invalid_adults", "At least 1 adult traveller is required");
  } else if (adults > 9) {
    addError(errors, "adults", "too_many_adults", "Maximum 9 adults per search");
  }

  return { valid: errors.length === 0, errors };
}

// ── URL Building ──

/**
 * Get the effective base URL for a partner, preferring White Label when available.
 */
function getEffectiveBaseUrl(partner: TravelPartnerId): string {
  const meta = PARTNERS[partner];
  if (meta?.whiteLabelHost) {
    return `https://${meta.whiteLabelHost}`;
  }
  return meta?.searchBaseUrl ?? "";
}

/**
 * Verify that a built URL's host matches the approved partner host.
 * This prevents accidental redirect to an unexpected domain.
 */
function isApprovedHost(urlString: string, partner: TravelPartnerId): boolean {
  try {
    const u = new URL(urlString);
    const approved = APPROVED_HOSTS[partner];
    if (!approved) return false;
    return u.hostname === approved || u.hostname.endsWith(`.${approved}`);
  } catch {
    return false;
  }
}

/**
 * Build a flight search URL for a travel partner.
 *
 * This constructs the URL that the get-redirect Edge Function would
 * build, but does so client-side for navigation purposes. The actual
 * affiliate redirect still passes through the Edge Function.
 *
 * Returns a structured result — never throws.
 */
export function buildFlightSearchUrl(params: ValidatedFlightParams): UrlBuildResult {
  const partner: TravelPartnerId = "aviasales";

  // Validate first
  const validation = validateFlightParams(params);
  if (!validation.valid) {
    return {
      success: false,
      url: null,
      partner,
      reason: "Validation failed",
      errors: validation.errors,
    };
  }

  const base = getEffectiveBaseUrl(partner);
  if (!base) {
    return {
      success: false,
      url: null,
      partner,
      reason: "Partner configuration not available",
    };
  }

  // Build search path: /search/ORIGINDATEDESTRETDATE1
  const depDate = params.departureDate.replace(/-/g, "");
  const retDate = params.returnDate?.replace(/-/g, "") ?? "";
  const path = `/search/${params.origin}${depDate}${params.destination}${retDate}1`;

  // Build query parameters safely
  const qs = new URLSearchParams();
  qs.set("origin_iata", params.origin);
  qs.set("destination_iata", params.destination);
  qs.set("depart_date", params.departureDate);
  if (params.returnDate) {
    qs.set("return_date", params.returnDate);
  }
  qs.set("adults", String(params.adults));
  if (params.cabinClass && params.cabinClass !== "economy") {
    qs.set("cabin_class", params.cabinClass);
  }

  // Construct full URL
  const url = new URL(path, base);
  url.search = qs.toString();

  const urlString = url.toString();

  // Safety: verify host is approved
  if (!isApprovedHost(urlString, partner)) {
    return {
      success: false,
      url: null,
      partner,
      reason: "Generated URL resolves to an unapproved host",
    };
  }

  return {
    success: true,
    url: urlString,
    partner,
  };
}

/**
 * Build the /flights route URL within BookingsFinder.
 * This navigates to the internal FlightResults page, not the partner.
 */
export function buildInternalFlightUrl(params: Partial<ValidatedFlightParams>): string {
  const qs = new URLSearchParams();
  if (params.origin) qs.set("origin", params.origin);
  if (params.destination) qs.set("destination", params.destination);
  if (params.departureDate) qs.set("departureDate", params.departureDate);
  if (params.returnDate) qs.set("returnDate", params.returnDate);
  if (params.adults) qs.set("passengers", String(params.adults));
  if (params.cabinClass) qs.set("cabinClass", params.cabinClass);
  const q = qs.toString();
  return q ? `/flights?${q}` : "/flights";
}

// ── Partner Disclosure ──

/**
 * Get the trust disclosure sentence for a partner.
 */
export function getPartnerDisclosure(partnerId: TravelPartnerId): string {
  return PARTNERS[partnerId]?.disclosure ?? "";
}

/**
 * Generic affiliate disclosure — used at handoff points.
 */
export const AFFILIATE_DISCLOSURE =
  "BookingsFinder is a travel comparison site. We may earn a commission when you book through our partners at no extra cost to you. Final prices and availability are confirmed by the booking provider.";
