/**
 * Things V2 (T3B) - design foundation on the activity detail page.
 *
 * Locks the T3B visual/semantic corrections while proving the genuine-data
 * gates are unchanged:
 *
 *   - "Check availability" uses the approved action-orange token #D14525
 *     family, never #D64A2A, and keeps sponsored nofollow noopener + _blank
 *   - breadcrumb links hover to brand-primary, not orange
 *   - essential "Booking and payment handled by X." copy uses
 *     sufficient-contrast secondary text
 *   - the premium no-image state renders with honest copy and a brand rule
 *   - "Good to know" facts render through the Things fact chip and remain
 *     every-offer-true gated (absence is better than invention)
 *
 * The resolver service is mocked at the module boundary; no network calls.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import type { ThingsActivityDetail, ThingsActivityOfferDetail } from "@/types/thingsActivityDetail";

const mockResolve = vi.fn();
vi.mock("@/services/thingsActivityDetail", () => ({
  resolveThingsActivityDetail: (...args: unknown[]) => mockResolve(...args),
}));

import ThingsToDoActivityRoute from "@/pages/ThingsToDoActivityRoute";

function makeOffer(overrides?: Partial<ThingsActivityOfferDetail>): ThingsActivityOfferDetail {
  return {
    activityId: "a1b2c3d4-0000-4000-8000-000000000001",
    provider: "viator",
    providerProductId: "3731VATICAN",
    providerUrl: "https://www.viator.com/tours/Rome/vatican-museums-sistine-chapel",
    createdAt: "2026-08-16T00:00:00.000Z",
    updatedAt: "2026-08-16T00:00:00.000Z",
    title: null,
    description: "A genuine provider description of the experience.",
    tagline: null,
    imageUrl: null,
    imageAlt: null,
    imageCredit: null,
    rating: 4.8,
    reviewCount: 1243,
    price: 59,
    currency: "AUD",
    freeCancellation: true,
    skipLine: true,
    smartphoneTicket: null,
    instantConfirmation: null,
    wheelchairAccessible: null,
    duration: null,
    meetingPoint: null,
    availabilityState: null,
    lastVerifiedAt: "2026-08-10T00:00:00.000Z",
    fetchedAt: "2026-08-16T00:00:00.000Z",
    ...overrides,
  };
}

function makeDetail(overrides?: Partial<ThingsActivityDetail>): ThingsActivityDetail {
  return {
    activity: {
      id: "a1b2c3d4-0000-4000-8000-000000000001",
      destinationSlug: "rome",
      slug: "vatican-museums-sistine-chapel-guided-tour",
      canonicalTitle: "Vatican Museums, Sistine Chapel & St Peter's Basilica Guided Tour",
      publicationStatus: "draft",
      verification: { evidence: "provider-catalog" },
      createdAt: "2026-08-16T00:00:00.000Z",
      updatedAt: "2026-08-16T00:00:00.000Z",
    },
    destination: { slug: "rome", displayName: "Rome", countryName: "Italy" },
    offers: [makeOffer()],
    ...overrides,
  };
}

const RESOLVED_PATH =
  "/things-to-do/rome/vatican-museums-sistine-chapel-guided-tour";

function renderPage(path: string = RESOLVED_PATH) {
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route
            path="/things-to-do/:destinationSlug/:activitySlug"
            element={<ThingsToDoActivityRoute />}
          />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

const ORANGE = /D64A2A|D14525|--accent/i;

describe("T3B - detail CTA and attribution", () => {
  it("'Check availability' uses the approved action-orange token family", async () => {
    mockResolve.mockResolvedValue({ state: "resolved", detail: makeDetail() });
    renderPage();

    const cta = await screen.findByRole("link", { name: /Check availability/i });
    expect(cta.className).toContain("bg-things-action");
    expect(cta.className).toContain("hover:bg-things-action-hover");
    expect(cta.className).not.toMatch(ORANGE);
    // External booking semantics unchanged.
    expect(cta.getAttribute("target")).toBe("_blank");
    const rel = cta.getAttribute("rel") ?? "";
    expect(rel.split(/\s+/)).toEqual(expect.arrayContaining(["sponsored", "nofollow", "noopener"]));
  });

  it("breadcrumb links hover to brand-primary, not orange", async () => {
    mockResolve.mockResolvedValue({ state: "resolved", detail: makeDetail() });
    renderPage();

    await waitFor(() => expect(screen.getByRole("link", { name: "Things to do" })).toBeTruthy());
    const hub = screen.getByRole("link", { name: "Things to do" });
    const rome = screen.getByRole("link", { name: "Rome" });
    expect(hub.className).toContain("hover:text-primary");
    expect(rome.className).toContain("hover:text-primary");
    expect(hub.className).not.toMatch(ORANGE);
    expect(rome.className).not.toMatch(ORANGE);
  });

  it("'Booking and payment handled by X.' uses sufficient-contrast secondary text", async () => {
    mockResolve.mockResolvedValue({ state: "resolved", detail: makeDetail() });
    renderPage();

    const handledBy = await screen.findByText("Booking and payment handled by Viator.");
    expect(handledBy.className).toContain("text-things-text-secondary");
    expect(handledBy.className).not.toContain("text-things-text-muted");
  });
});

describe("T3B - premium no-image state on the detail page", () => {
  it("renders honest copy and the intentional brand rule", async () => {
    mockResolve.mockResolvedValue({ state: "resolved", detail: makeDetail() });
    renderPage();

    const message = await screen.findByText("No image is available for this experience yet.");
    expect(message.className).toContain("text-things-text-secondary");
    const panel = message.closest('[data-testid="things-no-image-state"]');
    expect(panel).toBeTruthy();
    // Thin brand rule makes the state read as intentional.
    const rule = panel!.querySelector(".bg-primary");
    expect(rule).toBeTruthy();
    expect(document.body.textContent ?? "").not.toMatch(/unsplash/i);
  });

  it("falls back to the same no-image state when a genuine image fails to load", async () => {
    mockResolve.mockResolvedValue({
      state: "resolved",
      detail: makeDetail({ offers: [makeOffer({ imageUrl: "https://img.example/vatican.jpg" })] }),
    });
    renderPage();

    await waitFor(() => expect(document.querySelector("img")).toBeTruthy());
    const img = document.querySelector("img")!;
    img.dispatchEvent(new Event("error"));
    await waitFor(() =>
      expect(screen.getByText("No image is available for this experience yet.")).toBeTruthy(),
    );
  });
});

describe("T3B - Good to know facts through the Things fact chip", () => {
  it("renders every-offer-true facts as Things fact chips", async () => {
    mockResolve.mockResolvedValue({ state: "resolved", detail: makeDetail() });
    renderPage();

    await waitFor(() => expect(screen.getAllByTestId("things-fact-chip").length).toBe(2));
    const chips = screen.getAllByTestId("things-fact-chip");
    expect(chips.length).toBe(2); // freeCancellation + skipLine are true; others unknown/false
    for (const chip of chips) {
      expect(chip.querySelector(".lucide-circle-check")).toBeTruthy();
    }
    expect(screen.getByText("Skip the line")).toBeTruthy();
    expect(screen.getByText("Free cancellation")).toBeTruthy();
  });

  it("keeps the every-offer-true gate: an unknown fact is never claimed", async () => {
    mockResolve.mockResolvedValue({
      state: "resolved",
      detail: makeDetail({ offers: [makeOffer({ freeCancellation: null, skipLine: null })] }),
    });
    renderPage();

    await waitFor(() => expect(mockResolve).toHaveBeenCalled());
    expect(screen.queryByText("Free cancellation")).toBeNull();
    expect(screen.queryByText("Skip the line")).toBeNull();
    expect(screen.queryByTestId("things-fact-chip")).toBeNull();
  });
});

describe("T3B - data gates unchanged on the detail surface", () => {
  it("no genuine price -> no price text at all", async () => {
    mockResolve.mockResolvedValue({
      state: "resolved",
      detail: makeDetail({ offers: [makeOffer({ price: null, currency: null })] }),
    });
    renderPage();

    await waitFor(() =>
      expect(
        screen.getByRole("heading", {
          level: 1,
          name: "Vatican Museums, Sistine Chapel & St Peter's Basilica Guided Tour",
        }),
      ).toBeTruthy(),
    );
    expect(screen.queryByText(/From/)).toBeNull();
  });

  it("no valid provider URL -> honest copy, no fake booking CTA", async () => {
    mockResolve.mockResolvedValue({
      state: "resolved",
      detail: makeDetail({ offers: [makeOffer({ providerUrl: null })] }),
    });
    renderPage();

    await waitFor(() =>
      expect(screen.getByText("Check availability with the provider")).toBeTruthy(),
    );
    expect(screen.queryByRole("link", { name: /Check availability/i })).toBeNull();
  });

  it("section headers keep their aria-labelledby wiring", async () => {
    mockResolve.mockResolvedValue({ state: "resolved", detail: makeDetail() });
    renderPage();

    await waitFor(() => expect(screen.getByText("Good to know")).toBeTruthy());
    const section = screen.getByText("Good to know").closest("section")!;
    expect(section.getAttribute("aria-labelledby")).toBe("facts-heading");
    const heading = screen.getByText("Good to know");
    expect(heading.getAttribute("id")).toBe("facts-heading");
  });
});
