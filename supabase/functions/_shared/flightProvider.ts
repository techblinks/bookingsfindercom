/**
 * BookingsFinder flight provider abstraction (BF1-E).
 *
 * This module defines the BookingsFinder-owned NORMALIZED DOMAIN CONTRACT for
 * flight data. Application and Edge Function code depends on THESE types and
 * on the FlightProvider interface only — never on Travelpayouts wire-format
 * details, which are contained inside the Travelpayouts transport
 * (_shared/travelpayouts.ts) and its adapter (_shared/travelpayoutsProvider.ts).
 *
 * Design rules (BF1-E):
 *  - Types describe ONLY what providers actually supply today. No invented
 *    fields, no speculative future-provider fields.
 *  - Honesty semantics are part of the contract: timestamps are provider-stated
 *    values passed through verbatim (or null when the provider did not supply
 *    one); nothing here is ever generated from the current time.
 *  - Money representation is explicit: `priceMajor` is the numeric amount in
 *    MAJOR currency units (e.g. 123.45 = $123.45) exactly as the provider
 *    returned it. BF1-E performs NO float->minor-unit conversion anywhere, so
 *    every displayed price is byte-identical to pre-BF1-E behaviour. BF1-F
 *    (Currency Normalisation) will introduce integer minor units centrally at
 *    this boundary once the display layer converts in one place.
 *  - Location fields carry BF1-C-resolved provider codes: either an airport
 *    IATA (e.g. "HND") or a metro/city provider code (e.g. "TYO"), passed
 *    through verbatim — the adapter never second-guesses resolution.
 *  - providerId values MUST be members of the BF1-D supplier registry
 *    vocabulary (see _shared/suppliers.ts). No dynamic routing/selection is
 *    implemented in BF1-E; one flight provider remains active.
 */

import type { SupplierId } from "./suppliers.ts";
import type { ProviderMoney } from "./money.ts";

/**
 * Canonical id of the active flight provider. Compile-time-checked to be a
 * member of the BF1-D supplier registry vocabulary. Analytics, affiliate
 * redirects and the supplier registry all continue to see the exact string
 * "travelpayouts".
 */
export const FLIGHT_PROVIDER_ID = "travelpayouts" as const satisfies SupplierId;

export type FlightProviderId = typeof FLIGHT_PROVIDER_ID;

/* ------------------------------------------------------------------ */
/* Search                                                              */
/* ------------------------------------------------------------------ */

export interface FlightSearchQuery {
  /** BF1-C provider code: airport IATA ("HND") or metro/city code ("TYO"). */
  origin: string;
  /** BF1-C provider code: airport IATA or metro/city code. */
  destination: string;
  /** Requested outbound date, YYYY-MM-DD. */
  departureDate: string;
  /** Requested return date, YYYY-MM-DD. Omit/null for one-way searches. */
  returnDate?: string | null;
  /**
   * Traveller count, carried for callers' bookkeeping only. Cached
   * route-level provider endpoints do not price per passenger; adapters must
   * not forward this as if it produced a traveller-specific quote.
   */
  adults?: number;
  /** ISO-4217 alpha-3 currency code for returned prices. */
  currency: string;
}

/** One itinerary segment exactly as the provider stated it. */
export interface FlightOfferSegment {
  from: string;
  to: string;
  /**
   * Provider-stated departure timestamp for this leg, verbatim, or null when
   * the provider did not supply one.
   */
  departAt: string | null;
  /**
   * Provider-stated arrival timestamp for this leg, verbatim, or null. NEVER
   * derived, estimated or substituted from another quantity (the current
   * provider supplies no outbound arrival time at all).
   */
  arriveAt: string | null;
  /** Carrier code as stated by the provider, or null when unknown. */
  carrierCode: string | null;
  /** Provider-stated flight number, or null when the provider gave none. */
  flightNumber: string | null;
}

/**
 * One cached fare observation normalized into BookingsFinder's domain.
 *
 * Every timestamp/date-like field is a PROVIDER-STATED value passed through
 * verbatim, or null when the provider did not supply one. Nothing in this
 * type is ever synthesized from the current time.
 */
