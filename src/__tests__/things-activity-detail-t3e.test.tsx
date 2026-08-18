/**
 * Things V2 (T3E) — activity detail visual system.
 *
 * T3E redesigned the canonical activity page. This suite locks the redesign's
 * behavioural contract and, more importantly, proves that NONE of the data
 * honesty, canonical identity, provider neutrality or SEO gates moved while
 * the presentation did.
 *
 *   A–F   canonical identity, breadcrumb, SEO / structured data
 *   G–K   media: genuine image, failure fallback, no-image state, credit
 *   L–R   evidence: rating, price (activity + provider level), null handling
 *   S–V   facts and description gating
 *   W–AB  booking surface: CTA semantics, invalid URL, neutrality, disclosure
 *   AC–AF sparse pages, loading skeleton, unavailable state, accessibility
 *
 * The resolver service is mocked at the module boundary; no network calls.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import type {
  ThingsActivityDetail,
  ThingsActivityOfferDetail,
} from "@/types/thingsActivityDetail";

const mockResolve = vi.fn();
vi.mock("@/services/thingsActivityDetail", () => ({
  resolveThingsActivityDetail: (...args: unknown[]) => mockResolve(...args),
}));

import ThingsToDoActivityRoute from "@/pages/ThingsToDoActivityRoute";

// ── Fixtures ───────────────────────────────────────────────────

const CANONICAL_TITLE =
  "Vatican Museums, Sistine Chapel & St Peter's Basilica Guided Tour";
const RESOLVED_PATH =
  "/things-to-do/rome/vatican-museums-sistine-chapel-guided-tour";
const VIATOR_URL = "https://www.viator.com/tours/Rome/vatican-museums";
const TIQETS_URL = "https://www.tiqets.com/en/rome/vatican-museums";

function makeOffer(overrides?: Partial<ThingsActivityOfferDetail>): ThingsActivityOfferDetail {
  return {
    activityId: "a1b2c3d4-0000-4000-8000-000000000001",
    provider: "viator",
    providerProductId: "3731VATICAN",
    providerUrl: VIATOR_URL,
    createdAt: "2026-08-16T00:00:00.000Z",
    updatedAt: "2026-08-16T00:00:00.000Z",
    title: null,
    description: "A genuine provider description of the experience.",
    tagline: "A tagline the page must not print.",
    imageUrl: "https://img.example/vatican.jpg",
    imageAlt: "Sistine Chapel ceiling",
    imageCredit: "Viator",
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
      canonicalTitle: CANONICAL_TITLE,
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

/**
 * Two providers with NO overlapping optional data beyond price, so anything
 * activity-level that still renders would be an aggregation bug.
 */
const MULTI_OFFERS: ThingsActivityOfferDetail[] = [
  makeOffer({
    provider: "tiqets",
    providerProductId: "TIQ-1",
    providerUrl: TIQETS_URL,
    description: null,
    imageUrl: null,
    imageAlt: null,
    imageCredit: null,
    rating: null,
    reviewCount: null,
    price: 49,
    skipLine: true,
    freeCancellation: null,
  }),
  makeOffer({ price: 59 }),
];

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
    </HelmetProvider>,
  );
}

const resolveWith = (detail: ThingsActivityDetail) =>
  mockResolve.mockResolvedValue({ state: "resolved", detail });

const findH1 = () =>
  screen.findByRole("heading", { level: 1, name: CANONICAL_TITLE });

beforeEach(() => {
  vi.clearAllMocks();
});

// ── A–F. Identity, breadcrumb, SEO ─────────────────────────────

