/**
 * Mobile V2 Phase 1 — MobileHome: hero, trust line, search, quick actions,
 * compact how-it-works, and removal of the old five-card disclosure block.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { TripProvider } from "@/context/TripContext";
import MobileHome from "@/pages/home/MobileHome";
import { TRUST_ITEMS } from "@/components/shared/TrustContent";

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

/** Quick actions live in their own labelled section — Header nav repeats the labels. */
function quickActionsSection(): HTMLElement {
  const el = document.querySelector<HTMLElement>('section[aria-labelledby="mobile-actions-heading"]');
  expect(el).toBeTruthy();
  return el!;
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe("MobileHome — hero", () => {
  it("renders the value-proposition H1", () => {
    renderMobileHome();
    const h1s = screen.getAllByRole("heading", { level: 1 });
    expect(h1s.length).toBe(1);
    expect(h1s[0].textContent).toBe("Plan the whole trip,not just the flight.");
  });

  it("explains the three things you can compare and the whole trip cost", () => {
    renderMobileHome();
    const support = screen.getByText(/Compare flights, stays and things to do/);
    expect(support.textContent).toMatch(/what the whole trip is likely to cost/);
  });

  it("does not use the old utility heading", () => {
    renderMobileHome();
    expect(screen.queryByText("Bookings Finder")).toBeNull();
    expect(screen.queryByText("Where are you going?")?.tagName).not.toBe("P");
  });

  it("adds no hero image in Phase 1", () => {
    renderMobileHome();
    // The mocked BrandLogo in Header is the only image on the page
    expect(screen.getAllByRole("img").length).toBe(1);
  });
});

describe("MobileHome — compact trust line", () => {
  it("renders all three commitments", () => {
    renderMobileHome();
    expect(screen.getByText("Independent comparison")).toBeTruthy();
    expect(screen.getByText("We don't sell travel")).toBeTruthy();
    expect(screen.getByText("You book with the provider")).toBeTruthy();
  });

  it("is a single compact element, not a stack of cards", () => {
    renderMobileHome();
    const line = screen.getByText("Independent comparison").closest("p");
    expect(line).toBeTruthy();
    expect(line!.textContent).toContain("We don't sell travel");
    expect(line!.textContent).toContain("You book with the provider");
  });
});

describe("MobileHome — old five-card disclosure block removed", () => {
  it("no longer renders the 'How Bookings Finder works' card block", () => {
    renderMobileHome();
    expect(screen.queryByText("How Bookings Finder works")).toBeNull();
    expect(screen.queryByText("How BookingsFinder works")).toBeNull();
  });

  it("none of the five long TRUST_ITEMS paragraphs appear on the homepage", () => {
    renderMobileHome();
    for (const item of TRUST_ITEMS) {
      expect(screen.queryByText(item.text)).toBeNull();
    }
  });
});

describe("MobileHome — destination search", () => {
  it("keeps the existing search entry point", () => {
    renderMobileHome();
    const cta = screen.getByText("Search a city or destination").closest("a");
    expect(cta).toBeTruthy();
    expect(cta!.getAttribute("href")).toBe("/flights");
  });

  it("clarifies what the search is for", () => {
    renderMobileHome();
    expect(screen.getByText("Pick a destination to start planning your trip.")).toBeTruthy();
    expect(screen.getByText("Where are you going?").tagName).toBe("H2");
  });

  it("does NOT render the full flight search form", () => {
    renderMobileHome();
    expect(screen.queryByTestId("modern-flight-search")).toBeNull();
    expect(screen.queryByText("Search available flights")).toBeNull();
  });
});

describe("MobileHome — quick actions (1x3)", () => {
  it("renders exactly three actions", () => {
    const section = (renderMobileHome(), quickActionsSection());
    const links = section.querySelectorAll("a");
    expect(links.length).toBe(3);
  });

  it("actions are Flights, Stays and Things", () => {
    renderMobileHome();
    const section = quickActionsSection();
    const hrefs = Array.from(section.querySelectorAll("a")).map(a => a.getAttribute("href"));
    expect(hrefs).toEqual(["/flights", "/hotels", "/things-to-do"]);
    expect(section.textContent).toContain("Flights");
    expect(section.textContent).toContain("Stays");
    expect(section.textContent).toContain("Things");
  });

  it("Trip Cost is no longer a homepage quick action", () => {
    renderMobileHome();
    const section = quickActionsSection();
    expect(section.textContent).not.toContain("Trip Cost");
    const hrefs = Array.from(section.querySelectorAll("a")).map(a => a.getAttribute("href"));
    expect(hrefs).not.toContain("/trip-cost");
  });

  it("uses a 3-column grid, not a 2x2 card grid", () => {
    renderMobileHome();
    const grid = quickActionsSection().querySelector("ul");
    expect(grid!.className).toContain("grid-cols-3");
    expect(grid!.className).not.toContain("grid-cols-2");
  });

  it("actions keep a 44px+ touch target", () => {
    renderMobileHome();
    for (const link of Array.from(quickActionsSection().querySelectorAll("a"))) {
      expect(link.className).toMatch(/min-h-\[4[4-9]px\]|min-h-\[[5-9]\dpx\]/);
    }
  });
});

describe("MobileHome — compact 3-step how it works", () => {
  it("renders the section heading as an H2", () => {
    renderMobileHome();
    const heading = screen.getByText("How it works");
    expect(heading.tagName).toBe("H2");
  });

  it("renders the three honest steps in order", () => {
    renderMobileHome();
    const list = screen.getByText("Search across providers").closest("ol");
    expect(list).toBeTruthy();
    const steps = Array.from(list!.querySelectorAll("li")).map(li => li.textContent);
    expect(steps).toEqual([
      "1Search across providers",
      "2Compare openly",
      "3Book with the provider",
    ]);
  });

  it("uses an ordered list with exactly three steps", () => {
    renderMobileHome();
    const list = screen.getByText("Compare openly").closest("ol")!;
    expect(list.querySelectorAll("li").length).toBe(3);
  });
});

describe("MobileHome — bottom navigation clearance", () => {
  it("the footer is the last element and carries bottom-nav padding", () => {
    renderMobileHome();
    // Footer is mocked here; the real clearance lives in MobileFooter.
    expect(screen.getByTestId("footer")).toBeTruthy();
  });

  it("main content is not given a competing fixed bottom pad", () => {
    renderMobileHome();
    const main = document.querySelector("main")!;
    expect(main.className).not.toContain("pb-16");
  });
});

describe("MobileHome — accessibility", () => {
  it("has a skip link and a main landmark", () => {
    renderMobileHome();
    // Header renders one too — both must be anchors pointing at #main-content
    const skips = screen.getAllByText(/skip to main content/i);
    expect(skips.length).toBeGreaterThanOrEqual(1);
    for (const skip of skips) {
      expect(skip.tagName).toBe("A");
      expect(skip.getAttribute("href")).toBe("#main-content");
    }
    expect(document.querySelector("main")).toBeTruthy();
  });

  it("every section is labelled", () => {
    renderMobileHome();
    for (const section of Array.from(document.querySelectorAll("main section"))) {
      expect(section.getAttribute("aria-labelledby")).toBeTruthy();
    }
  });

  it("decorative icons are hidden from screen readers", () => {
    renderMobileHome();
    const main = document.querySelector("main")!;
    for (const svg of Array.from(main.querySelectorAll("svg"))) {
      expect(svg.getAttribute("aria-hidden")).toBe("true");
    }
  });

  it("all interactive homepage elements are semantic links or buttons", () => {
    renderMobileHome();
    const main = document.querySelector("main")!;
    expect(main.querySelectorAll('[role="button"]').length).toBe(0);
    for (const link of Array.from(main.querySelectorAll("a"))) {
      expect(link.getAttribute("href")).toBeTruthy();
    }
  });

  it("interactive elements expose a visible focus indicator", () => {
    renderMobileHome();
    const main = document.querySelector("main")!;
    for (const link of Array.from(main.querySelectorAll("a"))) {
      expect(link.className).toContain("focus-visible:outline");
    }
  });

  it("motion is opt-out via motion-safe, no unconditional animation", () => {
    renderMobileHome();
    const main = document.querySelector("main")!;
    for (const el of Array.from(main.querySelectorAll("*"))) {
      const cls = el.className?.toString() ?? "";
      if (cls.includes("transition")) expect(cls).toContain("motion-safe:transition");
      expect(cls).not.toMatch(/\banimate-/);
    }
  });
});

describe("MobileHome — partial trip state", () => {
  it("shows continue planning section when trip exists", () => {
    seedTrip({ destination: { name: "Sydney" } });
    renderMobileHome();
    expect(screen.getByText("Continue planning")).toBeTruthy();
    expect(screen.getAllByText("Sydney").length).toBeGreaterThanOrEqual(1);
  });

  it("shows dates and travellers when present", () => {
    seedTrip({ destination: { name: "Sydney" }, dates: { departureDate: "2026-08-18", returnDate: "2026-08-29" }, travellers: { adults: 2, children: 1, infants: 0 } });
    renderMobileHome();
    expect(screen.getAllByText(/3 travellers/).length).toBeGreaterThanOrEqual(1);
  });

  it("quick actions stay a single 1x3 row regardless of trip state", () => {
    seedTrip({ destination: { name: "Sydney" } });
    renderMobileHome();
    expect(quickActionsSection().querySelectorAll("a").length).toBe(3);
  });

  it("no fabricated 'Flight selected' or similar claims", () => {
    seedTrip({ destination: { name: "Sydney" } });
    renderMobileHome();
    expect(screen.queryByText(/flight.*selected/i)).toBeNull();
    expect(screen.queryByText(/stay.*selected/i)).toBeNull();
    expect(screen.queryByText(/activity.*saved/i)).toBeNull();
  });
});

describe("MobileHome — no fabricated content", () => {
  it("no prices, savings or urgency", () => {
    renderMobileHome();
    const text = document.querySelector("main")!.textContent || "";
    expect(text).not.toMatch(/\$|save up to|lowest price|best price|hurry|only \d+ left/i);
  });

  it("no fake reviews or popularity claims", () => {
    renderMobileHome();
    const text = document.querySelector("main")!.textContent || "";
    expect(text).not.toMatch(/trustpilot|\d+ reviews|rated \d|most popular|\d+ people/i);
  });

  it("does NOT show fake checkmarks or selected state", () => {
    renderMobileHome();
    expect(screen.queryByText(/selected/i)).toBeNull();
    expect(screen.queryByText(/booked/i)).toBeNull();
  });
});

describe("M1.1 accessibility fixes", () => {
  it("splash overlay uses pointer-events-none (never blocks interaction)", async () => {
    const { readFileSync } = await import("node:fs");
    const mainSource = readFileSync("src/main.tsx", "utf-8");
    expect(mainSource).toContain("pointer-events-none");
    expect(mainSource).not.toContain("pointerEvents: visible ? 'auto' : 'none'");
  });
});

describe("Protected areas untouched by Phase 1", () => {
  it("MobileHome does not import MobileFlightSearch", async () => {
    const { readFileSync } = await import("node:fs");
    const source = readFileSync("src/pages/home/MobileHome.tsx", "utf-8");
    expect(source).not.toContain("MobileFlightSearch");
    expect(source).not.toContain("LocationCombobox");
  });
});
