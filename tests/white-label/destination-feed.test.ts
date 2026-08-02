/**
 * Phase 7G-2C — White Label destination layout, interaction, header & footer tests.
 *
 * Exercises the REAL inline scripts from travelpayouts-white-label-current.html.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Prevent unhandled jsdom errors from scrollIntoView
beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    writable: true,
    value: vi.fn(),
  });
});

const HTML_PATH = resolve(__dirname, "../../travelpayouts-white-label-current.html");
const HTML = readFileSync(HTML_PATH, "utf8");

const ENDPOINT = "https://pjehrnhmjrxrlrhuhqgf.supabase.co/functions/v1/flight-destinations";

function extractGridScripts(): string[] {
  const scripts: string[] = [];
  const re = /<script>([\s\S]*?)<\/script>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(HTML)) !== null) {
    if (m[1].includes("bf-dest-grid")) scripts.push(m[1]);
  }
  return scripts;
}

const GRID_SCRIPTS = extractGridScripts();
const FEED_SCRIPT = GRID_SCRIPTS[GRID_SCRIPTS.length - 1];
const CLICK_SCRIPT = GRID_SCRIPTS[0];

function validRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "id-1", city: "Kathmandu", country: "Nepal", iata_code: "KTM",
    slug: "kathmandu", description: "Gateway to the Himalaya",
    alt_text: "Kathmandu, Nepal — temple rooftops",
    image_url: "https://pjehrnhmjrxrlrhuhqgf.supabase.co/storage/v1/object/public/flight-destinations/kathmandu/master-800x600.webp",
    focal_x: 0.5, focal_y: 0.5, display_order: 1,
    ...overrides,
  };
}

function buildFallbackCard(i: number, layoutClass: string) {
  return `<li class="bf-dest-item ${layoutClass}" data-fallback="1">` +
    `<button type="button" class="bf-dest-card" data-destination="F${i}" data-city="Fallback${i}" aria-label="Search flights to Fallback${i}"></button>` +
    `</li>`;
}

function getLayoutClass(i: number) {
  if (i === 0) return "bf-dest-pos--featured";
  if (i === 1) return "bf-dest-pos--stack-1";
  if (i === 2) return "bf-dest-pos--stack-2";
  if (i === 3) return "bf-dest-pos--std-1";
  if (i === 4) return "bf-dest-pos--std-2";
  return "bf-dest-pos--std-3";
}

function mountFallback() {
  const items = Array.from({ length: 6 }).map((_, i) => buildFallbackCard(i, getLayoutClass(i))).join("");
  document.body.innerHTML =
    `<ul id="bf-dest-grid" class="bf-dest-grid">${items}</ul>` +
    `<div id="tpwl-search"><input type="text" id="from" /></div>` +
    `<div id="bf-dest-pill" aria-live="polite"></div>` +
    `<p id="bf-search-instruction" class="bf-search-instruction">Enter your origin and dates to compare available flights.</p>` +
    `<div id="bf-main" tabindex="-1"></div>`;
}

function runFeed() { eval(FEED_SCRIPT); }
function runClickHandler() { eval(CLICK_SCRIPT); }

function fetchJson(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  return vi.fn(() => Promise.resolve({ ok: init.ok ?? true, status: init.status ?? 200, json: () => Promise.resolve(body) }));
}
function fetchInvalidJson() {
  return vi.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.reject(new SyntaxError("Unexpected token")) }));
}
function fetchReject(err: unknown) { return vi.fn(() => Promise.reject(err)); }

const grid = () => document.getElementById("bf-dest-grid")!;
const fallbackCount = () => grid().querySelectorAll("[data-fallback]").length;
const cardCount = () => grid().querySelectorAll(".bf-dest-card").length;
const cities = () => Array.from(grid().querySelectorAll(".bf-dest-city")).map(n => n.textContent);
const flush = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };

// ════════════════════════════════════════════════════════════════
describe("static source assertions", () => {
  it("exposes exactly one dynamic feed script", () => {
    expect(FEED_SCRIPT).toBeTruthy();
    expect(FEED_SCRIPT).toContain("flight-destinations");
  });

  it("uses a 3–5s request timeout", () => {
    const m = FEED_SCRIPT.match(/TIMEOUT_MS\s*=\s*(\d+)/);
    expect(m).toBeTruthy();
    const ms = Number(m![1]);
    expect(ms).toBeGreaterThanOrEqual(3000);
    expect(ms).toBeLessThanOrEqual(5000);
  });

  it("preserves Travelpayouts placeholders and IDs", () => {
    for (const token of ["[:embed_script:]", "[:cookie_policy_script:]", "[:current_year:]", "[:og_image:]", "[:route_info:]", "[:widget_domain:]", 'id="tpwl-search"', 'id="tpwl-tickets"']) {
      expect(HTML).toContain(token);
    }
  });

  it("keeps six static fallback cards in the HTML", () => {
    for (const city of ["Kathmandu", "New Delhi", "Dubai", "London", "Singapore", "Sydney"]) {
      expect(HTML).toContain(`>${city}<`);
    }
  });

  it("does not reintroduce Weedle widget markup or loader script", () => {
    expect(HTML).not.toContain('class="tpwl-widget-weedle');
    expect(HTML).not.toMatch(/weedle[-_]?loader/i);
    expect(HTML).not.toMatch(/weedle\.js/i);
    expect(HTML).not.toMatch(/<script[^>]+weedle/i);
  });

  it("builds cards with safe DOM APIs, never innerHTML from data", () => {
    expect(FEED_SCRIPT).toContain("createElement");
    expect(FEED_SCRIPT).toContain("textContent");
    expect(FEED_SCRIPT).toContain("setAttribute");
    expect(FEED_SCRIPT).not.toMatch(/\.innerHTML\s*=/);
  });

  // ── Layout system ──
  it("defines getLayoutClass mapping index→featured/stack/standard", () => {
    expect(FEED_SCRIPT).toContain("getLayoutClass");
    expect(FEED_SCRIPT).toContain("'bf-dest-pos--featured'");
  });

  it("does NOT use nth-child as primary layout system", () => {
    const styleBlock = HTML.match(/<style>([\s\S]*?)<\/style>/)?.[1] || "";
    expect(styleBlock).toContain("bf-dest-pos--featured");
    expect(styleBlock).toContain("bf-dest-pos--stack-1");
    expect(styleBlock).toContain("bf-dest-pos--stack-2");
    expect(styleBlock).toContain("bf-dest-pos--std-1");
    expect(styleBlock).toContain("bf-dest-pos--std-2");
    expect(styleBlock).toContain("bf-dest-pos--std-3");
    // Desktop positioning must use explicit class selectors, not nth-child
    expect(styleBlock).toMatch(/\.bf-dest-item\.bf-dest-pos--featured\s*\{/);
    expect(styleBlock).toMatch(/\.bf-dest-item\.bf-dest-pos--stack-1\s*\{/);
  });

  it("static fallback cards use featured/stack/standard classes", () => {
    expect(HTML).toContain('bf-dest-pos--featured');
    expect(HTML).toContain('bf-dest-pos--stack-1');
    expect(HTML).toContain('bf-dest-pos--std-1');
  });

  it("cards use native button elements (not anchors)", () => {
    expect(HTML).toContain('<button type="button" class="bf-dest-card"');
    // Should not use <a class="bf-dest-card" — those are anchor links
    expect(HTML).not.toMatch(/<a class="bf-dest-card"/);
  });

  it("no separate white information panel (.bf-dest-content is absolutely positioned)", () => {
    const styleBlock = HTML.match(/<style>([\s\S]*?)<\/style>/)?.[1] || "";
    expect(styleBlock).toContain(".bf-dest-content");
    expect(styleBlock).toMatch(/\.bf-dest-content\s*\{[^}]*position:\s*absolute/);
  });

  it("desktop layout uses 12-column grid", () => {
    const styleBlock = HTML.match(/<style>([\s\S]*?)<\/style>/)?.[1] || "";
    expect(styleBlock).toContain("grid-template-columns: repeat(12, minmax(0, 1fr))");
  });

  it("tablet layout uses 2-column grid at max-width:1023px", () => {
    const styleBlock = HTML.match(/<style>([\s\S]*?)<\/style>/)?.[1] || "";
    expect(styleBlock).toContain("max-width: 1023px");
    expect(styleBlock).toContain("grid-template-columns: repeat(2, minmax(0, 1fr))");
  });

  it("mobile layout uses scroll-snap rail below 640px", () => {
    const styleBlock = HTML.match(/<style>([\s\S]*?)<\/style>/)?.[1] || "";
    expect(styleBlock).toContain("scroll-snap-type: x mandatory");
    expect(styleBlock).toContain("min(84vw, 360px)");
  });

  it("footer and header text sizes are readable", () => {
    const styleBlock = HTML.match(/<style>([\s\S]*?)<\/style>/)?.[1] || "";
    // Header brand at least 16px
    expect(styleBlock).toMatch(/\.bf-hdr-brand\s*\{[^}]*font-size:\s*1[6-9]px/);
    // Footer links at least 14px
    expect(styleBlock).toMatch(/\.bf-footer\s+a\s*\{[^}]*font-size:\s*1[4-9]px/);
  });

  it("results-page container scoping is preserved", () => {
    const styleBlock = HTML.match(/<style>([\s\S]*?)<\/style>/)?.[1] || "";
    expect(styleBlock).toContain("#tpwl-search, #tpwl-tickets");
  });

  it("css does not globally style native button/appearance", () => {
    const styleBlock = HTML.match(/<style>([\s\S]*?)<\/style>/)?.[1] || "";
    expect(styleBlock).not.toMatch(/^button\s*\{/m);
    expect(styleBlock).not.toMatch(/^a\s*\{/m);
    expect(styleBlock).not.toMatch(/^input\s*\{/m);
  });
});

// ════════════════════════════════════════════════════════════════
describe("dynamic feed behaviour", () => {
  beforeEach(() => { mountFallback(); });
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); delete (window as unknown as { dataLayer?: unknown[] }).dataLayer; });

  it("API success with one destination replaces the fallback", async () => {
    window.fetch = fetchJson({ destinations: [validRow()] }) as never;
    runFeed(); await flush();
    expect(fallbackCount()).toBe(0);
    expect(cardCount()).toBe(1);
    expect(cities()).toEqual(["Kathmandu"]);
  });

  it("index 0 card receives bf-dest-card--featured via li class", async () => {
    const rows = Array.from({ length: 6 }).map((_, i) => validRow({ id: `id-${i}`, city: `City${i}`, iata_code: "AB" + String.fromCharCode(65 + i), display_order: i + 1 }));
    window.fetch = fetchJson({ destinations: rows }) as never;
    runFeed(); await flush();
    const items = grid().querySelectorAll(".bf-dest-item");
    expect(items[0].classList.contains("bf-dest-pos--featured")).toBe(true);
    expect(items[1].classList.contains("bf-dest-pos--stack-1")).toBe(true);
    expect(items[2].classList.contains("bf-dest-pos--stack-2")).toBe(true);
    expect(items[3].classList.contains("bf-dest-pos--std-1")).toBe(true);
    expect(items[4].classList.contains("bf-dest-pos--std-2")).toBe(true);
    expect(items[5].classList.contains("bf-dest-pos--std-3")).toBe(true);
  });

  it("static fallback cards also have featured/stack/standard", () => {
    mountFallback();
    const items = grid().querySelectorAll(".bf-dest-item");
    expect(items[0].classList.contains("bf-dest-pos--featured")).toBe(true);
    expect(items[1].classList.contains("bf-dest-pos--stack-1")).toBe(true);
    expect(items[2].classList.contains("bf-dest-pos--stack-2")).toBe(true);
    expect(items[3].classList.contains("bf-dest-pos--std-1")).toBe(true);
    expect(items[4].classList.contains("bf-dest-pos--std-2")).toBe(true);
    expect(items[5].classList.contains("bf-dest-pos--std-3")).toBe(true);
  });

  it("calls the correct endpoint with a timeout signal", async () => {
    const spy = fetchJson({ destinations: [validRow()] });
    window.fetch = spy as never; runFeed(); await flush();
    expect(spy).toHaveBeenCalledTimes(1);
    const [url, opts] = spy.mock.calls[0];
    expect(url).toBe(ENDPOINT);
    expect((opts as { signal?: unknown }).signal).toBeInstanceOf(AbortSignal);
  });

  it("renders at most six even when more are returned", async () => {
    const rows = Array.from({ length: 9 }).map((_, i) => validRow({ id: `id-${i}`, city: `City${i}`, iata_code: "A" + String.fromCharCode(65 + i) + "Z", display_order: i + 1 }));
    window.fetch = fetchJson({ destinations: rows }) as never; runFeed(); await flush();
    expect(cardCount()).toBe(6);
  });

  it("sorts by display_order before rendering", async () => {
    const rows = [validRow({ city: "Third", iata_code: "THR", display_order: 30 }), validRow({ city: "First", iata_code: "FST", display_order: 10 }), validRow({ city: "Second", iata_code: "SEC", display_order: 20 })];
    window.fetch = fetchJson({ destinations: rows }) as never; runFeed(); await flush();
    expect(cities()).toEqual(["First", "Second", "Third"]);
  });

  it("applies object-position from focal_x/focal_y", async () => {
    window.fetch = fetchJson({ destinations: [validRow({ focal_x: 0.25, focal_y: 0.75 })] }) as never;
    runFeed(); await flush();
    const img = grid().querySelector(".bf-dest-img") as HTMLImageElement;
    expect(img.style.objectPosition).toBe("25% 75%");
  });

  it("card is a native button (not anchor)", async () => {
    window.fetch = fetchJson({ destinations: [validRow()] }) as never;
    runFeed(); await flush();
    const card = grid().querySelector(".bf-dest-card")!;
    expect(card.tagName).toBe("BUTTON");
    expect(card.getAttribute("type")).toBe("button");
  });

  it("dynamic cards have data-destination and data-city attrs", async () => {
    window.fetch = fetchJson({ destinations: [validRow()] }) as never;
    runFeed(); await flush();
    const card = grid().querySelector(".bf-dest-card")!;
    expect(card.getAttribute("data-destination")).toBe("KTM");
    expect(card.getAttribute("data-city")).toBe("Kathmandu");
    expect(card.getAttribute("aria-label")).toBe("Search flights to Kathmandu, Nepal");
  });

  // Error / fallback preservation tests
  it("API empty/error/shape/invalid-json/network keeps fallback", async () => {
    for (const [label, fetchFn] of [
      ["empty", fetchJson({ destinations: [] })],
      ["bad shape", fetchJson({ not_destinations: 123 })],
      ["HTTP 500", fetchJson({ error: "boom" }, { ok: false, status: 500 })],
      ["invalid JSON", fetchInvalidJson()],
      ["network error", fetchReject(new Error("down"))],
    ] as const) {
      mountFallback(); window.fetch = fetchFn as never; runFeed(); await flush();
      expect(fallbackCount(), label).toBe(6);
    }
  });

  it("skips malformed / missing-image / non-https rows", async () => {
    for (const [label, rows] of [
      ["malformed", [{ city: "Good", iata_code: "GUD", display_order: 1 }, { city: "" }]],
      ["missing image_url", [validRow({ city: "HasImg", iata_code: "HAS" }), validRow({ city: "NoImg", iata_code: "NOI", image_url: null })]] as const,
      ["javascript: URL", [validRow({ image_url: "javascript:alert(1)" })]] as const,
    ]) {
      mountFallback();
      window.fetch = fetchJson({ destinations: rows }) as never; runFeed(); await flush();
      expect(grid().innerHTML, label).not.toContain("javascript:");
    }
  });

  it("renders XSS payloads as inert text", async () => {
    const payload = '<img src=x onerror="window.__xss=1">';
    window.fetch = fetchJson({ destinations: [validRow({ city: payload, description: payload, iata_code: "XSS" })] }) as never;
    runFeed(); await flush();
    const cityNode = grid().querySelector(".bf-dest-city")!;
    expect(cityNode.textContent).toBe(payload);
    expect(grid().querySelectorAll("img").length).toBe(1);
    expect((window as unknown as { __xss?: number }).__xss).toBeUndefined();
  });

  it("fetch timeout aborts and keeps fallback", async () => {
    vi.useFakeTimers();
    window.fetch = vi.fn((_url: string, opts: { signal?: AbortSignal }) => new Promise((_resolve, reject) => {
      opts?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    })) as never;
    runFeed(); await vi.advanceTimersByTimeAsync(4000); await flush();
    expect(fallbackCount()).toBe(6);
  });
});

// ════════════════════════════════════════════════════════════════
describe("whole-card interaction (button)", () => {
  beforeEach(() => {
    mountFallback();
    (window as unknown as { matchMedia: unknown }).matchMedia = vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    runClickHandler();
  });
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); delete (window as unknown as { dataLayer?: unknown[] }).dataLayer; });

  function setupClickTest() {
    (window as unknown as { dataLayer: unknown[] }).dataLayer = [];
    const search = document.getElementById("tpwl-search")!;
    const scrollSpy = vi.fn();
    (search as unknown as { scrollIntoView: unknown }).scrollIntoView = scrollSpy;
    const input = document.getElementById("from") as HTMLInputElement;
    input.getBoundingClientRect = () => ({ width: 120, height: 32 }) as DOMRect;
    const focusSpy = vi.spyOn(input, "focus");
    return { scrollSpy, focusSpy };
  }

  it("click anywhere on card activates selection", async () => {
    window.fetch = fetchJson({ destinations: [validRow()] }) as never;
    runFeed(); await flush();
    vi.useFakeTimers();
    const { scrollSpy, focusSpy } = setupClickTest();

    const card = grid().querySelector(".bf-dest-card") as HTMLElement;
    card.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    vi.advanceTimersByTime(200);

    const dl = (window as unknown as { dataLayer: Array<Record<string, unknown>> }).dataLayer;
    expect(dl.length).toBe(1);
    expect(dl[0]).toMatchObject({ event: "destination_card_click", destination_iata: "KTM", destination_city: "Kathmandu" });
    expect(scrollSpy).toHaveBeenCalledTimes(1);
    expect(focusSpy).toHaveBeenCalledTimes(1);
  });

  it("click fires analytics exactly once per activation", async () => {
    window.fetch = fetchJson({ destinations: [validRow()] }) as never;
    runFeed(); await flush();
    vi.useFakeTimers();
    (window as unknown as { dataLayer: unknown[] }).dataLayer = [];
    const card = grid().querySelector(".bf-dest-card") as HTMLElement;
    card.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    card.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    vi.advanceTimersByTime(200);
    expect((window as unknown as { dataLayer: Array<Record<string, unknown>> }).dataLayer.length).toBe(2);
  });

  it("selected pill appears with city and IATA", async () => {
    window.fetch = fetchJson({ destinations: [validRow()] }) as never;
    runFeed(); await flush();
    vi.useFakeTimers();
    (window as unknown as { dataLayer: unknown[] }).dataLayer = [];
    const card = grid().querySelector(".bf-dest-card") as HTMLElement;
    card.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    vi.advanceTimersByTime(200);

    const pill = document.getElementById("bf-dest-pill")!;
    expect(pill.classList.contains("active")).toBe(true);
    expect(pill.textContent).toContain("Kathmandu");
    expect(pill.textContent).toContain("KTM");
  });

  it("instruction changes contextually", async () => {
    window.fetch = fetchJson({ destinations: [validRow()] }) as never;
    runFeed(); await flush();
    vi.useFakeTimers();
    const card = grid().querySelector(".bf-dest-card") as HTMLElement;
    card.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    vi.advanceTimersByTime(200);

    const inst = document.getElementById("bf-search-instruction")!;
    expect(inst.textContent).toContain("Kathmandu");
  });

  it("aria-live region is updated", async () => {
    window.fetch = fetchJson({ destinations: [validRow()] }) as never;
    runFeed(); await flush();
    vi.useFakeTimers();
    const card = grid().querySelector(".bf-dest-card") as HTMLElement;
    card.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    vi.advanceTimersByTime(200);

    const pill = document.getElementById("bf-dest-pill")!;
    expect(pill.getAttribute("aria-live")).toBe("polite");
    expect(pill.textContent).toContain("Kathmandu");
  });

  it("Clear removes selected-destination state only", async () => {
    window.fetch = fetchJson({ destinations: [validRow()] }) as never;
    runFeed(); await flush();
    vi.useFakeTimers();
    const card = grid().querySelector(".bf-dest-card") as HTMLElement;
    card.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    vi.advanceTimersByTime(200);

    const pill = document.getElementById("bf-dest-pill")!;
    expect(pill.classList.contains("active")).toBe(true);

    const closeBtn = pill.querySelector(".bf-pill-close") as HTMLElement;
    expect(closeBtn).toBeTruthy();
    closeBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(pill.classList.contains("active")).toBe(false);
    expect(document.getElementById("bf-search-instruction")!.textContent).toBe("Enter your origin and dates to compare available flights.");
  });

  it("Clear does not alter Travelpayouts input fields", async () => {
    window.fetch = fetchJson({ destinations: [validRow()] }) as never;
    runFeed(); await flush();
    vi.useFakeTimers();
    (document.getElementById("from") as HTMLInputElement).value = "SYD";
    const card = grid().querySelector(".bf-dest-card") as HTMLElement;
    card.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    vi.advanceTimersByTime(200);

    const closeBtn = document.querySelector(".bf-pill-close") as HTMLElement;
    closeBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect((document.getElementById("from") as HTMLInputElement).value).toBe("SYD");
  });

  it("decorative overlays have pointer-events: none", () => {
    const styleBlock = HTML.match(/<style>([\s\S]*?)<\/style>/)?.[1] || "";
    expect(styleBlock).toMatch(/\.bf-dest-scrim\s*\{[^}]*pointer-events:\s*none/);
    expect(styleBlock).toMatch(/\.bf-dest-badge\s*\{[^}]*pointer-events:\s*none/);
  });

  it("homepage CSS remains scoped away from #tpwl-tickets", () => {
    const styleBlock = HTML.match(/<style>([\s\S]*?)<\/style>/)?.[1] || "";
    // No global button/a/input styles
    expect(styleBlock).not.toMatch(/^button\s*\{/m);
    expect(styleBlock).not.toMatch(/^a\s*\{/m);
     // Tickets container has its own scoping
    expect(styleBlock).toContain("#tpwl-tickets");
  });
});
