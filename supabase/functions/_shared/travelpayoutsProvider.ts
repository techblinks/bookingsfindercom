/**
 * TravelpayoutsProvider — the concrete FlightProvider adapter (BF1-E).
 *
 * This module is the ONLY place outside _shared/travelpayouts.ts where raw
 * Travelpayouts response structures are known about. It:
 *   1. calls the existing upstream endpoints (search prices_for_dates via the
 *      shared transport; month-matrix / city-directions / prices/latest via
 *      endpoint code moved here VERBATIM from their Edge Functions),
 *   2. validates upstream payloads with Zod and FAILS CLOSED — malformed rows
 *      are dropped with a warning, never partially fabricated into offers,
 *   3. maps validated data into the normalized BookingsFinder domain types
 *      (_shared/flightProvider.ts) exactly once, at this boundary,
 *   4. preserves affiliate marker/deep-link behaviour and cached-data
 *      semantics byte-for-byte (locked by golden contract tests),
 *   5. identifies itself with the BF1-D supplier registry id "travelpayouts".
 *
 * SANCTIONED BF1-E CORRECTNESS FIX (the only behaviour change in this package):
 * special offers previously fabricated a `found_at` timestamp with
 * `new Date().toISOString()` when upstream omitted one. The normalized
 * SpecialOffer.observedAt is now the provider-supplied value or null — NEVER
 * generated from the current time.
 *
 * Credentials come exclusively from Deno environment variables via the shared
 * getConfig(); no secrets appear anywhere else.
 */

import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import {
  deduplicateFlights,
  getFlightPrices,
  getLowestPrice,
  getConfig,
  TravelpayoutsError,
  type FlightResult,
  type TravelpayoutsConfig,
} from "./travelpayouts.ts";
import { isExactDateMatch } from "./flightDateMatch.ts";
import {
  FLIGHT_PROVIDER_ID,
  type FlightOffer,
  type FlightProvider,
  type FlightProviderId,
  type FlightSearchQuery,
  type FlightSearchResult,
  type PriceCalendar,
  type PriceCalendarEntry,
  type PriceCalendarQuery,
  type RouteSuggestion,
  type RouteSuggestionsQuery,
  type RouteSuggestionsResult,
  type SpecialOffer,
  type SpecialOffersQuery,
  type SpecialOffersResult,
} from "./flightProvider.ts";

const TRAVELPAYOUTS_API = "https://api.travelpayouts.com";

/* ------------------------------------------------------------------ */
/* Fail-closed validation of upstream payloads                         */
/* ------------------------------------------------------------------ */

/**
 * Schema for rows as mapped by the shared transport. Transport defaults keep
 * pre-BF1-E shapes (e.g. airline falls back to "Unknown" at the wire layer),
 * but genuinely unusable fare rows — no finite price, no stated departure, no
 * usable link — are rejected HERE so they can never become offers.
 */
const MappedFlightRowSchema = z.object({
  id: z.string(),
  airline: z.string(),
  airline_code: z.string().optional(),
  price: z.number().finite(),
  currency: z.string(),
  duration_minutes: z.number(),
  stops: z.number(),
  segments: z.array(
    z.object({
      from: z.string(),
      to: z.string(),
      depart_time: z.string(),
      arrive_time: z.string().nullable(),
      airline: z.string().optional(),
      flight_number: z.string().optional(),
    })
  ),
  link: z.string().min(1),
  flight_number: z.string().optional(),
  provider_departure_at: z.string().min(1),
  provider_return_at: z.string().nullable(),
  found_at: z.string().nullable().optional(),
});

/** /v2/prices/month-matrix row (price calendar). */
const MonthMatrixItemSchema = z
  .object({
    depart_date: z.string(),
    value: z.number().finite(),
    return_date: z.string().nullable().optional(),
    gate: z.string().nullable().optional(),
    number_of_changes: z.number().int().nullable().optional(),
    trip_duration: z.number().nullable().optional(),
  })
  .passthrough();

/** /v1/city-directions entry (popular routes). Typed-permissive: absent
 *  optional quantities stay honestly null, but type-violating values drop the
 *  row rather than leaking strings/nulls into numeric fields. */
