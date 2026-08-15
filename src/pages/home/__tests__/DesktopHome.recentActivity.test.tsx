/**
 * Desktop D3 — "Pick up where you left off".
 *
 * Seeds the REAL recentActivity store through recordActivity and renders the
 * real DesktopHome, so selection, expiry, past-date handling and deduplication
 * all run through the shipped model. These tests assert the desktop surface's
 * composition and the URLs it produces; the model's own 138 tests and the 39
 * mobile tests are not repeated.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DesktopHome from "@/pages/home/DesktopHome";
import {
  RECENT_ACTIVITY_STORAGE_KEY,
  recordActivity,
  type RecentActivityInput,
} from "@/lib/recentActivity";

const { mockLogInternalNavigation } = vi.hoisted(() => ({ mockLogInternalNavigation: vi.fn() }));

vi.mock("@/lib/analytics", () => ({
  logSearch: vi.fn(() => Promise.resolve("mock-id")),
  logAffiliateClick: vi.fn(() => Promise.resolve()),
  logInternalNavigation: mockLogInternalNavigation,
}));

vi.mock("@/components/search/ModernFlightSearch", () => ({
  default: () => <div data-testid="modern-flight-search">ModernFlightSearch</div>,
}));

vi.mock("@/components/brand/BrandLogo", () => ({
  BrandLogo: () => <img alt="BookingsFinder" data-testid="brand-logo" />,
}));

vi.mock("@/components/layout/Footer", () => ({
  default: () => <footer data-testid="footer">Footer</footer>,
}));

const DAY = 24 * 60 * 60 * 1000;
const daysFromNow = (days: number) => new Date(Date.now() + days * DAY);

function calendarDate(daysAhead: number): string {
  const d = daysFromNow(daysAhead);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const seed = (input: RecentActivityInput, at: Date = new Date()) => recordActivity(input, at);

function renderDesktopHome() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={["/"]}>
          <DesktopHome />
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>,
  );
}

const section = () => screen.queryByRole("region", { name: "Pick up where you left off" });
const heading = () => screen.queryByRole("heading", { name: "Pick up where you left off" });
const sectionLinks = () => (section() ? Array.from(section()!.querySelectorAll("a")) : []);
const continuation = () => screen.getByRole("link", { name: /^Continue search/ });
const shortcuts = () =>
  sectionLinks().filter(a => !/^Continue search/.test(a.getAttribute("aria-label") ?? ""));
const hrefs = () => sectionLinks().map(a => a.getAttribute("href"));

/** The section mounts its data after hydration; wait for the page to settle. */
async function renderAndSettle() {
  const utils = renderDesktopHome();
  await waitFor(() => expect(screen.getByText("How BookingsFinder works")).toBeTruthy());
  return utils;
}

const FUTURE_FLIGHT: RecentActivityInput = {
  kind: "flight",
  origin: "BNE",
  destination: "KTM",
  originLabel: "Brisbane",
  destinationLabel: "Kathmandu",
  departureDate: calendarDate(20),
  returnDate: calendarDate(36),
  travellers: { adults: 2, children: 1, infants: 0 },
  cabinClass: "economy",
};

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

// ── FIRST-TIME USER ──

describe("Desktop recent activity — first-time user", () => {
  it("renders no section at all", async () => {
    await renderAndSettle();

    expect(section()).toBeNull();
    expect(heading()).toBeNull();
    expect(screen.queryByText(/start searching/i)).toBeNull();
    expect(screen.queryByText(/no recent/i)).toBeNull();
  });

  it("leaves no placeholder between the trust strip and the product cards", async () => {
    const { container } = await renderAndSettle();

    const ids = Array.from(container.querySelectorAll("main section")).map(s =>
      s.getAttribute("aria-labelledby"),
    );
    expect(ids).not.toContain("recent-activity-heading");
  });

  it("survives corrupt storage without breaking the page", async () => {
    localStorage.setItem(RECENT_ACTIVITY_STORAGE_KEY, "{not json");
    await renderAndSettle();

    expect(section()).toBeNull();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Plan the whole trip, not just the flight.",
    );
    expect(screen.getByTestId("modern-flight-search")).toBeTruthy();
  });
});

// ── RETURNING USER ──