export interface FlightOffer {
  /**
   * Deterministic identifier for the offer within one provider response,
   * constructed by the adapter. Preserved byte-for-byte from the pre-BF1-E
   * implementation so analytics/redirect identifiers remain stable.
   */
  id: string;
  /** BF1-D registry id of the adapter that produced this offer. */
  providerId: FlightProviderId;
  /** Provider code of the origin as searched (airport IATA or metro code). */
  origin: string;
  /** Provider code of the destination as searched (airport IATA or metro code). */
  destination: string;
  /**
   * Outbound DEPARTURE timestamp exactly as the provider stated it (the
   * calendar date is the leading YYYY-MM-DD of this string). Null only when
   * the provider failed to state one — such offers are dropped upstream
   * rather than displayed with a guessed date.
   */
  departureAt: string | null;
  /**
   * RETURN-LEG DEPARTURE timestamp as stated by the provider (NOT an outbound
   * arrival time), or null for one-way observations.
   */
  returnAt: string | null;
  /**
   * Price in MAJOR currency units exactly as the provider returned it
   * (no rounding, no minor-unit conversion in BF1-E — see BF1-F transition
   * note in the module header).
   */
  /**
   * Observed fare as PROVIDER money (BF1-F): major-unit amount verbatim from
   * the provider, bound to its validated reported currency. No FX conversion
   * anywhere; integer-minor normalization only at explicit money.ts boundaries.
   */
  price: ProviderMoney;
  /** Carrier code as stated by the provider, or null when unknown. */
  carrierCode: string | null;
  /** Number of intermediate stops stated by the provider (0 when unstated). */
  stops: number;
  /**
   * Outbound-leg duration in minutes as derivable from provider quantities.
   * 0 means unknown/unstated — never a fabricated estimate.
   */
  durationMinutes: number;
  segments: FlightOfferSegment[];
  /** Provider-stated marketing flight number for the itinerary, or null. */
  flightNumber: string | null;
  /**
   * Provider/affiliate deep link, verbatim from the provider mapping (already
   * carries the affiliate marker where applicable). Never rewritten here.
   */
  deepLink: string;
  /**
   * Provider-supplied observation timestamp (when the provider states when it
   * last saw this fare), verbatim. NULL when the provider did not supply one.
   * Callers must never substitute "now" — absence means unknown.
   */
  observedAt: string | null;
}

export interface FlightSearchResult {
  offers: FlightOffer[];
  /** Length of `offers`; mirrored for wire meta convenience. */
  totalFound: number;
  /** Whether the provider result set was complete (cached endpoints: true). */
  isComplete: boolean;
  /**
   * How many cached results were excluded because their provider-stated
   * calendar date(s) differed from the requested date(s). Diagnostics/
   * logging only — not part of the frozen wire meta.
   */
  excludedNearestDateCount: number;
}

/* ------------------------------------------------------------------ */
/* Price calendar                                                      */
/* ------------------------------------------------------------------ */

export interface PriceCalendarQuery {
  /** BF1-C provider code (airport IATA or metro/city code). */
  origin: string;
  /** BF1-C provider code (airport IATA or metro/city code). */
  destination: string;
  /** Month to fetch, YYYY-MM. */
  month: string;
  currency: string;
}

export interface PriceCalendarEntry {
  /** Calendar date of the observed outbound fare, YYYY-MM-DD, or null. */
  date: string | null;
  /** Observed fare as provider money (BF1-F): verbatim amount, validated currency. */
  price: ProviderMoney;
  /** Provider-stated return date for bundled round-trip observations, or null. */
  returnDate: string | null;
  /**
   * Provider "gate" label passed through verbatim. NOTE: historically this is
   * the agent/gate label on the calendar endpoint, NOT a two-letter carrier
   * code — the wire field it serializes back into is named accordingly.
   */
  gateLabel: string | null;
  /** Stated stop count (0 when unstated). */
  stops: number;
  /** Stated trip duration in days, or null when unstated. */
  tripDuration: number | null;
}

export interface PriceCalendar {
  origin: string;
  destination: string;
  month: string;
  currency: string;
  entries: PriceCalendarEntry[];
}

/* ------------------------------------------------------------------ */
/* Route suggestions                                                   */
/* ------------------------------------------------------------------ */

export interface RouteSuggestionsQuery {
  /** BF1-C provider code of the origin (airport IATA or metro/city code). */
  origin: string;
  currency: string;
  /** Maximum suggestions to return. */
  limit: number;
}

export interface RouteSuggestion {
  origin: string;
  /** Display name for the origin (static lookup; never invented for unknown codes). */
  originName: string;
  destination: string;
  /** Display name for the destination (static lookup; code echoed when unmapped). */
  destinationName: string;
  /** Observed fare as provider money (BF1-F), or null when unstated upstream. */
  price: ProviderMoney | null;
  /** Carrier/gate code stated by the provider, or null. */
  airlineCode: string | null;
  /** Provider-stated outbound departure timestamp, verbatim, or null. */
  departureAt: string | null;
  /** Provider-stated return timestamp, verbatim, or null. */
  returnAt: string | null;
  /** Stated stop count (0 when unstated). */
  stops: number;
  /** Provider-stated flight number, or null. */
  flightNumber: string | null;
  /** Provider-supplied expiry timestamp for the suggestion, verbatim, or null. */
  expiresAt: string | null;
}

