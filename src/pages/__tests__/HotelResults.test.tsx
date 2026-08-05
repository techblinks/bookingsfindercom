/**
 * HotelResults — redesigned Stays landing page (matches /flights structure).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import HotelResults from "@/pages/HotelResults";

const { mockLogInternalNavigation } = vi.hoisted(() => ({
  mockLogInternalNavigation: vi.fn(),
}));
vi.mock("@/lib/analytics", () => ({
  logAffiliateClick: vi.fn(() => Promise.resolve()),
  logSearch: vi.fn(() => Promise.resolve("mock-id")),
  logInternalNavigation: mockLogInternalNavigation,
}));
vi.mock("@/services/travelApi", () => ({ getRedirectUrl: vi.fn() }));
vi.mock("@/components/layout/Header", () => ({ default: () => <div data-testid="mock-header" /> }));
vi.mock("@/components/layout/Footer", () => ({ default: () => <div data-testid="mock-footer" /> }));

function renderHotel(opts?: { mobile?: boolean }) {
  Object.defineProperty(window, "innerWidth", { value: opts?.mobile ? 768 : 1440, writable: true, configurable: true });
  window.dispatchEvent(new Event("resize"));
  return render(<MemoryRouter initialEntries={["/hotels"]}><HotelResults /></MemoryRouter>);
}

describe("Stays landing page", () => {
  beforeEach(() => { vi.clearAllMocks(); Object.defineProperty(window, "innerWidth", { value: 1440, writable: true, configurable: true }); });
  afterEach(() => vi.restoreAllMocks());

  // ── Structure ────────────────────────────────────────────

  it("renders exactly one H1", () => {
    renderHotel();
    expect(screen.getAllByRole("heading", { level: 1 }).length).toBe(1);
  });

  it("renders Header and Footer", () => {
    renderHotel();
    expect(screen.getByTestId("mock-header")).toBeTruthy();
    expect(screen.getByTestId("mock-footer")).toBeTruthy();
  });

  it("section order matches specification", () => {
    renderHotel();
    const t = document.body.textContent || "";
    const order = ["Find the right stay","Search accommodation for your trip","Current availability from Trip.com","Popular stay destinations","Why plan stays with BookingsFinder","Helpful trip-planning tools","Frequently asked questions","BookingsFinder helps you plan and search"];
    let prev = 0;
    for (const item of order) { const idx = t.indexOf(item); expect(idx).toBeGreaterThan(prev); prev = idx; }
  });

  it("has pale-blue page background", () => {
    renderHotel();
    expect(document.querySelector(".bg-\\[\\#EDF4FC\\]") || document.querySelector(".bg-background")).toBeTruthy();
  });

  it("no dark navy full-width hero", () => {
    renderHotel();
    expect(document.querySelectorAll(".bg-\\[\\#001D45\\]").length).toBe(0);
  });

  // ── Desktop widget ────────────────────────────────────────

  it("desktop host uses layout S10391", () => {
    const source = require("fs").readFileSync("public/tripcom-hotel-widget-desktop.html", "utf-8");
    expect(source).toContain("layout=S10391");
  });

  it("desktop host uses powered_by=false", () => {
    const source = require("fs").readFileSync("public/tripcom-hotel-widget-desktop.html", "utf-8");
    expect(source).toContain("powered_by=false");
  });

  it("S606230 is absent from active flow", () => {
    const source = require("fs").readFileSync("public/tripcom-hotel-widget-desktop.html", "utf-8");
    expect(source).not.toContain("S606230");
  });

  it("desktop widget uses width 100% (iframeW: 0)", () => {
    const source = require("fs").readFileSync("src/components/hotels/TripComHotelWidget.tsx", "utf-8");
    expect(source).toContain("iframeW: 0");
    expect(source).toContain("100%");
  });

  it("desktop search card has proper styling", () => {
    const source = require("fs").readFileSync("src/pages/HotelResults.tsx", "utf-8");
    expect(source).toContain("max-w-[1200px]");
    expect(source).toContain("rounded-[20px]");
  });

  // ── Mobile ────────────────────────────────────────────────

  it("mobile viewport shows trigger card, not active widget iframe", () => {
    renderHotel({ mobile: true });
    expect(document.querySelectorAll("iframe").length).toBe(1); // hidden desktop
    expect(screen.getByText("Search current stays")).toBeTruthy();
    expect(screen.getByText("Open stay search")).toBeTruthy();
  });

  it("opening dialog mounts mobile iframe (S10409)", async () => {
    renderHotel({ mobile: true });
    fireEvent.click(screen.getByText("Open stay search"));
    await waitFor(() => {
      const iframes = document.querySelectorAll("iframe");
      expect(iframes.length).toBe(2);
      expect(iframes[iframes.length - 1].getAttribute("src")).toBe("/tripcom-hotel-widget-mobile.html");
    });
  });

  it("closing dialog unmounts mobile iframe", async () => {
    renderHotel({ mobile: true });
    fireEvent.click(screen.getByText("Open stay search"));
    await waitFor(() => expect(document.querySelectorAll("iframe").length).toBe(2));
    fireEvent.click(screen.getByLabelText("Close stay search"));
    expect(document.querySelectorAll("iframe").length).toBe(1);
  });

  // ── Destinations ──────────────────────────────────────────

  it("all six destinations present", () => {
    renderHotel();
    ["Sydney","Melbourne","Brisbane","Gold Coast","Bali","Kathmandu"].forEach(d => expect(screen.getByText(d)).toBeTruthy());
  });

  it("no fake prices or ratings on destination cards", () => {
    renderHotel();
    expect(screen.queryByText(/\$/)).toBeNull();
    expect(screen.queryByText(/stars/i)).toBeNull();
  });

  it("no multiple-provider claim", () => {
    renderHotel();
    const t = document.body.textContent || "";
    expect(t).not.toMatch(/compare.*hotels|multiple.*provider/i);
    expect(t).not.toMatch(/search.*hundreds.*sites/i);
  });

  // ── Tool routes ───────────────────────────────────────────

  it("links to /trip-cost, /flights, /optimizer", () => {
    renderHotel();
    ["/trip-cost","/flights","/optimizer"].forEach(h => {
      expect(Array.from(document.querySelectorAll(`a[href='${h}']`)).length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── No transform/scale/zoom ───────────────────────────────

  it("no transform scale or zoom", () => {
    const source = require("fs").readFileSync("src/components/hotels/TripComHotelWidget.tsx", "utf-8");
    expect(source).not.toMatch(/transform.*scale/);
    expect(source).not.toContain("zoom:");
  });

  // ── Affiliate params ──────────────────────────────────────

  it("affiliate params preserved in both hosts", () => {
    for (const f of ["desktop","mobile"]) {
      const source = require("fs").readFileSync(`public/tripcom-hotel-widget-${f}.html`, "utf-8");
      expect(source).toContain("trs=44922");
      expect(source).toContain("campaign_id=121");
      expect(source).toContain("promo_id=4038");
    }
  });

  // ── Disclosure ────────────────────────────────────────────

  it("disclosure text is present", () => {
    renderHotel();
    expect(screen.getByText(/BookingsFinder helps you plan and search for accommodation/)).toBeTruthy();
  });

  it("disclosure mentions Trip.com", () => {
    renderHotel();
    expect(screen.getByText(/Current prices, availability, payment and booking conditions are provided by Trip\.com/)).toBeTruthy();
  });

  // ── FAQ ───────────────────────────────────────────────────

  it("FAQ questions are present", () => {
    renderHotel();
    expect(screen.getByText("Does BookingsFinder book accommodation directly?")).toBeTruthy();
    expect(screen.getByText("Does BookingsFinder charge a booking fee?")).toBeTruthy();
    expect(screen.getByText("Who handles payments and cancellations?")).toBeTruthy();
  });

  // ── No forbidden references ───────────────────────────────

  it("no Hotellook or synthetic references", () => {
    ["src/pages/HotelResults.tsx","src/components/hotels/TripComHotelWidget.tsx","src/components/hotels/MobileStaysDialog.tsx"].forEach(f => {
      const s = require("fs").readFileSync(f, "utf-8");
      expect(s).not.toMatch(/hotellook/i);
      expect(s).not.toMatch(/searchHotels/i);
    });
  });

  it("no affiliate clicks on load", async () => {
    const { logAffiliateClick } = await import("@/lib/analytics");
    renderHotel();
    await new Promise(r => setTimeout(r, 300));
    expect(logAffiliateClick).not.toHaveBeenCalled();
  });

  // ── Section anchors ───────────────────────────────────────

  it("search section has id=stay-search", () => {
    renderHotel();
    expect(document.getElementById("stay-search")).toBeTruthy();
  });

  it("hero H1 is correct", () => {
    renderHotel();
    expect(screen.getByText("Find the right stay for your next trip")).toBeTruthy();
  });
});
