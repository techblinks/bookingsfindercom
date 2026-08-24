/**
 * BF-FLIGHTS-LIVE-4 Phase L/W — native live flight result card.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// LiveFlightCard imports formatDuration from @/hooks/useFlightSearch, which
// transitively imports the real Supabase client at module scope (same
// coupling FlightCard.tsx has) — mocked here so it never tries to read
// real env vars in a unit test.
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import LiveFlightCard from "@/components/flights/LiveFlightCard";
import type { LiveFlightItinerary } from "@/types/liveFlights";

function segment(overrides: Partial<LiveFlightItinerary["segments"][number]> = {}) {
  return {
    airline: "Qantas", airlineLogoUrl: "https://logos.example/qf.png", flightNumber: "QF400",
    aircraft: "Boeing 737", travelClass: "Economy",
    departureAirport: { code: "SYD", name: "Sydney Airport", time: "2030-01-10 08:15" },
    arrivalAirport: { code: "MEL", name: "Melbourne Airport", time: "2030-01-10 09:45" },
    durationMinutes: 90, overnight: false, operatingAirline: null,
    ...overrides,
  };
}

function baseItinerary(overrides: Partial<LiveFlightItinerary> = {}): LiveFlightItinerary {
  return {
    id: "it-1", providerResultId: null, category: "best", price: 249, currency: "AUD",
    tripType: "one_way", totalDurationMinutes: 90, segments: [segment()], layovers: [],
    stops: 0, carbonEmissionsGrams: 45000, departureToken: null, bookingToken: "BOOK1",
    ...overrides,
  };
}

describe("LiveFlightCard", () => {
  it("renders departure/arrival times, price and currency from the itinerary", () => {
    render(<LiveFlightCard itinerary={baseItinerary()} currencySymbol="A$" action={{ type: "none" }} />);
    expect(screen.getByText("08:15")).toBeTruthy();
    expect(screen.getByText("09:45")).toBeTruthy();
    expect(screen.getByText("249")).toBeTruthy();
    expect(screen.getByText("A$")).toBeTruthy();
  });

  it("falls back to a neutral placeholder icon when the airline logo is missing — never fabricates a URL", () => {
    const itinerary = baseItinerary({ segments: [segment({ airlineLogoUrl: null })] });
    const { container } = render(<LiveFlightCard itinerary={itinerary} currencySymbol="A$" action={{ type: "none" }} />);
    expect(container.querySelector("img")).toBeNull();
  });

  it("labels a direct itinerary 'Direct'", () => {
    render(<LiveFlightCard itinerary={baseItinerary({ stops: 0 })} currencySymbol="A$" action={{ type: "none" }} />);
    expect(screen.getByText("Direct")).toBeTruthy();
  });

  it("renders layover airport codes and stop count for a connecting itinerary", () => {
    const itinerary = baseItinerary({
      stops: 1,
      layovers: [{ airportCode: "BNE", airportName: "Brisbane Airport", durationMinutes: 75, overnight: false }],
    });
    render(<LiveFlightCard itinerary={itinerary} currencySymbol="A$" action={{ type: "none" }} />);
    expect(screen.getByText(/1 stop/)).toBeTruthy();
    expect(screen.getByText(/BNE/)).toBeTruthy();
  });

  it("expanding Flight details shows the layover duration and airport name", () => {
    const itinerary = baseItinerary({
      stops: 1,
      segments: [segment(), segment({ flightNumber: "QF401" })],
      layovers: [{ airportCode: "BNE", airportName: "Brisbane Airport", durationMinutes: 75, overnight: false }],
    });
    render(<LiveFlightCard itinerary={itinerary} currencySymbol="A$" action={{ type: "none" }} />);
    fireEvent.click(screen.getByRole("button", { name: /flight details/i }));
    expect(screen.getByText(/Layover:/)).toBeTruthy();
    expect(screen.getByText(/Brisbane Airport/)).toBeTruthy();
  });

  it("shows a neutral placeholder rather than fabricating a price when price is null", () => {
    render(<LiveFlightCard itinerary={baseItinerary({ price: null })} currencySymbol="A$" action={{ type: "none" }} />);
    expect(screen.getByText(/price confirmed at booking/i)).toBeTruthy();
  });

  it("renders a 'Choose flight' CTA and fires onAction when action.type is 'choose'", () => {
    const onAction = vi.fn();
    render(<LiveFlightCard itinerary={baseItinerary()} currencySymbol="A$" action={{ type: "choose", onAction }} />);
    fireEvent.click(screen.getByRole("button", { name: /choose flight/i }));
    expect(onAction).toHaveBeenCalled();
  });

  it("renders a 'See booking options' CTA when action.type is 'booking'", () => {
    const onAction = vi.fn();
    render(<LiveFlightCard itinerary={baseItinerary()} currencySymbol="A$" action={{ type: "booking", onAction }} />);
    fireEvent.click(screen.getByRole("button", { name: /see booking options/i }));
    expect(onAction).toHaveBeenCalled();
  });

  it("renders no CTA when action.type is 'none'", () => {
    render(<LiveFlightCard itinerary={baseItinerary()} currencySymbol="A$" action={{ type: "none" }} />);
    expect(screen.queryByRole("button", { name: /choose flight|see booking options/i })).toBeNull();
  });
});