/**
 * CONTRACT-PARITY CLOSEOUT: result wrapper restoring the pre-BF1-E
 * get-popular-directions wire currency semantics (`data.currency || currency`)
 * at the adapter/wire boundary. The upstream-declared currency takes
 * precedence over an echo of the requested currency; only its absence (or any
 * falsy value) falls back to the request's currency.
 */
export interface RouteSuggestionsResult {
  routes: RouteSuggestion[];
  /** Legacy wire currency: upstream-declared value when stated, else requested. */
  currency: string;
}

/* ------------------------------------------------------------------ */
/* Special offers                                                      */
/* ------------------------------------------------------------------ */

export interface SpecialOffersQuery {
  /** BF1-C provider code of the origin (airport IATA or metro/city code). */
  origin: string;
  currency: string;
  /** Maximum offers to return (adapters may clamp further). */
  limit: number;
}

export interface SpecialOffer {
  /** Deterministic identifier built by the adapter (stable across refactor). */
  id: string;
  origin: string;
  destination: string;
  /** Observed fare as provider money (BF1-F): verbatim amount + validated currency. */
  price: ProviderMoney;
  /** Carrier/gate code stated by the provider, or null when unstated. */
  carrierCode: string | null;
  /** Provider-stated departure date/timestamp, verbatim, or null. */
  departureDate: string | null;
  /** Provider-stated return date, verbatim, or null. */
  returnDate: string | null;
  /** Stated stop count (0 when unstated). */
  stops: number;
  /**
   * Provider-supplied observation timestamp, verbatim. NULL when the provider
   * did not supply one. NEVER generated from the current time — fabricating a
   * timestamp here was a real correctness bug removed in BF1-E.
   */
  observedAt: string | null;
  /** Provider-stated flight number, or null. */
  flightNumber: string | null;
  /** Provider-stated duration in minutes (0 when unstated). */
  durationMinutes: number;
  /** Affiliate deep link (marker included) built by the adapter. */
  deepLink: string;
}

/**
 * CONTRACT-PARITY CLOSEOUT: result wrapper restoring the pre-BF1-E
 * get-special-offers wire discriminator for the empty-source response.
 *
 * Pre-BF1-E, the Edge Function chose `source: "empty"` when the UPSTREAM
 * ENVELOPE itself reported no offer set (`!data.success || !data.data`), and
 * `source: "travelpayouts_latest"` whenever the envelope was populated — even
 * if validation/filtering/slicing reduced it to zero offers. That distinction
 * is a property of the upstream envelope, not of the resulting array length,
 * so the adapter must carry it across the boundary verbatim.
 */
export interface SpecialOffersResult {
  offers: SpecialOffer[];
  /**
   * True when the upstream response reported no offer set (success flag false
   * or absent data) — the legacy wire used source:"empty" for this case.
   */
  upstreamEmpty: boolean;
}

/* ------------------------------------------------------------------ */
/* Provider interface                                                  */
/* ------------------------------------------------------------------ */

/**
 * The BookingsFinder flight provider contract.
 *
 * Scope discipline (BF1-E): these four operations match the capabilities the
 * active provider genuinely supports today. No booking/repricing/live-quote
 * methods exist because no upstream supports them yet. Future packages may add
 * operations only when a real provider capability arrives.
 *
 * Implementations must:
 *  - validate upstream responses and FAIL CLOSED (drop malformed rows; never
 *    emit partially fabricated offers),
 *  - preserve cached-data semantics (no live-inventory claims),
 *  - identify themselves with their BF1-D registry id,
 *  - perform mapping ONCE at this boundary (no per-card transformation).
 */
export interface FlightProvider {
  readonly providerId: FlightProviderId;

  /**
   * Search cached fares for exact requested date(s). Providers that may
   * return nearest-available-date substitutes MUST exclude non-matching
   * results here so callers only ever receive true date matches.
   */
  search(query: FlightSearchQuery): Promise<FlightSearchResult>;

  getPriceCalendar(query: PriceCalendarQuery): Promise<PriceCalendar>;

  getRouteSuggestions(query: RouteSuggestionsQuery): Promise<RouteSuggestionsResult>;

  getSpecialOffers(query: SpecialOffersQuery): Promise<SpecialOffersResult>;
}
