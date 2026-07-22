import type { TripCostPlannerState } from "./types";
import { buildInternalFlightUrl } from "@/lib/travelConfig";
import type { ValidatedFlightParams } from "@/lib/travelConfig";

/**
 * Handoff mode for the planner-to-flights bridge.
 *
 * "internal" — navigate to the BookingsFinder flight search page
 *             with safely mappable context
 * "disabled" — not enough trip context to continue
 *
 * Direct partner handoff is NOT supported because the planner
 * stores free-text city/country names, not IATA airport codes.
 */
export type FlightHandoffMode = "internal" | "disabled";

export interface FlightHandoffResult {
  mode: FlightHandoffMode;
  /** URL for internal navigation, or null when disabled. */
  url: string | null;
  /** Human-readable reason when disabled. */
  reason?: string;
}

/**
 * Map planner state to a flight handoff result.
 *
 * Never builds a direct partner URL (no IATA codes available).
 * Always uses the internal flight search continuation pattern.
 */
export function mapPlannerToFlightHandoff(state: TripCostPlannerState): FlightHandoffResult {
  const td = state.tripDetails;
  const travellers = state.travellers;
  const totalTravellers = travellers.adults + travellers.children + travellers.infants;

  // Need at minimum: valid departure date
  if (!td.departureDate) {
    return {
      mode: "disabled",
      url: null,
      reason: "Add a departure date to search flights.",
    };
  }

  // Build internal flight URL with available context
  const params: Partial<ValidatedFlightParams> = {
    departureDate: td.departureDate,
    adults: totalTravellers > 0 ? totalTravellers : 1,
  };

  if (td.returnDate) {
    params.returnDate = td.returnDate;
  }

  // Validate dates are not reversed before building
  if (td.returnDate && td.departureDate > td.returnDate) {
    return {
      mode: "disabled",
      url: null,
      reason: "Your return date is before the departure date. Fix trip dates to continue.",
    };
  }

  const url = buildInternalFlightUrl(params);

  return {
    mode: "internal",
    url,
  };
}
