/**
 * selectTopAdPerPlacement (BF-0R-7 Round 1.1 item 3).
 *
 * Regression coverage for the "disabled html_embed starves a real ad" bug:
 * get-ads used to rank ALL ad rows by priority per placement, including rows
 * of types the frontend never renders (html_embed was neutered as a P0 XSS
 * fix — see AdEmbed.tsx). A high-priority html_embed row would win the slot
 * and leave it silently blank, even when a lower-priority sponsored_card row
 * — which WOULD have rendered — was available for the same placement.
 */
import { describe, it, expect } from "vitest";
import { selectTopAdPerPlacement, type SelectableAd } from "../adSelection";

interface TestAd extends SelectableAd {
  id: string;
}

function ad(id: string, placement: string, type: string, priority: number): TestAd {
  return { id, placement, type, priority };
}

describe("selectTopAdPerPlacement", () => {
  it("REGRESSION: priority 100 html_embed + priority 50 sponsored_card, same placement -> selects sponsored_card", () => {
    const ads = [
      ad("embed-1", "bottom", "html_embed", 100),
      ad("card-1", "bottom", "sponsored_card", 50),
    ];

    const result = selectTopAdPerPlacement(ads, ["bottom"], ["sponsored_card"]);

    expect(result.bottom?.id).toBe("card-1");
  });

  it("picks the highest-priority ad among supported types when multiple qualify", () => {
    const ads = [
      ad("card-low", "bottom", "sponsored_card", 10),
      ad("card-high", "bottom", "sponsored_card", 90),
    ];

    const result = selectTopAdPerPlacement(ads, ["bottom"], ["sponsored_card"]);

    expect(result.bottom?.id).toBe("card-high");
  });

  it("returns null for a placement with no supported-type ads, even if unsupported-type ads exist", () => {
    const ads = [ad("embed-1", "bottom", "html_embed", 100)];

    const result = selectTopAdPerPlacement(ads, ["bottom"], ["sponsored_card"]);

    expect(result.bottom).toBeNull();
  });

  it("initializes every valid placement to null, even with zero ads", () => {
    const result = selectTopAdPerPlacement([], ["after_result_3", "after_result_5", "bottom"], ["sponsored_card"]);

    expect(result).toEqual({
      after_result_3: null,
      after_result_5: null,
      bottom: null,
    });
  });

  it("keeps placements independent — an unsupported-type ad in one placement doesn't affect another", () => {
    const ads = [
      ad("embed-1", "after_result_3", "html_embed", 100),
      ad("card-1", "after_result_5", "sponsored_card", 20),
    ];

    const result = selectTopAdPerPlacement(ads, ["after_result_3", "after_result_5"], ["sponsored_card"]);

    expect(result.after_result_3).toBeNull();
    expect(result.after_result_5?.id).toBe("card-1");
  });

  it("ignores ads whose placement is not in validPlacements", () => {
    const ads = [ad("card-1", "unknown_placement", "sponsored_card", 100)];

    const result = selectTopAdPerPlacement(ads, ["bottom"], ["sponsored_card"]);

    expect(result.bottom).toBeNull();
    expect(Object.keys(result)).toEqual(["bottom"]);
  });

  it("home page supports multiple ad types and still filters out html_embed", () => {
    const ads = [
      ad("embed-1", "hero_below", "html_embed", 100),
      ad("hero-1", "hero_below", "hero_banner", 60),
    ];

    const result = selectTopAdPerPlacement(
      ads,
      ["hero_below"],
      ["hero_banner", "inline_promo", "banner", "native", "sponsored_card"],
    );

    expect(result.hero_below?.id).toBe("hero-1");
  });
});
