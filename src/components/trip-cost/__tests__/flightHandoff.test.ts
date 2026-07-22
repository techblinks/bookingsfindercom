import { describe, it, expect } from "vitest";
import { mapPlannerToFlightHandoff, type FlightHandoffResult } from "../tripCostFlightHandoff";
import { createDefaultState } from "../useTripCostPlanner";
import type { TripCostPlannerState } from "../types";

function makeState(overrides: Partial<TripCostPlannerState> = {}): TripCostPlannerState {
  return { ...createDefaultState(), ...overrides };
}

// ── Mode Selection ──

describe("mapPlannerToFlightHandoff", () => {
  describe("disabled state", () => {
    it("returns disabled when departureDate is empty", () => {
      const state = makeState();
      state.tripDetails.departureDate = "";
      const r = mapPlannerToFlightHandoff(state);
      expect(r.mode).toBe("disabled");
      expect(r.url).toBeNull();
      expect(r.reason).toContain("departure date");
    });

    it("returns disabled when return is before departure", () => {
      const state = makeState();
      state.tripDetails.departureDate = "2026-12-25";
      state.tripDetails.returnDate = "2026-12-20";
      const r = mapPlannerToFlightHandoff(state);
      expect(r.mode).toBe("disabled");
      expect(r.url).toBeNull();
      expect(r.reason).toContain("return date");
    });
  });

  describe("internal mode", () => {
    it("returns internal with departure date and default adults", () => {
      const state = makeState();
      state.tripDetails.departureDate = "2026-12-25";
      state.travellers = { adults: 1, children: 0, infants: 0 };
      const r = mapPlannerToFlightHandoff(state);
      expect(r.mode).toBe("internal");
      expect(r.url).toContain("/flights?");
      expect(r.url).toContain("departureDate=2026-12-25");
      expect(r.url).toContain("passengers=1");
    });

    it("includes return date when present", () => {
      const state = makeState();
      state.tripDetails.departureDate = "2026-12-25";
      state.tripDetails.returnDate = "2026-12-30";
      const r = mapPlannerToFlightHandoff(state);
      expect(r.url).toContain("departureDate=2026-12-25");
      expect(r.url).toContain("returnDate=2026-12-30");
    });

    it("maps total travellers (adults + children + infants)", () => {
      const state = makeState();
      state.tripDetails.departureDate = "2026-12-25";
      state.travellers = { adults: 2, children: 1, infants: 1 };
      const r = mapPlannerToFlightHandoff(state);
      expect(r.url).toContain("passengers=4");
    });

    it("defaults to 1 adult when all travellers are 0", () => {
      const state = makeState();
      state.tripDetails.departureDate = "2026-12-25";
      state.travellers = { adults: 0, children: 0, infants: 0 };
      const r = mapPlannerToFlightHandoff(state);
      expect(r.url).toContain("passengers=1");
    });

    it("does NOT include origin or destination (no IATA codes)", () => {
      const state = makeState();
      state.tripDetails.departureDate = "2026-12-25";
      state.tripDetails.destinationCity = "Denpasar";
      const r = mapPlannerToFlightHandoff(state);
      expect(r.url).not.toContain("origin=");
      expect(r.url).not.toContain("destination=");
    });

    it("returns a URL for one-way trip", () => {
      const state = makeState();
      state.tripDetails.departureDate = "2026-12-25";
      state.tripDetails.returnDate = "";
      const r = mapPlannerToFlightHandoff(state);
      expect(r.mode).toBe("internal");
      expect(r.url).toContain("departureDate=2026-12-25");
      expect(r.url).not.toContain("returnDate");
    });
  });

  // ── Safety ──

  describe("safety", () => {
    it("never returns a partner URL (aviasales.com)", () => {
      const state = makeState();
      state.tripDetails.departureDate = "2026-12-25";
      const r = mapPlannerToFlightHandoff(state);
      if (r.url) {
        expect(r.url).not.toContain("aviasales");
        expect(r.url).not.toContain("hotellook");
        expect(r.url).not.toContain("marker");
        expect(r.url).not.toContain("token");
      }
    });

    it("never includes API tokens or secrets", () => {
      const state = makeState();
      state.tripDetails.departureDate = "2026-12-25";
      const r = mapPlannerToFlightHandoff(state);
      if (r.url) {
        expect(r.url).not.toContain("api_key");
        expect(r.url).not.toContain("apiKey");
        expect(r.url).not.toContain("secret");
        expect(r.url).not.toContain("MARKER_ID");
        expect(r.url).not.toContain("TRAVELPAYOUTS");
      }
    });

    it("does NOT mutate the planner state", () => {
      const state = makeState();
      state.tripDetails.departureDate = "2026-12-25";
      const travellersBefore = { ...state.travellers };
      mapPlannerToFlightHandoff(state);
      expect(state.travellers).toEqual(travellersBefore);
    });
  });
});
