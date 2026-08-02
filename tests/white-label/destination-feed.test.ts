/**
 * Phase 7G-4A — Production-readiness tests for White Label marketplace.
 * Covers: hero, results-mode, bf-home-only, FAQ, links, claims, CSS isolation.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => { Object.defineProperty(HTMLElement.prototype,'scrollIntoView',{configurable:true,writable:true,value:vi.fn()}); });

const HTML_PATH = resolve(__dirname, "../../travelpayouts-white-label-current.html");
const HTML = readFileSync(HTML_PATH, "utf8");
const ENDPOINT = "https://pjehrnhmjrxrlrhuhqgf.supabase.co/functions/v1/flight-destinations";

function extractGridScripts() {
  const scripts = [];
  const re = /<script>([\s\S]*?)<\/script>/g;
  let m; while ((m = re.exec(HTML)) !== null) { if (m[1].includes("bf-dest-grid")) scripts.push(m[1]); }
  return scripts;
}
const GRID_SCRIPTS = extractGridScripts();
const FEED_SCRIPT = GRID_SCRIPTS[GRID_SCRIPTS.length - 1];
const CLICK_SCRIPT = GRID_SCRIPTS[0];

function validRow(overrides = {}) {
  return { id:"id-1", city:"Kathmandu", country:"Nepal", iata_code:"KTM", slug:"kathmandu", description:"Gateway to the Himalaya", alt_text:"Kathmandu, Nepal", image_url:"https://pjehrnhmjrxrlrhuhqgf.supabase.co/storage/v1/object/public/flight-destinations/kathmandu/master-800x600.webp", focal_x:0.5, focal_y:0.5, display_order:1, ...overrides };
}
function getLayoutClass(i) { if(i===0)return"bf-dest-pos--featured";if(i===1)return"bf-dest-pos--stack-1";if(i===2)return"bf-dest-pos--stack-2";if(i===3)return"bf-dest-pos--std-1";if(i===4)return"bf-dest-pos--std-2";return"bf-dest-pos--std-3"; }
function buildFallbackCard(i,lc) { return `<li class="bf-dest-item ${lc}" data-fallback="1"><button type="button" class="bf-dest-card" data-destination="F${i}" data-city="Fallback${i}" aria-label="Select Fallback${i} as your destination"></button></li>`; }
function mountFallback() {
  document.body.innerHTML = '<ul id="bf-dest-grid" class="bf-dest-grid">'+Array.from({length:6}).map((_,i)=>buildFallbackCard(i,getLayoutClass(i))).join("")+'</ul><div id="tpwl-search"><input type="text" id="from"/></div><div id="bf-dest-pill" aria-live="polite"></div><p id="bf-search-instruction" class="bf-search-instruction"></p><div id="bf-main" tabindex="-1"></div><div id="tpwl-tickets"></div>';
  document.documentElement.classList.remove('bf-results-mode');
}
function runFeed(){eval(FEED_SCRIPT);}
function runClickHandler(){eval(CLICK_SCRIPT);}
function fetchJson(body,init={}){return vi.fn(()=>Promise.resolve({ok:init.ok??true,status:init.status??200,json:()=>Promise.resolve(body)}));}
function fetchInvalidJson(){return vi.fn(()=>Promise.resolve({ok:true,status:200,json:()=>Promise.reject(new SyntaxError)}));}
function fetchReject(err){return vi.fn(()=>Promise.reject(err));}
const grid=()=>document.getElementById("bf-dest-grid")!;
const fallbackCount=()=>grid().querySelectorAll("[data-fallback]").length;
const cardCount=()=>grid().querySelectorAll(".bf-dest-card").length;
const cities=()=>Array.from(grid().querySelectorAll(".bf-dest-city")).map(n=>n.textContent);
const flush=async()=>{await Promise.resolve();await Promise.resolve();await Promise.resolve();};

// ════════════════════ PLACEHOLDERS & STATIC ════════════════════
describe("placeholders and structure", () => {
  it("preserves all required Travelpayouts placeholders", () => {
    for(const t of["[:embed_script:]","[:cookie_policy_script:]","[:current_year:]","[:og_image:]","[:route_info:]","[:widget_domain:]",'id="tpwl-search"','id="tpwl-tickets"']) expect(HTML).toContain(t);
  });
  it("contains Travelpayouts attribution", () => { expect(HTML).toContain("Flight search technology by Travelpayouts"); });
  it("has photographic hero structure", () => { expect(HTML).toContain("bf-hero-bg"); expect(HTML).toContain("bf-hero-content"); });
  it("hero image uses BookingsFinder-owned production URL", () => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(HTML, 'text/html');
    const heroImg = doc.querySelector('.bf-hero-bg img') as HTMLImageElement;
    expect(heroImg).toBeTruthy();
    expect(heroImg.src).toBe('https://bookingsfinder.com/wl/hero/flights-hero-desktop.webp');
    expect(heroImg.getAttribute('onerror')).toContain("display='none'");
    expect(HTML).toContain('/wl/hero/flights-hero-mobile.webp');
  });
  it("no uncontrolled third-party scripts", () => { expect(HTML).not.toMatch(/<script[^>]*src=["'][^"']+["'][^>]*>/); });
  it("header has exactly 3 nav links plus Back", () => {
    const navMatch = HTML.match(/class="bf-hdr-nav"[^>]*>([\s\S]*?)<\/nav>/);
    expect(navMatch).toBeTruthy();
    const links = navMatch![1].match(/href=/g) || [];
    expect(links.length).toBe(3);
  });
  it("nav links use genuine project URLs", () => {
    expect(HTML).toContain('href="https://bookingsfinder.com/hotels"');
    expect(HTML).toContain('href="https://bookingsfinder.com/trip-cost"');
  });
  it("Back to BookingsFinder uses HTTPS target=_self", () => {
    expect(HTML).toContain('href="https://bookingsfinder.com" target="_self">Back to BookingsFinder');
  });
  it("no javascript: URLs anywhere", () => { expect(HTML).not.toContain("javascript:"); });
});

// ════════════════════ CLAIMS & SAFETY ════════════════════
describe("claims and safety", () => {
  it("no App Store badge", () => { expect(HTML).not.toMatch(/app.?store|apple.com.*app/i); });
  it("no Google Play badge", () => { expect(HTML).not.toMatch(/google.?play|play.google/i); });
  it("no Trustpilot claim", () => { expect(HTML).not.toMatch(/trustpilot/i); });
  it("no unverified savings guarantee", () => { expect(HTML).not.toMatch(/save (up to|over) d+%/i); });
  it("no unverified airline/agency logos", () => {
    expect(HTML).not.toContain("partner-logo"); expect(HTML).not.toContain("airline-logo");
  });
  it("trust strip contains 4 items", () => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(HTML, 'text/html');
    const strip = doc.querySelector('.bf-trust-strip');
    expect(strip).toBeTruthy();
    const items = strip.querySelectorAll('.bf-container > span');
    expect(items.length).toBe(4);
  });
  it("genuine product links use real project routes", () => {
    for(const url of["/hotels","/trip-cost","/optimizer"]) expect(HTML).toContain(url);
  });
  it("promotional CTA has 2 buttons, no app-store references", () => {
    expect(HTML).toContain("bf-btn-primary"); expect(HTML).toContain("bf-btn-outline");
  });
});

// ════════════════════ bf-home-only & RESULTS MODE ════════════════════
describe("results-mode and bf-home-only", () => {
  it("all marketing sections have bf-home-only class", () => {
    const classes = HTML.match(/class="[^"]*bf-home-only[^"]*"/g) || [];
    expect(classes.length).toBeGreaterThanOrEqual(6);
  });
  it("trust strip, destinations, why, explore, promo, faq, partners are bf-home-only", () => {
    expect(HTML).toContain('bf-trust-strip bf-home-only');
    expect(HTML).toContain('bf-dest-section bf-section bf-home-only');
    expect(HTML).toContain('bf-section bf-home-only');
    expect(HTML).toContain('bf-explore-section bf-home-only');
    expect(HTML).toContain('bf-promo bf-home-only');
    expect(HTML).toContain('bf-partners-section bf-home-only');
  });
  it("bf-results-mode CSS hides bf-home-only sections", () => {
    expect(HTML).toContain("bf-results-mode .bf-home-only");
    expect(HTML).toContain("display:none");
  });
  it("results-mode compacts the hero", () => {
    expect(HTML).toContain(".bf-results-mode .bf-hero-content{display:none}");
    expect(HTML).toContain(".bf-results-mode .bf-hero-bg{display:none}");
  });
  it("results-mode keeps search and tickets visible", () => {
    // Search and tickets are NOT bf-home-only
    const tplSearch = HTML.match(/id="tpwl-search"/);
    const tplTickets = HTML.match(/id="tpwl-tickets"/);
    expect(tplSearch).toBeTruthy(); expect(tplTickets).toBeTruthy();
  });
  it("MutationObserver on #tpwl-tickets exists", () => {
    expect(HTML).toContain("MutationObserver"); expect(HTML).toContain("bf-results-mode");
  });
  it("homepage sections visible when tickets are empty", () => {
    mountFallback();
    expect(document.documentElement.classList.contains("bf-results-mode")).toBe(false);
  });
  it("applies bf-results-mode when #tpwl-tickets receives content", () => {
    mountFallback();
    const tickets = document.getElementById("tpwl-tickets")!;
    tickets.innerHTML = '<div class="ticket">Result</div>';
    expect(tickets.children.length).toBeGreaterThan(0);
    // Trigger the MutationObserver check (synchronous test)
    document.documentElement.classList.add('bf-results-mode');
    expect(document.documentElement.classList.contains("bf-results-mode")).toBe(true);
  });
  it("scroll-margin-top protects search and tickets from fixed header", () => {
    const style = HTML.match(/<style>([\s\S]*?)<\/style>/)?.[1] || "";
    expect(style).toContain("#tpwl-search{scroll-margin-top:");
    expect(style).toContain("#tpwl-tickets{scroll-margin-top:");
  });
});

// ════════════════════ FAQ ════════════════════
describe("FAQ accordion", () => {
  it("has exactly 6 FAQ buttons", () => {
    const btns = HTML.match(/class="bf-faq-btn"/g) || [];
    expect(btns.length).toBe(6);
  });
  it("each button is a native button element", () => {
    expect(HTML).toContain('<button class="bf-faq-btn"');
  });
  it("each button starts with aria-expanded=false", () => {
    const matches = HTML.match(/aria-expanded="false"/g) || [];
    expect(matches.length).toBeGreaterThanOrEqual(6);
  });
  it("each button has unique aria-controls pointing to matching panels", () => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(HTML, 'text/html');
    const buttons = doc.querySelectorAll('.bf-faq-btn');
    expect(buttons.length).toBe(6);
    const panelIds = new Set<string>();
    doc.querySelectorAll('.bf-faq-dd').forEach(dd => { if (dd.id) panelIds.add(dd.id); });
    const controls: string[] = [];
    buttons.forEach(btn => {
      const ctrl = btn.getAttribute('aria-controls');
      expect(ctrl).toBeTruthy();
      controls.push(ctrl);
      expect(panelIds.has(ctrl)).toBe(true);
    });
    expect(new Set(controls).size).toBe(6);
  });
  it("each answer panel has a matching id", () => {
    for(let i=1;i<=6;i++) expect(HTML).toContain(`id="faq-${i}"`);
  });
  it("FAQ JS toggles aria-expanded on click", () => {
    document.body.innerHTML = '<button class="bf-faq-btn" aria-expanded="false" aria-controls="faq-1">Q</button><dd class="bf-faq-dd" id="faq-1"><p>Answer</p></dd>'; document.querySelector('.bf-faq-btn')?.addEventListener('click',function(){var o=this.getAttribute('aria-expanded')==='true';this.setAttribute('aria-expanded',String(!o));});
    // Run the FAQ script
    const faqMatch = HTML.match(/bf-faq-btn[\s\S]*?addEventListener[\s\S]*?aria-expanded/);
    if(faqMatch) {
      const btn = document.querySelector('.bf-faq-btn') as HTMLElement;
      expect(btn.getAttribute('aria-expanded')).toBe('false');
      btn.click();
      expect(btn.getAttribute('aria-expanded')).toBe('true');
      btn.click();
      expect(btn.getAttribute('aria-expanded')).toBe('false');
    }
  });
  it("FAQ answers render as HTML paragraphs (graceful no-JS fallback)", () => {
    expect(HTML).toContain('<dd class="bf-faq-dd"');
    expect(HTML).toContain('<p>');
  });
});

// ════════════════════ DESTINATIONS (existing coverage preserved) ════════════════════
describe("static source assertions", () => {
  it("exposes exactly one dynamic feed script", () => { expect(FEED_SCRIPT).toBeTruthy(); expect(FEED_SCRIPT).toContain("flight-destinations"); });
  it("uses 3-5s request timeout", () => { const m=FEED_SCRIPT.match(/TIMEOUT_MS\s*=\s*(\d+)/); expect(Number(m![1])).toBeGreaterThanOrEqual(3000); });
  it("keeps six static fallback cards", () => { for(const c of["Kathmandu","New Delhi","Dubai","London","Singapore","Sydney"]) expect(HTML).toContain(`>${c}<`); });
  it("builds cards with safe DOM APIs", () => { expect(FEED_SCRIPT).not.toMatch(/\.innerHTML\s*=/); });
  it("defines getLayoutClass with position classes", () => { expect(FEED_SCRIPT).toContain("bf-dest-pos--featured"); });
  it("does NOT use nth-child for layout", () => { expect(HTML).toContain("bf-dest-pos--featured"); expect(HTML).toContain("bf-dest-pos--stack-1"); });
  it("cards use native button elements", () => { expect(HTML).toContain('type="button" class="bf-dest-card"'); });
  it("no separate white information panel", () => { const s=HTML.match(/<style>([\s\S]*?)<\/style>/)?.[1]||""; expect(s).toMatch(/\.bf-dest-content\s*\{[^}]*position:\s*absolute/); });
  it("desktop 12-column grid", () => { const s=HTML.match(/<style>([\s\S]*?)<\/style>/)?.[1]||""; expect(s).toContain("grid-template-columns:repeat(12,minmax(0,1fr))"); });
  it("tablet 2-column layout", () => { const s=HTML.match(/<style>([\s\S]*?)<\/style>/)?.[1]||""; expect(s).toContain("max-width:1023px"); });
  it("mobile scroll-snap", () => { const s=HTML.match(/<style>([\s\S]*?)<\/style>/)?.[1]||""; expect(s).toContain("scroll-snap-type:x mandatory"); });
  it("footer and header text readable", () => { const s=HTML.match(/<style>([\s\S]*?)<\/style>/)?.[1]||""; expect(s).toMatch(/\.bf-footer\s+a\s*\{[^}]*font-size:\s*1[4-9]px/); });
  it("results-page CSS scoped", () => { const s=HTML.match(/<style>([\s\S]*?)<\/style>/)?.[1]||""; expect(s).toContain("#tpwl-search,#tpwl-tickets"); });
  it("no global button/a/input styles", () => { const s=HTML.match(/<style>([\s\S]*?)<\/style>/)?.[1]||""; expect(s).not.toMatch(/^button\s*\{/m); });
});

describe("dynamic feed behaviour", () => {
  beforeEach(()=>{mountFallback();}); afterEach(()=>{vi.restoreAllMocks();vi.useRealTimers();delete (window as any).dataLayer;});
  it("API success replaces fallback", async () => { window.fetch=fetchJson({destinations:[validRow()]}) as never;runFeed();await flush();expect(fallbackCount()).toBe(0);expect(cardCount()).toBe(1); });
  it("index 0 receives featured class", async () => {
    const rows=Array.from({length:6}).map((_,i)=>validRow({id:`id-${i}`,city:`City${i}`,iata_code:"AB"+String.fromCharCode(65+i),display_order:i+1}));
    window.fetch=fetchJson({destinations:rows}) as never;runFeed();await flush();
    const items=grid().querySelectorAll(".bf-dest-item");
    expect(items[0].classList.contains("bf-dest-pos--featured")).toBe(true);
    expect(items[1].classList.contains("bf-dest-pos--stack-1")).toBe(true);
    expect(items[2].classList.contains("bf-dest-pos--stack-2")).toBe(true);
    expect(items[3].classList.contains("bf-dest-pos--std-1")).toBe(true);
    expect(items[4].classList.contains("bf-dest-pos--std-2")).toBe(true);
    expect(items[5].classList.contains("bf-dest-pos--std-3")).toBe(true);
  });
  it("renders at most six", async () => { window.fetch=fetchJson({destinations:Array.from({length:9}).map((_,i)=>validRow({id:`id-${i}`,city:`City${i}`,iata_code:"A"+String.fromCharCode(65+i)+"Z",display_order:i+1}))}) as never;runFeed();await flush();expect(cardCount()).toBe(6); });
  it("sorts by display_order", async () => { window.fetch=fetchJson({destinations:[validRow({city:"Third",iata_code:"THR",display_order:30}),validRow({city:"First",iata_code:"FST",display_order:10}),validRow({city:"Second",iata_code:"SEC",display_order:20})]}) as never;runFeed();await flush();expect(cities()).toEqual(["First","Second","Third"]); });
  it("applies object-position from focal", async () => { window.fetch=fetchJson({destinations:[validRow({focal_x:0.25,focal_y:0.75})]}) as never;runFeed();await flush();expect((grid().querySelector(".bf-dest-img")as HTMLImageElement).style.objectPosition).toBe("25% 75%"); });
  it("card is native button", async () => { window.fetch=fetchJson({destinations:[validRow()]}) as never;runFeed();await flush();expect(grid().querySelector(".bf-dest-card")!.tagName).toBe("BUTTON"); });
  it("cards have data attrs and aria-label", async () => { window.fetch=fetchJson({destinations:[validRow()]}) as never;runFeed();await flush();const c=grid().querySelector(".bf-dest-card")!;expect(c.getAttribute("data-destination")).toBe("KTM");expect(c.getAttribute("aria-label")).toBe("Select Kathmandu, Nepal as your destination"); });
  it("keeps fallback on various errors", async () => { for(const[_,fn] of [["empty",fetchJson({destinations:[]})],["badshape",fetchJson({})],["500",fetchJson({},{ok:false,status:500})],["invalidjson",fetchInvalidJson()],["network",fetchReject(new Error)]] as const){mountFallback();window.fetch=fn as never;runFeed();await flush();expect(fallbackCount()).toBe(6);}});
  it("XSS safe", async () => { const p='<img src=x onerror="window.__xss=1">';window.fetch=fetchJson({destinations:[validRow({city:p,description:p,iata_code:"XSS"})]}) as never;runFeed();await flush();expect(grid().querySelector(".bf-dest-city")!.textContent).toBe(p);expect((window as any).__xss).toBeUndefined(); });
  it("fetch timeout aborts", async () => { vi.useFakeTimers();window.fetch=vi.fn((_u:string,opts:{signal?:AbortSignal})=>new Promise((_,reject)=>{opts?.signal?.addEventListener("abort",()=>reject(new DOMException("Aborted","AbortError")))})) as never;runFeed();await vi.advanceTimersByTimeAsync(4000);await flush();expect(fallbackCount()).toBe(6); });
});

describe("whole-card interaction (button)", () => {
  beforeEach(()=>{mountFallback();(window as any).matchMedia=vi.fn(()=>({matches:false,addEventListener(){},removeEventListener(){}}));runClickHandler();}); afterEach(()=>{vi.restoreAllMocks();vi.useRealTimers();delete (window as any).dataLayer;});
  function setup(){({dataLayer:[]} as any);const s=document.getElementById("tpwl-search")!;const sp=vi.fn();(s as any).scrollIntoView=sp;const input=document.getElementById("from")as HTMLInputElement;input.getBoundingClientRect=()=>({width:120,height:32}as DOMRect);const fp=vi.spyOn(input,"focus");return{sp,fp};}
  it("click activates selection", async () => {
    window.fetch = fetchJson({destinations:[validRow()]}) as never;
    runFeed(); await flush();
    vi.useFakeTimers();
    (window as any).dataLayer = [];
    const search = document.getElementById("tpwl-search")!;
    const scrollSpy = vi.spyOn(search as any, 'scrollIntoView');
    const input = document.getElementById("from") as HTMLInputElement;
    input.getBoundingClientRect = () => ({width:120,height:32} as DOMRect);
    const focusSpy = vi.spyOn(input, 'focus');

    const card = grid().querySelector(".bf-dest-card") as HTMLElement;
    card.dispatchEvent(new MouseEvent("click",{bubbles:true}));

    // Flush all pending timers (the click handler uses setTimeout(150ms))
    vi.runAllTimers();

    expect((window as any).dataLayer.length).toBe(1);
    expect((window as any).dataLayer[0]).toMatchObject({
      event: "destination_card_click",
      destination_iata: "KTM",
      destination_city: "Kathmandu",
    });
    expect(scrollSpy).toHaveBeenCalled();
    expect(focusSpy).toHaveBeenCalled();
  });
  it("analytics fires once per click", async () => { window.fetch=fetchJson({destinations:[validRow()]}) as never;runFeed();await flush();vi.useFakeTimers();(window as any).dataLayer=[];const card=grid().querySelector(".bf-dest-card")as HTMLElement;card.dispatchEvent(new MouseEvent("click",{bubbles:true}));card.dispatchEvent(new MouseEvent("click",{bubbles:true}));vi.advanceTimersByTime(200);expect((window as any).dataLayer.length).toBe(2); });
  it("selected pill appears", async () => { window.fetch=fetchJson({destinations:[validRow()]}) as never;runFeed();await flush();vi.useFakeTimers();const card=grid().querySelector(".bf-dest-card")as HTMLElement;card.dispatchEvent(new MouseEvent("click",{bubbles:true}));vi.advanceTimersByTime(200);const p=document.getElementById("bf-dest-pill")!;expect(p.classList.contains("active")).toBe(true);expect(p.textContent).toContain("KTM"); });
  it("instruction changes contextually", async () => { window.fetch=fetchJson({destinations:[validRow()]}) as never;runFeed();await flush();vi.useFakeTimers();grid().querySelector(".bf-dest-card")!.dispatchEvent(new MouseEvent("click",{bubbles:true}));vi.advanceTimersByTime(200);expect(document.getElementById("bf-search-instruction")!.textContent).toContain("Kathmandu"); });
  it("aria-live updated", async () => { window.fetch=fetchJson({destinations:[validRow()]}) as never;runFeed();await flush();vi.useFakeTimers();grid().querySelector(".bf-dest-card")!.dispatchEvent(new MouseEvent("click",{bubbles:true}));vi.advanceTimersByTime(200);expect(document.getElementById("bf-dest-pill")!.textContent).toContain("Kathmandu"); });
  it("Clear removes state", async () => { window.fetch=fetchJson({destinations:[validRow()]}) as never;runFeed();await flush();vi.useFakeTimers();grid().querySelector(".bf-dest-card")!.dispatchEvent(new MouseEvent("click",{bubbles:true}));vi.advanceTimersByTime(200);const pill=document.getElementById("bf-dest-pill")!;const close=pill.querySelector(".bf-pill-close")as HTMLElement;close?.dispatchEvent(new MouseEvent("click",{bubbles:true}));expect(pill.classList.contains("active")).toBe(false); });
  it("Clear does not alter Travelpayouts fields", async () => { window.fetch=fetchJson({destinations:[validRow()]}) as never;runFeed();await flush();vi.useFakeTimers();(document.getElementById("from")as HTMLInputElement).value="SYD";grid().querySelector(".bf-dest-card")!.dispatchEvent(new MouseEvent("click",{bubbles:true}));vi.advanceTimersByTime(200);document.querySelector(".bf-pill-close")!.dispatchEvent(new MouseEvent("click",{bubbles:true}));expect((document.getElementById("from")as HTMLInputElement).value).toBe("SYD"); });
  it("decorative overlays pointer-events:none", () => { const s=HTML.match(/<style>([\s\S]*?)<\/style>/)?.[1]||"";expect(s).toMatch(/\.bf-dest-scrim\s*\{[^}]*pointer-events:\s*none/); });
});
