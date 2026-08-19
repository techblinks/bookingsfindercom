/**
 * run-optimizer core — trust model for Optimizer output (BF-0R-2).
 *
 * This file deliberately contains NO Deno globals, NO database access and no
 * provider I/O so the vitest suite can import it directly (the repo's
 * edge-function test convention — same as tiqets-catalog/catalogue-core.ts and
 * sitemap/sitemap-core.ts).
 *
 * CORE RULE: NO PROVIDER DATA = NO INVENTED TRAVEL ANSWER.
 *
 * Every value this module emits is one of:
 *
 *   A. a genuine Travelpayouts observation (fare, stops, duration, airline
 *      code, deep link);
 *   B. a deterministic derivation from genuine observations, worded so the
 *      comparison is explicitly scoped to the options actually returned
 *      ("…below the average of the 8 options returned for this search");
 *   C. a value the traveller entered themselves.
 *
 * Anything that would require an assumption is NOT emitted. There is no
 * fallback fare, no synthetic airline, no invented duration or stop count, no
 * baggage/transfer/extra-fee figure, no BUY/WAIT prediction, no booking-window
 * claim and no scarcity language. When the provider returns nothing usable the
 * only possible outcome is the typed `insufficient_live_data` state.
 *
 * Note on cost breakdown: the Optimizer form collects `hasBags` as a BOOLEAN.
 * The traveller never enters a baggage budget or a ground-transfer estimate, so
 * there is no Source-Type-C basis for any such figure. Those line items are
 * therefore not produced at all — the only monetary value this module reports
 * is the provider-quoted fare.
 */

/** The single non-success outcome. Not an error — a truthful "no data" state. */
export const INSUFFICIENT_LIVE_DATA = "insufficient_live_data";

/**
 * Customer-facing copy for the no-data state. It must not imply that no
 * flights exist, that the route is unavailable, that a provider is permanently
 * down, that prices are high, or that the traveller should buy or wait.
 */
export const INSUFFICIENT_LIVE_DATA_MESSAGE =
  "We couldn't retrieve enough live flight data to calculate this trip right now. " +
  "No estimated fare or recommendation has been generated.";

/** Why no trustworthy answer could be produced. Diagnostic, not advice. */
export type InsufficientReason =
  | "provider_error"
  | "provider_unavailable"
  | "no_results"
  | "unusable_results";

export type TravelPriority = "cheapest" | "fastest" | "low_risk";

/** Which criterion the selection was ACTUALLY able to apply. */
export type SelectionCriterion = "price" | "duration" | "fewest_stops";

/**
 * A raw option as handed over by the shared Travelpayouts client. Fields are
 * optional here because the client coerces missing upstream values (a missing
 * `duration` becomes 0, a missing `airline` becomes "Unknown"), and this module
 * must never read a coerced placeholder as though it were an observation.
 */
export interface ProviderFlightObservation {
  price?: number;
  airline?: string;
  airline_code?: string;
  duration_minutes?: number;
  stops?: number;
  link?: string;
}

/** A provider option that carries a fare we can actually stand behind. */
export interface UsableFlight {
  price: number;
  airlineCode?: string;
  durationMinutes?: number;
  stops?: number;
  link?: string;
}

export interface PriceContext {
  optionsFound: number;
  averagePrice: number;
  lowestPrice: number;
  highestPrice: number;
}

export interface FactualNote {
  type: string;
  message: string;
}

export interface OptimizerSuccess {
  status: "ok";
  recommendedRoute: {
    summary: string;
    /** Omitted when the provider gave no usable airline code. */
    airline?: string;
    /** Omitted when the provider gave no usable stop count. */
    stops?: number;
    /** Omitted when the provider gave no usable duration. */
    duration?: number;
  };
  /** The provider-quoted fare. The ONLY monetary figure produced. */
  fare: number;
  /** Which criterion the selection could actually apply. */
  selectionCriterion: SelectionCriterion;
  priceContext: PriceContext;
  /** Scoped Type-B comparison, or null when a comparison is not supportable. */
  fareComparison: string | null;
  /** Purely factual observations. Never predictions or risk claims. */
  notes: FactualNote[];
  /** Present ONLY when the provider supplied a genuine deep link. */
  affiliateLinks: { provider: string; url: string }[];
}

export interface OptimizerInsufficient {
  status: typeof INSUFFICIENT_LIVE_DATA;
  reason: InsufficientReason;
  message: string;
}

export type OptimizerOutcome = OptimizerSuccess | OptimizerInsufficient;

/**
 * IATA code → display name. A lookup of a genuine provider code is a
 * deterministic derivation (Type B), not an invention. An unmapped code falls
 * through to the code itself, which is still the provider's own observation.
 */