describe("T3E A–F — canonical identity and SEO are untouched by the redesign", () => {
  it("A. the canonical BookingsFinder activity title is the page's only H1", async () => {
    resolveWith(makeDetail());
    renderPage();
    await findH1();

    // Provider offer titles never replace canonical identity, and the redesign
    // did not introduce a second H1 anywhere in the new composition.
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("A. a provider offer title never overrides the canonical H1", async () => {
    resolveWith(
      makeDetail({ offers: [makeOffer({ title: "Viator: VATICAN MUSEUMS TOUR (SKIP LINE!)" })] }),
    );
    renderPage();
    await findH1();
    expect(screen.queryByText(/VATICAN MUSEUMS TOUR \(SKIP LINE!\)/)).toBeNull();
  });

  it("B. the breadcrumb keeps Things to do / Rome / activity, with registry-owned links", async () => {
    resolveWith(makeDetail());
    renderPage();
    await findH1();

    const crumbs = screen.getByRole("navigation", { name: "Breadcrumb" });
    const hub = within(crumbs).getByRole("link", { name: "Things to do" });
    const dest = within(crumbs).getByRole("link", { name: "Rome" });
    expect(hub.getAttribute("href")).toBe("/things-to-do");
    expect(dest.getAttribute("href")).toBe("/things-to-do/rome");

    const current = within(crumbs).getByText(CANONICAL_TITLE);
    expect(current.getAttribute("aria-current")).toBe("page");
  });

  it("B. the destination line comes from the canonical registry, not provider text", async () => {
    resolveWith(makeDetail());
    renderPage();
    await findH1();
    expect(screen.getByText("Rome, Italy")).toBeTruthy();
  });

  it("C/D. canonical resolves to activity identity and robots stays noindex,follow", async () => {
    resolveWith(
      makeDetail({
        activity: { ...makeDetail().activity, publicationStatus: "published" as const },
      }),
    );
    renderPage();
    await findH1();

    await waitFor(() =>
      expect(
        document.head.querySelector('link[rel="canonical"]')?.getAttribute("href"),
      ).toBe(
        "https://bookingsfinder.com/things-to-do/rome/vatican-museums-sistine-chapel-guided-tour",
      ),
    );
    // Published status must NOT make the page indexable: T3E is not the
    // publication phase.
    expect(
      document.head.querySelector('meta[name="robots"]')?.getAttribute("content"),
    ).toBe("noindex,follow");
  });

  it("E. no Product / Offer / Review / FAQ structured data is emitted", async () => {
    resolveWith(makeDetail());
    renderPage();
    await findH1();

    const blocks = Array.from(
      document.querySelectorAll('script[type="application/ld+json"]'),
    ).map((node) => node.textContent ?? "");
    for (const block of blocks) {
      expect(block).not.toMatch(/"@type"\s*:\s*"(Product|Offer|Review|AggregateRating|FAQPage|Question)"/);
    }
  });

  it("F. unknown destination still fails closed without calling the resolver", async () => {
    renderPage("/things-to-do/paris/some-activity");
    await waitFor(() => expect(screen.getByText("Oops! Page not found")).toBeTruthy());
    expect(mockResolve).not.toHaveBeenCalled();
  });

  it("F. resolver not-found stays NotFound; unavailable stays a distinct state", async () => {
    mockResolve.mockResolvedValueOnce({ state: "not-found" });
    renderPage();
    await waitFor(() => expect(screen.getByText("Oops! Page not found")).toBeTruthy());
    expect(screen.queryByTestId("activity-detail-unavailable")).toBeNull();
  });
});

// ── G–K. Media ─────────────────────────────────────────────────

describe("T3E G–K — media is genuine or honestly absent", () => {
  it("G. a genuine image renders with its provider alt text", async () => {
    resolveWith(makeDetail());
    renderPage();

    const img = await screen.findByTestId("activity-hero-image");
    expect(img.getAttribute("src")).toBe("https://img.example/vatican.jpg");
    expect(img.getAttribute("alt")).toBe("Sistine Chapel ceiling");
  });

  it("G. alt falls back to the canonical title, never to empty or filler text", async () => {
    resolveWith(makeDetail({ offers: [makeOffer({ imageAlt: null })] }));
    renderPage();
    const img = await screen.findByTestId("activity-hero-image");
    expect(img.getAttribute("alt")).toBe(CANONICAL_TITLE);
  });

  it("H. a failed image falls back to the honest no-image state, and drops its credit", async () => {
    resolveWith(makeDetail());
    renderPage();

    const img = await screen.findByTestId("activity-hero-image");
    fireEvent.error(img);

    await waitFor(() =>
      expect(screen.getByText("No image is available for this experience yet.")).toBeTruthy(),
    );
    expect(screen.queryByTestId("activity-hero-image")).toBeNull();
    // Crediting an image nobody can see would be a false attribution.
    expect(screen.queryByText(/Image: Viator/)).toBeNull();
  });

  it("I. no genuine image fabricates nothing — no img, no stock, no gallery tiles", async () => {
    resolveWith(makeDetail({ offers: [makeOffer({ imageUrl: null, imageCredit: null })] }));
    renderPage();
    await findH1();

    expect(screen.getByTestId("things-no-image-state")).toBeTruthy();
    expect(screen.queryByTestId("activity-hero-image")).toBeNull();
    const body = document.body.textContent ?? "";
    expect(body).not.toMatch(/unsplash|pexels|shutterstock|placeholder/i);
  });

  it("J. one genuine image is presented once — never duplicated into a fake gallery", async () => {
    resolveWith(makeDetail());
    renderPage();
    await screen.findByTestId("activity-hero-image");

    const heroSources = Array.from(document.querySelectorAll("img"))
      .map((img) => img.getAttribute("src") ?? "")
      .filter((src) => src === "https://img.example/vatican.jpg");
    expect(heroSources).toHaveLength(1);
  });

  it("K. a genuine image credit is preserved", async () => {
    resolveWith(makeDetail());
    renderPage();
    await waitFor(() => expect(screen.getByText("Image: Viator")).toBeTruthy());
  });

  it("K. no credit is invented when the provider supplies none", async () => {
    resolveWith(makeDetail({ offers: [makeOffer({ imageCredit: null })] }));
    renderPage();
    await screen.findByTestId("activity-hero-image");
    expect(screen.queryByText(/^Image:/)).toBeNull();
  });
});

// ── L–R. Evidence: rating and price ────────────────────────────

describe("T3E L–R — rating and price render only under the existing helper gates", () => {
  it("L. an unambiguous single-offer rating renders calmly with its review count", async () => {
    resolveWith(makeDetail());
    renderPage();
    await waitFor(() => expect(screen.getByText("4.8")).toBeTruthy());
    expect(screen.getByText("1,243 reviews")).toBeTruthy();
  });

  it("M. two rated offers produce NO activity-level rating (never averaged or summed)", async () => {
    resolveWith(
      makeDetail({
        offers: [
          makeOffer({ provider: "tiqets", providerProductId: "TIQ-1", providerUrl: TIQETS_URL, rating: 4.2, reviewCount: 300, imageUrl: null, description: null }),
          makeOffer({ rating: 4.8, reviewCount: 1243 }),
        ],
      }),
    );
    renderPage();
    await findH1();

    const body = document.body.textContent ?? "";
    expect(screen.queryByText(/reviews/)).toBeNull();
    expect(body).not.toContain("4.5"); // no local average
    expect(body).not.toContain("1,543"); // no summed review count
  });

  it("N. a null rating renders no rating at all — no zero stars, no placeholder", async () => {
    resolveWith(makeDetail({ offers: [makeOffer({ rating: null, reviewCount: null })] }));
    renderPage();
    await findH1();
    expect(screen.queryByText(/reviews/)).toBeNull();
    expect(screen.queryByText("0.0")).toBeNull();
  });

  it("O. an unambiguous activity-level from-price renders once as a single phrase", async () => {
    resolveWith(makeDetail());
    renderPage();
    await findH1();
    // Header evidence row + the provider's own row — both genuine, both the
    // same single price, and "From" is never separated from the amount.
    expect(screen.getAllByText(/^From .*59$/).length).toBeGreaterThan(0);
  });

  it("P. two priced offers drop the activity-level price but keep each genuine provider price", async () => {
    resolveWith(makeDetail({ offers: MULTI_OFFERS }));
    renderPage();
    await findH1();

    const panel = screen.getByTestId("activity-booking-panel");
    expect(within(panel).getByText(/^From .*49$/)).toBeTruthy();
    expect(within(panel).getByText(/^From .*59$/)).toBeTruthy();
    // Nothing outside the panel claims a price for the activity as a whole.
    expect(screen.getAllByText(/^From /)).toHaveLength(2);
  });

  it("Q/R. a null price produces no wording — and never 'Price on request'", async () => {
    resolveWith(makeDetail({ offers: [makeOffer({ price: null, currency: null })] }));
    renderPage();
    await findH1();

    expect(screen.queryByText(/From/)).toBeNull();
    const body = document.body.textContent ?? "";
    expect(body).not.toMatch(/Price on request|Contact for price|\bTBC\b|\bN\/A\b/i);
    expect(body).not.toMatch(/was \$|\bsave\b|\bdiscount\b|% off/i);
  });

  it("Q. one priced and one unpriced offer never borrows the known price", async () => {
    resolveWith(
      makeDetail({
        offers: [
          makeOffer({ provider: "tiqets", providerProductId: "TIQ-1", providerUrl: TIQETS_URL, price: null, currency: null, imageUrl: null, description: null, rating: null, reviewCount: null }),
          makeOffer({ price: 59 }),
        ],
      }),
    );
    renderPage();
    await findH1();

    // Exactly one priced row in the panel — Tiqets' row states no price at all
    // rather than inheriting Viator's.
    const panel = screen.getByTestId("activity-booking-panel");
    expect(within(panel).getAllByText(/^From /)).toHaveLength(1);
    expect(within(panel).getByText(/^From .*59$/)).toBeTruthy();
    expect(within(panel).queryByText(/49/)).toBeNull();
  });
});

// ── S–V. Facts and description ─────────────────────────────────

describe("T3E S–V — facts and description keep their truth gates", () => {
  it("S. genuinely-true facts render as fact chips", async () => {
    resolveWith(makeDetail());
    renderPage();
    await waitFor(() => expect(screen.getAllByTestId("things-fact-chip")).toHaveLength(2));
    expect(screen.getByText("Free cancellation")).toBeTruthy();
    expect(screen.getByText("Skip the line")).toBeTruthy();
  });

  it("S. the detail page may show more facts than the T3D card's three-fact cap", async () => {
    resolveWith(
      makeDetail({
        offers: [
          makeOffer({
            smartphoneTicket: true,
            instantConfirmation: true,
            wheelchairAccessible: true,
          }),
        ],
      }),
    );
    renderPage();
    await waitFor(() => expect(screen.getAllByTestId("things-fact-chip")).toHaveLength(5));
  });

  it("T. null and false facts never become positive claims", async () => {
    resolveWith(
      makeDetail({
        offers: [makeOffer({ freeCancellation: false, skipLine: null, smartphoneTicket: null })],
      }),
    );
    renderPage();
    await findH1();

    expect(screen.queryByTestId("things-fact-chip")).toBeNull();
    expect(screen.queryByText("Good to know")).toBeNull();
    const body = document.body.textContent ?? "";
    expect(body).not.toMatch(/No free cancellation|Not wheelchair|Unavailable/i);
  });

  it("T. a fact only one provider reports is not promoted to an activity-level claim", async () => {
    resolveWith(makeDetail({ offers: MULTI_OFFERS }));
    renderPage();
    await findH1();
    // Both offers report skipLine; only Viator reports freeCancellation.
    expect(screen.getByText("Skip the line")).toBeTruthy();
    expect(screen.queryByText("Free cancellation")).toBeNull();
  });

  it("U. no urgency, scarcity or popularity claim appears anywhere", async () => {
    resolveWith(makeDetail({ offers: MULTI_OFFERS }));
    renderPage();
    await findH1();

    const body = document.body.textContent ?? "";
    expect(body).not.toMatch(/likely to sell out|selling fast|only \d+ left|in high demand|popular/i);
    expect(body).not.toMatch(/available today|instant availability|book now before/i);
  });

  it("V. the description renders with its provider attribution when attributable", async () => {
    resolveWith(makeDetail());
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByText("A genuine provider description of the experience."),
      ).toBeTruthy(),
    );
    expect(screen.getByText("Description provided by Viator.")).toBeTruthy();
  });

  it("V. two described offers render no description — descriptions are never merged", async () => {
    resolveWith(
      makeDetail({
        offers: [
          makeOffer({ provider: "tiqets", providerProductId: "TIQ-1", providerUrl: TIQETS_URL, description: "Tiqets' own words.", imageUrl: null, rating: null, reviewCount: null }),
          makeOffer({ description: "Viator's own words." }),
        ],
      }),
    );
    renderPage();
    await findH1();

    expect(screen.queryByText("About this experience")).toBeNull();
    expect(screen.queryByText(/Tiqets' own words/)).toBeNull();
    expect(screen.queryByText(/Viator's own words/)).toBeNull();
  });

  it("V. a null description renders no section and no generated copy", async () => {
    resolveWith(makeDetail({ offers: [makeOffer({ description: null })] }));
    renderPage();
    await findH1();
    expect(screen.queryByText("About this experience")).toBeNull();
    expect(screen.queryByText(/Description provided by/)).toBeNull();
  });

  it("V. the provider tagline is deliberately not surfaced", async () => {
    resolveWith(makeDetail());
    renderPage();
    await findH1();
    expect(screen.queryByText(/A tagline the page must not print/)).toBeNull();
  });

  it("V. unpopulated duration / meeting point / availability create no empty shells", async () => {
    resolveWith(makeDetail());
    renderPage();
    await findH1();

    const body = document.body.textContent ?? "";
    expect(body).not.toMatch(/Duration|Meeting point|Meeting Point/i);
    expect(body).not.toMatch(/Duration varies|provided later|Check provider for schedule/i);
    // Technical timestamps stay internal.
    expect(body).not.toMatch(/Last verified|Last checked|Fetched/i);
  });
});

// ── W–AB. Booking surface ──────────────────────────────────────

describe("T3E W–AB — the booking surface stays truthful and provider-neutral", () => {
  it("W. a valid provider URL yields an external CTA with the exact affiliate semantics", async () => {
    resolveWith(makeDetail());
    renderPage();

    const cta = await screen.findByRole("link", { name: /Check availability/i });
    expect(cta.getAttribute("href")).toBe(VIATOR_URL);
    expect(cta.getAttribute("target")).toBe("_blank");
    expect((cta.getAttribute("rel") ?? "").split(/\s+/)).toEqual(
      expect.arrayContaining(["sponsored", "nofollow", "noopener"]),
    );
    // External-link marker distinguishes leaving the site.
    expect(cta.querySelector("svg.lucide-external-link")).toBeTruthy();
    // The accessible name extends the visible label (WCAG 2.5.3).
    expect(cta.getAttribute("aria-label")).toBe("Check availability with Viator");
    expect(cta.textContent).toContain("Check availability");
  });

  it("W. the CTA meets the 44px mobile touch target", async () => {
    resolveWith(makeDetail());
    renderPage();
    const cta = await screen.findByRole("link", { name: /Check availability/i });
    expect(cta.className).toContain("min-h-[44px]");
  });

  it("X. an invalid or null provider URL renders no clickable CTA and no manufactured URL", async () => {
    for (const url of [null, "javascript:alert(1)", "  "]) {
      mockResolve.mockReset();
      resolveWith(makeDetail({ offers: [makeOffer({ providerUrl: url })] }));
      const { unmount } = render(
        <HelmetProvider>
          <MemoryRouter initialEntries={[RESOLVED_PATH]}>
            <Routes>
              <Route
                path="/things-to-do/:destinationSlug/:activitySlug"
                element={<ThingsToDoActivityRoute />}
              />
            </Routes>
          </MemoryRouter>
        </HelmetProvider>,
      );
      await waitFor(() =>
        expect(screen.getByText("Check availability with the provider")).toBeTruthy(),
      );
      expect(screen.queryByRole("link", { name: /Check availability/i })).toBeNull();
      expect(screen.queryByRole("button", { name: /Check availability/i })).toBeNull();
      unmount();
    }
  });

  it("Y. provider handling copy stays next to every CTA", async () => {
    resolveWith(makeDetail({ offers: MULTI_OFFERS }));
    renderPage();
    await findH1();

    expect(screen.getByText("Booking and payment handled by Tiqets.")).toBeTruthy();
    expect(screen.getByText("Booking and payment handled by Viator.")).toBeTruthy();
  });

  it("Z. multiple providers keep neutral ordering and identical CTA treatment", async () => {
    resolveWith(makeDetail({ offers: MULTI_OFFERS }));
    renderPage();
    await findH1();

    const panel = screen.getByLabelText("Booking options");
    const providers = within(panel).getAllByText(/^(Tiqets|Viator)$/).map((n) => n.textContent);
    expect(providers).toEqual(["Tiqets", "Viator"]);

    const ctas = within(panel).getAllByRole("link", { name: /Check availability/i });
    expect(ctas).toHaveLength(2);
    // Identical classes: no crowning, no highlight, no de-emphasis.
    expect(ctas[0].className).toBe(ctas[1].className);
  });

  it("Z. price order never reorders providers (cheaper offer does not jump first)", async () => {
    resolveWith(
      makeDetail({
        offers: [
          makeOffer({ price: 59 }), // viator, dearer, supplied first
          makeOffer({ provider: "tiqets", providerProductId: "TIQ-1", providerUrl: TIQETS_URL, price: 9, imageUrl: null, description: null, rating: null, reviewCount: null }),
        ],
      }),
    );
    renderPage();
    await findH1();

    const panel = screen.getByLabelText("Booking options");
    const providers = within(panel).getAllByText(/^(Tiqets|Viator)$/).map((n) => n.textContent);
    expect(providers).toEqual(["Tiqets", "Viator"]); // alphabetical, not by price
  });

  it("AA. no best / cheapest / recommended / preferred language anywhere", async () => {
    resolveWith(makeDetail({ offers: MULTI_OFFERS }));
    renderPage();
    await findH1();

    const body = document.body.textContent ?? "";
    for (const claim of [
      /\bbest\b/i,
      /\bcheapest\b/i,
      /\brecommended\b/i,
      /\bpreferred\b/i,
      /\bofficial partner\b/i,
      /\bverified provider\b/i,
      /\btrusted provider\b/i,
      /\btop pick\b/i,
    ]) {
      expect(body).not.toMatch(claim);
    }
  });

  it("AB. the commission disclosure is present and readable", async () => {
    resolveWith(makeDetail());
    renderPage();

    const disclosure = await screen.findByText(
      /BookingsFinder may earn a commission when you book with a provider\./,
    );
    expect(disclosure.textContent).toContain(
      "Availability and prices are set by the provider.",
    );
    // Contrast: subordinate must not mean unreadable.
    expect(disclosure.className).toContain("text-things-text-secondary");
    expect(disclosure.className).not.toContain("text-things-text-muted");
  });

  it("AB. no native checkout, date picker, quantity or wishlist controls exist", async () => {
    resolveWith(makeDetail({ offers: MULTI_OFFERS }));
    renderPage();
    await findH1();

    const main = screen.getByRole("main");
    expect(within(main).queryAllByRole("combobox")).toHaveLength(0);
    expect(within(main).queryAllByRole("spinbutton")).toHaveLength(0);
    expect(main.querySelectorAll('input[type="date"], input[type="number"], form')).toHaveLength(0);

    const body = document.body.textContent ?? "";
    expect(body).not.toMatch(/select a date|choose a date|add to cart|checkout|save to wishlist|add to favourites/i);
  });
});

// ── AC–AF. Sparse, loading, unavailable, accessibility ─────────

describe("T3E AC–AF — sparse pages, loading and unavailable states", () => {
  it("AC. a sparse activity renders without a single fabricated section", async () => {
    resolveWith(
      makeDetail({
        offers: [
          makeOffer({
            description: null,
            tagline: null,
            imageUrl: null,
            imageAlt: null,
            imageCredit: null,
            rating: null,
            reviewCount: null,
            price: null,
            currency: null,
            freeCancellation: null,
            skipLine: null,
          }),
        ],
      }),
    );
    renderPage();
    await findH1();

    // What remains is genuine: identity, honest no-image state, and one way to book.
    expect(screen.getByTestId("things-no-image-state")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Check availability/i })).toBeTruthy();
    expect(screen.queryByText("Good to know")).toBeNull();
    expect(screen.queryByText("About this experience")).toBeNull();
    expect(screen.queryByText(/From/)).toBeNull();
    expect(screen.queryByText(/reviews/)).toBeNull();
  });

  it("AC. an activity with no offers says so plainly and renders no CTA", async () => {
    resolveWith(makeDetail({ offers: [] }));
    renderPage();
    await findH1();

    expect(screen.getByText("No booking options are available yet.")).toBeTruthy();
    expect(screen.queryByRole("link", { name: /Check availability/i })).toBeNull();
    // The disclosure remains — the commercial relationship is unchanged.
    expect(
      screen.getByText(/BookingsFinder may earn a commission when you book with a provider\./),
    ).toBeTruthy();
  });

  it("AD. the loading skeleton keeps aria-busy and promises no gated content", async () => {
    mockResolve.mockReturnValue(new Promise(() => {}));
    renderPage();

    const skeleton = screen.getByTestId("activity-detail-loading");
    expect(skeleton.getAttribute("aria-busy")).toBe("true");

    const text = skeleton.textContent ?? "";
    expect(text).not.toMatch(/Good to know|About this experience|From |reviews/);
  });

  it("AD. the skeleton pulse honours prefers-reduced-motion", async () => {
    mockResolve.mockReturnValue(new Promise(() => {}));
    renderPage();

    const pulse = screen
      .getByTestId("activity-detail-loading")
      .querySelector('[class*="animate-pulse"]');
    expect(pulse).toBeTruthy();
    expect(pulse!.className).toContain("motion-safe:animate-pulse");
    expect(pulse!.className).not.toMatch(/(^|\s)animate-pulse(\s|$)/);
  });

  it("AE. the unavailable state stays infrastructure-honest and never blames the traveller", async () => {
    mockResolve.mockResolvedValue({ state: "unavailable" });
    renderPage();

    await waitFor(() =>
      expect(screen.getByText("We couldn't load this experience right now.")).toBeTruthy(),
    );
    const body = document.body.textContent ?? "";
    expect(body).not.toMatch(/doesn't exist|does not exist|try another destination|change your filters|no results/i);
    expect(screen.queryByText("Oops! Page not found")).toBeNull();
  });

  it("AE. retry genuinely re-runs the resolver with the same canonical slug pair", async () => {
    mockResolve
      .mockResolvedValueOnce({ state: "unavailable" })
      .mockResolvedValueOnce({ state: "resolved", detail: makeDetail() });

    renderPage();
    await screen.findByRole("button", { name: "Try again" });
    expect(mockResolve).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await findH1();
    expect(mockResolve).toHaveBeenCalledTimes(2);
    expect(mockResolve).toHaveBeenLastCalledWith(
      "rome",
      "vatican-museums-sistine-chapel-guided-tour",
    );
  });

  it("AF. landmarks and section labelling survive the redesign", async () => {
    resolveWith(makeDetail());
    renderPage();
    await findH1();

    expect(screen.getByRole("main")).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toBeTruthy();
    expect(screen.getByLabelText("Booking options")).toBeTruthy();

    const facts = screen.getByText("Good to know").closest("section")!;
    expect(facts.getAttribute("aria-labelledby")).toBe("facts-heading");
    const about = screen.getByText("About this experience").closest("section")!;
    expect(about.getAttribute("aria-labelledby")).toBe("about-heading");
  });
});
