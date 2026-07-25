/**
 * Safe outbound affiliate tracking payload builder.
 *
 * Constructs only approved fields for the affiliate_clicks table.
 * Never includes PII, full URLs, API keys, or free-text sensitive data.
 * Returns structured valid/invalid results — never throws.
 */

// ── Types ──

/** Approved travel product types for tracking. */
export type TrackedProductType = "flight" | "hotel";

/** Approved outbound actions. */
export type TrackedAction = "search" | "click";

/** Approved source page identifiers (stable, machine-readable). */
export const SOURCE_PAGES = [
  "flight_results",
  "trip_cost_planner",
  "hotel_results",
  "hotel_booking_guide",
  "homepage",
  "route_page",
] as const;
export type SourcePage = (typeof SOURCE_PAGES)[number];

/** Approved placement identifiers (stable, machine-readable). */
export const PLACEMENTS = [
  "flight_result_card",
  "flight_result_cta",
  "planner_summary",
  "hotel_result_card",
  "hotel_result_cta",
  "homepage_flight_handoff",
  "homepage_hotel_handoff",
  "route_page_cta",
] as const;
export type Placement = (typeof PLACEMENTS)[number];

/** Approved partner identifiers. Matches PARTNERS in travelConfig.ts. */
export type TrackedPartner = "aviasales" | "hotellook";

/** Approved partner host suffixes for outbound_host sanitisation. */
const APPROVED_HOSTS: Record<TrackedPartner, string> = {
  aviasales: "aviasales.com",
  hotellook: "hotellook.com",
};

/**
 * White Label host — resolved and cached at module load time.
 * Read from the same VITE_TRAVEL_WHITE_LABEL_HOST env var used by travelConfig.
 * Accepts values with or without https:// prefix (normalised to bare hostname).
 */
let _wlHostCache: string | null | undefined;
function getWhiteLabelHost(): string | null {
  if (_wlHostCache !== undefined) return _wlHostCache;
  const raw = import.meta.env.VITE_TRAVEL_WHITE_LABEL_HOST;
  if (!raw || raw === "") { _wlHostCache = null; return null; }
  let host = raw.trim();
  if (host.startsWith("https://")) host = host.slice("https://".length);
  else if (host.startsWith("http://")) host = host.slice("http://".length);
  if (host.endsWith("/")) host = host.slice(0, -1);
  if (host.includes("/") || host.includes("?") || host.includes("#") || !host) {
    _wlHostCache = null; return null;
  }
  _wlHostCache = host;
  return host;
}

/** Fields accepted for a tracking payload. */
export interface OutboundTrackingPayload {
  type: TrackedProductType;
  action: TrackedAction;
  origin?: string;
  destination?: string;
  departureDate?: string;       // "YYYY-MM-DD"
  returnDate?: string;          // "YYYY-MM-DD"
  airlineCode?: string;
  flightNumber?: string;
  hotelId?: string;
  price?: number;
  currency?: string;
  sourcePage?: SourcePage;
  placement?: Placement;
  outboundHost?: string;
}

export interface TrackingValidationError {
  field: string;
  code: string;
  message: string;
}

export interface TrackingBuildResult {
  valid: boolean;
  /** The sanitised row ready for Supabase insert, or null. */
  row: Record<string, unknown> | null;
  errors: TrackingValidationError[];
}

// ── Helpers ──

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const IATA_RE = /^[A-Z]{3}$/;

function err(field: string, code: string, message: string): TrackingValidationError {
  return { field, code, message };
}

// ── Payload Builder ──

/**
 * Build a safe, sanitised tracking payload.
 *
 * Strips unapproved fields, validates types, normalises values.
 * Returns a structured result — never throws.
 */