const CityDirectionEntrySchema = z
  .object({
    origin: z.string().optional(),
    destination: z.string().optional(),
    price: z.number().finite().nullable().optional(),
    airline: z.string().optional(),
    departure_at: z.string().optional(),
    return_at: z.string().optional(),
    transfers: z.number().int().optional(),
    flight_number: z.string().optional(),
    expires_at: z.string().optional(),
  })
  .passthrough();

/** /v2/prices/latest deal (special offers). */
const LatestDealSchema = z
  .object({
    destination: z.string().optional(),
    depart_date: z.string().optional(),
    departure_at: z.string().optional(),
    value: z.number().finite().optional(),
    price: z.number().finite().optional(),
    airline: z.string().optional(),
    gate: z.string().optional(),
    return_date: z.string().optional(),
    return_at: z.string().optional(),
    number_of_changes: z.number().int().optional(),
    transfers: z.number().int().optional(),
    found_at: z.string().optional(),
    flight_number: z.string().optional(),
    duration: z.number().finite().optional(),
  })
  .passthrough();

function warnDropped(context: string, index: number, reason: string): void {
  console.warn(
    `[travelpayoutsProvider] Dropped malformed ${context} entry #${index}: ${reason}`
  );
}

/* ------------------------------------------------------------------ */
/* Display-name lookup (moved verbatim from get-popular-directions)     */
/* ------------------------------------------------------------------ */

// City name lookup - common IATA codes
const cityNames: Record<string, string> = {
  SYD: "Sydney", MEL: "Melbourne", BNE: "Brisbane", PER: "Perth", ADL: "Adelaide",
  LHR: "London", LON: "London", MAN: "Manchester", EDI: "Edinburgh", LGW: "London Gatwick", STN: "London Stansted",
  JFK: "New York", NYC: "New York", LAX: "Los Angeles", SFO: "San Francisco", ORD: "Chicago", MIA: "Miami", ATL: "Atlanta", BOS: "Boston", SEA: "Seattle", DEN: "Denver", DFW: "Dallas",
  DEL: "Delhi", BOM: "Mumbai", BLR: "Bangalore", MAA: "Chennai", CCU: "Kolkata", HYD: "Hyderabad", GOI: "Goa",
  SIN: "Singapore", BKK: "Bangkok", HKG: "Hong Kong", NRT: "Tokyo", TYO: "Tokyo", KIX: "Osaka", ICN: "Seoul", SEL: "Seoul",
  DXB: "Dubai", AUH: "Abu Dhabi", DOH: "Doha", RUH: "Riyadh", BAH: "Bahrain",
  CDG: "Paris", PAR: "Paris", AMS: "Amsterdam", FRA: "Frankfurt", FCO: "Rome", ROM: "Rome", BCN: "Barcelona", MAD: "Madrid", LIS: "Lisbon", VIE: "Vienna", PRG: "Prague", BUD: "Budapest", WAW: "Warsaw", ZRH: "Zurich", MUC: "Munich", BER: "Berlin", CPH: "Copenhagen", OSL: "Oslo", HEL: "Helsinki", ATH: "Athens",
  IST: "Istanbul", CAI: "Cairo", JNB: "Johannesburg", NBO: "Nairobi", CMN: "Casablanca",
  YYZ: "Toronto", YVR: "Vancouver", YUL: "Montreal", MEX: "Mexico City", GRU: "São Paulo", EZE: "Buenos Aires", BOG: "Bogota", SCL: "Santiago", LIM: "Lima",
  KUL: "Kuala Lumpur", CGK: "Jakarta", MNL: "Manila", TPE: "Taipei", PVG: "Shanghai", PEK: "Beijing", BJS: "Beijing",
  DPS: "Bali", HNL: "Honolulu", CUN: "Cancun", PMI: "Palma", AGP: "Malaga",
  MLE: "Maldives", CMB: "Colombo", KTM: "Kathmandu",
  AKL: "Auckland", MOW: "Moscow", LED: "St Petersburg", BEG: "Belgrade", TAS: "Tashkent", AYT: "Antalya", BSZ: "Bishkek",
  LOS: "Lagos", ACC: "Accra", DAR: "Dar es Salaam",
};

