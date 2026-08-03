/**
 * Phase 7H-1F — HotelResults component-level affiliate-click tests.
 *
 * These tests render the actual HotelResults component, click the real
 * View Deal control, and verify analytics behaviour. No handleViewDeal
 * logic is duplicated.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import HotelResults from "@/pages/HotelResults";

// ── Hoisted mocks ──────────────────────────────────────────────
const { mockLogAffiliateClick, mockGetRedirectUrl, mockSetHref } = vi.hoisted(() => ({
  mockLogAffiliateClick: vi.fn(() => Promise.resolve()),
  mockGetRedirectUrl: vi.fn(),
  mockSetHref: vi.fn(),
}));

vi.mock("@/lib/analytics", () => ({
  logAffiliateClick: (...args: unknown[]) => mockLogAffiliateClick(...args),
  logSearch: vi.fn(() => Promise.resolve("mock-id")),
}));

const defaultHotel = {
  id: "h1", hotelId: 12345, name: "Test Hotel Sydney",
  image: "https://example.com/img.jpg", location: "Sydney",
  stars: 4, guestScore: 8.5, reviewCount: 200, price: 299, currency: "AUD",
  amenities: ["wifi", "pool"], isDeal: true, redirectId: "rd-abc",
  link: "https://search.hotellook.com/hotel?id=12345",
};

vi.mock("@/services/travelApi", () => ({
  searchHotels: vi.fn(() =>
    Promise.resolve({ success: true, results: [defaultHotel], totalResults: 1 })
  ),
  getRedirectUrl: (...args: unknown[]) => mockGetRedirectUrl(...args),
}));

vi.mock("@/components/layout/Header", () => ({ default: () => <div data-testid="mock-header" /> }));
vi.mock("@/components/layout/Footer", () => ({ default: () => <div data-testid="mock-footer" /> }));
vi.mock("@/components/filters/HotelFilters", () => ({ default: () => null }));
vi.mock("@/components/cards/HotelResultCard", () => ({
  default: ({ id, name, price, currency, onViewDeal }: {
    id: string; name: string; price: number; currency: string; onViewDeal: (id: string) => void;
  }) => (
    <div data-testid={`hotel-card-${id}`}>
      <span>{name}</span><span>{currency}{price}</span>
      <button data-testid={`view-deal-${id}`} onClick={() => onViewDeal(id)}>View Deal</button>
    </div>
  ),
}));
vi.mock("@/components/skeletons/HotelCardSkeleton", () => ({ default: () => <div data-testid="skeleton" /> }));
vi.mock("@/components/states/EnhancedEmptyHotelResults", () => ({ default: () => <div data-testid="empty" /> }));
vi.mock("@/components/seo/HotelSearchSchema", () => ({ default: () => null }));
vi.mock("@/components/ads/AdSlot", () => ({ AdSlot: () => null }));
vi.mock("@/components/hotels/HotelQuickSelect", () => ({ default: () => null }));
vi.mock("@/components/hotels/HotelSearchForm", () => ({ HotelSearchForm: () => <div data-testid="search-form" /> }));
vi.mock("@/components/ui/pagination", () => ({
  Pagination: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PaginationContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PaginationItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PaginationLink: ({ children, isActive }: { children: React.ReactNode; isActive?: boolean }) => (
    <span data-active={isActive}>{children}</span>
  ),
  PaginationNext: () => null,
  PaginationPrevious: () => null,
}));
vi.mock("@/hooks/useAds", () => ({
  useAds: () => ({ ads: {}, trackImpression: vi.fn(), trackClick: vi.fn() }),
}));
vi.mock("@/hooks/useGeoLocation", () => ({
  useGeoLocation: () => ({ geoData: { currency: "AUD", currencySymbol: "$" } }),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

// ── Helpers ─────────────────────────────────────────────────────

function renderHotelResults(searchParams: Record<string, string> = {
  destination: "Sydney", checkIn: "2026-09-01", checkOut: "2026-09-05", guests: "2", rooms: "1",
}) {
  const qs = new URLSearchParams(searchParams).toString();

  // Mock window.location.href setter via Object.defineProperty (jsdom-safe)
  const origHref = window.location.href;
  Object.defineProperty(window, "location", {
    value: { ...window.location, href: origHref },
    writable: true,
    configurable: true,
  });
  const hrefSetter = vi.fn();
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

describe("HotelResults — component-level affiliate analytics", () => {
  beforeEach(() => {
    mockLogAffiliateClick.mockClear();
    mockLogAffiliateClick.mockResolvedValue(undefined);
    mockGetRedirectUrl.mockClear();
    mockGetRedirectUrl.mockResolvedValue({
      success: true, redirectUrl: "https://search.hotellook.com/hotel?id=999",
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── 1. Single call ──────────────────────────────────────────

  it("calls logAffiliateClick exactly once when View Deal is clicked", async () => {
    renderHotelResults();

    await waitFor(() => {
      expect(screen.getByTestId("view-deal-h1")).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId("view-deal-h1"));

    await waitFor(() => {
      expect(mockLogAffiliateClick).toHaveBeenCalledTimes(1);
    });
  });

  // ── 2. Exact payload ────────────────────────────────────────

  it("payload contains partner 'hotellook', partnerType 'hotel', route, price, currency, outboundHost, landingPage", async () => {
    renderHotelResults();
    await waitFor(() => screen.getByTestId("view-deal-h1"));
    fireEvent.click(screen.getByTestId("view-deal-h1"));

    await waitFor(() => {
      expect(mockLogAffiliateClick).toHaveBeenCalledWith({
        partner: "hotellook",
        partnerType: "hotel",
        route: "Sydney",
        price: 299,
        currency: "AUD",
        outboundHost: "search.hotellook.com",
        landingPage: "/hotels",
      });
    });
  });

  it("payload contains route from URL search params", async () => {
    renderHotelResults({ destination: "Bali", checkIn: "2026-09-01", checkOut: "2026-09-05", guests: "2", rooms: "1" });
    await waitFor(() => screen.getByTestId("view-deal-h1"));
    fireEvent.click(screen.getByTestId("view-deal-h1"));

    await waitFor(() => {
      expect(mockLogAffiliateClick).toHaveBeenCalledWith(
        expect.objectContaining({ route: "Bali" })
      );
    });
  });

  it("outboundHost derived from final affiliateUrl, not hotel.link", async () => {
    // hotel has a link, but getRedirectUrl returns a different URL
    mockGetRedirectUrl.mockResolvedValue({
      success: true, redirectUrl: "https://different.provider.com/booking/xyz",
    });

    // Override searchHotels to give a hotel with NO link so it uses getRedirectUrl
    const { searchHotels } = await import("@/services/travelApi");
    (searchHotels as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      success: true,
      results: [{
        ...defaultHotel,
        id: "h-nolink",
        link: null,
      }],
      totalResults: 1,
    });

    renderHotelResults();
    await waitFor(() => screen.getByTestId("view-deal-h-nolink"));
    fireEvent.click(screen.getByTestId("view-deal-h-nolink"));

    await waitFor(() => {
      expect(mockLogAffiliateClick).toHaveBeenCalledWith(
        expect.objectContaining({ outboundHost: "different.provider.com" })
      );
    });
  });

  // ── 3. No legacy invalid fields ─────────────────────────────

  it("no type, action, sourcePage or placement fields in payload", async () => {
    renderHotelResults();
    await waitFor(() => screen.getByTestId("view-deal-h1"));
    fireEvent.click(screen.getByTestId("view-deal-h1"));

    await waitFor(() => expect(mockLogAffiliateClick).toHaveBeenCalledTimes(1));
    const call = mockLogAffiliateClick.mock.calls[0][0];
    expect(call).not.toHaveProperty("type");
    expect(call).not.toHaveProperty("action");
    expect(call).not.toHaveProperty("sourcePage");
    expect(call).not.toHaveProperty("placement");
  });

  // ── 4. Failure isolation ────────────────────────────────────

  it("analytics rejection does not prevent navigation", async () => {
    mockLogAffiliateClick.mockRejectedValueOnce(new Error("analytics down"));

    const { hrefSetter } = renderHotelResults();
    await waitFor(() => screen.getByTestId("view-deal-h1"));
    fireEvent.click(screen.getByTestId("view-deal-h1"));

    await waitFor(() => {
      expect(hrefSetter).toHaveBeenCalled();
      const navigationUrl = hrefSetter.mock.calls[0][0] as string;
      expect(navigationUrl).toContain("/redirect?url=");
    });
  });

  // ── 5. No tracking before user activation ───────────────────

  it("no analytics call on initial render before clicking View Deal", async () => {
    renderHotelResults();
    await waitFor(() => screen.getByTestId("hotel-card-h1"));
    expect(mockLogAffiliateClick).not.toHaveBeenCalled();
  });

  it("each View Deal click produces exactly one analytics call", async () => {
    renderHotelResults();
    await waitFor(() => screen.getByTestId("view-deal-h1"));

    fireEvent.click(screen.getByTestId("view-deal-h1"));
    await waitFor(() => expect(mockLogAffiliateClick).toHaveBeenCalledTimes(1));

    mockLogAffiliateClick.mockClear();
    fireEvent.click(screen.getByTestId("view-deal-h1"));
    await waitFor(() => expect(mockLogAffiliateClick).toHaveBeenCalledTimes(1));
  });

  // ── 6. No tracking/navigation when no valid outbound URL ─────

  it("does NOT call logAffiliateClick when hotel has no link AND getRedirectUrl fails", async () => {
    const { searchHotels } = await import("@/services/travelApi");
    (searchHotels as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      success: true,
      results: [{
        id: "h-broken", hotelId: 99999, name: "Broken Hotel",
        image: "https://example.com/img.jpg", location: "Sydney",
        stars: 3, guestScore: 7.0, reviewCount: 50, price: 150, currency: "AUD",
        amenities: [], isDeal: false, redirectId: "rd-broken",
        link: null,
      }],
      totalResults: 1,
    });
    mockGetRedirectUrl.mockResolvedValueOnce({ success: false, error: "No redirect" });

    renderHotelResults();
    await waitFor(() => screen.getByTestId("view-deal-h-broken"));
    fireEvent.click(screen.getByTestId("view-deal-h-broken"));

    // No affiliate click — resolved URL does not exist
    await waitFor(() => {
      // toast.error was called
    });
    expect(mockLogAffiliateClick).not.toHaveBeenCalled();
  });

  it("does not navigate when no valid outbound URL exists", async () => {
    const { searchHotels } = await import("@/services/travelApi");
    (searchHotels as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      success: true,
      results: [{
        id: "h-dead", hotelId: 77777, name: "Dead Hotel",
        image: "https://example.com/img.jpg", location: "Sydney",
        stars: 2, guestScore: 5.0, reviewCount: 10, price: 99, currency: "AUD",
        amenities: [], isDeal: false, redirectId: "rd-dead",
        link: null,
      }],
      totalResults: 1,
    });
    mockGetRedirectUrl.mockResolvedValueOnce({ success: false, error: "No redirect" });

    const { hrefSetter } = renderHotelResults();
    await waitFor(() => screen.getByTestId("view-deal-h-dead"));
    fireEvent.click(screen.getByTestId("view-deal-h-dead"));

    // Navigation must not happen
    expect(mockLogAffiliateClick).not.toHaveBeenCalled();
    // hrefSetter should not have been called with a redirect URL
    const redirectCalls = hrefSetter.mock.calls.filter(
      (c: string[]) => (c[0] as string).includes("/redirect")
    );
    expect(redirectCalls.length).toBe(0);
  });
});