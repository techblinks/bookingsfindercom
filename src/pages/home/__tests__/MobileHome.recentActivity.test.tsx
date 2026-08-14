/**
 * Mobile V2 Phase 2A-3 — "Pick up where you left off" on the mobile homepage.
 *
 * These tests seed the REAL recentActivity store through recordActivity and
 * render the real MobileHome, so selection, deduplication, expiry and stale-date
 * handling all run through the shipped model. They assert UI composition and the
 * URLs the section produces; the model's own 138 tests already cover its
 * invariants and are not repeated here.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { TripProvider } from "@/context/TripContext";
import MobileHome from "@/pages/home/MobileHome";
import {
  RECENT_ACTIVITY_STORAGE_KEY,
  recordActivity,
  type RecentActivityInput,
} from "@/lib/recentActivity";

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

const DAY = 24 * 60 * 60 * 1000;
const daysFromNow = (days: number) => new Date(Date.now() + days * DAY);

/** A YYYY-MM-DD local calendar date, the format the model stores. */
function calendarDate(daysAhead: number): string {
  const d = daysFromNow(daysAhead);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Seed through the real recorder so entries are canonical. */
function seed(input: RecentActivityInput, at: Date = new Date()) {
  recordActivity(input, at);
}

function renderHome() {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={["/"]}>
        <TripProvider>
          <MobileHome />
        </TripProvider>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

const section = () => screen.queryByRole("region", { name: "Pick up where you left off" });
const heading = () => screen.queryByRole("heading", { name: "Pick up where you left off" });
const sectionLinks = () =>
  section() ? Array.from(section()!.querySelectorAll("a")) : [];
const hrefs = () => sectionLinks().map(a => a.getAttribute("href"));
const continuationLink = () => screen.getByRole("link", { name: /^Continue search/ });
const shortcutLinks = () =>
  sectionLinks().filter(a => !/^Continue search/.test(a.getAttribute("aria-label") ?? ""));

/** The section mounts its data after hydration, so wait for it to settle. */
async function renderAndSettle() {
  const utils = renderHome();
  await waitFor(() => expect(screen.getByText("How it works")).toBeTruthy());
  return utils;
}

const FUTURE_FLIGHT: RecentActivityInput = {
  kind: "flight",
  origin: "SYD",
  destination: "MEL",
  originLabel: "Sydney",
  destinationLabel: "Melbourne",
  departureDate: calendarDate(20),
  returnDate: calendarDate(30),
  travellers: { adults: 2, children: 1, infants: 0 },
  cabinClass: "business",
};

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

// ── A. FIRST-TIME USER ──

describe("Pick up where you left off — first-time user", () => {
  it("renders nothing at all when there is no history", async () => {
    await renderAndSettle();

    expect(heading()).toBeNull();
    expect(section()).toBeNull();
    expect(screen.queryByText(/no recent/i)).toBeNull();
    expect(screen.queryByText(/recent search/i)).toBeNull();
  });

  it("leaves the Phase 1 homepage composition untouched", async () => {
    await renderAndSettle();

    const sections = Array.from(document.querySelectorAll("main section"));
    expect(sections.some(s => s.getAttribute("aria-labelledby") === "recent-activity-heading")).toBe(false);
    // Hero, search, quick actions and how-it-works all still present.
    expect(screen.getByText("Where are you going?")).toBeTruthy();
    expect(screen.getByText("How it works")).toBeTruthy();
  });
});

// ── B–F. WHAT APPEARS ──

describe("Pick up where you left off — continuation", () => {
  it("shows one continuation for a dated future flight, with no duplicate row", async () => {
    seed(FUTURE_FLIGHT);
    await renderAndSettle();

    expect(heading()).toBeTruthy();
    expect(continuationLink()).toBeTruthy();
    expect(shortcutLinks()).toHaveLength(0);
    expect(sectionLinks()).toHaveLength(1);
  });

  it("shows the route, the committed dates and the traveller count", async () => {
    seed(FUTURE_FLIGHT);
    await renderAndSettle();

    const card = continuationLink();
    expect(within(card).getByText(/Sydney/)).toBeTruthy();
    expect(within(card).getByText(/Melbourne/)).toBeTruthy();
    expect(card.textContent).toContain("3 travellers");
    expect(card.textContent).toContain("Continue search");
  });

  it("falls back to the IATA code when no label was stored", async () => {
    seed({ ...FUTURE_FLIGHT, originLabel: undefined, destinationLabel: undefined });
    await renderAndSettle();

    expect(continuationLink().textContent).toContain("SYD");
    expect(continuationLink().textContent).toContain("MEL");
  });

  it("keeps a dateless flight out of the continuation slot", async () => {
    seed({ kind: "flight", origin: "SYD", destination: "MEL", originLabel: "Sydney", destinationLabel: "Melbourne" });
    await renderAndSettle();

    expect(screen.queryByRole("link", { name: /^Continue search/ })).toBeNull();
    expect(shortcutLinks()).toHaveLength(1);
    expect(shortcutLinks()[0].textContent).toContain("Search route again");
  });

  it("does not continue a flight whose departure has passed", async () => {
    seed({ ...FUTURE_FLIGHT, departureDate: calendarDate(-5), returnDate: calendarDate(-1) });
    await renderAndSettle();

    expect(screen.queryByRole("link", { name: /^Continue search/ })).toBeNull();
    // The route itself is still a useful shortcut, without the stale dates.
    expect(hrefs()).toEqual(["/flights?origin=SYD&destination=MEL"]);
  });
});

describe("Pick up where you left off — shortcuts", () => {
  it("shows the dated flight as the continuation and the other flight as a shortcut", async () => {
    seed({ kind: "flight", origin: "BNE", destination: "LHR", originLabel: "Brisbane", destinationLabel: "London" }, daysFromNow(-1));
    seed(FUTURE_FLIGHT);
    await renderAndSettle();

    expect(continuationLink().textContent).toContain("Sydney");
    expect(shortcutLinks()).toHaveLength(1);
    expect(shortcutLinks()[0].textContent).toContain("Brisbane");
  });

  it("shows a things shortcut on its own with no continuation", async () => {
    seed({ kind: "things", city: "Sydney", query: "harbour cruise" });
    await renderAndSettle();

    expect(heading()).toBeTruthy();
    expect(screen.queryByRole("link", { name: /^Continue search/ })).toBeNull();
    expect(shortcutLinks()).toHaveLength(1);
    expect(shortcutLinks()[0].textContent).toContain("harbour cruise");
  });

  it("shows flight and things shortcuts together, newest first", async () => {
    seed({ kind: "flight", origin: "SYD", destination: "MEL", originLabel: "Sydney", destinationLabel: "Melbourne" }, daysFromNow(-2));
    seed({ kind: "things", city: "Rome" }, daysFromNow(-1));
    await renderAndSettle();

    const labels = shortcutLinks().map(a => a.textContent ?? "");
    expect(labels).toHaveLength(2);
    expect(labels[0]).toContain("Rome");
    expect(labels[1]).toContain("Melbourne");
  });

  it("never renders more than three shortcuts", async () => {
    for (let i = 0; i < 6; i++) {
      seed({ kind: "things", city: `City ${i}` }, daysFromNow(-6 + i));
    }
    await renderAndSettle();

    expect(shortcutLinks().length).toBeLessThanOrEqual(3);
    expect(shortcutLinks()).toHaveLength(3);
  });

  it("relies on the model's deduplication rather than rendering the same route twice", async () => {
    seed({ kind: "flight", origin: "SYD", destination: "MEL", originLabel: "Sydney", destinationLabel: "Melbourne" }, daysFromNow(-2));
    seed({ kind: "flight", origin: "SYD", destination: "MEL", originLabel: "Sydney", destinationLabel: "Melbourne" }, daysFromNow(-1));
    await renderAndSettle();

    expect(shortcutLinks()).toHaveLength(1);
  });
});

// ── G–H. STAYS ARE NOT SURFACED YET ──

describe("Pick up where you left off — stays stay hidden", () => {
  it("renders nothing when the only history is a stay", async () => {
    seed({ kind: "stay", destination: "Bali" });
    await renderAndSettle();

    expect(section()).toBeNull();
    expect(screen.queryByText("Bali")).toBeNull();
  });

  it("never links to the hotels surface from this section", async () => {
    seed({ kind: "stay", destination: "Bali" });
    seed({ kind: "things", city: "Rome" });
    await renderAndSettle();

    expect(hrefs().some(href => href?.startsWith("/hotels"))).toBe(false);
  });

  it("a newer stay does not consume one of the three visible slots", async () => {
    seed({ kind: "things", city: "Rome" }, daysFromNow(-4));
    seed({ kind: "things", city: "Paris" }, daysFromNow(-3));
    seed({ kind: "flight", origin: "SYD", destination: "MEL", originLabel: "Sydney", destinationLabel: "Melbourne" }, daysFromNow(-2));
    seed({ kind: "stay", destination: "Bali" }, daysFromNow(-1)); // newest

    await renderAndSettle();

    const labels = shortcutLinks().map(a => a.textContent ?? "");
    expect(labels).toHaveLength(3);
    expect(labels.join(" ")).toContain("Melbourne");
    expect(labels.join(" ")).toContain("Paris");
    expect(labels.join(" ")).toContain("Rome");
    expect(labels.join(" ")).not.toContain("Bali");
  });

  it("leaves stay entries in storage untouched", async () => {
    seed({ kind: "stay", destination: "Bali" });
    await renderAndSettle();

    const raw = localStorage.getItem(RECENT_ACTIVITY_STORAGE_KEY)!;
    expect(JSON.parse(raw).items.some((item: { kind: string }) => item.kind === "stay")).toBe(true);
  });
});

// ── I, K. EXPIRY AND CORRUPTION ──

describe("Pick up where you left off — expired and corrupt storage", () => {
  it("does not render activity older than the retention window", async () => {
    seed({ kind: "things", city: "Rome" }, daysFromNow(-40));
    await renderAndSettle();

    expect(section()).toBeNull();
  });

  it("survives a corrupt store and simply renders no section", async () => {
    localStorage.setItem(RECENT_ACTIVITY_STORAGE_KEY, "{not json at all");
    await renderAndSettle();

    expect(section()).toBeNull();
    expect(screen.getByText("How it works")).toBeTruthy();
    expect(screen.getByText("Where are you going?")).toBeTruthy();
  });

  it("survives a structurally wrong store", async () => {
    localStorage.setItem(RECENT_ACTIVITY_STORAGE_KEY, JSON.stringify({ v: 99, items: "nope" }));
    await renderAndSettle();

    expect(section()).toBeNull();
    expect(screen.getByText("How it works")).toBeTruthy();
  });
});

// ── NAVIGATION CONTRACTS ──

describe("Pick up where you left off — navigation", () => {
  it("continuation restores the whole committed search", async () => {
    seed(FUTURE_FLIGHT);
    await renderAndSettle();

    expect(continuationLink().getAttribute("href")).toBe(
      `/flights?origin=SYD&destination=MEL&departureDate=${calendarDate(20)}&returnDate=${calendarDate(30)}` +
        "&passengers=3&adults=2&children=1&infants=0&cabinClass=business",
    );
  });

  it("continuation omits fields the traveller never committed", async () => {
    seed({ kind: "flight", origin: "SYD", destination: "MEL", departureDate: calendarDate(10) });
    await renderAndSettle();

    const href = continuationLink().getAttribute("href")!;
    expect(href).toBe(`/flights?origin=SYD&destination=MEL&departureDate=${calendarDate(10)}`);
    expect(href).not.toContain("cabinClass");
    expect(href).not.toContain("adults");
    expect(href).not.toContain("returnDate");
  });

  it("a flight shortcut carries the route only — no dates, travellers or cabin", async () => {
    seed({ kind: "flight", origin: "SYD", destination: "MEL", departureDate: calendarDate(-3), travellers: { adults: 2, children: 0, infants: 0 }, cabinClass: "business" });
    await renderAndSettle();

    const href = shortcutLinks()[0].getAttribute("href")!;
    expect(href).toBe("/flights?origin=SYD&destination=MEL");
    expect(href).not.toContain("departureDate");
    expect(href).not.toContain("returnDate");
    expect(href).not.toContain("adults");
    expect(href).not.toContain("cabinClass");
  });

  it("a things shortcut carries city and query only", async () => {
    seed({ kind: "things", city: "Sydney", query: "harbour cruise" });
    await renderAndSettle();

    const href = shortcutLinks()[0].getAttribute("href")!;
    expect(href).toBe("/things-to-do?city=Sydney&q=harbour+cruise");
    for (const excluded of ["activity=", "rating=", "minPrice=", "maxPrice=", "sort=", "page=", "accessible=", "skipLine="]) {
      expect(href).not.toContain(excluded);
    }
  });

  it("a things shortcut with no query carries the city alone", async () => {
    seed({ kind: "things", city: "Rome" });
    await renderAndSettle();

    expect(shortcutLinks()[0].getAttribute("href")).toBe("/things-to-do?city=Rome");
  });

  it("excludes the continuation from the shortcut list", async () => {
    seed(FUTURE_FLIGHT);
    seed({ kind: "things", city: "Rome" });
    await renderAndSettle();

    const shortcutHrefs = shortcutLinks().map(a => a.getAttribute("href"));
    expect(shortcutHrefs).toEqual(["/things-to-do?city=Rome"]);
    expect(shortcutHrefs).not.toContain("/flights?origin=SYD&destination=MEL");
  });

  it("adds no tracking or affiliate parameters", async () => {
    seed(FUTURE_FLIGHT);
    seed({ kind: "things", city: "Rome" });
    await renderAndSettle();

    for (const href of hrefs()) {
      expect(href).not.toMatch(/utm_|marker=|affiliate|ref=|partner/i);
    }
  });
});

// ── LONG LABELS ──

describe("Pick up where you left off — long route labels", () => {
  const LONG_ORIGIN = "Auckland International Airport Region";
  const LONG_DESTINATION = "Santiago de Chile Comodoro Arturo Merino";

  /** Each end must be its own element, so neither can swallow the whole row. */
  function routeParts(link: HTMLElement) {
    return Array.from(link.querySelectorAll("span.truncate"))
      .map(s => s.textContent?.trim() ?? "")
      .filter(Boolean);
  }

  it("keeps the destination visible when the origin label is long", async () => {
    seed({ ...FUTURE_FLIGHT, originLabel: LONG_ORIGIN, destinationLabel: "Melbourne" });
    await renderAndSettle();

    const card = continuationLink();
    expect(routeParts(card)).toContain(LONG_ORIGIN);
    expect(routeParts(card)).toContain("Melbourne");
    expect(card.getAttribute("aria-label")).toBe(
      `Continue search, flights from ${LONG_ORIGIN} to Melbourne`,
    );
  });

  it("keeps the origin visible when the destination label is long", async () => {
    seed({ ...FUTURE_FLIGHT, originLabel: "Sydney", destinationLabel: LONG_DESTINATION });
    await renderAndSettle();

    const card = continuationLink();
    expect(routeParts(card)).toContain("Sydney");
    expect(routeParts(card)).toContain(LONG_DESTINATION);
    expect(card.getAttribute("aria-label")).toContain(LONG_DESTINATION);
  });

  it("represents origin, arrow and destination when both labels are long", async () => {
    seed({ ...FUTURE_FLIGHT, originLabel: LONG_ORIGIN, destinationLabel: LONG_DESTINATION });
    await renderAndSettle();

    const card = continuationLink();
    const parts = routeParts(card);
    expect(parts).toContain(LONG_ORIGIN);
    expect(parts).toContain(LONG_DESTINATION);
    expect(Array.from(card.querySelectorAll("span")).some(s => s.textContent === "→")).toBe(true);
    expect(card.getAttribute("aria-label")).toBe(
      `Continue search, flights from ${LONG_ORIGIN} to ${LONG_DESTINATION}`,
    );
  });

  it("applies the same treatment to a recent flight row", async () => {
    seed({ kind: "flight", origin: "AKL", destination: "SCL", originLabel: LONG_ORIGIN, destinationLabel: LONG_DESTINATION });
    await renderAndSettle();

    const row = shortcutLinks()[0];
    expect(routeParts(row)).toContain(LONG_ORIGIN);
    expect(routeParts(row)).toContain(LONG_DESTINATION);
    expect(row.getAttribute("aria-label")).toBe(
      `Search flights from ${LONG_ORIGIN} to ${LONG_DESTINATION} again`,
    );
    // The polish is presentational only — the route URL is unchanged.
    expect(row.getAttribute("href")).toBe("/flights?origin=AKL&destination=SCL");
  });
});

// ── PRESENTATION AND ACCESSIBILITY ──

describe("Pick up where you left off — presentation", () => {
  it("is a labelled region with a real heading", async () => {
    seed(FUTURE_FLIGHT);
    await renderAndSettle();

    expect(section()!.getAttribute("aria-labelledby")).toBe("recent-activity-heading");
    expect(heading()!.tagName).toBe("H2");
  });

  it("gives every row an understandable accessible name and a comfortable target", async () => {
    seed(FUTURE_FLIGHT);
    seed({ kind: "things", city: "Rome" });
    await renderAndSettle();

    for (const link of sectionLinks()) {
      expect(link.getAttribute("aria-label")).toBeTruthy();
      expect(link.className).toMatch(/min-h-\[(5[6-9]|6\d)px\]/);
      expect(link.className).toContain("focus-visible:outline");
    }
  });

  it("hides the route arrow and icons from screen readers", async () => {
    seed(FUTURE_FLIGHT);
    await renderAndSettle();

    for (const svg of Array.from(section()!.querySelectorAll("svg"))) {
      expect(svg.getAttribute("aria-hidden")).toBe("true");
    }
    for (const span of Array.from(section()!.querySelectorAll("span"))) {
      if (span.textContent === "→") expect(span.getAttribute("aria-hidden")).toBe("true");
    }
  });

  it("keeps both ends of a route independently truncatable", async () => {
    seed(FUTURE_FLIGHT);
    seed({ kind: "flight", origin: "BNE", destination: "LHR", originLabel: "Brisbane", destinationLabel: "London Heathrow" }, daysFromNow(-1));
    await renderAndSettle();

    for (const link of sectionLinks()) {
      const parts = Array.from(link.querySelectorAll("span.truncate")).filter(
        s => s.textContent && s.textContent.trim().length > 0,
      );
      // Each end owns its own truncation boundary rather than sharing one string.
      expect(parts.length).toBeGreaterThanOrEqual(2);
      const arrow = Array.from(link.querySelectorAll("span")).find(s => s.textContent === "→");
      expect(arrow).toBeTruthy();
      expect(arrow!.className).toContain("shrink-0");
    }
  });

  it("shows no timestamps, prices or invented claims", async () => {
    seed(FUTURE_FLIGHT);
    seed({ kind: "things", city: "Rome" });
    await renderAndSettle();

    const text = section()!.textContent ?? "";
    expect(text).not.toMatch(/ago|yesterday|today|last (week|month)/i);
    expect(text).not.toMatch(/\$|price|deal|save|popular|only \d+/i);
    expect(text).not.toMatch(/bf_recent_activity|localStorage/);
  });

  it("does not write recent activity into the trip context", async () => {
    seed(FUTURE_FLIGHT);
    await renderAndSettle();

    expect(section()).toBeTruthy();
    // TripProvider persists its own empty envelope on mount; what matters is
    // that no route, dates or travellers from recent activity leak into it.
    const trip = JSON.parse(localStorage.getItem("bf_trip_context") ?? "{}");
    expect(trip.origin).toBeUndefined();
    expect(trip.destination).toBeUndefined();
    expect(trip.dates).toBeUndefined();
    expect(trip.travellers).toBeUndefined();
  });
});