function getCityName(iata: string): string {
  return cityNames[iata?.toUpperCase()] || iata;
}

/* ------------------------------------------------------------------ */
/* Raw -> domain mappers                                               */
/* ------------------------------------------------------------------ */

function mapFlightRowToOffer(row: FlightResult, query: FlightSearchQuery): FlightOffer {
  const segment = row.segments[0];
  return {
    id: row.id,
    providerId: FLIGHT_PROVIDER_ID,
    origin: segment?.from || query.origin.toUpperCase(),
    destination: segment?.to || query.destination.toUpperCase(),
    departureAt: row.provider_departure_at,
    returnAt: row.provider_return_at,
    priceMajor: row.price,
    currency: row.currency,
    carrierCode: row.airline_code ?? null,
    stops: row.stops,
    durationMinutes: row.duration_minutes,
    segments: row.segments.map((seg) => ({
      from: seg.from,
      to: seg.to,
      departAt: seg.depart_time ?? null,
      arriveAt: seg.arrive_time ?? null,
      carrierCode: seg.airline ?? null,
      flightNumber: seg.flight_number ?? null,
    })),
    flightNumber: row.flight_number ?? null,
    deepLink: row.link,
    observedAt: row.found_at ?? null,
  };
}

/* ------------------------------------------------------------------ */
/* The adapter                                                         */
/* ------------------------------------------------------------------ */

class TravelpayoutsProvider implements FlightProvider {
  readonly providerId: FlightProviderId = FLIGHT_PROVIDER_ID;

  private config(): TravelpayoutsConfig {
    return getConfig();
  }

  /**
   * Cached-fare search over prices_for_dates.
   *
   * Composition (deduplicate -> fail-closed row validation -> exact-date
   * filtering) is moved here VERBATIM from search-flights/index.ts: the
   * nearest-date-substitute exclusion is a property of THIS provider's cache
   * (documented in _shared/flightDateMatch.ts), so it belongs behind the
   * adapter boundary. Callers only ever receive true requested-date matches.
   */
  async search(query: FlightSearchQuery): Promise<FlightSearchResult> {
    let flights: FlightResult[];
    let isComplete: boolean;
    try {
      const result = await getFlightPrices(
        {
          origin: query.origin,
          destination: query.destination,
          departureDate: query.departureDate,
          returnDate: query.returnDate ?? null,
          adults: query.adults,
          currency: query.currency,
        },
        this.config()
      );
      flights = result.flights;
      isComplete = result.isComplete;
    } catch (error) {
      if (error instanceof TravelpayoutsError) throw error;
      // Non-HTTP failure while reading the payload (e.g. shape crash):
      // surface as a typed provider error instead of an untyped TypeError.
      throw new TravelpayoutsError("Malformed flight prices payload", 502);
    }

    const uniqueFlights = deduplicateFlights(flights);

    const validRows: FlightResult[] = [];
    uniqueFlights.forEach((row, index) => {
      const parsed = MappedFlightRowSchema.safeParse(row);
      if (parsed.success) {
        validRows.push(row);
      } else {
        warnDropped(
          "flight result",
          index,
          parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
        );
      }
    });

    const exactMatches = validRows.filter((flight) =>
      isExactDateMatch({
        requestedDepartureDate: query.departureDate,
        requestedReturnDate: query.returnDate ?? null,
        providerDepartureAt: flight.provider_departure_at,
        providerReturnAt: flight.provider_return_at,
      })
    );

    return {
      offers: exactMatches.map((row) => mapFlightRowToOffer(row, query)),
      totalFound: exactMatches.length,
      isComplete,
      excludedNearestDateCount: validRows.length - exactMatches.length,
    };
  }

