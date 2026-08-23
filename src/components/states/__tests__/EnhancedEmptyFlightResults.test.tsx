/**
 * BF-0R-7.2 — flight empty-state truth cleanup.
 *
 * Covers:
 *   Phase B: no fabricated nearby-airport/"100 miles" claim
 *   Phase C: no premature price-alert email promise
 *   Phase D: alternative date/destination links preserve the full
 *            supported traveller/cabin contract
 *   Phase E: no unverified "Popular" claim; no cached-fare price is
 *            fetched or shown in the explore-destinations list (final
 *            correction item 1)
 *   Phase F: Modify Search reopens the in-page form, never navigates home
 *   Final correction item 2: alternative-date generation is timezone-safe
 *            (date-fns parseISO/addDays/format) and respects the return-date
 *            boundary on round trips
 */
import { describe, it, expect, vi, afterAll } from "vitest";
import type { ComponentProps } from "react";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import EnhancedEmptyFlightResults from "../EnhancedEmptyFlightResults";

function renderEmpty(props: Partial<ComponentProps<typeof EnhancedEmptyFlightResults>> = {}) {
  return render(
    <MemoryRouter>
      <EnhancedEmptyFlightResults
        origin="SYD"
        destination="MEL"
        departureDate="2030-06-10"
        returnDate="2030-06-20"
        {...props}
      />
    </MemoryRouter>
  );
}

/**
 * Scoped to the "Try Different Dates" card specifically — every link on
 * this page (date AND destination alternatives) carries a departureDate
 * param, since getFlightSearchUrl always includes the current one, so
 * filtering by href content alone can't tell the two apart.
 */
const dateLinks = () => {
  const heading = screen.getByText("Try Different Dates");
  const card = heading.closest(".p-6") as HTMLElement;
  return within(card).getAllByRole("link");
};

// ── Phase B: no fabricated nearby-airport claim ──

describe("EnhancedEmptyFlightResults — no fabricated nearby-airport claim (Phase B)", () => {
  it("item 1: does not claim 'within 100 miles' anywhere", () => {
    const { container } = renderEmpty();
    expect(container.textContent).not.toMatch(/100 miles/i);
    expect(screen.queryByText(/nearby airports/i)).toBeNull();
  });

  it("item 2: does not render the hardcoded MEL/BNE nearby-airport suggestions for a SYD origin", () => {
    renderEmpty({ origin: "SYD", destination: "MEL" });
    // MEL is the searched destination, so its absence as a "nearby airport"
    // suggestion is checked via the removed section heading instead.
    expect(screen.queryByText("Try Nearby Airports")).toBeNull();
    expect(screen.queryByText("Brisbane")).toBeNull();
  });
});

// ── Phase C: no premature price-alert promise ──

