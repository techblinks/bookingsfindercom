/**
 * AdSlot — routes to the correct renderer per ad type, and fails closed
 * for html_embed (BF-0R-7 Phase H). sponsored_card is proven unaffected
 * by the html_embed security fix (regression coverage).
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AdSlot } from "../AdSlot";
import type { AdPlacement } from "@/hooks/useAds";

function makeAd(overrides: Partial<AdPlacement> = {}): AdPlacement {
  return {
    id: "ad-1",
    name: "Test Ad",
    type: "sponsored_card",
    placement: "after_result_3",
    page: "flights",
    device: "all",
    priority: 1,
    title: "Great Deal",
    cta_text: "Learn More",
    ...overrides,
  };
}

describe("AdSlot", () => {
  it("renders nothing when ad is null", () => {
    const { container } = render(<AdSlot ad={null} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders SponsoredCard for type=sponsored_card (regression — unaffected by the html_embed fix)", () => {
    render(<AdSlot ad={makeAd({ type: "sponsored_card", title: "Great Deal" })} />);
    // "Great Deal" appears twice (visible heading + sr-only SEO link).
    expect(screen.getAllByText("Great Deal").length).toBeGreaterThan(0);
    expect(screen.getByText("Sponsored")).toBeInTheDocument();
  });

  it("renders nothing for type=html_embed, even with html_content set to a script payload", () => {
    const { container } = render(
      <AdSlot
        ad={makeAd({
          type: "html_embed",
          html_content: '<script>window.__xssRan = true;</script>',
        })}
      />
    );
    expect(container.innerHTML).toBe("");
    expect(document.querySelectorAll("script").length).toBe(0);
  });
});