const airlineNames: Record<string, string> = {
  QF: "Qantas",
  VA: "Virgin Australia",
  JQ: "Jetstar",
  EK: "Emirates",
  SQ: "Singapore Airlines",
  CX: "Cathay Pacific",
  BA: "British Airways",
  AA: "American Airlines",
  UA: "United Airlines",
  DL: "Delta Air Lines",
  LH: "Lufthansa",
  AF: "Air France",
  KL: "KLM",
  TK: "Turkish Airlines",
  QR: "Qatar Airways",
  EY: "Etihad Airways",
  NZ: "Air New Zealand",
  MH: "Malaysia Airlines",
  TG: "Thai Airways",
  CA: "Air China",
  MU: "China Eastern",
  CZ: "China Southern",
  NH: "ANA",
  JL: "Japan Airlines",
  OZ: "Asiana Airlines",
  KE: "Korean Air",
  SU: "Aeroflot",
  LX: "Swiss",
  OS: "Austrian",
  AY: "Finnair",
  SK: "SAS",
  IB: "Iberia",
  TP: "TAP Portugal",
  AZ: "ITA Airways",
  AC: "Air Canada",
  WN: "Southwest",
  B6: "JetBlue",
  AS: "Alaska Airlines",
  F9: "Frontier",
  NK: "Spirit",
  FR: "Ryanair",
  U2: "easyJet",
  W6: "Wizz Air",
};

/**
 * Resolve a display name for a genuine airline code. Returns undefined — never
 * a generic carrier-tier stand-in — when the code is absent or is the shared
 * client's "Unknown" placeholder.
 */
export function resolveAirlineName(code?: string): string | undefined {
  if (typeof code !== "string") return undefined;
  const trimmed = code.trim();
  if (trimmed.length === 0) return undefined;
  if (trimmed.toLowerCase() === "unknown") return undefined;
  return airlineNames[trimmed.toUpperCase()] ?? trimmed;
}

function isPositiveFinite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/**
 * Keep only options carrying a fare we can stand behind, and drop every
 * coerced placeholder so a missing value is never read as an observation:
 * a duration of 0 means "not provided", not "instant"; a negative or absent
 * stop count means "not provided", not "direct".
 */
export function toUsableFlights(
  flights: ProviderFlightObservation[] | null | undefined,
): UsableFlight[] {
  if (!Array.isArray(flights)) return [];

  return flights
    .filter((f) => f && isPositiveFinite(f.price))
    .map((f) => {
      const stops =
        typeof f.stops === "number" && Number.isInteger(f.stops) && f.stops >= 0
          ? f.stops
          : undefined;
      const durationMinutes = isPositiveFinite(f.duration_minutes)
        ? f.duration_minutes
        : undefined;
      const link =
        typeof f.link === "string" && f.link.trim().length > 0 ? f.link.trim() : undefined;

      return {
        price: f.price as number,
        airlineCode: f.airline_code,
        durationMinutes,
        stops,
        link,
      };
    });
}

/**
 * Choose an option, reporting which criterion could actually be applied.
 *
 * "fastest" needs durations and "low_risk" needs stop counts. When the provider
 * did not supply them we do NOT silently pretend the requested criterion was
 * honoured — we fall back to price and say so in the notes.
 */
export function selectBestFlight(
  flights: UsableFlight[],
  priority: TravelPriority,
): { flight: UsableFlight; criterion: SelectionCriterion } | null {
  if (flights.length === 0) return null;

  const cheapest = flights.reduce((best, f) => (f.price < best.price ? f : best));

  if (priority === "fastest") {
    const timed = flights.filter((f) => f.durationMinutes !== undefined);
    if (timed.length === 0) return { flight: cheapest, criterion: "price" };
    return {
      flight: timed.reduce((best, f) =>
        (f.durationMinutes as number) < (best.durationMinutes as number) ? f : best,
      ),
      criterion: "duration",
    };
  }

  if (priority === "low_risk") {
    const known = flights.filter((f) => f.stops !== undefined);
    if (known.length === 0) return { flight: cheapest, criterion: "price" };
    const fewest = Math.min(...known.map((f) => f.stops as number));
    const best = known.filter((f) => f.stops === fewest);
    return {
      flight: best.reduce((a, f) => (f.price < a.price ? f : a)),
      criterion: "fewest_stops",
    };
  }

  return { flight: cheapest, criterion: "price" };
}

/** Deterministic aggregate over genuine observations (Type B). */
export function buildPriceContext(flights: UsableFlight[]): PriceContext {
  const prices = flights.map((f) => f.price);
  const total = prices.reduce((a, b) => a + b, 0);
  return {
    optionsFound: flights.length,
    averagePrice: Math.round(total / prices.length),
    lowestPrice: Math.round(Math.min(...prices)),
    highestPrice: Math.round(Math.max(...prices)),
  };
}

/**
 * A Type-B comparison, scoped explicitly to the returned result set.
 *
 * This states where the fare sits among the options actually returned. It is
 * NOT a market claim, a forecast, or advice: it never says a price is a "good
 * deal", never says prices will rise or fall, and never recommends buying or
 * waiting. A comparison needs at least two options to mean anything.
 */
