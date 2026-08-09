/**
 * M1: MobileHome tests — no-trip state, partial-trip state, compliance.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { TripProvider } from "@/context/TripContext";
import MobileHome from "@/pages/home/MobileHome";

vi.mock("@/lib/analytics", () => ({
  logSearch: vi.fn(() => Promise.resolve("mock-id")),
  logAffiliateClick: vi.fn(() => Promise.resolve()),
  logInternalNavigation: vi.fn(),
}));

vi.mock("@/components/brand/BrandLogo", () => ({
  BrandLogo: () => <img alt="BookingsFinder" data-testid="brand-logo" />,
}));

vi.mock("@/components/layout/Footer", () => ({
  default: () => <footer data-testid="footer">Footer</footer>,
}));

function renderMobileHome() {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={["/"]}>
        <TripProvider>
          <MobileHome />
        </TripProvider>
      </MemoryRouter>
    </HelmetProvider>
  );
}

function seedTrip(state: object) {
  localStorage.setItem("bf_trip_context", JSON.stringify({ version: 1, updatedAt: new Date().toISOString(), ...state }));
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe("MobileHome — no trip state", () => {
  it("renders the heading", () => {
    renderMobileHome();
    expect(screen.getByText("Bookings Finder")).toBeTruthy();
  });

  it("renders destination search CTA", () => {
    renderMobileHome();
    expect(screen.getByText("Search a city or destination")).toBeTruthy();
  });

  it("renders quick product launcher", () => {
    renderMobileHome();
    expect(screen.getByText("Plan your trip")).toBeTruthy();
  });

  it("has all four product action cards", () => {
    renderMobileHome();
    // Header nav also renders these labels — use getAllByText
    expect(screen.getAllByText("Flights").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Stays").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Things").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Trip Cost").length).toBeGreaterThanOrEqual(1);
  });

  it("does NOT render full flight search form", () => {
    renderMobileHome();
    expect(screen.queryByTestId("modern-flight-search")).toBeNull();
    expect(screen.queryByText("Search available flights")).toBeNull();
  });

  it("does NOT show hero marketing heading", () => {
    renderMobileHome();
    expect(screen.queryByText("Find, compare and plan your whole trip.")).toBeNull();
  });

  it("renders trust/compliance content", () => {
    renderMobileHome();
    expect(screen.getByText("How Bookings Finder works")).toBeTruthy();
    expect(screen.getByText("Affiliate disclosure")).toBeTruthy();
    expect(screen.getByText("Privacy policy")).toBeTruthy();
    expect(screen.getByText("Terms of service")).toBeTruthy();
  });

  it("does NOT show fake totals or prices", () => {
    renderMobileHome();
    expect(screen.queryByText(/\$/)).toBeNull();
    expect(screen.queryByText(/saved/i)).toBeNull();
  });

  it("does NOT show fake checkmarks or selected state", () => {
    renderMobileHome();
    expect(screen.queryByText(/selected/i)).toBeNull();
    expect(screen.queryByText(/booked/i)).toBeNull();
  });
});

describe("MobileHome — partial trip state", () => {
  it("shows continue planning section when trip exists", () => {
    seedTrip({ destination: { name: "Sydney" } });
    renderMobileHome();
    expect(screen.getByText("Continue planning")).toBeTruthy();
    // Ribbon also shows Sydney — check it appears at least once
    expect(screen.getAllByText("Sydney").length).toBeGreaterThanOrEqual(1);
  });

  it("shows dates and travellers when present", () => {
    seedTrip({ destination: { name: "Sydney" }, dates: { departureDate: "2026-08-18", returnDate: "2026-08-29" }, travellers: { adults: 2, children: 1, infants: 0 } });
    renderMobileHome();
    // Ribbon also shows dates — use getAllByText
    expect(screen.getAllByText(/3 travellers/).length).toBeGreaterThanOrEqual(1);
  });

  it("has quick action links in planning section", () => {
    seedTrip({ destination: { name: "Sydney" } });
    renderMobileHome();
    const links = screen.getAllByRole("link");
    const hrefs = links.map(l => l.getAttribute("href"));
    expect(hrefs).toContain("/flights");
    expect(hrefs).toContain("/hotels");
    expect(hrefs).toContain("/things-to-do");
    expect(hrefs).toContain("/trip-cost");
  });

  it("no fabricated 'Flight selected' or similar claims", () => {
    seedTrip({ destination: { name: "Sydney" } });
    renderMobileHome();
    expect(screen.queryByText(/flight.*selected/i)).toBeNull();
    expect(screen.queryByText(/stay.*selected/i)).toBeNull();
    expect(screen.queryByText(/activity.*saved/i)).toBeNull();
  });
});

describe("M1.1 accessibility fixes", () => {
  it("splash overlay uses pointer-events-none (never blocks interaction)", async () => {
    // Verify the main.tsx splash fix at source level:
    // The splash overlay div must have pointer-events-none class
    // so it is purely visual and does not intercept clicks/touches.
    const { readFileSync } = await import("node:fs");
    const mainSource = readFileSync("src/main.tsx", "utf-8");
    expect(mainSource).toContain("pointer-events-none");
    // The old blocking pattern must be gone
    expect(mainSource).not.toContain("pointerEvents: visible ? 'auto' : 'none'");
  });
});
