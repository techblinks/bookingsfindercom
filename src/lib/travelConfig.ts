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

/**
 * Resolve the White Label host from the build-time environment variable.
 * Accepts values with or without `https://` prefix.
 * Strips protocol and trailing slashes so only the bare hostname is stored.
 * Returns null when the env var is not set, empty, or contains invalid
 * characters for a hostname (full URLs with paths are rejected).
 *
 * Result is cached at module load time — VITE_ env vars are build-time constants.
 * The cache can be reset via resetPartnerConfig() for testing.
 */
let _whiteLabelHostCache: string | null | undefined;

function getWhiteLabelHost(): string | null {
  if (_whiteLabelHostCache !== undefined) return _whiteLabelHostCache;

  const raw = import.meta.env.VITE_TRAVEL_WHITE_LABEL_HOST;
  if (!raw || raw === "") {
    _whiteLabelHostCache = null;
    return null;
  }

  // Normalise: strip https:// or http:// prefix
  let host = raw.trim();
  if (host.startsWith("https://")) host = host.slice("https://".length);
  else if (host.startsWith("http://")) host = host.slice("http://".length);

  // Strip trailing slash
  if (host.endsWith("/")) host = host.slice(0, -1);

  // Reject values that still look like URLs (contain paths or query strings)
  if (host.includes("/") || host.includes("?") || host.includes("#")) {
    _whiteLabelHostCache = null;
    return null;
  }

  // Reject empty after normalisation
  if (!host) {
    _whiteLabelHostCache = null;
    return null;
  }

  _whiteLabelHostCache = host;
  return host;
}

/**
 * Reset cached configuration — for testing only.
 * Clears the White Label host cache so the next call to getWhiteLabelHost()
 * re-reads import.meta.env (which can be stubbed in tests via vi.stubEnv).
 */
export function resetPartnerConfig(): void {
  _whiteLabelHostCache = undefined;
}