export function describeFarePosition(
  selected: UsableFlight,
  flights: UsableFlight[],
): string | null {
  if (flights.length < 2) return null;

  const average =
    flights.reduce((sum, f) => sum + f.price, 0) / flights.length;
  if (!isPositiveFinite(average)) return null;

  const options = `${flights.length} options returned for this search`;
  const delta = Math.round(Math.abs(1 - selected.price / average) * 100);

  if (delta < 1) {
    return `This fare is about the same as the average of the ${options}.`;
  }
  const direction = selected.price < average ? "below" : "above";
  return `This fare is ${delta}% ${direction} the average of the ${options}.`;
}

/**
 * Factual observations only.
 *
 * Every note restates something observed. None of them assert delay risk,
 * baggage risk, seat scarcity, price volatility or booking timing — those were
 * unsupported predictive claims and are not produced.
 */
export function buildFactualNotes(
  selected: UsableFlight,
  flights: UsableFlight[],
  criterion: SelectionCriterion,
  priority: TravelPriority,
): FactualNote[] {
  const notes: FactualNote[] = [];

  if (selected.stops !== undefined) {
    notes.push({
      type: "stops",
      message:
        selected.stops === 0
          ? "The returned itinerary is direct."
          : `The returned itinerary contains ${selected.stops} stop(s).`,
    });
  } else {
    notes.push({
      type: "stops_unknown",
      message: "The provider did not report a stop count for this itinerary.",
    });
  }

  if (selected.durationMinutes === undefined) {
    notes.push({
      type: "duration_unknown",
      message: "The provider did not report a journey duration for this itinerary.",
    });
  }

  if (priority === "fastest" && criterion !== "duration") {
    notes.push({
      type: "priority_not_applied",
      message:
        "No journey durations were returned, so the fastest option could not be identified. " +
        "The lowest fare is shown instead.",
    });
  }

  if (priority === "low_risk" && criterion !== "fewest_stops") {
    notes.push({
      type: "priority_not_applied",
      message:
        "No stop counts were returned, so the lowest-connection option could not be identified. " +
        "The lowest fare is shown instead.",
    });
  }

  if (flights.length > 1) {
    const context = buildPriceContext(flights);
    notes.push({
      type: "price_range",
      message:
        `Fares among the ${context.optionsFound} options returned ranged from ` +
        `${context.lowestPrice} to ${context.highestPrice}.`,
    });
  }

  return notes;
}

export function insufficientLiveData(reason: InsufficientReason): OptimizerInsufficient {
  return {
    status: INSUFFICIENT_LIVE_DATA,
    reason,
    message: INSUFFICIENT_LIVE_DATA_MESSAGE,
  };
}

export interface BuildOutcomeInput {
  origin: string;
  destination: string;
  priority: TravelPriority;
  /** Raw provider options. Null/undefined means the call did not succeed. */
  flights?: ProviderFlightObservation[] | null;
  /** Set when the provider threw, timed out or was unreachable. */
  providerFailure?: InsufficientReason | null;
  /** Affiliate marker, appended only to a genuine provider deep link. */
  marker?: string;
}

/**
 * The single entry point. Fails closed: any path that cannot be backed by a
 * genuine provider observation returns `insufficient_live_data`.
 */
export function buildOptimizerOutcome(input: BuildOutcomeInput): OptimizerOutcome {
  const { origin, destination, priority, providerFailure, marker } = input;

  if (providerFailure) return insufficientLiveData(providerFailure);
  if (!Array.isArray(input.flights)) return insufficientLiveData("provider_unavailable");
  if (input.flights.length === 0) return insufficientLiveData("no_results");

  const usable = toUsableFlights(input.flights);
  if (usable.length === 0) return insufficientLiveData("unusable_results");

  const selection = selectBestFlight(usable, priority);
  if (!selection) return insufficientLiveData("unusable_results");

  const { flight, criterion } = selection;
  const airline = resolveAirlineName(flight.airlineCode);

  const summary =
    flight.stops === undefined
      ? `${origin} to ${destination}`
      : flight.stops === 0
        ? `${origin} to ${destination} (direct)`
        : `${origin} to ${destination} via ${flight.stops} connection(s)`;

  // An affiliate link is emitted ONLY from a genuine provider deep link. No
  // search URL is synthesised to stand in for a result we do not have.
  const affiliateLinks = flight.link
    ? [
        {
          provider: "Aviasales",
          url: `https://www.aviasales.com${flight.link}${marker ? `&marker=${marker}` : ""}`,
        },
      ]
    : [];

  return {
    status: "ok",
    recommendedRoute: {
      summary,
      ...(airline ? { airline } : {}),
      ...(flight.stops !== undefined ? { stops: flight.stops } : {}),
      ...(flight.durationMinutes !== undefined ? { duration: flight.durationMinutes } : {}),
    },
    fare: Math.round(flight.price),
    selectionCriterion: criterion,
    priceContext: buildPriceContext(usable),
    fareComparison: describeFarePosition(flight, usable),
    notes: buildFactualNotes(flight, usable, criterion, priority),
    affiliateLinks,
  };
}
