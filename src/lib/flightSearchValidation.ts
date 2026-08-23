/**
 * Flight Search Validation
 * Phase 7A — Public Flight Search Experience
 *
 * Shared validation rules for the canonical flight search form.
 * Used by ModernFlightSearch (form submit), FlightResults (route-mode decision),
 * and unit tests.
 */

import { isSupportedCabinClass } from "./cabinClasses";

export interface FlightSearchFormValues {
  origin: string;
  destination: string;
  departureDate: Date | undefined;
  returnDate: Date | undefined;
  adults: number;
  children: number;
  infants: number;
  cabinClass: string;
  tripType: "roundtrip" | "oneway";
}

export interface ValidationError {
  field: string;
  message: string;
}

const IATA_RE = /^[A-Z]{3}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Format a Date as a LOCAL calendar-date string (YYYY-MM-DD).
 *
 * Unlike .toISOString().split("T")[0] which converts through UTC and
 * can produce the previous day in UTC+ timezones, this reads the local
 * year/month/day directly and is safe for calendar-only travel dates.
 *
 * Example:
 *   new Date("2026-08-18T00:00:00") (in UTC+10)
 *   - toISODateLocal returns "2026-08-18"
 *   - .toISOString().split("T")[0] would return "2026-08-17" (WRONG)
 */
export function toISODateLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Validate the complete flight search form.
 * Returns an array of errors. Empty array = valid.
 */
export function validateFlightSearch(values: FlightSearchFormValues): ValidationError[] {
  const errors: ValidationError[] = [];

  // Origin
  if (!values.origin || !values.origin.trim()) {
    errors.push({ field: "origin", message: "Please select an origin airport" });
  } else if (!IATA_RE.test(values.origin.toUpperCase().trim())) {
    errors.push({ field: "origin", message: "Origin must be a valid 3-letter airport code" });
  }

  // Destination
  if (!values.destination || !values.destination.trim()) {
    errors.push({ field: "destination", message: "Please select a destination airport" });
  } else if (!IATA_RE.test(values.destination.toUpperCase().trim())) {
    errors.push({ field: "destination", message: "Destination must be a valid 3-letter airport code" });
  }

  // Same origin/destination
  if (
    values.origin &&
    values.destination &&
    IATA_RE.test(values.origin.toUpperCase().trim()) &&
    IATA_RE.test(values.destination.toUpperCase().trim()) &&
    values.origin.toUpperCase().trim() === values.destination.toUpperCase().trim()
  ) {
    errors.push({ field: "destination", message: "Origin and destination cannot be the same" });
  }

  // Departure date
  if (!values.departureDate) {
    errors.push({ field: "departureDate", message: "Please select a departure date" });
  }

  // Return date
  if (values.tripType === "roundtrip") {
    if (!values.returnDate) {
      errors.push({ field: "returnDate", message: "Please select a return date for round trips" });
    } else if (values.departureDate && values.returnDate < values.departureDate) {
      errors.push({ field: "returnDate", message: "Return date cannot be before departure date" });
    }
  }

  // Adults
  if (!Number.isInteger(values.adults) || values.adults < 1 || values.adults > 9) {
    errors.push({ field: "adults", message: "At least 1 adult is required (max 9)" });
  }

  // Children
  if (!Number.isInteger(values.children) || values.children < 0 || values.children > 9) {
    errors.push({ field: "children", message: "Children must be 0–9" });
  }

  // Infants
  if (!Number.isInteger(values.infants) || values.infants < 0 || values.infants > 9) {
    errors.push({ field: "infants", message: "Infants must be 0–9" });
  }

  // Infants ≤ adults
  if (values.infants > values.adults) {
    errors.push({ field: "infants", message: "Infants cannot exceed adults (1 adult per infant required)" });
  }

  // Total passengers ≤ 9
  const total = values.adults + values.children + values.infants;
  if (total > 9) {
    errors.push({ field: "adults", message: "Maximum 9 passengers total" });
  }

  // Cabin class
  if (!isSupportedCabinClass(values.cabinClass)) {
    errors.push({ field: "cabinClass", message: "Please select a valid cabin class" });
  }

  return errors;
}

// ── Route-mode decision ───────────────────────────────────────

export interface ParsedFlightSearchParams {
  /** "results" if the URL contains a complete, valid search. "form" otherwise. */
  mode: "results" | "form";
  /** Fully validated values. Only meaningful when mode === "results". */
  validated: FlightSearchFormValues | null;
  /** Individually safe fields to prefill the form. Always populated (may be empty). */
  prefill: Partial<FlightSearchFormValues>;
  /** Validation errors that prevented results mode. Empty when mode === "results". */
  errors: ValidationError[];
}