export function buildTrackingPayload(data: OutboundTrackingPayload): TrackingBuildResult {
  const errors: TrackingValidationError[] = [];
  const row: Record<string, unknown> = {};

  // Product type
  if (!["flight", "hotel"].includes(data.type)) {
    errors.push(err("type", "invalid_type", "Product type must be 'flight' or 'hotel'"));
  } else {
    row.type = data.type;
  }

  // Action
  if (!["search", "click"].includes(data.action)) {
    errors.push(err("action", "invalid_action", "Action must be 'search' or 'click'"));
  } else {
    row.action = data.action;
  }

  // Origin (IATA only, if provided)
  if (data.origin !== undefined) {
    if (IATA_RE.test(data.origin)) {
      row.origin = data.origin;
    } else {
      errors.push(err("origin", "invalid_iata", "Origin must be a 3-letter IATA code"));
    }
  }

  // Destination (IATA only, if provided)
  if (data.destination !== undefined) {
    if (IATA_RE.test(data.destination)) {
      row.destination = data.destination;
    } else {
      errors.push(err("destination", "invalid_iata", "Destination must be a 3-letter IATA code"));
    }
  }

  // Departure date
  if (data.departureDate !== undefined) {
    if (DATE_RE.test(data.departureDate)) {
      row.departure_date = data.departureDate;
    } else {
      errors.push(err("departureDate", "invalid_date", "Date must be YYYY-MM-DD"));
    }
  }

  // Return date
  if (data.returnDate !== undefined) {
    if (DATE_RE.test(data.returnDate)) {
      row.return_date = data.returnDate;
    } else {
      errors.push(err("returnDate", "invalid_date", "Date must be YYYY-MM-DD"));
    }
  }

  // Airline code
  if (data.airlineCode !== undefined) {
    row.airline_code = data.airlineCode;
  }

  // Flight number
  if (data.flightNumber !== undefined) {
    row.flight_number = data.flightNumber;
  }

  // Hotel ID
  if (data.hotelId !== undefined) {
    row.hotel_id = data.hotelId;
  }

  // Price (only if positive finite number)
  if (data.price !== undefined) {
    if (typeof data.price === "number" && Number.isFinite(data.price) && data.price >= 0) {
      row.price = data.price;
    } else {
      errors.push(err("price", "invalid_price", "Price must be a positive number"));
    }
  }

  // Currency
  if (data.currency !== undefined) {
    if (/^[A-Z]{3}$/.test(data.currency)) {
      row.currency = data.currency;
    } else {
      errors.push(err("currency", "invalid_currency", "Currency must be a 3-letter code"));
    }
  }

  // Source page (allowlisted only)
  if (data.sourcePage !== undefined) {
    if ((SOURCE_PAGES as readonly string[]).includes(data.sourcePage)) {
      row.source_page = data.sourcePage;
    } else {
      errors.push(err("sourcePage", "invalid_source_page", `Source page must be one of: ${SOURCE_PAGES.join(", ")}`));
    }
  }

  // Placement (allowlisted only)
  if (data.placement !== undefined) {
    if ((PLACEMENTS as readonly string[]).includes(data.placement)) {
      row.placement = data.placement;
    } else {
      errors.push(err("placement", "invalid_placement", `Placement must be one of: ${PLACEMENTS.join(", ")}`));
    }
  }

  // Outbound host (approved partners only)
  if (data.outboundHost !== undefined) {
    let host = data.outboundHost;
    // Strip protocol and path
    try {
      const u = new URL(host.startsWith("http") ? host : `https://${host}`);
      host = u.hostname;
    } catch {
      // Keep as-is for validation
    }

    // Check standard partner hosts
    const standardApproved = Object.values(APPROVED_HOSTS).some(
      (approved) => host === approved || host.endsWith(`.${approved}`)
    );

    // Also accept White Label host for aviasales
    const wlHost = getWhiteLabelHost();
    const wlApproved = wlHost ? host === wlHost || host.endsWith(`.${wlHost}`) : false;

    if (standardApproved || wlApproved) {
      row.outbound_host = host;
    } else {
      errors.push(err("outboundHost", "unapproved_host", "Outbound host is not an approved partner"));
    }
  }

  return {
    valid: errors.length === 0,
    row: errors.length === 0 ? row : null,
    errors,
  };
}