describe("EnhancedEmptyFlightResults — no premature price-alert promise (Phase C)", () => {
  it("item 3: renders no price-alert email promise", () => {
    const { container } = renderEmpty();
    expect(screen.queryByText(/get notified when flights become available/i)).toBeNull();
    expect(container.textContent).not.toMatch(/we'll email you/i);
  });

  it("item 4: PriceAlertDialog is not reachable — no 'Set alert'-style trigger renders", () => {
    renderEmpty();
    // PriceAlertDialog's own trigger button copy — asserting its complete
    // absence from the DOM proves the dialog was never mounted.
    expect(screen.queryByText(/set.*alert/i)).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

// ── Phase D: traveller/cabin context preserved on suggestion links ──

describe("EnhancedEmptyFlightResults — alternative-date links preserve search context (Phase D)", () => {
  it("items 5-8: preserves adults, children, infants and cabin class", () => {
    renderEmpty({ adults: 2, children: 1, infants: 1, cabinClass: "business" });

    const links = dateLinks();
    expect(links.length).toBeGreaterThan(0);
    links.forEach(link => {
      const href = link.getAttribute("href")!;
      expect(href).toContain("adults=2");
      expect(href).toContain("children=1");
      expect(href).toContain("infants=1");
      expect(href).toContain("cabinClass=business");
    });
  });

  it("does not silently reset a family search to a single traveller (regression)", () => {
    renderEmpty({ adults: 4, children: 2, infants: 0, cabinClass: "economy", returnDate: "" });

    dateLinks().forEach(link => {
      const href = link.getAttribute("href")!;
      expect(href).not.toContain("adults=1&");
      expect(href).toContain("adults=4");
    });
  });

  it("preserves the return date on alternative-date links", () => {
    renderEmpty({ returnDate: "2030-07-20" });
    dateLinks().forEach(link => {
      expect(link.getAttribute("href")).toContain("returnDate=2030-07-20");
    });
  });

  it("item 9: preserves traveller context on alternative-destination links too", () => {
    renderEmpty({ adults: 3, children: 0, infants: 1, cabinClass: "economy" });

    const destinationLink = screen.getByRole("link", { name: /Singapore/i });
    const href = destinationLink.getAttribute("href")!;
    expect(href).toContain("adults=3");
    expect(href).toContain("infants=1");
    expect(href).toContain("cabinClass=economy");
    expect(href).toContain("destination=SIN");
  });
});

// ── Phase E: no unverified "Popular" claim, no fetched price ──

describe("EnhancedEmptyFlightResults — no unverified 'Popular' claim, no fetched price (Phase E / final correction item 1)", () => {
  it("item 10: 'Popular Flights' wording is gone", () => {
    const { container } = renderEmpty();
    expect(container.textContent).not.toMatch(/popular flights/i);
    expect(container.textContent).not.toMatch(/popular destinations/i);
  });

  it("item 11: truthful 'Explore other destinations' wording renders instead", () => {
    renderEmpty({ origin: "SYD" });
    expect(screen.getByText("Explore other destinations from SYD")).toBeTruthy();
    expect(screen.getByText(/try another destination from your departure airport/i)).toBeTruthy();
  });

  it("always shows 'View options' for every destination — never a fetched numeric price", () => {
    renderEmpty();
    // Exactly 4 exploratory destinations are offered (SIN/DXB/LHR/LAX for
    // a non-MEL/non-SYD-clashing origin), every one labelled "View options".
    expect(screen.getAllByText("View options")).toHaveLength(4);
    expect(screen.queryByText(/recent from/i)).toBeNull();
    expect(screen.queryByText(/\$\d/)).toBeNull();
  });

  it("does not render a price-loading skeleton for the destination list", () => {
    const { container } = renderEmpty();
    // The old route-price skeletons carried this exact class; asserting
    // its absence proves no loading state was ever introduced.
    expect(container.querySelectorAll(".h-5.w-16").length).toBe(0);
  });
});

// ── Phase F: Modify Search reopens the in-page form ──

describe("EnhancedEmptyFlightResults — Modify Search reopens the in-page form (Phase F)", () => {
  it("item 12: clicking Modify Search calls the onModifySearch callback", () => {
    const onModifySearch = vi.fn();
    renderEmpty({ onModifySearch });

    screen.getByRole("button", { name: /modify search/i }).click();
    expect(onModifySearch).toHaveBeenCalledTimes(1);
  });

  it("item 13: Modify Search is a button, not a link to '/'", () => {
    renderEmpty({ onModifySearch: vi.fn() });

    const modifyButton = screen.getByRole("button", { name: /modify search/i });
    expect(modifyButton.closest("a")).toBeNull();
    expect(screen.queryByRole("link", { name: /modify search/i })).toBeNull();
  });

  it("does not render Modify Search at all when no callback is supplied, rather than falling back to a home link", () => {
    renderEmpty({ onModifySearch: undefined });
    expect(screen.queryByRole("button", { name: /modify search/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /modify search/i })).toBeNull();
  });
});

// ── Final correction item 2: timezone-safe alternative-date generation ──

describe("EnhancedEmptyFlightResults — timezone-safe alternative dates (final correction item 2)", () => {
  const originalTZ = process.env.TZ;
  afterAll(() => {
    process.env.TZ = originalTZ;
  });

  it("regression 1: the label and the URL date always name the same calendar day, even far from UTC", () => {
    // A host timezone far from any of these dates' own implied offset —
    // if the old UTC-parsing bug were present, the label (derived from a
    // Date built one way) and the URL (derived via toISOString) could
    // disagree by a day here.
    process.env.TZ = "Pacific/Kiritimati"; // UTC+14
    renderEmpty({ departureDate: "2030-06-10", returnDate: "" });

    const links = dateLinks();
    expect(links.length).toBeGreaterThan(0);
    links.forEach(link => {
      const href = link.getAttribute("href")!;
      const urlDate = new URL(href, "https://example.com").searchParams.get("departureDate")!;
      const [, , day] = urlDate.split("-");
      // The visible button label ("Wed, Jun 7" etc.) must contain the same
      // day-of-month as the URL it links to.
      const dayNum = String(Number(day));
      const label = link.textContent || "";
      expect(label).toContain(dayNum);
    });
  });

  it("regression 2: offers exactly -3..-1 and +1..+3 days from the requested calendar date (2030-06-10)", () => {
    renderEmpty({ departureDate: "2030-06-10", returnDate: "" });

    const expectedDates = ["2030-06-07", "2030-06-08", "2030-06-09", "2030-06-11", "2030-06-12", "2030-06-13"];
    const links = dateLinks();
    expect(links.length).toBe(6);
    const hrefDates = links.map(l => new URL(l.getAttribute("href")!, "https://example.com").searchParams.get("departureDate"));
    expectedDates.forEach(d => expect(hrefDates).toContain(d));
  });

  it("regression 3: a round trip never offers an alternative departure on or after the return date", () => {
    // Return date is only 2 days after departure, so +2 and +3 alternative
    // departures (2030-06-12, 2030-06-13) would land on/after the return
    // (2030-06-12) and must be excluded.
    renderEmpty({ departureDate: "2030-06-10", returnDate: "2030-06-12" });

    const links = dateLinks();
    const hrefDates = links.map(l => new URL(l.getAttribute("href")!, "https://example.com").searchParams.get("departureDate"));
    expect(hrefDates).not.toContain("2030-06-12");
    expect(hrefDates).not.toContain("2030-06-13");
    // The earlier, valid alternatives are still offered.
    expect(hrefDates).toContain("2030-06-07");
    expect(hrefDates).toContain("2030-06-09");
    expect(hrefDates).toContain("2030-06-11");
  });

  it("regression 4: adults is preserved on alternative-date links", () => {
    renderEmpty({ adults: 5, returnDate: "" });
    dateLinks().forEach(l => expect(l.getAttribute("href")).toContain("adults=5"));
  });

  it("regression 5: children is preserved on alternative-date links", () => {
    renderEmpty({ children: 3, returnDate: "" });
    dateLinks().forEach(l => expect(l.getAttribute("href")).toContain("children=3"));
  });

  it("regression 6: infants is preserved on alternative-date links", () => {
    renderEmpty({ infants: 2, adults: 3, returnDate: "" });
    dateLinks().forEach(l => expect(l.getAttribute("href")).toContain("infants=2"));
  });

  it("regression 7: cabinClass is preserved on alternative-date links", () => {
    renderEmpty({ cabinClass: "business", returnDate: "" });
    dateLinks().forEach(l => expect(l.getAttribute("href")).toContain("cabinClass=business"));
  });

  it("regression 8: returnDate is preserved on alternative-date links (when it doesn't exclude the candidate)", () => {
    renderEmpty({ departureDate: "2030-06-10", returnDate: "2030-08-01" });
    const links = dateLinks();
    expect(links.length).toBe(6); // far enough away that nothing is excluded
    links.forEach(l => expect(l.getAttribute("href")).toContain("returnDate=2030-08-01"));
  });
});
