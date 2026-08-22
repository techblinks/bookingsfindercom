/**
 * AdEmbed — HTML Embed fail-closed security regression (BF-0R-7 Phase H).
 *
 * The previous implementation set innerHTML from ad.html_content and
 * explicitly re-executed any <script> tags with no sanitization. These
 * tests prove AdEmbed now renders nothing and never touches html_content,
 * for ordinary content and for an explicit script-injection payload alike.
 */
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { AdEmbed } from "../AdEmbed";
import type { AdPlacement } from "@/hooks/useAds";

function makeAd(overrides: Partial<AdPlacement> = {}): AdPlacement {
  return {
    id: "ad-1",
    name: "Test HTML Embed",
    type: "html_embed",
    placement: "after_result_3",
    page: "flights",
    device: "all",
    priority: 1,
    html_content: '<p>hello</p>',
    ...overrides,
  };
}

describe("AdEmbed — fails closed", () => {
  it("renders nothing for ordinary html_content", () => {
    const { container } = render(<AdEmbed ad={makeAd()} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders nothing for a script-injection payload, and never inserts a live <script> element into the document", () => {
    const scriptPayload = '<img src=x onerror="window.__xssRan = true">' +
      '<script>window.__xssRan = true;</script>';

    const globalMarker = globalThis as unknown as { __xssRan?: boolean };
    globalMarker.__xssRan = false;

    const { container } = render(<AdEmbed ad={makeAd({ html_content: scriptPayload })} />);

    expect(container.innerHTML).toBe("");
    expect(document.querySelectorAll("script").length).toBe(0);
    expect(globalMarker.__xssRan).toBe(false);
  });

  it("does not call onImpression (nothing to observe — no DOM node is ever created)", () => {
    const onImpression = vi.fn();
    render(<AdEmbed ad={makeAd()} onImpression={onImpression} />);
    expect(onImpression).not.toHaveBeenCalled();
  });

  it("renders nothing even when html_content is empty/absent", () => {
    const { container } = render(<AdEmbed ad={makeAd({ html_content: undefined })} />);
    expect(container.innerHTML).toBe("");
  });
});