describe("Desktop recent activity — returning user", () => {
  it("shows one continuation and no duplicate shortcut for it", async () => {
    seed(FUTURE_FLIGHT);
    await renderAndSettle();

    expect(heading()!.tagName).toBe("H2");
    expect(continuation()).toBeTruthy();
    expect(shortcuts()).toHaveLength(0);
  });

  it("shows the committed route, dates and travellers", async () => {
    seed(FUTURE_FLIGHT);
    await renderAndSettle();

    const card = continuation();
    expect(card.textContent).toContain("Brisbane");
    expect(card.textContent).toContain("Kathmandu");
    expect(card.textContent).toContain("3 travellers");
    expect(card.textContent).toContain("Continue search");
  });

  it("never renders more than three shortcuts", async () => {
    for (let i = 0; i < 6; i++) seed({ kind: "things", city: `City ${i}` }, daysFromNow(-6 + i));
    await renderAndSettle();

    expect(shortcuts()).toHaveLength(3);
  });

  it("places the continuation beside its shortcuts", async () => {
    seed({ kind: "flight", origin: "SYD", destination: "MEL", originLabel: "Sydney", destinationLabel: "Melbourne" }, daysFromNow(-2));
    seed({ kind: "things", city: "Rome" }, daysFromNow(-1));
    seed(FUTURE_FLIGHT);
    await renderAndSettle();

    expect(continuation()).toBeTruthy();
    expect(shortcuts()).toHaveLength(2);
    expect(sectionLinks()).toHaveLength(3);
  });

  it("shows shortcuts alone when nothing is resumable", async () => {
    seed({ kind: "things", city: "Rome", query: "colosseum tour" });
    await renderAndSettle();

    expect(screen.queryByRole("link", { name: /^Continue search/ })).toBeNull();
    expect(shortcuts()).toHaveLength(1);
    expect(shortcuts()[0].textContent).toContain("colosseum tour");
  });

  it("does not offer a past departure as a continuation", async () => {
    seed({ ...FUTURE_FLIGHT, departureDate: calendarDate(-5), returnDate: calendarDate(-1) });
    await renderAndSettle();

    expect(screen.queryByRole("link", { name: /^Continue search/ })).toBeNull();
    expect(hrefs()).toEqual(["/flights?origin=BNE&destination=KTM"]);
  });

  it("hides activity older than the retention window", async () => {
    seed({ kind: "things", city: "Rome" }, daysFromNow(-40));
    await renderAndSettle();

    expect(section()).toBeNull();
  });
});

// ── STAYS ──

describe("Desktop recent activity — stays stay hidden", () => {
  it("renders nothing when the only history is a stay", async () => {
    seed({ kind: "stay", destination: "Bali" });
    await renderAndSettle();

    expect(section()).toBeNull();
    expect(screen.queryByText("Bali")).toBeNull();
  });

  it("a newer stay does not consume one of the three slots", async () => {
    seed({ kind: "things", city: "Rome" }, daysFromNow(-4));
    seed({ kind: "things", city: "Paris" }, daysFromNow(-3));
    seed({ kind: "flight", origin: "SYD", destination: "MEL", originLabel: "Sydney", destinationLabel: "Melbourne" }, daysFromNow(-2));
    seed({ kind: "stay", destination: "Bali" }, daysFromNow(-1)); // newest
    await renderAndSettle();

    const text = shortcuts().map(a => a.textContent ?? "").join(" ");
    expect(shortcuts()).toHaveLength(3);
    expect(text).toContain("Melbourne");
    expect(text).toContain("Paris");
    expect(text).toContain("Rome");
    expect(text).not.toContain("Bali");
  });

  it("never links to the hotels surface", async () => {
    seed({ kind: "stay", destination: "Bali" });
    seed({ kind: "things", city: "Rome" });
    await renderAndSettle();

    expect(hrefs().some(h => h?.startsWith("/hotels"))).toBe(false);
  });

  it("leaves stay entries untouched in storage", async () => {
    seed({ kind: "stay", destination: "Bali" });
    await renderAndSettle();

    const raw = localStorage.getItem(RECENT_ACTIVITY_STORAGE_KEY)!;
    expect(JSON.parse(raw).items.some((i: { kind: string }) => i.kind === "stay")).toBe(true);
  });
});

// ── RESTORE CONTRACTS ──

