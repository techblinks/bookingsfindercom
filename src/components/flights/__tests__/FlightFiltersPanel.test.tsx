/**
 * BF-0R-7.2 Phase G — dead filter controls are hidden on zero results.
 *
 * With meta.total_found === 0, the price range is an unused [0, 10000]
 * placeholder (never provider-derived) and every stop/departure-time count
 * is 0 — none of them can filter anything, so they should not render at
 * all rather than show as dead controls.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import FlightFiltersPanel from "../FlightFiltersPanel";
import type { FilterState } from "@/types/flight";

// FlightFiltersPanel imports formatDuration from useFlightSearch.ts, which
// constructs the real Supabase client at module load time — mock it so this
// file doesn't need a real VITE_SUPABASE_URL to run in isolation.
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getSession: () => Promise.resolve({ data: { session: null } }) } },
}));

function makeFilters(overrides: Partial<FilterState> = {}): FilterState {
  return {
    priceRange: [0, 10000],
    maxPrice: 10000,
    minPrice: 0,
    selectedAirlines: [],
    selectedStops: [],
    selectedDepartureTimes: [],
    durationRange: [0, 1440],
    maxDuration: 1440,
    ...overrides,
  };
}

describe("FlightFiltersPanel — hasResults=false hides dead controls (item 14)", () => {
  it("hides the price range, Stops and Departure Time sections with zero results", () => {
    render(
      <FlightFiltersPanel
        filters={makeFilters()}
        airlines={[]}
        stopCounts={{ 0: 0, 1: 0, 2: 0 }}
        departureCounts={{}}
        onFilterChange={() => {}}
        onReset={() => {}}
        totalResults={0}
        hasResults={false}
      />
    );

    expect(screen.queryByText("Recent fare")).toBeNull();
    expect(screen.queryByText("Stops")).toBeNull();
    expect(screen.queryByText("Departure Time")).toBeNull();
  });

  it("still renders the Filters heading — a simple, honest empty filter panel, not a blank one", () => {
    render(
      <FlightFiltersPanel
        filters={makeFilters()}
        airlines={[]}
        stopCounts={{ 0: 0, 1: 0, 2: 0 }}
        departureCounts={{}}
        onFilterChange={() => {}}
        onReset={() => {}}
        totalResults={0}
        hasResults={false}
      />
    );

    expect(screen.getByRole("heading", { name: "Filters", level: 2 })).toBeTruthy();
  });
});

describe("FlightFiltersPanel — hasResults=true (default) preserves existing behaviour", () => {
  it("renders the price range, Stops and Departure Time sections when results exist", () => {
    render(
      <FlightFiltersPanel
        filters={makeFilters({ minPrice: 100, maxPrice: 300, priceRange: [100, 300] })}
        airlines={[{ code: "QF", name: "Qantas", count: 2 }]}
        stopCounts={{ 0: 2, 1: 1, 2: 0 }}
        departureCounts={{ morning: 1 }}
        onFilterChange={() => {}}
        onReset={() => {}}
        totalResults={3}
      />
    );

    expect(screen.getByText("Recent fare")).toBeTruthy();
    expect(screen.getByText("Stops")).toBeTruthy();
    expect(screen.getByText("Departure Time")).toBeTruthy();
    expect(screen.getByText("Airlines")).toBeTruthy();
  });
});
