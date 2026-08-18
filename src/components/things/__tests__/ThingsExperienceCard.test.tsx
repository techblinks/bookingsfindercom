/**
 * Things V2 (T3D) — listing card behaviour.
 *
 * The card is the surface where a data-honesty slip becomes a customer-visible
 * lie, so every rule below is asserted against RENDERED OUTPUT rather than
 * props. Grouped by the promise each rule protects:
 *
 *   PRICE      "From <price>" is truthful because BOTH providers emit a genuine
 *              minimum (Tiqets `minPrice.amount`, Viator
 *              `pricing.summary.fromPrice`). A null price renders nothing —
 *              no "Price on request", no placeholder.
 *   FEATURES   only `=== true` renders; `false` and `null` are silent;
 *              `likelyToSellOut` is never surfaced at all.
 *   CLAIMS     no popularity, urgency, scarcity or recommendation wording.
 *   LOCATION   the product's OWN city/country, including surrounding-area
 *              inventory that is not in the searched destination.
 *   CTA        mapped = internal "View details"; unmapped = outbound
 *              "View experience" with exact URL and affiliate rel; both in one
 *              calm non-orange family.
 *   SKELETON   structurally matches the real card.
 */
import { describe, it, expect } from "vitest";
import { render, screen, within, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ThingsExperienceCard, {
  ThingsExperienceCardSkeleton,
  visibleFeatureFacts,
} from "@/components/things/ThingsExperienceCard";
import type { ExperienceProduct } from "@/types/experiences";

const ORANGE = /D64A2A|D14525|things-action|--accent/i;

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
    imageUrl: "https://img.example/vatican.jpg",
    imageAlt: "Sistine Chapel ceiling",
    imageCredit: null,
    rating: 4.7,
    reviewCount: 2100,
    price: 68,
    currency: "AUD",
    saleStatus: "on_sale",
    features: {
      freeCancellation: null,
      skipLine: null,
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

function renderCard(p: ExperienceProduct, canonicalPath: string | null = null) {
  return render(
    <MemoryRouter>
      <ThingsExperienceCard product={p} canonicalPath={canonicalPath} />
    </MemoryRouter>,
  );
}

function card(): HTMLElement {
  return screen.getByTestId("things-experience-card");
}

describe("T3D — genuine price only", () => {
  it("renders 'From <formatted price>' when the provider gave a genuine minimum", () => {
    renderCard(product({ price: 68, currency: "AUD" }));
    const text = card().textContent ?? "";
    expect(text).toContain("From");
    expect(text).toContain("$68");
  });

  it("renders NO price wording at all when price is null", () => {
    renderCard(product({ price: null, currency: null }));
    const text = card().textContent ?? "";
    expect(text).not.toMatch(/Price on request/i);
    expect(text).not.toMatch(/From/);
    // No placeholder stand-in either.
    expect(text).not.toMatch(/\bN\/A\b|--|\bTBC\b/);
  });

  it("never renders the legacy 'Price on request' copy, priced or not", () => {
    const { unmount } = renderCard(product({ price: 68 }));
    expect(screen.queryByText(/Price on request/i)).toBeNull();
    unmount();
    renderCard(product({ price: null, currency: null }));
    expect(screen.queryByText(/Price on request/i)).toBeNull();
  });

  it("keeps a currency the provider actually supplied rather than defaulting silently", () => {
    renderCard(product({ price: 42, currency: "EUR" }));
    expect(card().textContent ?? "").toMatch(/€|EUR/);
  });

  it("still shows provider attribution when there is no price", () => {
    renderCard(product({ price: null, currency: null, provider: "viator" }));
    expect(screen.getByText("Provided by Viator")).toBeTruthy();
  });
});

describe("T3D — feature facts are true-only", () => {
  it("renders a fact when the provider reported it as exactly true", () => {
    renderCard(product({ features: { ...product().features, skipLine: true } }));
    expect(within(card()).getByText("Skip the line")).toBeTruthy();
  });

  it("renders nothing positive for a false fact", () => {
    renderCard(product({ features: { ...product().features, freeCancellation: false } }));
    const text = card().textContent ?? "";
    expect(text).not.toMatch(/Free cancellation/i);
    // And no negative restatement either — a card is not a denial list.
    expect(text).not.toMatch(/No free cancellation|Non-refundable/i);
  });

  it("renders nothing for a null fact — missing evidence is not a denial", () => {
    renderCard(product({ features: { ...product().features, wheelchairAccessible: null } }));
    expect(card().textContent ?? "").not.toMatch(/Wheelchair/i);
    expect(screen.queryByTestId("things-card-facts")).toBeNull();
  });

  it("never surfaces likelyToSellOut, even when true", () => {
    renderCard(product({ features: { ...product().features, likelyToSellOut: true } }));
    const text = card().textContent ?? "";
    expect(text).not.toMatch(/sell out|selling fast|likely to sell/i);
    expect(screen.queryByTestId("things-card-facts")).toBeNull();
  });

  it("stays restrained: a fully-featured product does not become a feature dump", () => {
    renderCard(
      product({
        features: {
          freeCancellation: true,
          skipLine: true,
          smartphoneTicket: true,
          instantConfirmation: true,
          wheelchairAccessible: true,
          likelyToSellOut: true,
        },
      }),
    );
    const facts = within(card()).getAllByRole("listitem");
    expect(facts.length).toBeLessThanOrEqual(3);
    expect(card().textContent ?? "").not.toMatch(/sell out/i);
  });

  it("visibleFeatureFacts filters to true-only and excludes likelyToSellOut", () => {
    expect(
      visibleFeatureFacts({
        freeCancellation: true,
        skipLine: false,
        smartphoneTicket: null,
        instantConfirmation: null,
        wheelchairAccessible: null,
        likelyToSellOut: true,
      }),
    ).toEqual(["Free cancellation"]);
  });
});

describe("T3D — no fabricated popularity, urgency or recommendation", () => {
  it("carries no merchandising claims for a fully-populated product", () => {
    renderCard(
      product({
        rating: 4.9,
        reviewCount: 18400,
        features: {
          freeCancellation: true,
          skipLine: true,
          smartphoneTicket: true,
          instantConfirmation: true,
          wheelchairAccessible: true,
          likelyToSellOut: true,
        },
      }),
    );
    expect(card().textContent ?? "").not.toMatch(
      /bestsell|best.seller|most popular|top pick|recommended|trending|hot|must.see|limited|hurry|only \d+ left|book now|selling fast|editor/i,
    );
  });

  it("presents rating and review count as plain facts with no superlative", () => {
    renderCard(product({ rating: 4.7, reviewCount: 2100 }));
    const text = card().textContent ?? "";
    expect(text).toContain("4.7");
    expect(text).toContain("2,100 reviews");
    expect(text).not.toMatch(/excellent|outstanding|superb|highly rated/i);
  });

  it("renders no rating block when both rating and review count are null", () => {
    renderCard(product({ rating: null, reviewCount: null }));
    const text = card().textContent ?? "";
    expect(text).not.toMatch(/reviews/i);
    expect(text).not.toMatch(/\bNew\b|Be the first|No reviews yet/i);
  });

  it("renders a review count without a rating, and a rating without reviews", () => {
    const { unmount } = renderCard(product({ rating: null, reviewCount: 340 }));
    expect(card().textContent ?? "").toContain("340 reviews");
    unmount();
    renderCard(product({ rating: 4.2, reviewCount: null }));
    const text = card().textContent ?? "";
    expect(text).toContain("4.2");
    expect(text).not.toMatch(/reviews/i);
  });
});

describe("T3D — genuine location, including surrounding-area inventory", () => {
  it("prints the product's own city and country", () => {
    renderCard(product({ city: "Rome", country: "Italy" }));
    expect(within(card()).getByText("Rome, Italy")).toBeTruthy();
  });

  it("keeps a surrounding-area product's true location instead of the searched city", () => {
    renderCard(product({ city: "Tivoli", country: "Italy", title: "Villa d'Este Day Trip" }));
    const text = card().textContent ?? "";
    expect(text).toContain("Tivoli, Italy");
    // The Rome route must never overwrite a genuine non-Rome product location.
    expect(text).not.toMatch(/\bRome\b/);
  });

  it("prints a lone city without a dangling separator when country is null", () => {
    renderCard(product({ city: "Ostia Antica", country: null }));
    const text = card().textContent ?? "";
    expect(text).toContain("Ostia Antica");
    expect(text).not.toContain("Ostia Antica,");
  });

  it("renders no location row at all when the provider gave neither city nor country", () => {
    renderCard(product({ city: null, country: null }));
    expect(card().querySelector(".lucide-map-pin")).toBeNull();
  });
});

describe("T3D — CTA semantics preserved", () => {
  it("mapped: internal 'View details' React Router link, same tab, no affiliate rel, no external icon", () => {
    renderCard(product(), "/things-to-do/rome/vatican-museums");
    const link = screen.getByRole("link", { name: "View details" });
    expect(link.getAttribute("href")).toBe("/things-to-do/rome/vatican-museums");
    expect(link.hasAttribute("target")).toBe(false);
    expect(link.getAttribute("rel")).toBeNull();
    expect(link.querySelector(".lucide-external-link")).toBeNull();
  });

  it("unmapped: 'View experience' keeps the exact outbound URL and affiliate semantics", () => {
    const p = product();
    renderCard(p, null);
    const link = screen.getByRole("link", { name: /View experience/i });
    expect(link.getAttribute("href")).toBe(p.outboundUrl);
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("sponsored nofollow noopener");
    expect(link.querySelector(".lucide-external-link")).toBeTruthy();
  });

  it("a mapping wins over an outbound URL — the mapped card never links out", () => {
    renderCard(product(), "/things-to-do/rome/vatican-museums");
    expect(screen.queryByRole("link", { name: /View experience/i })).toBeNull();
    expect(card().querySelector('a[target="_blank"]')).toBeNull();
  });

  it("renders no CTA when there is neither a mapping nor a genuine outbound URL", () => {
    renderCard(product({ outboundUrl: null }), null);
    expect(within(card()).queryByRole("link")).toBeNull();
  });

  it("both CTAs share one calm non-orange family", () => {
    const { unmount } = renderCard(product(), "/things-to-do/rome/vatican-museums");
    const mapped = screen.getByRole("link", { name: "View details" }).className;
    unmount();
    renderCard(product(), null);
    const unmapped = screen.getByRole("link", { name: /View experience/i }).className;

    for (const cls of [mapped, unmapped]) {
      expect(cls).not.toMatch(ORANGE);
      expect(cls).toContain("text-primary");
      expect(cls).toContain("border-primary/30");
    }
  });
});

describe("T3D — imagery and structure", () => {
  it("renders the genuine image with provider alt text", () => {
    renderCard(product({ imageUrl: "https://img.example/v.jpg", imageAlt: "Sistine Chapel ceiling" }));
    const img = card().querySelector("img")!;
    expect(img.getAttribute("src")).toBe("https://img.example/v.jpg");
    expect(img.getAttribute("alt")).toBe("Sistine Chapel ceiling");
  });

  it("falls back to the premium no-image state, never a stock substitute", () => {
    renderCard(product({ imageUrl: null }));
    expect(within(card()).getByTestId("things-no-image-state")).toBeTruthy();
    expect(card().querySelector("img")).toBeNull();
    expect(card().textContent ?? "").not.toMatch(/unsplash|placeholder/i);
  });

  it("a long title is clamped rather than allowed to unbalance the grid", () => {
    renderCard(
      product({
        title:
          "Skip-the-Line Vatican Museums, Sistine Chapel and St Peter's Basilica Small-Group Guided Tour with Optional Dome Climb and Hotel Pickup",
      }),
    );
    const heading = within(card()).getByRole("heading", { level: 3 });
    expect(heading.className).toContain("line-clamp-2");
    // Clamping is visual only — the full genuine title stays in the DOM.
    expect(heading.textContent).toContain("Optional Dome Climb");
  });

  it("the skeleton structurally matches the card: same shell and same media aspect", () => {
    const { container: cardContainer } = renderCard(product());
    const cardMedia = cardContainer.querySelector('[class*="aspect-"]')!;
    const cardAspect = [...cardMedia.classList].find((c) => c.startsWith("aspect-"))!;
    cleanup();

    const { container } = render(<ThingsExperienceCardSkeleton />);
    const skeleton = screen.getByTestId("things-experience-card-skeleton");
    for (const cls of ["rounded-2xl", "border-things-border", "bg-things-surface-card"]) {
      expect(skeleton.className).toContain(cls);
    }
    // The media box must track the card's ratio, whatever it is — a skeleton
    // with a different aspect reintroduces the layout shift it exists to stop.
    const skeletonMedia = container.querySelector('[class*="aspect-"]')!;
    expect([...skeletonMedia.classList]).toContain(cardAspect);
  });

  it("the skeleton announces nothing to assistive technology", () => {
    render(<ThingsExperienceCardSkeleton />);
    expect(screen.getByTestId("things-experience-card-skeleton").getAttribute("aria-hidden")).toBe("true");
  });
});