describe("Desktop recent activity — restore URLs", () => {
  it("continuation restores the whole committed search", async () => {
    seed(FUTURE_FLIGHT);
    await renderAndSettle();

    expect(continuation().getAttribute("href")).toBe(
      `/flights?origin=BNE&destination=KTM&departureDate=${calendarDate(20)}&returnDate=${calendarDate(36)}` +
        "&passengers=3&adults=2&children=1&infants=0&cabinClass=economy",
    );
  });

  it("continuation omits fields never committed", async () => {
    seed({ kind: "flight", origin: "SYD", destination: "MEL", departureDate: calendarDate(9) });
    await renderAndSettle();

    const href = continuation().getAttribute("href")!;
    expect(href).toBe(`/flights?origin=SYD&destination=MEL&departureDate=${calendarDate(9)}`);
    expect(href).not.toContain("cabinClass");
    expect(href).not.toContain("adults");
  });

  it("a flight shortcut carries the route only", async () => {
    seed({
      kind: "flight",
      origin: "SYD",
      destination: "MEL",
      departureDate: calendarDate(-3),
      travellers: { adults: 2, children: 0, infants: 0 },
      cabinClass: "business",
    });
    await renderAndSettle();

    const href = shortcuts()[0].getAttribute("href")!;
    expect(href).toBe("/flights?origin=SYD&destination=MEL");
    for (const stale of ["departureDate", "returnDate", "adults", "children", "infants", "cabinClass", "passengers"]) {
      expect(href).not.toContain(stale);
    }
  });

  it("a things shortcut carries city and query only", async () => {
    seed({ kind: "things", city: "Sydney", query: "harbour cruise" });
    await renderAndSettle();

    const href = shortcuts()[0].getAttribute("href")!;
    expect(href).toBe("/things-to-do?city=Sydney&q=harbour+cruise");
    for (const stale of ["rating=", "minPrice=", "maxPrice=", "sort=", "page=", "accessible=", "skipLine=", "activity="]) {
      expect(href).not.toContain(stale);
    }
  });

  it("a canonical Rome shortcut restores to the canonical path", async () => {
    seed({ kind: "things", city: "Rome" });
    await renderAndSettle();

    expect(shortcuts()[0].getAttribute("href")).toBe("/things-to-do/rome");
  });

  it("a canonical Rome shortcut with a query restores to the canonical path", async () => {
    seed({ kind: "things", city: "Rome", query: "colosseum tour" });
    await renderAndSettle();

    expect(shortcuts()[0].getAttribute("href")).toBe("/things-to-do/rome?q=colosseum+tour");
  });

  it("non-canonical cities keep the legacy hub contract", async () => {
    seed({ kind: "things", city: "Paris" }, daysFromNow(-2));
    seed({ kind: "things", city: "Sydney", query: "harbour cruise" }, daysFromNow(-1));
    await renderAndSettle();

    const hrefs = shortcuts().map(a => a.getAttribute("href"));
    expect(hrefs).toContain("/things-to-do?city=Paris");
    expect(hrefs).toContain("/things-to-do?city=Sydney&q=harbour+cruise");
    expect(hrefs).not.toContain("/things-to-do/paris");
    expect(hrefs).not.toContain("/things-to-do/sydney");
  });

  it("rendering a canonical shortcut does not rewrite the stored item", async () => {
    seed({ kind: "things", city: "Rome" });
    const rawBefore = localStorage.getItem(RECENT_ACTIVITY_STORAGE_KEY)!;
    await renderAndSettle();

    expect(shortcuts()[0].getAttribute("href")).toBe("/things-to-do/rome");

    // The URL is rebuilt at render time; storage stays exactly as written —
    // no slug, provider ref or canonical hint is persisted.
    const rawAfter = localStorage.getItem(RECENT_ACTIVITY_STORAGE_KEY)!;
    expect(rawAfter).toBe(rawBefore);
    expect(rawAfter).not.toMatch(/slug|providerRefs|viator|destinationId/i);
  });

  it("adds no tracking or affiliate parameters", async () => {
    seed(FUTURE_FLIGHT);
    seed({ kind: "things", city: "Rome" });
    await renderAndSettle();

    for (const href of hrefs()) expect(href).not.toMatch(/utm_|marker=|affiliate|ref=|partner/i);
  });
});

// ── LABELS ──