  async getPriceCalendar(query: PriceCalendarQuery): Promise<PriceCalendar> {
    const config = this.config();

    // Request built VERBATIM from get-price-calendar/index.ts.
    const params = new URLSearchParams({
      origin: query.origin.toUpperCase(),
      destination: query.destination.toUpperCase(),
      month: query.month,
      currency: query.currency,
      token: config.token,
      show_to_affiliates: "true",
    });

    const url = `${TRAVELPAYOUTS_API}/v2/prices/month-matrix?${params.toString()}`;
    console.log(`Fetching price calendar: ${query.origin} -> ${query.destination} for ${query.month}`);

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      // CONTRACT-PARITY CLOSEOUT (Fix 3): `data.error` is accessed WITHOUT
      // optional chaining, verbatim from get-price-calendar/index.ts. When an
      // upstream error body parses to JSON null, this property access throws
      // a TypeError which propagates untyped and lands on the Edge Function's
      // generic 500 catch — exactly the pre-BF1-E HTTP behaviour. (Optional
      // chaining here would wrongly expose the provider status code for
      // null-body errors; object-bodied errors already expose it in BOTH
      // implementations via the TravelpayoutsError statusCode passthrough.)
      throw new TravelpayoutsError(
        data.error || "Failed to fetch price calendar",
        response.status
      );
    }

    if (!Array.isArray(data.data)) {
      throw new TravelpayoutsError("Malformed price calendar payload", 502);
    }

    const entries: PriceCalendarEntry[] = [];
    (data.data as unknown[]).forEach((item, index) => {
      const parsed = MonthMatrixItemSchema.safeParse(item);
      if (!parsed.success) {
        warnDropped(
          "price calendar",
          index,
          parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
        );
        return;
      }
      const row = parsed.data;
      // Mapping VERBATIM from get-price-calendar/index.ts (gate label kept
      // distinct in the domain — historically an agent/gate label, not a
      // carrier code).
      entries.push({
        date: row.depart_date,
        priceMajor: row.value,
        returnDate: row.return_date || null,
        gateLabel: row.gate || null,
        stops: row.number_of_changes ?? 0,
        tripDuration: row.trip_duration ?? null,
      });
    });

