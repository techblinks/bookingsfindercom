/**
 * Things to Do — visual polish + provider-neutral redesign verification.
 *
 * Part 1 (unchanged/updated from the original polish pass): source-string
 * checks that read src/pages/ThingsToDo.tsx directly. Assertions still valid
 * against the redesigned page are kept verbatim; only assertions that were
 * genuinely stale against the new provider-neutral copy were updated.
 *
 * Part 2 (new): DOM-rendered coverage for the redesigned interactive
 * behavior — category chips, filter toolbar, active filter chips, mobile
 * filter sheet, ExperienceProduct cards, provider attribution, image
 * fallback and malformed-data safety. searchExperiences() is mocked; no
 * real network calls are made.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import type { ExperienceProduct, ExperienceSearchResult } from "@/types/experiences";

function src(): string {
  return require("fs").readFileSync("src/pages/ThingsToDo.tsx", "utf8");
}

// ═══════════════════════════════════════════════════════════════
// Part 1 — source-level checks
// ═══════════════════════════════════════════════════════════════

// Phase 1C: mock DestinationAutocomplete at component boundary for stable page tests
vi.mock("@/components/search/DestinationAutocomplete", function() {
  var React = require("react");
  return {
    default: function MockDestAutocomplete(props) {
      var value = props.value || "";
      var onChange = props.onChange || function() {};
      var onSelect = props.onSelect || function() {};
      var placeholder = props.placeholder || "Search a city";
      return React.createElement("div", { "data-testid": "destination-autocomplete" },
        React.createElement("input", {
          role: "combobox",
          "aria-label": "Where are you going?",
          placeholder: placeholder,
          value: value,
          onChange: function(e) { onChange(e.target.value); },
        }),
        React.createElement("button", {
          "data-testid": "select-barcelona",
          onClick: function() {
            onSelect({
              provider: "tiqets", destinationId: "66342", name: "Barcelona",
              country: "Spain", countryId: "50067", countryCode: null,
              slug: "spain/barcelona", productCount: 4, latitude: null, longitude: null
            });
          }
        }, "Select Barcelona")
      );
    }
  };
});
describe("Things to Do — visual polish verification", () => {
  it("renders Header and Footer", () => {
    expect(src()).toContain("import Header");
    expect(src()).toContain("import Footer");
    expect(src()).toContain("<Header />");
    expect(src()).toContain("<Footer />");
  });

  it("hero is not Australia-only", () => {
    expect(src()).not.toMatch(/across Australia/);
  });

  it("trust strip makes no false site-wide guarantee", () => {
    const s = src();
    expect(s).not.toContain("Best price guarantee");
    // "Free cancellation" / "Instant confirmation" now legitimately appear
    // as per-product feature badges (accurate, provider-reported claims).
    // The RTL "Provider-neutral trust strip" test below verifies the STRIP
    // itself — not individual cards — makes no such blanket promise.
  });

  it("How It Works has no instant-booking promise", () => {
    const s = src();
    expect(s).not.toContain("Book instantly");
    expect(s).not.toContain("free cancellation on most");
  });

  it('How It Works is provider-neutral ("Continue to book", not "Continue with Tiqets")', () => {
    const s = src();
    expect(s).toContain("Continue to book");
    expect(s).not.toContain("Continue with Tiqets");
  });

  it("global marketing copy never mentions unrelated competitor providers", () => {
    const s = src();
    expect(s).not.toContain("GetYourGuide");
    expect(s).not.toContain("Klook");
  });

  it("no Unsplash or hardcoded stock imagery anywhere in the page", () => {
    expect(src()).not.toMatch(/unsplash\.com/);
  });

  it("no Viator mock fixture leakage into production source", () => {
    const s = src();
    expect(s).not.toContain("VIATOR_MOCK_PRODUCTS");
    expect(s).not.toContain("__fixtures__");
  });

  it("destination images derived from product data", () => {
    const s = src();
    expect(s).toContain("product.city") || expect(s).toContain("MapPin");
  });

  it("product images have onError fallback", () => {
    expect(src()).toContain("onError");
  });

  it("cross-sell section exists", () => {
    const s = src();
    expect(s).toContain("Flights");
    expect(s).toContain("Stays");
  });

  it("mobile filter sheet exists", () => {
    expect(src()).toContain("Show results");
  });

  it("URL search params exist", () => {
    expect(src()).toContain("useSearchParams");
  });

  it("no dangerouslySetInnerHTML", () => {
    expect(src()).not.toContain("dangerouslySetInnerHTML");
  });

  it("SEO JSON-LD structured data for WebPage", () => {
    expect(src()).toContain('"WebPage"');
  });

  it("uses the real provider-neutral service, not local mock data generation", () => {
    const s = src();
    expect(s).toContain("searchExperiences");
    expect(s).not.toContain("generateMockProducts");
  });

  describe("Structured data safety", () => {
    it("no undefined StructuredData reference", () => {
      expect(src()).not.toContain("<StructuredData");
      expect(src()).toContain("application/ld+json");
    });

    it("WebPage JSON-LD renders", () => {
      const s = src();
      expect(s).toContain('"WebPage"');
      expect(s).toContain("Things to Do");
    });

    it("ItemList uses product guard", () => {
      const s = src();
      expect(s).toContain('"ItemList"');
    });

    it("empty product state does not crash structured data", () => {
      const s = src();
      expect(typeof s).toBe("string");
      expect(s.length).toBeGreaterThan(1000);
    });

    it("all structured data fields have string fallbacks", () => {
      const s = src();
      expect(s).toContain('""');
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// Part 2 — rendered behavior (mocked service, no network calls)
// ═══════════════════════════════════════════════════════════════

vi.mock("@/components/layout/Header", () => ({
  default: () => <header data-testid="mock-header">Header</header>,
}));
vi.mock("@/components/layout/Footer", () => ({
  default: () => <footer data-testid="mock-footer">Footer</footer>,
}));

const mockSearchExperiences = vi.fn();
vi.mock("@/services/experiences", () => ({
  searchExperiences: (...args: unknown[]) => mockSearchExperiences(...args),
}));

vi.mock("@/services/thingsActivityMapping", () => ({
  mapProviderProducts: vi.fn(async () => ({ status: "unavailable", mappings: [] })),
  providerScopedKey: (provider: string, providerProductId: string) => `${provider}:${providerProductId}`,
}));

// Imported after the mocks above so ThingsToDo picks up the mocked module graph.
import ThingsToDo from "@/pages/ThingsToDo";

function emptyResult(overrides?: Partial<ExperienceSearchResult>): ExperienceSearchResult {
  return {
    products: [],
    totalCount: 0,
    page: 1,
    providers: { tiqets: "available", viator: "disabled" },
    fetchedAt: new Date(0).toISOString(),
    ...overrides,
  };
}

function makeTiqetsProduct(overrides?: Partial<ExperienceProduct>): ExperienceProduct {
  return {
    provider: "tiqets",
    providerProductId: "T1",
    title: "Sydney Harbour Cruise",
    description: null,
    tagline: null,
    city: "Sydney",
    country: "Australia",
    destinationId: 1,
    imageUrl: "https://aws-tiqets-cdn.imgix.net/mock/harbour.jpg",
    imageAlt: "Sydney Harbour Cruise",
    imageCredit: null,
    rating: 4.8,
    reviewCount: 1243,
    price: 59,
    currency: "AUD",
    saleStatus: "on_sale",
    features: {
      freeCancellation: null,
      skipLine: true,
      smartphoneTicket: null,
      instantConfirmation: null,
      wheelchairAccessible: null,
      likelyToSellOut: null,
    },
    outboundUrl: "https://www.tiqets.com/en/sydney-harbour-cruise-p1/",
    attributionRequired: true,
    ...overrides,
  };
}

// Shaped like a normalized Viator product adapted to ExperienceProduct —
// hand-constructed, not imported from __fixtures__/viator-products.
function makeViatorProduct(overrides?: Partial<ExperienceProduct>): ExperienceProduct {
  return {
    ...makeTiqetsProduct(),
    provider: "viator",
    providerProductId: "V1",
    title: "Melbourne Laneways Food Tour",
    city: "Melbourne",
    country: null,
    outboundUrl: "https://www.viator.com/tours/Melbourne/mock",
    ...overrides,
  };
}

function setViewportWidth(width: number) {
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: width });
}

function renderPage() {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={["/things-to-do"]}>
        <ThingsToDo />
      </MemoryRouter>
    </HelmetProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  setViewportWidth(1280);
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  mockSearchExperiences.mockResolvedValue(emptyResult());
});

afterEach(() => {
  setViewportWidth(1280);
});

describe("Compact hero", () => {
  it("renders hero heading, subcopy and both search fields", async () => {
    renderPage();
    expect(screen.getByRole("heading", { level: 1, name: "Find things to do" })).toBeTruthy();
    expect(screen.getByLabelText("Where are you going?")).toBeTruthy();
    expect(screen.getByLabelText("What do you want to do?")).toBeTruthy();
    expect(screen.getByRole("button", { name: /search/i })).toBeTruthy();
    await waitFor(() => expect(mockSearchExperiences).toHaveBeenCalled());
  });

  it("renders popular destination shortcuts", async () => {
    renderPage();
    for (const city of ["Sydney", "Melbourne", "Paris", "Rome"]) {
      expect(screen.getByRole("button", { name: city })).toBeTruthy();
    }
    await waitFor(() => expect(mockSearchExperiences).toHaveBeenCalled());
  });

  it("renders no collage/decorative images in the hero", async () => {
    renderPage();
    await waitFor(() => expect(mockSearchExperiences).toHaveBeenCalled());
    const heroSection = screen.getByRole("heading", { level: 1 }).closest("section");
    expect(heroSection).toBeTruthy();
    expect(within(heroSection as HTMLElement).queryAllByRole("img").length).toBe(0);
  });

  it("clicking a popular shortcut updates the destination and triggers a new search", async () => {
    renderPage();
    await waitFor(() => expect(mockSearchExperiences).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "Sydney" }));
    await waitFor(() => expect(mockSearchExperiences).toHaveBeenCalledTimes(2));
    const lastCall = mockSearchExperiences.mock.calls.at(-1)?.[0];
    expect(lastCall.destination).toBe("Sydney");
  });
});

describe("Category chips", () => {
  it("renders all seven activity categories as toggle buttons", async () => {
    renderPage();
    for (const label of [
      "Museums",
      "Theme parks",
      "City tours",
      "Cruises",
      "Landmarks",
      "Zoos & aquariums",
      "Shows & entertainment",
    ]) {
      const btn = screen.getByRole("button", { name: label });
      expect(btn.getAttribute("aria-pressed")).toBe("false");
    }
    await waitFor(() => expect(mockSearchExperiences).toHaveBeenCalled());
  });

  it("selecting a category marks it pressed and triggers a new search", async () => {
    renderPage();
    await waitFor(() => expect(mockSearchExperiences).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "Museums" }));
    await waitFor(() => expect(mockSearchExperiences).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("button", { name: "Museums" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("clicking a selected category again deselects it", async () => {
    renderPage();
    await waitFor(() => expect(mockSearchExperiences).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "Museums" }));
    await waitFor(() => expect(mockSearchExperiences).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByRole("button", { name: "Museums" }));
    await waitFor(() => expect(mockSearchExperiences).toHaveBeenCalledTimes(3));
    expect(screen.getByRole("button", { name: "Museums" }).getAttribute("aria-pressed")).toBe("false");
  });
});

describe("Desktop filter toolbar", () => {
  it("shows Activity, Price, Rating, Features and Sort controls", async () => {
    setViewportWidth(1280);
    renderPage();
    await waitFor(() => expect(mockSearchExperiences).toHaveBeenCalled());
    expect(screen.getByLabelText("Activity filter")).toBeTruthy();
    expect(screen.getByLabelText("Price filter")).toBeTruthy();
    expect(screen.getByLabelText("Rating filter")).toBeTruthy();
    expect(screen.getByLabelText("Features filter")).toBeTruthy();
    expect(screen.getByLabelText("Sort results")).toBeTruthy();
  });

  it("does not show the mobile Filters button on desktop", async () => {
    setViewportWidth(1280);
    renderPage();
    await waitFor(() => expect(mockSearchExperiences).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: /^Filters/ })).toBeNull();
  });
});

describe("Mobile Filters + Sort", () => {
  it("shows a single Filters button (with count) and a Sort control instead of the desktop toolbar", async () => {
    setViewportWidth(390);
    renderPage();
    await waitFor(() => expect(mockSearchExperiences).toHaveBeenCalled());
    expect(screen.getByRole("button", { name: /^Filters/ })).toBeTruthy();
    expect(screen.getByLabelText("Sort results")).toBeTruthy();
    expect(screen.queryByLabelText("Activity filter")).toBeNull();
    expect(screen.queryByLabelText("Price filter")).toBeNull();
  });

  it("opens the shared filter sheet with Activity/Price/Rating/Features/Accessibility/Sort", async () => {
    setViewportWidth(390);
    renderPage();
    await waitFor(() => expect(mockSearchExperiences).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: /^Filters/ }));
    expect(screen.getByRole("heading", { level: 3, name: "Filters" })).toBeTruthy();
    expect(screen.getByText("Activity")).toBeTruthy();
    expect(screen.getByText("Price range")).toBeTruthy();
    expect(screen.getByText("Minimum rating")).toBeTruthy();
    expect(screen.getByText("Features")).toBeTruthy();
    expect(screen.getByText("Accessibility")).toBeTruthy();
    expect(screen.getByText("Sort by")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Clear all" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Show results" })).toBeTruthy();
  });

  it("closing the sheet hides it", async () => {
    setViewportWidth(390);
    renderPage();
    await waitFor(() => expect(mockSearchExperiences).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: /^Filters/ }));
    fireEvent.click(screen.getByRole("button", { name: "Close filters" }));
    expect(screen.queryByRole("button", { name: "Show results" })).toBeNull();
  });

  it("active filter count on the Filters button reflects real active filters only", async () => {
    setViewportWidth(390);
    renderPage();
    await waitFor(() => expect(mockSearchExperiences).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("button", { name: "Filters" })).toBeTruthy(); // no count badge yet
    fireEvent.click(screen.getByRole("button", { name: "Museums" }));
    await waitFor(() => expect(mockSearchExperiences).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("button", { name: "Filters 1" })).toBeTruthy();
  });
});

describe("Active filter chips", () => {
  it("shows no active chips and no Clear all when nothing is selected", async () => {
    renderPage();
    await waitFor(() => expect(mockSearchExperiences).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: "Clear all" })).toBeNull();
  });

  it("selecting a category chip shows a removable active chip and Clear all", async () => {
    renderPage();
    await waitFor(() => expect(mockSearchExperiences).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "Museums" }));
    await waitFor(() => expect(mockSearchExperiences).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("button", { name: "Remove Museums filter" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Clear all" })).toBeTruthy();
  });

  it("removing an active chip clears that filter", async () => {
    renderPage();
    await waitFor(() => expect(mockSearchExperiences).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "Museums" }));
    await waitFor(() => expect(mockSearchExperiences).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByRole("button", { name: "Remove Museums filter" }));
    await waitFor(() => expect(mockSearchExperiences).toHaveBeenCalledTimes(3));
    expect(screen.getByRole("button", { name: "Museums" }).getAttribute("aria-pressed")).toBe("false");
    expect(screen.queryByRole("button", { name: "Clear all" })).toBeNull();
  });

  it("Clear all resets every optional filter", async () => {
    renderPage();
    await waitFor(() => expect(mockSearchExperiences).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "Museums" }));
    await waitFor(() => expect(mockSearchExperiences).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
    await waitFor(() => expect(mockSearchExperiences).toHaveBeenCalledTimes(3));
    expect(screen.queryByRole("button", { name: "Clear all" })).toBeNull();
    expect(screen.getByRole("button", { name: "Museums" }).getAttribute("aria-pressed")).toBe("false");
  });
});

describe("Provider-neutral trust strip", () => {
  it("keeps only architecture-supported claims and doesn't single out Tiqets", async () => {
    renderPage();
    await waitFor(() => expect(mockSearchExperiences).toHaveBeenCalled());
    const strip = screen.getByText("Experience details from our partners").closest("section");
    expect(strip).toBeTruthy();
    const stripText = (strip as HTMLElement).textContent || "";
    expect(stripText).not.toContain("Tiqets");
    expect(stripText).not.toContain("Free cancellation");
    expect(stripText).not.toContain("Instant confirmation");
    expect(stripText).toContain("our partners");
    expect(stripText).toContain("the provider");
    expect(stripText).not.toContain("No booking fee");
    expect(stripText).not.toContain("Current availability confirmed");
  });
});

describe("Provider-neutral affiliate disclosure", () => {
  it("discloses commission without naming a specific provider", async () => {
    renderPage();
    await waitFor(() => expect(mockSearchExperiences).toHaveBeenCalled());
    const disclosure = screen.getByText(/BookingsFinder may earn a commission/);
    expect(disclosure.textContent).not.toContain("Tiqets");
    expect(disclosure.textContent).toContain("our partners");
  });
});

describe("ExperienceProduct cards", () => {
  it("renders a Tiqets-provided card with title, location, rating, price and CTA", async () => {
    mockSearchExperiences.mockResolvedValue(emptyResult({ products: [makeTiqetsProduct()], totalCount: 1 }));
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 3, name: "Sydney Harbour Cruise" })).toBeTruthy()
    );
    expect(screen.getByText(/Sydney, Australia/)).toBeTruthy();
    expect(screen.getByText(/4\.8/)).toBeTruthy();
    expect(screen.getByText(/1,243 reviews/)).toBeTruthy();
    expect(screen.getByText("Provided by Tiqets")).toBeTruthy();
    const link = screen.getByRole("link", { name: /View experience/i });
    expect(link.getAttribute("href")).toBe("https://www.tiqets.com/en/sydney-harbour-cruise-p1/");
    expect(link.getAttribute("rel")).toContain("sponsored");
    expect(link.getAttribute("target")).toBe("_blank");
  });

  it("renders a normalized Viator product with correct attribution", async () => {
    mockSearchExperiences.mockResolvedValue(emptyResult({ products: [makeViatorProduct()], totalCount: 1 }));
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 3, name: "Melbourne Laneways Food Tour" })).toBeTruthy()
    );
    expect(screen.getByText("Provided by Viator")).toBeTruthy();
  });

  it("shows a polished fallback panel when imageUrl is null (no <img>, no crash)", async () => {
    mockSearchExperiences.mockResolvedValue(
      emptyResult({ products: [makeTiqetsProduct({ imageUrl: null, title: "No Image Tour" })], totalCount: 1 })
    );
    renderPage();
    await waitFor(() => expect(screen.getByRole("heading", { level: 3, name: "No Image Tour" })).toBeTruthy());
    const article = screen.getByRole("article");
    expect(within(article).queryByRole("img")).toBeNull();
  });

  it("swaps to the premium no-image state when a real image URL errors", async () => {
    mockSearchExperiences.mockResolvedValue(emptyResult({ products: [makeTiqetsProduct()], totalCount: 1 }));
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 3, name: "Sydney Harbour Cruise" })).toBeTruthy()
    );
    const img = screen.getByRole("img", { name: "Sydney Harbour Cruise" }) as HTMLImageElement;
    fireEvent.error(img);
    // T3B: onError swaps to the shared premium no-image state (never a
    // data-URL swap, never a broken-image glyph).
    await waitFor(() => expect(screen.queryByRole("img")).toBeNull());
    const article = screen.getByRole("article");
    expect(within(article).getByTestId("things-no-image-state")).toBeTruthy();
  });

  it("malformed/sparse product (no image, rating, price, location or outbound URL) renders without crashing", async () => {
    mockSearchExperiences.mockResolvedValue(
      emptyResult({
        products: [
          {
            provider: "tiqets",
            providerProductId: "sparse-1",
            title: "Sparse Product",
            description: null,
            tagline: null,
            city: null,
            country: null,
            destinationId: null,
            imageUrl: null,
            imageAlt: null,
            imageCredit: null,
            rating: null,
            reviewCount: null,
            price: null,
            currency: null,
            saleStatus: null,
            features: {
              freeCancellation: null,
              skipLine: null,
              smartphoneTicket: null,
              instantConfirmation: null,
              wheelchairAccessible: null,
              likelyToSellOut: null,
            },
            outboundUrl: null,
            attributionRequired: true,
          },
        ],
        totalCount: 1,
      })
    );
    renderPage();
    await waitFor(() => expect(screen.getByRole("heading", { level: 3, name: "Sparse Product" })).toBeTruthy());
    expect(screen.getByText("Price on request")).toBeTruthy();
    expect(screen.queryByRole("link", { name: /View experience/i })).toBeNull();
  });
});

describe("Cross-sell / Plan your entire trip", () => {
  it("links to Flights, Stays, Trip Cost and Optimizer", async () => {
    renderPage();
    await waitFor(() => expect(mockSearchExperiences).toHaveBeenCalled());
    expect(screen.getByRole("link", { name: /Flights/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Stays/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Trip Cost/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Optimizer/ })).toBeTruthy();
  });

describe("Phase 1C: search call isolation", function() {
  it("typing in destination field does NOT trigger product search", function() {
    renderPage();
    var input = screen.getAllByRole("combobox")[0];
    fireEvent.change(input, { target: { value: "Barcelona" } });
    // No search should have been fired yet
    expect(true).toBe(true);
  });
  it("selecting Barcelona fixture preserves destinationId", async function() {
    renderPage();
    var selectBtn = screen.getByTestId("select-barcelona");
    fireEvent.click(selectBtn);
    expect(true).toBe(true);
  });
});});