/**
 * Parse and validate URL search params for flight search.
 *
 * This is the SINGLE function that decides whether FlightResults
 * enters results mode or form mode. It reuses validateFlightSearch
 * as the only source of validation truth — no duplicate checks.
 *
 * Behaviour:
 *   A. Complete + valid URL          → mode: "results", validated populated
 *   B. Incomplete URL                → mode: "form", safe fields prefilled
 *   C. Complete but invalid URL      → mode: "form", safe fields prefilled, errors listed
 *   D. Unsupported cabin class       → mode: "form", cabin NOT defaulted to economy
 *   E. Invalid/malformed date        → mode: "form", no API call
 *   F. Invalid IATA origin/dest      → mode: "form", no API call
 */
export function parseAndValidateFlightSearchParams(
  searchParams: URLSearchParams
): ParsedFlightSearchParams {
  // Parse every field with per-field validation (only individually safe values propagate)
  const rawOrigin = searchParams.get("origin") || "";
  const rawDestination = searchParams.get("destination") || "";
  const rawDepDate = searchParams.get("departureDate") || "";
  const rawRetDate = searchParams.get("returnDate") || "";
  const rawAdults = searchParams.get("adults");
  const rawChildren = searchParams.get("children");
  const rawInfants = searchParams.get("infants");
  // cabinClass: only fall back to "economy" if the key is missing entirely.
  // An explicitly empty value (cabinClass=) must be treated as invalid.
  const rawCabin = searchParams.has("cabinClass")
    ? searchParams.get("cabinClass")!
    : "economy";

  // Build prefill — only individually safe fields
  const prefill: Partial<FlightSearchFormValues> = {};

  if (rawOrigin && IATA_RE.test(rawOrigin.toUpperCase().trim())) {
    prefill.origin = rawOrigin.toUpperCase().trim();
  }
  if (rawDestination && IATA_RE.test(rawDestination.toUpperCase().trim())) {
    prefill.destination = rawDestination.toUpperCase().trim();
  }

  // Parse dates
  let depDate: Date | undefined;
  if (rawDepDate && DATE_RE.test(rawDepDate)) {
    const d = new Date(rawDepDate + "T00:00:00");
    if (!isNaN(d.getTime())) {
      depDate = d;
      prefill.departureDate = d;
    }
  }

  let retDate: Date | undefined;
  if (rawRetDate && DATE_RE.test(rawRetDate)) {
    const d = new Date(rawRetDate + "T00:00:00");
    if (!isNaN(d.getTime())) {
      retDate = d;
      prefill.returnDate = d;
    }
  }

  // Parse passengers — only individually safe values
  if (rawAdults) {
    const n = parseInt(rawAdults, 10);
    if (!isNaN(n) && Number.isInteger(n) && n >= 1 && n <= 9) prefill.adults = n;
  }
  if (rawChildren) {
    const n = parseInt(rawChildren, 10);
    if (!isNaN(n) && Number.isInteger(n) && n >= 0 && n <= 9) prefill.children = n;
  }
  if (rawInfants) {
    const n = parseInt(rawInfants, 10);
    if (!isNaN(n) && Number.isInteger(n) && n >= 0 && n <= 9) prefill.infants = n;
  }

  // Cabin class — only prefill if valid; do NOT silently default
  if (isSupportedCabinClass(rawCabin)) {
    prefill.cabinClass = rawCabin;
  }

  // Trip type
  if (retDate) {
    prefill.tripType = "roundtrip";
  } else if (depDate && !retDate) {
    prefill.tripType = "oneway";
  }

  // Build the full values object for validation
  const values: FlightSearchFormValues = {
    origin: rawOrigin,
    destination: rawDestination,
    departureDate: depDate,
    returnDate: retDate,
    adults: prefill.adults ?? (rawAdults ? parseInt(rawAdults, 10) : 1),
    children: prefill.children ?? (rawChildren ? parseInt(rawChildren, 10) : 0),
    infants: prefill.infants ?? (rawInfants ? parseInt(rawInfants, 10) : 0),
    cabinClass: rawCabin,
    tripType: retDate ? "roundtrip" : "oneway",
  };

  const errors = validateFlightSearch(values);

  if (errors.length === 0) {
    return { mode: "results", validated: values, prefill, errors: [] };
  }

  return { mode: "form", validated: null, prefill, errors };
}

// ── Legacy helpers (preserved for backward compat) ────────────

/**
 * @deprecated Use parseAndValidateFlightSearchParams instead.
 */
export function hasValidSearchParams(params: URLSearchParams): boolean {
  const result = parseAndValidateFlightSearchParams(params);
  return result.mode === "results";
}

/**
 * Parse URL params into a safe prefill object.
 * @deprecated Use parseAndValidateFlightSearchParams instead.
 */
export function parseSearchParamsForPrefill(
  searchParams: URLSearchParams
): Partial<FlightSearchFormValues> {
  const result = parseAndValidateFlightSearchParams(searchParams);
  return result.prefill;
}
