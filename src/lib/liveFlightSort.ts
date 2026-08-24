/**
 * BF-FLIGHTS-LIVE-4 Round 2 Phase 6/8 — native Live Flights sort.
 *
 * Entirely separate from the cached Travelpayouts sort/filter system
 * (useFlightSearch.ts's sortBy) — operates only on LiveFlightItinerary[]
 * and never mutates the input array or the cached results.
 */
import type { LiveFlightItinerary } from "@/types/liveFlights";

export type LiveFlightSortOption = "best" | "cheapest" | "fastest";

export const LIVE_FLIGHT_SORT_OPTIONS: { value: LiveFlightSortOption; label: string }[] = [
  { value: "best", label: "Best" },
  { value: "cheapest", label: "Cheapest" },
  { value: "fastest", label: "Fastest" },
];

/** best_flights (category "best") ranks before other_flights ("other") — the provider's own ranking, never a proprietary score. */
function categoryRank(itinerary: LiveFlightItinerary): number {
  return itinerary.category === "best" ? 0 : 1;
}

/**
 * Stable sort — ties keep their original provider order. Returns a new
 * array; never mutates `itineraries` or reorders anything in place, so
 * the same list can be safely reused (e.g. re-sorted) without side
 * effects on cached-fare state elsewhere on the page.
 */
export function sortLiveItineraries(itineraries: LiveFlightItinerary[], sortBy: LiveFlightSortOption): LiveFlightItinerary[] {
  const indexed = itineraries.map((itinerary, index) => ({ itinerary, index }));

  indexed.sort((a, b) => {
    switch (sortBy) {
      case "cheapest": {
        const diff = compareNullableAscending(a.itinerary.price, b.itinerary.price);
        return diff !== 0 ? diff : a.index - b.index;
      }
      case "fastest": {
        const diff = compareNullableAscending(a.itinerary.totalDurationMinutes, b.itinerary.totalDurationMinutes);
        return diff !== 0 ? diff : a.index - b.index;
      }
      case "best":
      default: {
        const diff = categoryRank(a.itinerary) - categoryRank(b.itinerary);
        return diff !== 0 ? diff : a.index - b.index;
      }
    }
  });

  return indexed.map((entry) => entry.itinerary);
}

/** Ascending numeric compare; null/non-numeric values always sort after every valid value. */
function compareNullableAscending(a: number | null, b: number | null): number {
  const aValid = typeof a === "number" && Number.isFinite(a);
  const bValid = typeof b === "number" && Number.isFinite(b);
  if (aValid && bValid) return a - b;
  if (aValid) return -1;
  if (bValid) return 1;
  return 0;
}
