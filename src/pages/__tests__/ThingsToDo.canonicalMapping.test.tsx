/**
 * Things V2 (T2D-B2B-5C) — search-result card → canonical activity detail
 * wiring (page/card matrix S–AF).
 *
 *   S.  mapped product renders: View details
 *   T.  mapped CTA is internal navigation to exact canonicalPath
 *   U.  mapped CTA has NO target="_blank" / rel="sponsored"
 *   V.  mapped CTA does not use the provider outbound URL
 *   W.  unmapped product still renders: View experience
 *   X.  unmapped CTA keeps exact product.outboundUrl
 *   Y.  unmapped CTA keeps target="_blank" and sponsored nofollow noopener
 *   Z.  mapping-service failure still renders provider products with outbound CTA
 *   AA. empty result set does not request mappings
 *   AB. 24 visible products produce ONE batch mapping request, not 24
 *   AC. stale mapping response cannot overwrite newer search result mappings
 *   AD. same product ID across Tiqets and Viator uses separate canonical keys
 *   AE. no mapping means no guessed internal route
 *   AF. product with neither mapping nor outbound URL renders no CTA
 *
 * searchExperiences and mapProviderProducts are mocked at the module
 * boundary; no network calls.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import type {
  ExperienceProduct,
  ExperienceSearchResult,
  ProviderAvailability,
} from "@/types/experiences";

const { mockSearchExperiences, mockMapProviderProducts } = vi.hoisted(() => ({
  mockSearchExperiences: vi.fn(),
  mockMapProviderProducts: vi.fn(),
}));

vi.mock("@/services/experiences", () => ({
  searchExperiences: mockSearchExperiences,
  fetchProviderAvailability: vi.fn(() => Promise.resolve({ tiqets: "available", viator: "disabled" })),
}));

vi.mock("@/services/thingsActivityMapping", () => ({
  mapProviderProducts: mockMapProviderProducts,
  providerScopedKey: (provider: string, providerProductId: string) => `${provider}:${providerProductId}`,
}));

vi.mock("@/components/layout/Header", () => ({ default: () => <header /> }));
vi.mock("@/components/layout/Footer", () => ({ default: () => <footer /> }));

vi.mock("@/components/search/DestinationAutocomplete", () => ({
  default: ({ value, onChange }: { value?: string; onChange?: (v: string) => void }) => (
    <input
      role="combobox"
      aria-label="Where are you going?"
      value={value || ""}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}));

import ThingsToDo from "@/pages/ThingsToDo";

// ── Fixtures (the 1111450 / Rome example is a test fixture, never source) ──

function product(overrides?: Partial<ExperienceProduct>): ExperienceProduct {
  return {
    provider: "tiqets",
    providerProductId: "1111450",
    title: "Vatican Museums & Sistine Chapel Fast-Track Ticket",
    description: null,
    tagline: null,
    city: "Rome",
    country: "Italy",
    destinationId: 1,
    imageUrl: null,
    imageAlt: null,
    imageCredit: null,
    rating: 4.7,
    reviewCount: 2100,
    price: 68,
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
    outboundUrl: "https://www.tiqets.com/en/rome-vatican-museums/l1111450",
    attributionRequired: true,
    ...overrides,
  };
}

function result(
  products: ExperienceProduct[],
  providers: ProviderAvailability = { tiqets: "available", viator: "disabled" },
): ExperienceSearchResult {
  return {
    products,
    totalCount: products.length,
    page: 1,
    providers,
    fetchedAt: new Date().toISOString(),
  };
}

interface MappingFixture {
  provider: string;
  providerProductId: string;
  destinationSlug: string;
  activitySlug: string;
  canonicalPath: string;
  publicationStatus: string;
}

function mapping(overrides?: Partial<MappingFixture>): MappingFixture {
  return {
    provider: "tiqets",
    providerProductId: "1111450",
    destinationSlug: "rome",
    activitySlug: "vatican-museums-sistine-chapel-fast-track-ticket",
    canonicalPath: "/things-to-do/rome/vatican-museums-sistine-chapel-fast-track-ticket",
    publicationStatus: "draft",
    ...overrides,
  };
}

function renderPage(search = "?city=Rome") {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[`/things-to-do${search}`]}>
        <ThingsToDo />
      </MemoryRouter>
    </HelmetProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  mockSearchExperiences.mockResolvedValue(result([]));
  mockMapProviderProducts.mockResolvedValue({ status: "available", mappings: [] });
});

// ── MAPPED CARD ───────────────────────────────────────────────────

describe("Things card — mapped CTA", () => {
  it("S/T/U/V. renders an internal View details link to the exact canonicalPath", async () => {
    mockSearchExperiences.mockResolvedValue(result([product()]));
    mockMapProviderProducts.mockResolvedValue({ status: "available", mappings: [mapping()] });
    renderPage();

    const link = await screen.findByRole("link", { name: "View details" });
    expect(link.getAttribute("href")).toBe(
      "/things-to-do/rome/vatican-museums-sistine-chapel-fast-track-ticket",
    );
    // Internal navigation: same-tab React Router link.
    expect(link.hasAttribute("target")).toBe(false);
    expect(link.getAttribute("rel")).toBeNull();
    // Never the provider outbound URL.
    expect(link.getAttribute("href")).not.toBe(product().outboundUrl);
    // No ExternalLink icon — the accessible text is exactly the label.
    expect(link.textContent?.trim()).toBe("View details");
    // Not an affiliate click: no sponsored rel anywhere on the link.
    expect(link.getAttribute("rel") ?? "").not.toContain("sponsored");
  });

  it("S. a mapped product does not also render the provider CTA", async () => {
    mockSearchExperiences.mockResolvedValue(result([product()]));
    mockMapProviderProducts.mockResolvedValue({ status: "available", mappings: [mapping()] });
    renderPage();

    await screen.findByRole("link", { name: "View details" });
    expect(screen.queryByRole("link", { name: /View experience/i })).toBeNull();
  });
});

// ── UNMAPPED CARD ─────────────────────────────────────────────────

describe("Things card — unmapped CTA", () => {
  it("W/X/Y. keeps the genuine provider outbound CTA exactly", async () => {
    const p = product();
    mockSearchExperiences.mockResolvedValue(result([p]));
    mockMapProviderProducts.mockResolvedValue({ status: "available", mappings: [] });
    renderPage();

    const link = await screen.findByRole("link", { name: /View experience/i });
    expect(link.getAttribute("href")).toBe(p.outboundUrl);
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("sponsored nofollow noopener");
    expect(screen.queryByRole("link", { name: "View details" })).toBeNull();
  });
});

// ── MAPPING FAILURE ───────────────────────────────────────────────

describe("Things card — mapping failure preserves provider inventory", () => {
  it("Z. mapping-unavailable still renders provider products with the outbound CTA", async () => {
    const p = product();
    mockSearchExperiences.mockResolvedValue(result([p]));
    mockMapProviderProducts.mockResolvedValue({ status: "unavailable", mappings: [] });
    renderPage();

    const link = await screen.findByRole("link", { name: /View experience/i });
    expect(link.getAttribute("href")).toBe(p.outboundUrl);
    expect(screen.queryByText("Experiences are temporarily unavailable")).toBeNull();
    expect(screen.queryByRole("link", { name: "View details" })).toBeNull();
  });

  it("Z2. a rejecting mapping call also preserves provider inventory", async () => {
    const p = product();
    mockSearchExperiences.mockResolvedValue(result([p]));
    mockMapProviderProducts.mockRejectedValue(new Error("network down"));
    renderPage();

    const link = await screen.findByRole("link", { name: /View experience/i });
    expect(link.getAttribute("href")).toBe(p.outboundUrl);
    expect(screen.queryByText("Experiences are temporarily unavailable")).toBeNull();
  });
});

// ── BATCHING ──────────────────────────────────────────────────────

describe("Things page — one mapping batch per result page", () => {
  it("AA. an empty result set never requests a mapping batch", async () => {
    mockSearchExperiences.mockResolvedValue(result([]));
    renderPage();

    await screen.findByText("No experiences matched your search");
    expect(mockMapProviderProducts).not.toHaveBeenCalled();
  });

  it("AB. 24 visible products produce exactly ONE mapping request, not 24", async () => {
    const tiqets = Array.from({ length: 12 }, (_, i) =>
      product({ provider: "tiqets", providerProductId: `T${i}` }),
    );
    const viator = Array.from({ length: 12 }, (_, i) =>
      product({ provider: "viator", providerProductId: `V${i}` }),
    );
    mockSearchExperiences.mockResolvedValue(result([...tiqets, ...viator]));
    renderPage();

    await waitFor(() => expect(document.querySelectorAll('[role="article"]')).toHaveLength(24));
    expect(mockMapProviderProducts).toHaveBeenCalledTimes(1);
    const identities = mockMapProviderProducts.mock.calls[0][0] as Array<{ provider: string; providerProductId: string }>;
    expect(identities).toHaveLength(24);
    // Only provider identity leaves the browser.
    for (const identity of identities) {
      expect(Object.keys(identity).sort()).toEqual(["provider", "providerProductId"]);
    }
  });
});

// ── STALE RESPONSES ───────────────────────────────────────────────

describe("Things page — stale mapping protection", () => {
  it("AC. a stale mapping response cannot overwrite newer search result mappings", async () => {
    const productA = product({ title: "A", providerProductId: "1111450" });
    const productB = product({
      provider: "viator",
      providerProductId: "3731VATICAN",
      title: "B",
      outboundUrl: "https://www.viator.com/tours/Rome/b",
    });

    let resolveStale!: (value: unknown) => void;
    const staleDeferred = new Promise((resolve) => {
      resolveStale = resolve;
    });

    mockMapProviderProducts
      // First search's mapping stays pending until after the second search commits.
      .mockReturnValueOnce(staleDeferred)
      .mockResolvedValueOnce({
        status: "available",
        mappings: [
          {
            provider: "viator",
            providerProductId: "3731VATICAN",
            destinationSlug: "rome",
            activitySlug: "colosseum-arena-tour",
            canonicalPath: "/things-to-do/rome/colosseum-arena-tour",
            publicationStatus: "draft",
          },
        ],
      });

    mockSearchExperiences
      .mockResolvedValueOnce(result([productA]))
      .mockResolvedValueOnce(result([productB]));

    renderPage("?city=Rome");
    await waitFor(() => expect(mockSearchExperiences).toHaveBeenCalledTimes(1));

    // A second search (different filter) begins while the first mapping pends.
    fireEvent.click(screen.getByRole("button", { name: "Museums" }));
    await waitFor(() => expect(mockSearchExperiences).toHaveBeenCalledTimes(2));

    // The newer search's mapping commits.
    await waitFor(() => {
      expect(screen.getByRole("link", { name: "View details" }).getAttribute("href")).toBe(
        "/things-to-do/rome/colosseum-arena-tour",
      );
    });

    // The stale first-search mapping finally resolves — it must NOT apply.
    await act(async () => {
      resolveStale({
        status: "available",
        mappings: [
          {
            provider: "tiqets",
            providerProductId: "1111450",
            destinationSlug: "rome",
            activitySlug: "vatican-museums-sistine-chapel-fast-track-ticket",
            canonicalPath: "/things-to-do/rome/vatican-museums-sistine-chapel-fast-track-ticket",
            publicationStatus: "draft",
          },
        ],
      });
    });

    // The current result set keeps its own mapping; the stale path never lands.
    expect(screen.getByRole("link", { name: "View details" }).getAttribute("href")).toBe(
      "/things-to-do/rome/colosseum-arena-tour",
    );
    expect(screen.queryAllByRole("link", { name: "View details" })).toHaveLength(1);
  });
});

// ── PROVIDER SCOPE ────────────────────────────────────────────────

describe("Things page — provider-scoped identity", () => {
  it("AD. the same product ID on Tiqets and Viator stays separate", async () => {
    const tiqetsP = product({ provider: "tiqets", providerProductId: "X", title: "Tiqets X" });
    const viatorP = product({
      provider: "viator",
      providerProductId: "X",
      title: "Viator X",
      outboundUrl: "https://www.viator.com/tours/Rome/x",
    });
    mockSearchExperiences.mockResolvedValue(result([tiqetsP, viatorP]));
    mockMapProviderProducts.mockResolvedValue({
      status: "available",
      mappings: [
        {
          provider: "tiqets",
          providerProductId: "X",
          destinationSlug: "rome",
          activitySlug: "tiqets-x",
          canonicalPath: "/things-to-do/rome/tiqets-x",
          publicationStatus: "draft",
        },
      ],
    });
    renderPage();

    await waitFor(() => expect(document.querySelectorAll('[role="article"]')).toHaveLength(2));

    // Both identities are sent, provider-scoped, with the same product ID.
    const identities = mockMapProviderProducts.mock.calls[0][0] as Array<{ provider: string; providerProductId: string }>;
    expect(identities).toEqual([
      { provider: "tiqets", providerProductId: "X" },
      { provider: "viator", providerProductId: "X" },
    ]);

    // Only the Tiqets card is mapped; the Viator card with the SAME ID is not.
    const detailsLinks = screen.getAllByRole("link", { name: "View details" });
    expect(detailsLinks).toHaveLength(1);
    expect(detailsLinks[0].getAttribute("href")).toBe("/things-to-do/rome/tiqets-x");

    const experienceLinks = screen.getAllByRole("link", { name: /View experience/i });
    expect(experienceLinks).toHaveLength(1);
    expect(experienceLinks[0].getAttribute("href")).toBe(viatorP.outboundUrl);
  });
});

// ── NO FABRICATED IDENTITY ────────────────────────────────────────

describe("Things card — no invented internal routes", () => {
  it("AE. no mapping means no guessed internal route", async () => {
    const p = product();
    mockSearchExperiences.mockResolvedValue(result([p]));
    mockMapProviderProducts.mockResolvedValue({ status: "available", mappings: [] });
    renderPage();

    await waitFor(() => expect(document.querySelectorAll('[role="article"]')).toHaveLength(1));
    expect(screen.queryByRole("link", { name: "View details" })).toBeNull();
    expect(screen.queryByRole("link", { name: /View experience/i })).toBeTruthy();
  });

  it("AF. a product with neither mapping nor outbound URL renders no CTA", async () => {
    const p = product({ outboundUrl: null });
    mockSearchExperiences.mockResolvedValue(result([p]));
    renderPage();

    await waitFor(() => expect(document.querySelectorAll('[role="article"]')).toHaveLength(1));
    expect(screen.queryByRole("link", { name: /View details/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /View experience/i })).toBeNull();
  });
});