export const PARTNERS: Record<TravelPartnerId, TravelPartnerMeta> = {
  aviasales: {
    id: "aviasales",
    name: "Aviasales",
    productType: "flight",
    website: "https://www.aviasales.com",
    searchBaseUrl: "https://www.aviasales.com",
    // Lazy getter: re-evaluates on each access so tests can stub env vars
    get whiteLabelHost() { return getWhiteLabelHost(); },
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
 *
 * For aviasales, also accepts the configured White Label host (e.g.,
 * flights.bookingsfinder.com) even though its root domain differs
 * from the standard aviasales.com.
 */
function isApprovedHost(urlString: string, partner: TravelPartnerId): boolean {
  try {
    const u = new URL(urlString);
    const approved = APPROVED_HOSTS[partner];
    if (!approved) return false;

    // Standard partner host (e.g., aviasales.com or subdomain)
    if (u.hostname === approved || u.hostname.endsWith(`.${approved}`)) return true;

    // White Label host for aviasales
    if (partner === "aviasales") {
      const wlHost = getWhiteLabelHost();
      if (wlHost && (u.hostname === wlHost || u.hostname.endsWith(`.${wlHost}`))) {
        return true;
      }
    }

    return false;
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

// ── Redirect Host Validation ──

/**
 * Approved redirect destination hosts.
 *
 * Constructed from partner configuration and the White Label host.
 *   - aviasales.com (and subdomains) — standard Aviasales search
 *   - hotellook.com (and subdomains) — standard Hotellook search
 *   - The configured White Label host, if set
 *   - localhost / 127.0.0.1 — for development (only in DEV mode)
 *
 * The hostname comparison is **exact match only** for the White Label host
 * and exact or strict dot-boundary suffix for standard partner hosts.
 * Substring matching (e.g. includes(), endsWith() without a dot) is never used.
 */

/**
 * Check whether `hostname` matches `approved`:
 *   - Exact match ("aviasales.com" matches "aviasales.com")
 *   - Subdomain match ("www.aviasales.com" matches ".aviasales.com" via endswith)
 * The rule always uses a dot prefix for suffix matching to prevent lookalike attacks.
 */
function hostnameMatches(hostname: string, approved: string): boolean {
  return hostname === approved || hostname.endsWith("." + approved);
}

/**
 * Validate a bare hostname against approved outbound hosts.
 *
 * Reuses the same hostnameMatches logic as redirect validation.
 *   - 'flight': aviasales.com subdomains + configured White Label host
 *   - 'hotel': hotellook.com subdomains
 *
 * Lookalikes (aviasales.com.evil.example) are rejected because
 * hostnameMatches requires exact match or a dot-prefixed suffix.
 *
 * Returns false for null, empty, or malformed hostnames.
 */
export function isApprovedOutboundHost(hostname: string | null | undefined, partnerType: "flight" | "hotel"): boolean {
  if (!hostname) return false;

  let clean: string;
  try {
    clean = hostname.trim().toLowerCase();
    if (clean.startsWith("https://")) clean = clean.slice("https://".length);
    else if (clean.startsWith("http://")) clean = clean.slice("http://".length);
    if (clean.endsWith("/")) clean = clean.slice(0, -1);
    if (clean.includes("/") || clean.includes("?") || clean.includes("#")) return false;
    if (!clean) return false;
  } catch {
    return false;
  }

  if (partnerType === "flight") {
    if (hostnameMatches(clean, "aviasales.com")) return true;
    const wlHost = getWhiteLabelHost();
    if (wlHost && hostnameMatches(clean, wlHost)) return true;
    return false;
  }

  if (partnerType === "hotel") {
    if (hostnameMatches(clean, "hotellook.com")) return true;
    return false;
  }

  return false;
}

/**
 * All approved redirect destination hostnames.
 * Computed once at module load — values are build-time constants.
 *
 * White Label host is approved by EXACT hostname only — no root domain, no siblings.
 */
export function getApprovedRedirectHosts(): string[] {
  const hosts: string[] = [
    // Standard Aviasales host
    "www.aviasales.com",
    "aviasales.com",
    // Hotellook host
    "search.hotellook.com",
    "hotellook.com",
  ];

  // Configured White Label host — exact match only
  const wlHost = getWhiteLabelHost();
  if (wlHost) {
    hosts.push(wlHost);
  }

  return hosts;
}

/** Safe localhost patterns — only valid in development mode. */
const DEV_HOSTS = ["localhost", "127.0.0.1", "[::1]"];

export interface HostValidationResult {
  valid: boolean;
  hostname: string | null;
  reason?: string;
}

/**
 * Validate that a redirect URL resolves to an approved partner host.
 * HTTPS only in production — localhost is permitted for development only.
 * Returns a structured result — never throws.
 */
export function validateRedirectHost(rawUrl: string): HostValidationResult {
  // Must be non-empty
  if (!rawUrl || !rawUrl.trim()) {
    return { valid: false, hostname: null, reason: "Empty URL" };
  }

  const trimmed = rawUrl.trim().replace(/\s/g, "%20");

  // Parse with URL constructor
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, hostname: null, reason: "Invalid URL" };
  }

  // Reject dangerous protocols even if URL constructor accepts them
  if (parsed.protocol === "javascript:" || parsed.protocol === "data:" || parsed.protocol === "file:") {
    return { valid: false, hostname: null, reason: "Invalid URL" };
  }

  // Reject URLs with userinfo (username/password) — lookalike vector:
  //   https://flights.bookingsfinder.com@evil.example → hostname = evil.example
  if (parsed.username || parsed.password) {
    return { valid: false, hostname: parsed.hostname, reason: "URLs with credentials are not permitted" };
  }

  // Normalise hostname for comparison
  const hostname = parsed.hostname.toLowerCase();

  // Only https: in production; http: allowed for localhost dev
  const isDevHost = DEV_HOSTS.includes(hostname);
  if (parsed.protocol !== "https:" && !(isDevHost && import.meta.env.DEV && parsed.protocol === "http:")) {
    return { valid: false, hostname, reason: "Only HTTPS URLs are permitted" };
  }

  // Development hosts — only accepted when running in DEV mode
  if (isDevHost) {
    if (!import.meta.env.DEV) {
      return { valid: false, hostname, reason: `Host "${hostname}" is not permitted in production` };
    }
    return { valid: true, hostname };
  }

  // Check against approved hosts
  const approved = getApprovedRedirectHosts();
  for (const a of approved) {
    if (hostnameMatches(hostname, a)) {
      return { valid: true, hostname };
    }
  }

  return {
    valid: false,
    hostname,
    reason: `Host "${hostname}" is not an approved redirect destination`,
  };
}
