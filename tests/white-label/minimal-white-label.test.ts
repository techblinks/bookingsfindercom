/**
 * Minimal White Label — centered hero, search-first, no destination strip.
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

// ═══ PLACEHOLDERS ═══
describe("placeholders", () => {
  it.each([
    ["[:embed_script:]"],
    ["[:cookie_policy_script:]"],
    ['id="tpwl-search"'],
    ['id="tpwl-tickets"'],
    ["[:og_image:]"],
    ["[:route_info:]"],
    ["[:current_year:]"],
    ["[:widget_domain:]"],
  ])("preserves %s", (token) => { expect(HTML).toContain(token); });
});

// ═══ HEADER ═══
describe("header", () => {
  it("white header exists", () => { expect(HTML).toContain("background:#fff"); });
  it("has Flights nav", () => { expect(HTML).toMatch(/class="active"[^>]*>[\s\S]*?Flights[\s\S]*?<\/a>/); });
  it("has Stays nav", () => { expect(HTML).toContain('href="https://bookingsfinder.com/hotels"'); });
  it("has Travel Tools nav", () => { expect(HTML).toContain('href="https://bookingsfinder.com/trip-cost"'); });
  it("has Back to BookingsFinder", () => { expect(HTML).toContain("Back to BookingsFinder"); });
  it("hero shortcuts are absent", () => {
    expect(HTML).not.toContain("bf-shortcuts");
    expect(HTML).not.toContain("bf-shortcut");
  });
});

// ═══ HERO ═══
describe("hero", () => {
  it("uses centred blue gradient", () => { expect(HTML).toContain("linear-gradient(135deg,#01367F 0%,#001D45 100%)"); });
  it("has rounded container", () => { expect(HTML).toContain("border-radius:24px"); });
  it("has COMPARE FLIGHTS eyebrow", () => { expect(HTML).toContain("COMPARE FLIGHTS"); });
  it("has correct headline", () => { expect(HTML).toContain("Find the right flight for your next trip."); });
  it("headline is centred", () => { expect(HTML).toContain("text-align:center"); });
  it("no right-side collage or visual column", () => {
    expect(HTML).not.toContain("bf-visual-col");
    expect(HTML).not.toContain("bf-visual-card");
    expect(HTML).not.toContain("Explore destinations");
  });
});

// ═══ SEARCH ═══
describe("search", () => {
  it("white search shell exists", () => { expect(HTML).toContain("bf-search-shell"); });
  it("#tpwl-search present", () => { expect(HTML).toContain('id="tpwl-search"'); });
  it("no broad Travelpayouts selectors", () => {
    expect(HTML).not.toContain("#tpwl-search *");
    expect(HTML).not.toContain("#tpwl-search > div");
    expect(HTML).not.toContain("#tpwl-search input");
    expect(HTML).not.toContain("#tpwl-search form");
  });
});

// ═══ DESTINATION STRIP — REMOVED ═══
describe("destination strip", () => {
  it("strip is absent", () => { expect(HTML).not.toContain("bf-dest-strip"); });
  it("image URLs are absent", () => {
    expect(HTML).not.toContain("kathmandu");
    expect(HTML).not.toContain("sydney");
    expect(HTML).not.toContain("dubai");
    expect(HTML).not.toContain("london");
  });
  it("no destination feed JS", () => {
    expect(HTML).not.toContain("flight-destinations");
    expect(HTML).not.toContain("bf-dest-pill");
  });
  it("no scroll-snap for destinations", () => { expect(HTML).not.toContain("scroll-snap-type:x mandatory"); });
});

// ═══ BRAND ═══
describe("brand colours", () => {
  it("--bf-blue is #01367F", () => { expect(HTML).toContain("--bf-blue:#01367F"); });
  it("no bright-blue or teal", () => {
    expect(HTML).not.toContain("#2563EB");
    expect(HTML).not.toContain("#1D4ED8");
    expect(HTML).not.toContain("#60A5FA");
    expect(HTML).not.toContain("--bf-teal");
  });
  it("orange present", () => { expect(HTML).toContain("--bf-orange:#D64A2A"); });
  it("deep blue present", () => { expect(HTML).toContain("#001D45"); });
});

// ═══ REMOVED SECTIONS ═══
describe("removed sections", () => {
  it.each([
    ["destinations", "bf-dest-section"],
    ["tools section", "bf-tools-section"],
    ["Why BookingsFinder", "Why BookingsFinder"],
    ["FAQ", "bf-faq"],
    ["partners", "bf-partners-section"],
    ["promotional CTA", "bf-promo"],
    ["benefits", "bf-benefits"],
    ["trust wrap", "bf-trust-wrap"],
    ["explore section", "bf-explore"],
    ["destination feed fetch", "flight-destinations"],
  ])("%s is absent", (_, token) => { expect(HTML).not.toContain(token); });
});

// ═══ RESULTS MODE ═══
describe("results mode", () => {
  it("hides hero content", () => { expect(HTML).toContain(".bf-results-mode .bf-hero-content{display:none}"); });
  it("collapses hero", () => { expect(HTML).toContain("bf-results-mode .bf-hero"); });
  it("observer is safe", () => {
    expect(HTML).toContain("typeof document==='undefined'");
    expect(HTML).toContain("window._bfResultsObserver");
    expect(HTML).toContain("addEventListener('pagehide'");
    expect(HTML).toContain("addEventListener('beforeunload'");
  });
});

// ═══ FOOTER ═══
describe("footer", () => {
  it("uses deep blue", () => { expect(HTML).toContain("var(--bf-blue-deep)"); });
  it("has Travelpayouts disclosure", () => { expect(HTML).toContain("Flight search powered by Travelpayouts"); });
  it("has comparison-platform disclosure", () => { expect(HTML).toContain("travel comparison platform"); });
  it("has required links", () => {
    expect(HTML).toContain("/terms");
    expect(HTML).toContain("/privacy");
    expect(HTML).toContain("affiliate-disclosure");
  });
});

// ═══ SEO ═══
describe("SEO", () => {
  it("has SEO architecture comment", () => { expect(HTML).toContain("flights.bookingsfinder.com is the transactional"); });
});
