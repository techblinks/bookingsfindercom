/**
 * HotelResults — inactive provider regression tests.
 *
 * Verifies that:
 * - The search form is preserved
 * - No affiliate click is logged when provider is inactive
 * - "Hotel partner configuration is being updated." is shown
 * - Search values are preserved in the unavailable state
 * - No synthetic hotel inventory is rendered
 * - No hotellook URLs are navigated to
 * - Occupancy is never altered (1 adult stays 1 adult)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import HotelResults from "@/pages/HotelResults";

// ── Hoisted mocks ──────────────────────────────────────────────
const { mockLogAffiliateClick } = vi.hoisted(() => ({
  mockLogAffiliateClick: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/lib/analytics", () => ({
  logAffiliateClick: (...args: unknown[]) => mockLogAffiliateClick(...args),
  logSearch: vi.fn(() => Promise.resolve("mock-id")),
}));

vi.mock("@/services/travelApi", () => ({
  getRedirectUrl: vi.fn(),
}));

vi.mock("@/components/layout/Header", () => ({ default: () => <div data-testid="mock-header" /> }));
vi.mock("@/components/layout/Footer", () => ({ default: () => <div data-testid="mock-footer" /> }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

// ── Helpers ─────────────────────────────────────────────────────

function renderHotelResults(searchParams: Record<string, string> = {
  destination: "Sydney", checkIn: "2026-09-01", checkOut: "2026-09-05", guests: "2", rooms: "1",
}) {
  const qs = new URLSearchParams(searchParams).toString();

  const hrefSetter = vi.fn();
  const origHref = window.location.href;
  Object.defineProperty(window, "location", {
    value: { ...window.location, href: origHref },
    writable: true,
    configurable: true,
  });
  Object.defineProperty(window.location, "href", {
    get: () => origHref,
    set: hrefSetter,
    configurable: true,
  });

  const result = render(
    <MemoryRouter initialEntries={[`/hotels?${qs}`]}>
      <HotelResults />
    </MemoryRouter>
  );

  return { hrefSetter, ...result };
}

function renderPreSearch() {
  return render(
    <MemoryRouter initialEntries={["/hotels"]}>
      <HotelResults />
    </MemoryRouter>
  );
}

describe("HotelResults — inactive provider", () => {
  beforeEach(() => {
    mockLogAffiliateClick.mockClear();
    mockLogAffiliateClick.mockResolvedValue(undefined);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── 1. No affiliate click ever ──────────────────────────────

  it("does NOT call logAffiliateClick when search params are present", async () => {
    renderHotelResults();

    // Wait for any async effects to settle
    await new Promise(r => setTimeout(r, 500));
    expect(mockLogAffiliateClick).not.toHaveBeenCalled();
  });

  it("does NOT call logAffiliateClick with 1 adult", async () => {
    renderHotelResults({ destination: "Sydney", checkIn: "2026-09-01", checkOut: "2026-09-05", guests: "1", rooms: "1" });

    await new Promise(r => setTimeout(r, 500));
    expect(mockLogAffiliateClick).not.toHaveBeenCalled();
  });

  it("does NOT call logAffiliateClick on initial render without params", () => {
    renderPreSearch();
    expect(mockLogAffiliateClick).not.toHaveBeenCalled();
  });

  // ── 2. "Hotel partner configuration is being updated" ───────

  it("shows configuration update message when search params are provided", async () => {
    renderHotelResults();

    const heading = await screen.findByText("Hotel partner configuration is being updated.");
    expect(heading).toBeTruthy();
  });

  it("shows that the search has been preserved", async () => {
    renderHotelResults({ destination: "Bali", checkIn: "2026-10-01", checkOut: "2026-10-07", guests: "2", rooms: "1" });

    const heading = await screen.findByText("Hotel partner configuration is being updated.");
    expect(heading).toBeTruthy();
    const baliEls = screen.getAllByText(/Bali/);
    expect(baliEls.length).toBeGreaterThanOrEqual(1);
  });

  // ── 3. Search values preserved ──────────────────────────────

  it("preserves destination in the update message", async () => {
    renderHotelResults({ destination: "Cooma", checkIn: "2026-09-01", checkOut: "2026-09-05", guests: "1", rooms: "1" });

    const heading = await screen.findByText("Hotel partner configuration is being updated.");
    expect(heading).toBeTruthy();
    const coomaEls = screen.getAllByText("Cooma");
    expect(coomaEls.length).toBeGreaterThanOrEqual(1);
  });

  it("preserves all entered dates, guests, rooms", async () => {
    renderHotelResults({ destination: "Darwin", checkIn: "2026-11-15", checkOut: "2026-11-20", guests: "3", rooms: "2" });

    await screen.findByText("Hotel partner configuration is being updated.");
    const darwinEls = screen.getAllByText("Darwin");
    expect(darwinEls.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("2026-11-15")).toBeTruthy();
    expect(screen.getByText("2026-11-20")).toBeTruthy();
    expect(screen.getByText("3 guests")).toBeTruthy();
    expect(screen.getByText("2 rooms")).toBeTruthy();
  });

  it("1 adult is displayed as '1 guest', not '2 guests'", async () => {
    renderHotelResults({ destination: "Sydney", checkIn: "2026-09-01", checkOut: "2026-09-05", guests: "1", rooms: "1" });

    await screen.findByText("Hotel partner configuration is being updated.");
    // Should show "1 guest" not "2 guests"
    expect(screen.getByText("1 guest")).toBeTruthy();
  });

  it("2 adults are displayed as '2 guests'", async () => {
    renderHotelResults({ destination: "Sydney", checkIn: "2026-09-01", checkOut: "2026-09-05", guests: "2", rooms: "1" });

    await screen.findByText("Hotel partner configuration is being updated.");
    expect(screen.getByText("2 guests")).toBeTruthy();
  });

  // ── 4. No navigation to hotellook ───────────────────────────

  it("does NOT navigate to any hotellook URL", async () => {
    const { hrefSetter } = renderHotelResults();

    await screen.findByText("Hotel partner configuration is being updated.");

    // No navigation should have occurred
    const redirectCalls = hrefSetter.mock.calls.filter(
      (c: string[]) => (c[0] as string).includes("hotellook")
    );
    expect(redirectCalls.length).toBe(0);
  });

  it("does NOT navigate to /redirect", async () => {
    const { hrefSetter } = renderHotelResults();

    await screen.findByText("Hotel partner configuration is being updated.");

    const redirectCalls = hrefSetter.mock.calls.filter(
      (c: string[]) => (c[0] as string).includes("/redirect")
    );
    expect(redirectCalls.length).toBe(0);
  });

  // ── 5. No synthetic hotel cards, prices, ratings ────────────

  it("renders no hotel cards with star ratings or prices", async () => {
    renderHotelResults();

    await screen.findByText("Hotel partner configuration is being updated.");

    expect(screen.queryByText(/stars/i)).toBeNull();
    expect(screen.queryByText(/\$\d+/)).toBeNull();
    const images = document.querySelectorAll('img[src*="unsplash"]');
    expect(images.length).toBe(0);
  });

  // ── 6. Pre-search form works normally ───────────────────────

  it("renders the search form when no params are present", () => {
    renderPreSearch();

    expect(screen.getByText(/Search accommodation with our travel partner/)).toBeTruthy();
    expect(screen.getByText(/Current prices and availability are shown by the provider/)).toBeTruthy();
  });

  // ── 7. Cooma / manual destination preserved ────────────────

  it("preserves manual destination like Cooma", async () => {
    renderHotelResults({ destination: "Cooma", checkIn: "2026-12-01", checkOut: "2026-12-05", guests: "1", rooms: "1" });

    await screen.findByText("Hotel partner configuration is being updated.");
    const coomaEls = screen.getAllByText("Cooma");
    expect(coomaEls.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("1 guest")).toBeTruthy();
  });
});