describe("Desktop recent activity — labels", () => {
  const LONG_ORIGIN = "Auckland International Airport Region";
  const LONG_DESTINATION = "Santiago de Chile Comodoro Arturo Merino";

  const routeParts = (link: HTMLElement) =>
    Array.from(link.querySelectorAll("span.truncate"))
      .map(s => s.textContent?.trim() ?? "")
      .filter(Boolean);

  it("falls back to IATA codes when no label was stored", async () => {
    seed({ ...FUTURE_FLIGHT, originLabel: undefined, destinationLabel: undefined });
    await renderAndSettle();

    expect(continuation().textContent).toContain("BNE");
    expect(continuation().textContent).toContain("KTM");
  });

  it("keeps the destination visible when the origin label is long", async () => {
    seed({ ...FUTURE_FLIGHT, originLabel: LONG_ORIGIN, destinationLabel: "Kathmandu" });
    await renderAndSettle();

    expect(routeParts(continuation())).toContain(LONG_ORIGIN);
    expect(routeParts(continuation())).toContain("Kathmandu");
  });

  it("keeps the origin visible when the destination label is long", async () => {
    seed({ ...FUTURE_FLIGHT, originLabel: "Brisbane", destinationLabel: LONG_DESTINATION });
    await renderAndSettle();

    expect(routeParts(continuation())).toContain("Brisbane");
    expect(routeParts(continuation())).toContain(LONG_DESTINATION);
  });

  it("represents origin, arrow and destination when both labels are long", async () => {
    seed({ ...FUTURE_FLIGHT, originLabel: LONG_ORIGIN, destinationLabel: LONG_DESTINATION });
    await renderAndSettle();

    const card = continuation();
    expect(routeParts(card)).toContain(LONG_ORIGIN);
    expect(routeParts(card)).toContain(LONG_DESTINATION);
    const arrow = Array.from(card.querySelectorAll("span")).find(s => s.textContent === "→");
    expect(arrow).toBeTruthy();
    expect(arrow!.className).toContain("shrink-0");
    expect(card.getAttribute("aria-label")).toBe(
      `Continue search, flights from ${LONG_ORIGIN} to ${LONG_DESTINATION}`,
    );
  });
});

// ── ANALYTICS ──

describe("Desktop recent activity — analytics", () => {
  it("uses generic labels with a desktop source and no history payload", async () => {
    seed(FUTURE_FLIGHT);
    seed({ kind: "things", city: "Sydney", query: "harbour cruise" });
    await renderAndSettle();

    continuation().click();
    expect(mockLogInternalNavigation).toHaveBeenLastCalledWith({
      label: "continue_recent_flight",
      source: "homepage-desktop",
      href: "/flights",
    });

    shortcuts()[0].click();
    expect(mockLogInternalNavigation).toHaveBeenLastCalledWith({
      label: "recent_things",
      source: "homepage-desktop",
      href: "/things-to-do",
    });

    for (const call of mockLogInternalNavigation.mock.calls) {
      const payload = JSON.stringify(call[0]);
      expect(payload).not.toContain("harbour cruise");
      expect(payload).not.toContain("BNE");
      expect(payload).not.toContain("?");
    }
  });
});

// ── ACCESSIBILITY AND SURROUNDING PAGE ──

describe("Desktop recent activity — presentation", () => {
  it("is a labelled region with an H2 and accessible link names", async () => {
    seed(FUTURE_FLIGHT);
    seed({ kind: "things", city: "Rome" });
    await renderAndSettle();

    expect(section()!.getAttribute("aria-labelledby")).toBe("recent-activity-heading");
    for (const link of sectionLinks()) {
      expect(link.getAttribute("aria-label")).toBeTruthy();
      expect(link.className).toContain("focus-visible:outline");
    }
  });

  it("hides icons and the route arrow from screen readers", async () => {
    seed(FUTURE_FLIGHT);
    await renderAndSettle();

    for (const svg of Array.from(section()!.querySelectorAll("svg"))) {
      expect(svg.getAttribute("aria-hidden")).toBe("true");
    }
  });

  it("shows no timestamps, prices or invented claims", async () => {
    seed(FUTURE_FLIGHT);
    seed({ kind: "things", city: "Rome" });
    await renderAndSettle();

    const text = section()!.textContent ?? "";
    expect(text).not.toMatch(/ago|yesterday|last (week|month)/i);
    expect(text).not.toMatch(/\$|price|deal|save|popular|only \d+/i);
  });

  it("sits after the search band and before the product cards", async () => {
    seed(FUTURE_FLIGHT);
    await renderAndSettle();

    const main = document.querySelector("main")!;
    const order = Array.from(main.children);
    const bandIndex = order.findIndex(el => el.id === "flight-search");
    const recentIndex = order.findIndex(el => el.contains(section()!));
    const cardsIndex = order.findIndex(el =>
      el.querySelector("#products-heading"),
    );
    expect(bandIndex).toBeLessThan(recentIndex);
    expect(recentIndex).toBeLessThan(cardsIndex);
  });

  it("leaves the D1 first viewport untouched", async () => {
    seed(FUTURE_FLIGHT);
    await renderAndSettle();

    const h1s = screen.getAllByRole("heading", { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent("Plan the whole trip, not just the flight.");
    const band = document.getElementById("flight-search")!;
    expect(band.contains(screen.getByTestId("modern-flight-search"))).toBe(true);
    expect(band.contains(section()!)).toBe(false);
  });

  it("adds no whole-trip next actions in this phase", async () => {
    seed(FUTURE_FLIGHT);
    await renderAndSettle();

    const text = section()!.textContent ?? "";
    expect(text).not.toMatch(/find a stay|things to do in|estimate this trip/i);
  });
});
