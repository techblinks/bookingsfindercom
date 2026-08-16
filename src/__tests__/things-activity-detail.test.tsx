/**
 * Things V2 (T2D-B1) — activity detail page behavior.
 *
 * The resolver service is mocked at the module boundary; no network calls
 * are made. Locks the page contract:
 *
 *   A.  exact canonical resolved activity renders
 *   B.  canonical URL emitted only after resolved identity
 *   C.  robots stays noindex,follow (always — even resolved)
 *   D.  unknown activity -> NotFound
 *   E.  unknown destination -> NotFound (resolver not called)
 *   F.  infrastructure failure != NotFound (honest unavailable + retry)
 *   G.  retry genuinely re-runs the resolver
 *   H.  provider ID absent from canonical URL
 *   I.  provider name absent from canonical URL
 *   J.  provider CTA appears only with a valid providerUrl
 *   K.  no provider URL -> no fake booking CTA
 *   L.  external CTA has sponsored nofollow noopener + _blank
 *   M.  provider attribution visible near the CTA
 *   N.  price renders only when genuine
 *   O.  rating/reviews render only when genuine
 *   P.  unknown availability is never shown as available
 *   Q.  unknown cancellation is not claimed
 *   R.  multiple offers render neutrally
 *   S.  no best/cheapest/recommended claim
 *   T.  no automatic affiliate redirect
 *
 * Helmet is asserted against document.head: react-helmet-async renders head
 * tags into the DOM in browser mode (the v2 context API is SSR-only).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import type { ThingsActivityDetail, ThingsActivityOfferDetail } from "@/types/thingsActivityDetail";

const mockResolve = vi.fn();
vi.mock("@/services/thingsActivityDetail", () => ({
  resolveThingsActivityDetail: (...args: unknown[]) => mockResolve(...args),
}));

// Imported after the mock above.
import ThingsToDoActivityRoute from "@/pages/ThingsToDoActivityRoute";

// ── Fixtures ───────────────────────────────────────────────────

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

// ── Render harness + head introspection ────────────────────────

interface HeadSnapshot {
  canonical: string;
  robots: string;
  title: string;
}

function renderPage(path: string) {
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

function readHead(): HeadSnapshot {
  const head = document.head ? document.head.innerHTML : "";
  const canonicalTag =
    head.match(/<link[^>]*rel="canonical"[^>]*>/i)?.[0] ?? "";
  const robotsTag =
    head.match(/<meta[^>]*name="robots"[^>]*>/i)?.[0] ?? "";
  return {
    canonical: canonicalTag,
    robots: robotsTag,
    title: document.title ?? "",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── A. Resolved activity renders ───────────────────────────────

describe("A/B/C — resolved activity page", () => {
  it("A. renders the exact canonical activity: H1, breadcrumb, location", async () => {
    mockResolve.mockResolvedValue({ state: "resolved", detail: makeDetail() });
    renderPage(RESOLVED_PATH);

    await waitFor(() =>
      expect(
        screen.getByRole("heading", {
          level: 1,
          name: "Vatican Museums, Sistine Chapel & St Peter's Basilica Guided Tour",
        }),
      ).toBeTruthy(),
    );

    // Breadcrumb: Things to do / Rome / title
    expect(screen.getByRole("link", { name: "Things to do" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Rome" })).toBeTruthy();
    expect(screen.getByText(/Rome, Italy/)).toBeTruthy();
  });

  it("B/H/I. canonical self-link emitted with identity only — no provider ID or name", async () => {
    mockResolve.mockResolvedValue({ state: "resolved", detail: makeDetail() });
    renderPage(RESOLVED_PATH);
    // Head tags flush asynchronously after the resolved DOM renders.
    await waitFor(() =>
      expect(readHead().canonical).toContain(
        "https://bookingsfinder.com/things-to-do/rome/vatican-museums-sistine-chapel-guided-tour",
      ),
    );
    const helmet = readHead();

    expect(helmet.canonical).toContain('rel="canonical"');
    expect(helmet.canonical).toContain(
      "https://bookingsfinder.com/things-to-do/rome/vatican-museums-sistine-chapel-guided-tour",
    );
    // H. provider product ID absent
    expect(helmet.canonical).not.toContain("3731VATICAN");
    // I. provider name absent
    expect(helmet.canonical.toLowerCase()).not.toContain("viator");
    expect(helmet.canonical.toLowerCase()).not.toContain("tiqets");
  });

  it("C. robots stays noindex,follow even when the activity is genuinely resolved", async () => {
    mockResolve.mockResolvedValue({
      state: "resolved",
      detail: makeDetail({
        activity: { ...makeDetail().activity, publicationStatus: "published" as const },
      }),
    });
    renderPage(RESOLVED_PATH);
    await waitFor(() => expect(readHead().robots).toContain('content="noindex,follow"'));
  });

  it("B. canonical is absent while loading", () => {
    mockResolve.mockReturnValue(new Promise(() => {})); // never settles
    renderPage(RESOLVED_PATH);
    expect(screen.getByTestId("activity-detail-loading")).toBeTruthy();
    expect(readHead().canonical).toBe("");
  });
});

// ── D/E — fail closed ──────────────────────────────────────────

describe("D/E — unknown identity fails closed to NotFound", () => {
  it("D. unknown activity (resolver not-found) renders NotFound", async () => {
    mockResolve.mockResolvedValue({ state: "not-found" });
    renderPage(RESOLVED_PATH);
    await waitFor(() => expect(screen.getByText("Oops! Page not found")).toBeTruthy());
    expect(screen.getByText("404")).toBeTruthy();
    expect(mockResolve).toHaveBeenCalledWith("rome", "vatican-museums-sistine-chapel-guided-tour");
  });

  it("E. unknown destination renders NotFound WITHOUT calling the resolver", async () => {
    renderPage("/things-to-do/paris/some-activity");
    await waitFor(() => expect(screen.getByText("Oops! Page not found")).toBeTruthy());
    expect(mockResolve).not.toHaveBeenCalled();
  });

  it("D. no canonical is invented from URL text on a not-found page", async () => {
    mockResolve.mockResolvedValue({ state: "not-found" });
    renderPage(RESOLVED_PATH);
    await waitFor(() => expect(screen.getByText("Oops! Page not found")).toBeTruthy());
    await waitFor(() => expect(readHead().robots).toContain('content="noindex,follow"'));
    expect(readHead().canonical).toBe("");
  });
});

// ── F/G — infrastructure failure vs not-found ──────────────────

describe("F/G — infrastructure failure is NOT not-found", () => {
  it("F. unavailable renders honest copy, not NotFound", async () => {
    mockResolve.mockResolvedValue({ state: "unavailable" });
    renderPage(RESOLVED_PATH);
    await waitFor(() =>
      expect(
        screen.getByText("We couldn't load this experience right now."),
      ).toBeTruthy(),
    );
    expect(screen.queryByText("Oops! Page not found")).toBeNull();
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
  });

  it("F. a rejected promise (network failure) also renders unavailable, not NotFound", async () => {
    mockResolve.mockRejectedValue(new Error("network down"));
    renderPage(RESOLVED_PATH);
    await waitFor(() =>
      expect(
        screen.getByText("We couldn't load this experience right now."),
      ).toBeTruthy(),
    );
    expect(screen.queryByText("Oops! Page not found")).toBeNull();
  });

  it("G. retry genuinely re-runs the resolver with the same slug pair", async () => {
    mockResolve
      .mockResolvedValueOnce({ state: "unavailable" })
      .mockResolvedValueOnce({ state: "resolved", detail: makeDetail() });

    renderPage(RESOLVED_PATH);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy(),
    );
    expect(mockResolve).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() =>
      expect(
        screen.getByRole("heading", {
          level: 1,
          name: "Vatican Museums, Sistine Chapel & St Peter's Basilica Guided Tour",
        }),
      ).toBeTruthy(),
    );
    expect(mockResolve).toHaveBeenCalledTimes(2);
    expect(mockResolve).toHaveBeenLastCalledWith(
      "rome",
      "vatican-museums-sistine-chapel-guided-tour",
    );
  });
});

// ── J/K/L/M — provider CTA behavior ────────────────────────────

describe("J/K/L/M — provider CTA and attribution", () => {
  it("J/L. CTA renders only with a valid providerUrl and carries sponsored nofollow noopener", async () => {
    mockResolve.mockResolvedValue({ state: "resolved", detail: makeDetail() });
    renderPage(RESOLVED_PATH);
    await waitFor(() =>
      expect(screen.getByRole("link", { name: /Check availability/i })).toBeTruthy(),
    );
    const cta = screen.getByRole("link", { name: /Check availability/i });
    expect(cta.getAttribute("href")).toBe(
      "https://www.viator.com/tours/Rome/vatican-museums-sistine-chapel",
    );
    expect(cta.getAttribute("target")).toBe("_blank");
    const rel = cta.getAttribute("rel") ?? "";
    expect(rel.split(/\s+/)).toEqual(
      expect.arrayContaining(["sponsored", "nofollow", "noopener"]),
    );
  });

  it("K. no provider URL -> no fake booking CTA, only honest copy", async () => {
    mockResolve.mockResolvedValue({
      state: "resolved",
      detail: makeDetail({ offers: [makeOffer({ providerUrl: null })] }),
    });
    renderPage(RESOLVED_PATH);
    await waitFor(() =>
      expect(screen.getByText("Check availability with the provider")).toBeTruthy(),
    );
    expect(screen.queryByRole("link", { name: /Check availability/i })).toBeNull();
  });

  it("M. provider attribution is visible near the CTA", async () => {
    mockResolve.mockResolvedValue({ state: "resolved", detail: makeDetail() });
    renderPage(RESOLVED_PATH);
    await waitFor(() =>
      expect(screen.getByText("Booking and payment handled by Viator.")).toBeTruthy(),
    );
  });

  it("a provider URL that is not http(s) is treated as absent", async () => {
    mockResolve.mockResolvedValue({
      state: "resolved",
      detail: makeDetail({ offers: [makeOffer({ providerUrl: "javascript:alert(1)" })] }),
    });
    renderPage(RESOLVED_PATH);
    await waitFor(() =>
      expect(screen.getByText("Check availability with the provider")).toBeTruthy(),
    );
    expect(screen.queryByRole("link", { name: /Check availability/i })).toBeNull();
  });
});

// ── N/O/P/Q — absence is better than invention ─────────────────

describe("N/O/P/Q — sparse data renders honestly", () => {
  it("N. price renders only when genuinely known", async () => {
    mockResolve.mockResolvedValue({ state: "resolved", detail: makeDetail() });
    renderPage(RESOLVED_PATH);
    await waitFor(() => expect(mockResolve).toHaveBeenCalled());
    // Header summary + offer card both show the single genuine price.
    expect(screen.getAllByText(/From .*59/).length).toBeGreaterThan(0);
  });

  it("N. no genuine price -> no price text at all", async () => {
    mockResolve.mockResolvedValue({
      state: "resolved",
      detail: makeDetail({ offers: [makeOffer({ price: null, currency: null })] }),
    });
    renderPage(RESOLVED_PATH);
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

  it("O. rating/reviews render only when genuine", async () => {
    mockResolve.mockResolvedValue({ state: "resolved", detail: makeDetail() });
    renderPage(RESOLVED_PATH);
    await waitFor(() => expect(screen.getByText("4.8")).toBeTruthy());
    expect(screen.getByText(/1,243 reviews/)).toBeTruthy();
  });

  it("O. no genuine rating -> no rating or review count rendered (no zero-star)", async () => {
    mockResolve.mockResolvedValue({
      state: "resolved",
      detail: makeDetail({ offers: [makeOffer({ rating: null, reviewCount: null })] }),
    });
    renderPage(RESOLVED_PATH);
    await waitFor(() =>
      expect(
        screen.getByRole("heading", {
          level: 1,
          name: "Vatican Museums, Sistine Chapel & St Peter's Basilica Guided Tour",
        }),
      ).toBeTruthy(),
    );
    expect(screen.queryByText(/reviews/)).toBeNull();
  });

  it("P. unknown availability is never shown as available", async () => {
    mockResolve.mockResolvedValue({ state: "resolved", detail: makeDetail() });
    renderPage(RESOLVED_PATH);
    await waitFor(() => expect(mockResolve).toHaveBeenCalled());
    const bodyText = document.body.textContent ?? "";
    expect(bodyText).not.toMatch(/Available today/i);
    expect(bodyText).not.toMatch(/Selling fast/i);
    expect(bodyText).not.toMatch(/Only \d+ left/i);
    expect(bodyText).not.toMatch(/Instant availability/i);
  });

  it("Q. unknown cancellation is not claimed", async () => {
    mockResolve.mockResolvedValue({
      state: "resolved",
      detail: makeDetail({ offers: [makeOffer({ freeCancellation: null })] }),
    });
    renderPage(RESOLVED_PATH);
    await waitFor(() => expect(mockResolve).toHaveBeenCalled());
    expect(screen.queryByText("Free cancellation")).toBeNull();
  });

  it("no image -> neutral fallback panel, not unrelated stock imagery", async () => {
    mockResolve.mockResolvedValue({
      state: "resolved",
      detail: makeDetail({ offers: [makeOffer({ imageUrl: null })] }),
    });
    renderPage(RESOLVED_PATH);
    await waitFor(() =>
      expect(screen.getByText("No image is available for this experience yet.")).toBeTruthy(),
    );
    expect(document.body.textContent ?? "").not.toMatch(/unsplash/i);
  });
});

// ── R/S/T — multiple offers and redirect safety ────────────────

describe("R/S/T — multi-offer neutrality and no auto-redirect", () => {
  // Clean multi-offer fixture: no hero image / credit bleed, no description
  // ambiguity, per-offer prices intact. Order must come from the booking
  // panel alone.
  const multiOfferDetail: ThingsActivityDetail = makeDetail({
    offers: [
      makeOffer({
        provider: "tiqets",
        providerProductId: "TIQ-1",
        providerUrl: "https://www.tiqets.com/en/rome/vatican-l1/",
        title: null,
        description: null,
        imageUrl: null,
        imageCredit: null,
        rating: null,
        reviewCount: null,
        price: 49,
      }),
      makeOffer({
        provider: "viator",
        providerProductId: "3731VATICAN",
        providerUrl: "https://www.viator.com/tours/Rome/vatican-museums-sistine-chapel",
        title: null,
        description: null,
        imageUrl: null,
        imageCredit: null,
        rating: null,
        reviewCount: null,
        price: 59,
      }),
    ],
  });

  it("R. multiple offers render in neutral provider order with attribution", async () => {
    mockResolve.mockResolvedValue({ state: "resolved", detail: multiOfferDetail });
    renderPage(RESOLVED_PATH);
    await waitFor(() => expect(screen.getByText("Booking options")).toBeTruthy());

    const aside = screen.getByLabelText("Booking options");
    expect(aside).toBeTruthy();

    // Both providers visible with their own CTA.
    expect(within(aside).getByText("Tiqets")).toBeTruthy();
    expect(within(aside).getByText("Viator")).toBeTruthy();
    expect(within(aside).getAllByRole("link", { name: /Check availability/i })).toHaveLength(2);

    // Neutral stable order: Tiqets before Viator (provider ascending), never
    // a ranking claim.
    const html = aside.innerHTML;
    const tiqetsIndex = html.indexOf("Tiqets");
    const viatorIndex = html.indexOf("Viator");
    expect(tiqetsIndex).toBeGreaterThan(-1);
    expect(viatorIndex).toBeGreaterThan(-1);
    expect(tiqetsIndex).toBeLessThan(viatorIndex);
  });

  it("S. no best/cheapest/recommended claim is ever made", async () => {
    mockResolve.mockResolvedValue({ state: "resolved", detail: multiOfferDetail });
    renderPage(RESOLVED_PATH);
    await waitFor(() => expect(mockResolve).toHaveBeenCalled());
    const bodyText = document.body.textContent ?? "";
    expect(bodyText).not.toMatch(/\bBest\b/i);
    expect(bodyText).not.toMatch(/\bCheapest\b/i);
    expect(bodyText).not.toMatch(/\bRecommended\b/i);
  });

  it("T. no automatic affiliate redirect (no location mutation, no meta refresh)", async () => {
    const assign = vi.fn();
    const replace = vi.fn();
    Object.defineProperty(window, "location", {
      writable: true,
      value: { ...window.location, assign, replace },
    });

    mockResolve.mockResolvedValue({ state: "resolved", detail: multiOfferDetail });
    renderPage(RESOLVED_PATH);
    await waitFor(() => expect(mockResolve).toHaveBeenCalled());

    expect(assign).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    expect(readHead().robots.toLowerCase()).not.toContain("http-equiv");
  });
});
