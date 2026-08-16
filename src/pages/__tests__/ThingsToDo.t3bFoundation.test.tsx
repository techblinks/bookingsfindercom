/**
 * Things V2 (T3B) - design foundation on the ThingsToDo surface.
 *
 * Locks the T3B visual/semantic corrections on the results page:
 *
 *   - mapped "View details" and unmapped "View experience" CTAs belong to the
 *     SAME calm listing-action family and are never orange (design system
 *     section 19 / 30.3 / 30.4)
 *   - the external icon and sponsored nofollow noopener rel on the unmapped
 *     CTA are preserved
 *   - the premium no-image state renders in the card image slot
 *   - pagination uses the bounded window with a non-interactive ellipsis
 *   - essential "price on request" copy no longer uses muted contrast
 *   - the hero eyebrow uses the approved action-orange token
 *
 * searchExperiences / mapProviderProducts are mocked at the module boundary;
 * no network calls.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import type {
  ExperienceProduct,
  ExperienceSearchResult,
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
  totalCount = products.length,
): ExperienceSearchResult {
  return {
    products,
    totalCount,
    page: 1,
    providers: { tiqets: "available", viator: "disabled" },
    fetchedAt: new Date().toISOString(),
  };
}

const ORANGE = /D64A2A|D14525|things-action|--accent/i;

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

describe("T3B - listing card CTA family", () => {
  it("mapped card 'View details' uses the calm listing-action family, never orange", async () => {
    mockSearchExperiences.mockResolvedValue(result([product()]));
    mockMapProviderProducts.mockResolvedValue({
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
    renderPage();

    const link = await screen.findByRole("link", { name: "View details" });
    expect(link.className).not.toMatch(ORANGE);
    // Calm blue/neutral outline family: brand-primary text + outline border.
    expect(link.className).toContain("text-primary");
    expect(link.className).toContain("border-primary/30");
  });

  it("unmapped card 'View experience' uses the same calm family, never orange, and keeps its external semantics", async () => {
    const p = product();
    mockSearchExperiences.mockResolvedValue(result([p]));
    renderPage();

    const link = await screen.findByRole("link", { name: /View experience/i });
    expect(link.className).not.toMatch(ORANGE);
    expect(link.className).toContain("text-primary");
    expect(link.className).toContain("border-primary/30");
    // External semantics preserved.
    expect(link.getAttribute("href")).toBe(p.outboundUrl);
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("sponsored nofollow noopener");
    // External icon distinguishes the outbound action.
    expect(link.querySelector(".lucide-external-link")).toBeTruthy();
  });

  it("mapped and unmapped CTAs share the same action family classes", async () => {
    const mapped = product({ providerProductId: "M1" });
    const unmapped = product({
      provider: "viator",
      providerProductId: "V1",
      title: "Viator tour",
      outboundUrl: "https://www.viator.com/tours/Rome/v1",
    });
    mockSearchExperiences.mockResolvedValue(result([mapped, unmapped]));
    mockMapProviderProducts.mockResolvedValue({
      status: "available",
      mappings: [
        {
          provider: "tiqets",
          providerProductId: "M1",
          destinationSlug: "rome",
          activitySlug: "mapped-one",
          canonicalPath: "/things-to-do/rome/mapped-one",
          publicationStatus: "draft",
        },
      ],
    });
    renderPage();

    const details = await screen.findByRole("link", { name: "View details" });
    const experience = screen.getByRole("link", { name: /View experience/i });
    expect(details.className).toContain("border-primary/30");
    expect(experience.className).toContain("border-primary/30");
    expect(details.className).toContain("text-primary");
    expect(experience.className).toContain("text-primary");
  });

  it("the mapped 'View details' CTA is internal: no target, no rel, no external icon", async () => {
    mockSearchExperiences.mockResolvedValue(result([product()]));
    mockMapProviderProducts.mockResolvedValue({
      status: "available",
      mappings: [
        {
          provider: "tiqets",
          providerProductId: "1111450",
          destinationSlug: "rome",
          activitySlug: "vatican",
          canonicalPath: "/things-to-do/rome/vatican",
          publicationStatus: "draft",
        },
      ],
    });
    renderPage();

    const link = await screen.findByRole("link", { name: "View details" });
    expect(link.hasAttribute("target")).toBe(false);
    expect(link.getAttribute("rel")).toBeNull();
    expect(link.querySelector(".lucide-external-link")).toBeNull();
  });
});

describe("T3B - premium no-image state on cards", () => {
  it("a product with no image renders the Things no-image state in the image slot", async () => {
    mockSearchExperiences.mockResolvedValue(result([product({ imageUrl: null })]));
    renderPage();

    await waitFor(() => expect(document.querySelectorAll('[role="article"]')).toHaveLength(1));
    const card = document.querySelector('[role="article"]')!;
    const fallback = within(card as HTMLElement).getByTestId("things-no-image-state");
    expect(fallback).toBeTruthy();
    // No broken-image placeholder and no stock image substitution.
    expect(card.querySelector("img")).toBeNull();
    expect(card.textContent ?? "").not.toMatch(/unsplash|placeholder\.com/i);
  });

  it("an image load failure falls back to the same no-image state", async () => {
    mockSearchExperiences.mockResolvedValue(result([product({ imageUrl: "https://img.example/vatican.jpg" })]));
    renderPage();

    await waitFor(() => expect(document.querySelectorAll('[role="article"]')).toHaveLength(1));
    const card = document.querySelector('[role="article"]')!;
    const img = card.querySelector("img")!;
    expect(img).toBeTruthy();
    // Simulate a broken image: the onError handler swaps to the fallback.
    img.dispatchEvent(new Event("error"));
    await waitFor(() => expect(card.querySelector("img")).toBeNull());
    expect(within(card as HTMLElement).getByTestId("things-no-image-state")).toBeTruthy();
  });
});

describe("T3B - pagination on the results page", () => {
  it("renders the bounded window with a non-interactive ellipsis on large totals", async () => {
    const products = Array.from({ length: 24 }, (_, i) => product({ providerProductId: `P${i}` }));
    mockSearchExperiences.mockResolvedValue(result(products, 240));
    renderPage();

    const pagination = await screen.findByTestId("things-pagination");
    expect(pagination).toBeTruthy();
    // 10-page total: window must not render all ten numbers.
    const numericButtons = within(pagination as HTMLElement)
      .getAllByRole("button")
      .filter((button) => /^(Go to page|Page )\d+$/.test(button.getAttribute("aria-label") ?? ""));
    expect(numericButtons.length).toBeLessThanOrEqual(7);
    // Ellipsis present and non-interactive.
    const ellipsis = within(pagination as HTMLElement).getByText("…");
    expect(ellipsis.tagName).toBe("SPAN");
    expect(ellipsis.closest("button")).toBeNull();
    // Current page carries aria-current.
    expect(within(pagination as HTMLElement).getByRole("button", { name: "Page 1" }).getAttribute("aria-current")).toBe("page");
  });

  it("does not render pagination for a single page of results", async () => {
    mockSearchExperiences.mockResolvedValue(result([product()], 1));
    renderPage();
    await waitFor(() => expect(document.querySelectorAll('[role="article"]')).toHaveLength(1));
    expect(screen.queryByTestId("things-pagination")).toBeNull();
  });
});

describe("T3B - essential muted-text corrections", () => {
  it("'Price on request' uses sufficient-contrast secondary text, not muted", async () => {
    mockSearchExperiences.mockResolvedValue(
      result([product({ price: null, currency: null })]),
    );
    renderPage();

    const priceCopy = await screen.findByText("Price on request");
    expect(priceCopy.className).toContain("text-things-text-secondary");
    expect(priceCopy.className).not.toContain("text-things-text-muted");
  });

  it("the hero eyebrow uses an on-dark neutral treatment, never action-orange", async () => {
    mockSearchExperiences.mockResolvedValue(result([]));
    renderPage();

    const eyebrow = await screen.findByText("DISCOVER MORE");
    expect(eyebrow.className).toContain("text-white/70");
    expect(eyebrow.className).not.toMatch(/D64A2A|D14525|things-action/);
  });
});
