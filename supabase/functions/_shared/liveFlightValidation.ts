/**
 * BF-FLIGHTS-LIVE-4 Phase E — fail-closed input validation for
 * search-live-flights and get-live-flight-booking-options.
 *
 * Uses the same z / validateRequest convention as every other edge
 * function (see _shared/validation.ts, search-flights/index.ts).
 * .strict() on every object schema rejects any unrecognized key outright
 * — the caller cannot smuggle an arbitrary extra SerpApi parameter through
 * a field this schema doesn't know about; only fields explicitly mapped in
 * serpapiFlights.ts ever reach the upstream request.
 */

import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const IATA_RE = /^[A-Z]{3}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * BookingsFinder-supported currencies (Phase E/P). Mirrors
 * src/lib/currency.ts's CURRENCY_OPTIONS exactly — keep both in sync by
 * hand (Deno edge functions in this repo don't import from src/, see
 * liveFlightTypes.ts). This is the FULL BookingsFinder-supported set, not
 * the narrower WHITE_LABEL_SUPPORTED_CURRENCIES subset — SerpApi/Google
 * Flights is a different provider with its own (wider) currency support.
 */
export const LIVE_FLIGHT_SUPPORTED_CURRENCIES = [
  "USD", "AUD", "GBP", "EUR", "CAD", "NZD", "INR", "SGD", "JPY", "AED",
] as const;

function isPastDate(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(`${dateStr}T00:00:00`);
  return date.getTime() < today.getTime();
}

const BaseLiveFlightRequestSchema = z.object({
  origin: z.string().regex(IATA_RE, "Origin must be an uppercase 3-letter IATA code"),
  destination: z.string().regex(IATA_RE, "Destination must be an uppercase 3-letter IATA code"),
  departureDate: z.string().regex(DATE_RE, "Invalid departure date format (YYYY-MM-DD)"),
  returnDate: z.string().regex(DATE_RE, "Invalid return date format (YYYY-MM-DD)").optional(),
  tripType: z.enum(["one_way", "round_trip"]),
  adults: z.number().int().min(1).max(9),
  children: z.number().int().min(0).max(8).default(0),
  infants: z.number().int().min(0).max(9).default(0),
  cabinClass: z.enum(["economy", "premium_economy", "business", "first"]),
  currency: z.enum(LIVE_FLIGHT_SUPPORTED_CURRENCIES),
});

/**
 * Cross-field checks shared by both request schemas below. Typed to the
 * common subset of fields it needs — both extended schemas' actual output
 * (which additionally carries departureToken or bookingToken) structurally
 * satisfies this, so the same checker works for either via .superRefine().
 */
function checkSharedRules(
  v: {
    origin: string;
    destination: string;
    departureDate: string;
    returnDate?: string;
    tripType: "one_way" | "round_trip";
    adults: number;
    infants: number;
  },
  ctx: z.RefinementCtx,
) {
  if (v.origin === v.destination) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Origin and destination must be different", path: ["destination"] });
  }
  if (isPastDate(v.departureDate)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Departure date cannot be in the past", path: ["departureDate"] });
  }
  if (v.tripType === "round_trip" && !v.returnDate) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Return date is required for a round-trip search", path: ["returnDate"] });
  }
  if (v.returnDate && v.returnDate < v.departureDate) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Return date cannot be before the departure date", path: ["returnDate"] });
  }
  if (v.returnDate && isPastDate(v.returnDate)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Return date cannot be in the past", path: ["returnDate"] });
  }
  if (v.infants > v.adults) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Each infant must be accompanied by an adult", path: ["infants"] });
  }
}

/**
 * Step 1 (initial search) and step 2 (return-leg search after outbound
 * selection, Phase H) share this schema — step 2 additionally supplies
 * departureToken. Both are POSTed to search-live-flights.
 */
export const LiveFlightSearchRequestSchema = BaseLiveFlightRequestSchema.extend({
  departureToken: z.string().min(1).optional(),
})
  .strict()
  .superRefine(checkSharedRules);

/**
 * get-live-flight-booking-options (Phase J): SerpApi's booking_token
 * lookup must be accompanied by the original search context, not just the
 * token, so this replays the same fields plus the required token.
 */
export const LiveFlightBookingOptionsRequestSchema = BaseLiveFlightRequestSchema.extend({
  bookingToken: z.string().min(1, "bookingToken is required"),
})
  .strict()
  .superRefine(checkSharedRules);
