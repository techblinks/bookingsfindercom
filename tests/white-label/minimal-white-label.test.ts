/**
 * White Label minimal flight-search application tests.
 * Covers: placeholders, header, hero, search, results, footer, brand, observer safety.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, writable: true, value: vi.fn() });
});

afterEach(() => {
  if ((window as any)._bfResultsObserver) {
    try { (window as any)._bfResultsObserver.disconnect(); } catch (_) { }
    (window as any)._bfResultsObserver = null;
  }
  vi.clearAllTimers();
});

const HTML_PATH = resolve(__dirname, "../../travelpayouts-white-label-current.html");
const HTML = readFileSync(HTML_PATH, "utf8");

// ════════════════════ PLACEHOLDERS ════════════════════
describe("required placeholders", () => {
  it("preserves [:embed_script:]", () => {
    expect(HTML).toContain("[:embed_script:]");
  });
  it("preserves [:cookie_policy_script:]", () => {
    expect(HTML).toContain("[:cookie_policy_script:]");
  });
  it("preserves #tpwl-search", () => {
    expect(HTML).toContain('id="tpwl-search"');
  });
  it("preserves #tpwl-tickets", () => {
    expect(HTML).toContain('id="tpwl-tickets"');
  });
  it("preserves [:og_image:]", () => {
    expect(HTML).toContain("[:og_image:]");
  });
  it("preserves [:route_info:]", () => {
    expect(HTML).toContain("[:route_info:]");
  });
  it("preserves [:current_year:]", () => {
    expect(HTML).toContain("[:current_year:]");
  });
  it("preserves [:widget_domain:]", () => {
    expect(HTML).toContain("[:widget_domain:]");
  });
});

// ════════════════════ HEADER ════════════════════
describe("header", () => {
  it("contains BookingsFinder brand", () => {
    expect(HTML).toContain("BookingsFinder");
  });
  it("has Flights nav link", () => {
    expect(HTML).toMatch(/class="active"[^>]*>[\s\S]*?Flights[\s\S]*?<\/a>/);
  });
  it("has Stays nav link", () => {
    expect(HTML).toContain('href="https://bookingsfinder.com/hotels"');
    expect(HTML).toContain("Stays");
  });
  it("has Travel Tools nav link", () => {
    expect(HTML).toContain('href="https://bookingsfinder.com/trip-cost"');
    expect(HTML).toContain("Travel Tools");
  });
  it("has Back to BookingsFinder link", () => {
    expect(HTML).toContain("Back to BookingsFinder");
  });
  it("has dashboard logo loader", () => {
    expect(HTML).toContain("bf-brand-logo");
    expect(HTML).toContain("addEventListener('load'");
  });
});

// ════════════════════ HERO ════════════════════
describe("hero", () => {
  it("contains hero section", () => {
    expect(HTML).toContain('class="bf-hero"');
  });
  it("contains COMPARE FLIGHTS eyebrow", () => {
    expect(HTML).toContain("COMPARE FLIGHTS");
  });
  it("contains headline", () => {
    expect(HTML).toContain("Find a better way to fly.");
  });
  it("has Flights shortcut active", () => {
    expect(HTML).toMatch(/bf-shortcut[^"]*active[^"]*"[^>]*>[\s\S]*?Flights/);
  });
  it("has Stays shortcut", () => {
    expect(HTML).toContain('href="https://bookingsfinder.com/hotels"');
  });
  it("has Travel Tools shortcut", () => {
    expect(HTML).toContain('href="https://bookingsfinder.com/trip-cost"');
  });
  it("has visual collage", () => {
    expect(HTML).toContain("bf-visual-col");
    expect(HTML).toContain("bf-visual-card");
    expect(HTML).toContain("bf-visual-ph");
  });
  it("uses two-column grid on desktop", () => {
    expect(HTML).toContain("grid-template-columns:minmax(0,1fr) 340px");
  });
});

// ════════════════════ BRAND COLOURS ════════════════════
describe("brand colours", () => {
  it("--bf-blue is exactly #01367F", () => {
    const s = HTML.match(/<style>([\s\S]*?)<\/style>/)?.[1] || "";
    expect(s).toContain("--bf-blue:#01367F");
  });
  it("does not contain removed bright-blue #2563EB", () => {
    expect(HTML).not.toContain("#2563EB");
  });
  it("does not contain #1D4ED8", () => {
    expect(HTML).not.toContain("#1D4ED8");
  });
  it("does not contain #60A5FA", () => {
    expect(HTML).not.toContain("#60A5FA");
  });
  it("does not contain teal tokens", () => {
    expect(HTML).not.toContain("--bf-teal");
  });
  it("orange brand colour present", () => {
    expect(HTML).toContain("--bf-orange:#D64A2A");
  });
});

// ════════════════════ REMOVED SECTIONS ════════════════════
describe("removed sections", () => {
  it("Popular destinations section is absent", () => {
    expect(HTML).not.toContain("bf-dest-section");
  });
  it("destination feed script is absent", () => {
    expect(HTML).not.toContain("bf-dest-grid");
    expect(HTML).not.toContain("flight-destinations");
    expect(HTML).not.toContain("Supabase");
  });
  it("Plan more of your trip is absent", () => {
    expect(HTML).not.toContain("bf-tools-section");
  });
  it("Why BookingsFinder is absent", () => {
    expect(HTML).not.toContain("Why BookingsFinder");
  });
  it("FAQ section is absent", () => {
    expect(HTML).not.toContain("bf-faq");
  });
  it("standalone partners section is absent", () => {
    expect(HTML).not.toContain("bf-partners-section");
  });
  it("promotional CTA section is absent", () => {
    expect(HTML).not.toContain("bf-promo");
  });
  it("trust/benefit sections are absent", () => {
    expect(HTML).not.toContain("bf-benefits");
    expect(HTML).not.toContain("bf-trust-wrap");
  });
  it("destination click handling script is absent", () => {
    expect(HTML).not.toContain("data-destination");
    expect(HTML).not.toContain("bf-dest-pill");
  });
  it("explore cards section is absent", () => {
    expect(HTML).not.toContain("bf-explore-card");
  });
});

// ════════════════════ FOOTER ════════════════════
describe("footer", () => {
  it("contains Travelpayouts disclosure", () => {
    expect(HTML).toContain("Flight search powered by Travelpayouts");
  });
  it("contains terms link", () => {
    expect(HTML).toContain("bookingsfinder.com/terms");
  });
  it("contains privacy link", () => {
    expect(HTML).toContain("bookingsfinder.com/privacy");
  });
  it("contains affiliate disclosure link", () => {
    expect(HTML).toContain("affiliate-disclosure");
  });
  it("contains comparison-platform disclosure", () => {
    expect(HTML).toContain("travel comparison platform");
  });
  it("uses deep blue footer background", () => {
    const s = HTML.match(/<style>([\s\S]*?)<\/style>/)?.[1] || "";
    expect(s).toContain("--bf-blue-deep");
  });
});

// ════════════════════ OBSERVER SAFETY ════════════════════
describe("observer safety", () => {
  it("has document guard in MutationObserver", () => {
    expect(HTML).toContain("typeof document==='undefined'");
  });
  it("has observer reference stored on window", () => {
    expect(HTML).toContain("window._bfResultsObserver");
  });
  it("has disconnect on pagehide", () => {
    expect(HTML).toContain("addEventListener('pagehide'");
  });
  it("has disconnect on beforeunload", () => {
    expect(HTML).toContain("addEventListener('beforeunload'");
  });
  it("disconnects before creating new observer", () => {
    expect(HTML).toContain("_bfResultsObserver.disconnect()");
  });
});

// ════════════════════ RESULTS MODE ════════════════════
describe("results mode", () => {
  it("results-mode CSS exists", () => {
    expect(HTML).toContain("bf-results-mode");
  });
  it("hides hero content in results mode", () => {
    expect(HTML).toContain(".bf-results-mode .bf-hero-content{display:none}");
  });
  it("hides visual collage in results mode", () => {
    expect(HTML).toContain(".bf-results-mode .bf-visual-col{display:none}");
  });
  it("hides shortcuts in results mode", () => {
    expect(HTML).toContain(".bf-results-mode .bf-shortcuts{display:none}");
  });
  it("results detection script exists", () => {
    expect(HTML).toContain("hasMeaningfulResults");
  });
});

// ════════════════════ SEO ════════════════════
describe("SEO architecture", () => {
  it("contains SEO architecture comment", () => {
    expect(HTML).toContain("flights.bookingsfinder.com is the transactional");
  });
  it("references bookingsfinder.com/flights as SEO page", () => {
    expect(HTML).toContain("bookingsfinder.com/flights is the SEO");
  });
});
