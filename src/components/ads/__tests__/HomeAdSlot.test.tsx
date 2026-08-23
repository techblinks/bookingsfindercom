/**
 * HomeAdSlot — fails closed for html_embed (BF-0R-7 Phase H). This
 * component is not currently mounted anywhere live (see the BF-0R-7
 * audit), but is fixed and tested defensively so it is safe if/when it is
 * wired up in a future phase.
 */
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { HomeAdSlot } from "../HomeAdSlot";
import type { HomeAdPlacement } from "@/hooks/useHomeAds";

function makeAd(overrides: Partial<HomeAdPlacement> = {}): HomeAdPlacement {
  return {
    id: "ad-1",
    name: "Test Ad",
    type: "html_embed",
    placement: "hero_below",
    page: "home",
    device: "all",
    priority: 1,
    ...overrides,
  };
}

describe("HomeAdSlot — fails closed for html_embed", () => {
  it("renders nothing for type=html_embed, even with html_content set to a script payload", () => {
    const { container } = render(
      <HomeAdSlot
        ad={makeAd({ html_content: '<script>window.__xssRan = true;</script>' })}
        placement="hero_below"
      />
    );
    expect(container.innerHTML).toBe("");
    expect(document.querySelectorAll("script").length).toBe(0);
  });

  it("renders nothing when ad is null", () => {
    const { container } = render(<HomeAdSlot ad={null} placement="hero_below" />);
    expect(container.innerHTML).toBe("");
  });

  // BF-0R-7 Round 1.2 item 6: the impression effect used to fire on any
  // truthy `ad`, regardless of whether it was ever actually rendered — so a
  // disabled html_embed row could be counted as an impression even though
  // nothing was shown to the user.
  it("renders nothing AND does not call onImpression for type=html_embed", () => {
    const onImpression = vi.fn();
    const { container } = render(
      <HomeAdSlot
        ad={makeAd({ html_content: '<script>window.__xssRan = true;</script>' })}
        placement="hero_below"
        onImpression={onImpression}
      />
    );
    expect(container.innerHTML).toBe("");
    expect(onImpression).not.toHaveBeenCalled();
  });

  it("renders nothing AND does not call onImpression for an unrecognized ad type", () => {
    const onImpression = vi.fn();
    const { container } = render(
      <HomeAdSlot ad={makeAd({ type: "future_unknown_type" as HomeAdPlacement["type"] })} placement="hero_below" onImpression={onImpression} />
    );
    expect(container.innerHTML).toBe("");
    expect(onImpression).not.toHaveBeenCalled();
  });

  it("DOES call onImpression for a genuinely renderable type (sponsored_card)", () => {
    const onImpression = vi.fn();
    render(<HomeAdSlot ad={makeAd({ type: "sponsored_card" })} placement="hero_below" onImpression={onImpression} />);
    expect(onImpression).toHaveBeenCalledWith("ad-1");
  });
});
