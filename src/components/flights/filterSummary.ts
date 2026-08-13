import { FilterState } from "@/types/flight";

/**
 * How many constraints the user has actually applied.
 *
 * One per selected airline, stop option and departure slot, plus one each for a
 * price or duration range that has been narrowed away from the full range of the
 * loaded results. `minPrice`, `maxPrice` and `maxDuration` describe those results
 * rather than constrain them, so they are never counted.
 *
 * Shared so the desktop panel's "any filters active?" test and the mobile
 * trigger's badge can never disagree about what "active" means.
 */
export function countActiveFilters(filters: FilterState): number {
  const priceNarrowed =
    filters.priceRange[0] !== filters.minPrice || filters.priceRange[1] !== filters.maxPrice;
  const durationNarrowed =
    filters.durationRange[0] !== 0 || filters.durationRange[1] !== filters.maxDuration;

  return (
    filters.selectedAirlines.length +
    filters.selectedStops.length +
    filters.selectedDepartureTimes.length +
    (priceNarrowed ? 1 : 0) +
    (durationNarrowed ? 1 : 0)
  );
}

/** The constraint-bearing fields, reset to "no constraint" for the loaded results. */
export function clearedFilters(filters: FilterState): FilterState {
  return {
    ...filters,
    priceRange: [filters.minPrice, filters.maxPrice],
    selectedAirlines: [],
    selectedStops: [],
    selectedDepartureTimes: [],
    durationRange: [0, filters.maxDuration],
  };
}