    return {
      origin: query.origin,
      destination: query.destination,
      month: query.month,
      currency: query.currency,
      entries,
    };
  }

  async getRouteSuggestions(query: RouteSuggestionsQuery): Promise<RouteSuggestionsResult> {
    const config = this.config();

    // Request built VERBATIM from get-popular-directions/index.ts.
    const params = new URLSearchParams({
      origin: query.origin.toUpperCase(),
      currency: query.currency,
      token: config.token,
    });

    const url = `${TRAVELPAYOUTS_API}/v1/city-directions?${params.toString()}`;
    console.log(`Fetching popular directions from: ${query.origin}`);

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      throw new TravelpayoutsError("Failed to fetch popular directions", response.status);
    }

    if (data.data === null || data.data === undefined || typeof data.data !== "object") {
      throw new TravelpayoutsError("Malformed popular directions payload", 502);
    }

    const directionsData = data.data as Record<string, unknown>;

    // CONTRACT-PARITY CLOSEOUT (Fix 2): restore the pre-BF1-E wire currency
    // semantics `data.currency || currency` verbatim — the upstream-declared
    // currency takes precedence; any falsy upstream value falls back to the
    // requested currency. Captured here at the adapter/wire boundary so the
    // HTTP shell cannot accidentally echo the request currency instead.
    const wireCurrency: string = data.currency || query.currency;

    // Slice BEFORE validating/mapping, exactly as the original function did.
    const routes: RouteSuggestion[] = [];
    Object.entries(directionsData)
      .slice(0, query.limit)
      .forEach(([destCode, rawInfo], index) => {
        const parsed = CityDirectionEntrySchema.safeParse(rawInfo);
        if (!parsed.success) {
          warnDropped(
            "route suggestion",
            index,
            parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
          );
          return;
        }
        const info = parsed.data;
        // Mapping VERBATIM from get-popular-directions/index.ts.
        routes.push({
          origin: info.origin || query.origin.toUpperCase(),
          originName: getCityName(info.origin || query.origin),
          destination: info.destination || destCode,
          destinationName: getCityName(info.destination || destCode),
          priceMajor: info.price || null,
          airlineCode: info.airline || null,
          departureAt: info.departure_at || null,
          returnAt: info.return_at || null,
          stops: info.transfers ?? 0,
          flightNumber: info.flight_number || null,
          expiresAt: info.expires_at || null,
        });
      });

    return { routes, currency: wireCurrency };
  }

  async getSpecialOffers(query: SpecialOffersQuery): Promise<SpecialOffersResult> {
    const config = this.config();

    // Request built VERBATIM from get-special-offers/index.ts.
    const searchParams = new URLSearchParams({
      origin: query.origin.toUpperCase(),
      currency: query.currency,
      sorting: "price",
      limit: String(Math.min(query.limit, 20)),
      period_type: "year",
      show_to_affiliates: "true",
      token: config.token,
    });

    const url = `${TRAVELPAYOUTS_API}/v2/prices/latest?${searchParams}`;
    console.log(`Fetching special offers from: ${query.origin}`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new TravelpayoutsError("Failed to fetch offers", response.status);
    }

    const data = await response.json();

    if (!data.success || !data.data) {
      // CONTRACT-PARITY CLOSEOUT (Fix 1): the upstream ENVELOPE reported no
      // offer set. Pre-BF1-E, this exact branch produced the wire response
      // { offers: [], source: "empty" }; a populated envelope that merely
      // filters/slices down to zero offers kept source:"travelpayouts_latest".
      // The distinction is envelope-shaped, so it must cross the adapter
      // boundary as a flag — it cannot be inferred from array length.
      return { offers: [], upstreamEmpty: true };
    }

    const rawDeals: unknown[] = Array.isArray(data.data) ? data.data : Object.values(data.data);

    // Mapping VERBATIM from get-special-offers/index.ts's buildOffer, with the
    // single sanctioned BF1-E correction: observedAt is the PROVIDER-supplied
    // found_at or null — the previous `|| new Date().toISOString()` fabrication
    // is removed.
    const offers: SpecialOffer[] = [];
    rawDeals.forEach((rawDeal) => {
      const parsed = LatestDealSchema.safeParse(rawDeal);
      if (!parsed.success) {
        warnDropped(
          "special offer",
          offers.length,
          parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
        );
        return;
      }
      const deal = parsed.data;
      const dest = deal.destination || "";
      const dep = deal.depart_date || deal.departure_at || "";
      const originUpper = query.origin.toUpperCase();
      offers.push({
        id: `${originUpper}-${dest}-${dep}`,
        origin: originUpper,
        destination: dest.toUpperCase(),
        priceMajor: deal.value || deal.price || 0,
        carrierCode: (deal.airline || deal.gate) || null,
        departureDate: dep || null,
        returnDate: deal.return_date || deal.return_at || null,
        stops: deal.number_of_changes ?? deal.transfers ?? 0,
        observedAt: deal.found_at ?? null,
        flightNumber: deal.flight_number || null,
        durationMinutes: deal.duration || 0,
        deepLink:
          dest && dep
            ? `https://www.aviasales.com/search/${originUpper}${dep.replace(/-/g, "").slice(2, 6)}${dest}1?marker=${config.marker}`
            : "",
      });
    });

    // Post-filters VERBATIM from get-special-offers/index.ts.
    const filtered = offers.filter(
      (o) => o.destination && o.destination.length >= 2 && o.priceMajor > 0
    );

    filtered.sort((a, b) => a.priceMajor - b.priceMajor);

    return { offers: filtered.slice(0, query.limit), upstreamEmpty: false };
  }

  /**
   * Lowest observed fare for an exact route/date pair. Supports the existing
   * route-price cache flow (get-route-prices); input/output were already
   * normalized there, so this delegates straight to the shared transport.
   * Kept as a concrete adapter method rather than interface member until the
   * capability set consolidates in BF1-F.
   */
  async getLowestPrice(params: {
    origin: string;
    destination: string;
    departureDate: string;
    returnDate?: string | null;
    currency?: string;
  }): Promise<number | null> {
    return getLowestPrice(params, this.config());
  }
}

/**
 * Factory used by Edge Functions. One instance per invocation keeps the
 * request path free of shared mutable state; mapping still happens exactly
 * once per fetched batch, at this boundary.
 */
export function createTravelpayoutsProvider(): FlightProvider & {
  getLowestPrice(params: {
    origin: string;
    destination: string;
    departureDate: string;
    returnDate?: string | null;
    currency?: string;
  }): Promise<number | null>;
} {
  return new TravelpayoutsProvider();
}
