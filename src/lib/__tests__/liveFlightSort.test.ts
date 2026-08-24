/**
 * BF-FLIGHTS-LIVE-4 Round 2 Phase 6/W — native Live Flights sort contract.
 */
import { describe, it, expect } from "vitest";
import { sortLiveItineraries } from "@/lib/liveFlightSort";
import type { LiveFlightItinerary } from "@/types/liveFlights";

function it_(id: string, overrides: Partial<LiveFlightItinerary> = {}): LiveFlightItinerary {
  return {
    id, providerResultId: null, category: "best", price: null, currency: "AUD",
    tripType: "one_way", totalDurationMinutes: null, segments: [], layovers: [],
    stops: 0, carbonEmissionsGrams: null, departureToken: null, bookingToken: null,
    ...overrides,
  };
}

describe("sortLiveItineraries — best", () => {
  it("puts every 'best' category itinerary before every 'other' one", () => {
    const input = [
      it_("o1", { category: "other" }),
      it_("b1", { category: "best" }),
      it_("o2", { category: "other" }),
      it_("b2", { category: "best" }),
    ];
    const sorted = sortLiveItineraries(input, "best");
    expect(sorted.map((i) => i.id)).toEqual(["b1", "b2", "o1", "o2"]);
  });

  it("preserves original provider order within each category (stable, no proprietary re-scoring)", () => {
    const input = [it_("b3", { category: "best" }), it_("b1", { category: "best" }), it_("b2", { category: "best" })];
    const sorted = sortLiveItineraries(input, "best");
    expect(sorted.map((i) => i.id)).toEqual(["b3", "b1", "b2"]);
  });

  it("does not mutate the input array", () => {
    const input = [it_("o1", { category: "other" }), it_("b1", { category: "best" })];
    const copy = [...input];
    sortLiveItineraries(input, "best");
    expect(input).toEqual(copy);
  });
});

describe("sortLiveItineraries — cheapest", () => {
  it("sorts ascending by price", () => {
    const input = [it_("a", { price: 300 }), it_("b", { price: 100 }), it_("c", { price: 200 })];
    expect(sortLiveItineraries(input, "cheapest").map((i) => i.id)).toEqual(["b", "c", "a"]);
  });

  it("places a missing (null) price after every valid-priced itinerary", () => {
    const input = [it_("a", { price: null }), it_("b", { price: 150 })];
    expect(sortLiveItineraries(input, "cheapest").map((i) => i.id)).toEqual(["b", "a"]);
  });

  it("stable-sorts equal prices by original provider order", () => {
    const input = [it_("a", { price: 100 }), it_("b", { price: 100 }), it_("c", { price: 50 })];
    expect(sortLiveItineraries(input, "cheapest").map((i) => i.id)).toEqual(["c", "a", "b"]);
  });
});

describe("sortLiveItineraries — fastest", () => {
  it("sorts ascending by totalDurationMinutes", () => {
    const input = [it_("a", { totalDurationMinutes: 300 }), it_("b", { totalDurationMinutes: 90 }), it_("c", { totalDurationMinutes: 150 })];
    expect(sortLiveItineraries(input, "fastest").map((i) => i.id)).toEqual(["b", "c", "a"]);
  });

  it("places a missing (null) duration after every valid-duration itinerary", () => {
    const input = [it_("a", { totalDurationMinutes: null }), it_("b", { totalDurationMinutes: 120 })];
    expect(sortLiveItineraries(input, "fastest").map((i) => i.id)).toEqual(["b", "a"]);
  });

  it("stable-sorts equal durations by original provider order", () => {
    const input = [it_("a", { totalDurationMinutes: 120 }), it_("b", { totalDurationMinutes: 120 }), it_("c", { totalDurationMinutes: 60 })];
    expect(sortLiveItineraries(input, "fastest").map((i) => i.id)).toEqual(["c", "a", "b"]);
  });
});

describe("sortLiveItineraries — never touches cached results", () => {
  it("returns a new array reference, never the same array instance", () => {
    const input = [it_("a")];
    expect(sortLiveItineraries(input, "best")).not.toBe(input);
  });
});
