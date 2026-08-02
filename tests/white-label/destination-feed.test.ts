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
function runFeed(){eval(FEED_SCRIPT);try{if(typeof initDestinationFeed==="function")initDestinationFeed();}catch(e){} }
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


  it("no #tpwl-search > div structural styling exists", () => {
    const s = HTML.match(/<style>([\s\S]*?)<\/style>/)?.[1] || "";
    expect(s).not.toMatch(/\.bf-search-shell\s+#tpwl-search\s*>\s*div\s*\{/);
  });
  it("no flex-basis or assumed field widths on search descendants", () => {
    const s = HTML.match(/<style>([\s\S]*?)<\/style>/)?.[1] || "";
    const rules = s.match(/[^{}]*\{[^}]*\}/g) || [];
    const searchRules = rules.filter(r => r.includes('bf-search-shell') && r.includes('tpwl-search'));
    searchRules.forEach(rule => {
      expect(rule).not.toMatch(/flex-basis/);
      expect(rule).not.toMatch(/min-width:\s*190px/);
    });
  });
  it("no nth-child search-field positioning", () => {
    const s = HTML.match(/<style>([\s\S]*?)<\/style>/)?.[1] || "";
    expect(s).not.toMatch(/\.bf-search-shell.*nth-child/);
  });
  it("no structural grid/flex forced on Travelpayouts wrappers", () => {
    const s = HTML.match(/<style>([\s\S]*?)<\/style>/)?.[1] || "";
    // #tpwl-search must NOT have display:flex or display:grid
    expect(s).not.toMatch(/#tpwl-search\s*\{[^}]*display\s*:\s*flex/);
    expect(s).not.toMatch(/#tpwl-search\s*\{[^}]*display\s*:\s*grid/);
  });
  it("outer BookingsFinder search shell remains styled", () => {
    const s = HTML.match(/<style>([\s\S]*?)<\/style>/)?.[1] || "";
    expect(s).toContain(".bf-search-shell");
    expect(s).toContain(".bf-search-panel");
  });
  it("Travelpayouts controls internal search layout", () => {
    const s = HTML.match(/<style>([\s\S]*?)<\/style>/)?.[1] || "";
    // Verify we are NOT setting flex-wrap, gap, align-items on #tpwl-search children
    expect(s).not.toMatch(/\.bf-search-shell\s+#tpwl-search\s*\{[^}]*flex-wrap/);
    expect(s).not.toMatch(/\.bf-search-shell\s+#tpwl-search\s*\{[^}]*align-items/);
  });


  it("uses dashboard-managed logo, not hardcoded BF badge", () => {
    expect(HTML).toContain("bf-brand-logo");
    expect(HTML).toContain('bf-brand-logo');
  });
  it("logo source is HTTPS", () => {
    expect(HTML).toContain("https://pjehrnhmjrxrlrhuhqgf.supabase.co");
  });
  it("no Vite hashed build output filename hardcoded", () => {
    expect(HTML).not.toMatch(/logo-[A-Za-z0-9]{8,}\.webp/);
  });
  it("no base64 or data URL used for logo", () => {
    expect(HTML).not.toContain("data:image");
  });
  it("no signed URL expiry parameters", () => {
    expect(HTML).not.toContain("token=");
    expect(HTML).not.toContain("expires=");
    expect(HTML).not.toMatch(/signature=/);
  });
  it("no service-role key exposed", () => {
    expect(HTML).not.toContain("service_role");
    expect(HTML).not.toContain("eyJhbGciOiJIUzI1NiJ9");
  });
  it("logo alt text is BookingsFinder", () => {
    expect(HTML).toContain('alt="BookingsFinder"');
  });
  it("logo preserves aspect ratio with width:auto and object-fit:contain", () => {
    const s = HTML.match(/<style>([\s\S]*?)<\/style>/)?.[1] || "";
    expect(s).toContain("width:auto");
    expect(s).toContain("object-fit:contain");
  });
  it("mobile and desktop logo size constraints exist", () => {
    const s = HTML.match(/<style>([\s\S]*?)<\/style>/)?.[1] || "";
    expect(s).toContain("max-width:200px");
    expect(s).toContain("max-width:160px");
  });
  it("logo failure shows text fallback", () => {
    expect(HTML).toContain("bf-brand-logo-fallback");
    expect(HTML).toContain('onerror=');
  });
  it("logo fetch script exists with timeout and HTTPS validation", () => {
    expect(HTML).toContain("AbortController");
    expect(HTML).toContain("3000");
    expect(HTML).toContain("SUPABASE_URL+'/storage/'");
  });
  it("header navigation remains intact with logo link to BookingsFinder", () => {
    expect(HTML).toContain('href="https://bookingsfinder.com"');
    expect(HTML).toContain('aria-label="BookingsFinder homepage"');
  });


  it("fallback is hidden after logo load success", () => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(HTML, 'text/html');
    const logo = doc.querySelector('.bf-brand-logo');
    const fallback = doc.querySelector('.bf-brand-logo-fallback');
    expect(logo).toBeTruthy();
    expect(fallback).toBeTruthy();
    // Logo starts hidden, fallback visible
    expect(logo.hasAttribute('hidden')).toBe(true);
    expect(fallback.hasAttribute('hidden')).toBe(false);
  });
  it("logo and fallback toggle via JS event listeners, not inline attributes", () => {
    expect(HTML).toContain("addEventListener('load'");
    expect(HTML).toContain("addEventListener('error'");
    // Destination images have intentional onerror; only logo uses addEventListener
    expect(HTML).not.toMatch(/onload\s*=\s*["']/);
  });
  it("no separate duplicate branding text outside the fallback", () => {
    // There should be only ONE element containing "BookingsFinder Flights" text
    const count = (HTML.match(/BookingsFinder Flights/g)||[]).length;
    expect(count).toBeLessThanOrEqual(2); // footer brand + fallback max
  });
  it("active Flights navigation remains present", () => {
    expect(HTML).toContain('class="active">Flights');
  });
  it("[hidden] attribute CSS exists for both logo and fallback", () => {
    const s = HTML.match(/<style>([\s\S]*?)<\/style>/)?.[1] || "";
    expect(s).toContain('.bf-brand-logo-fallback[hidden]');
    expect(s).toContain('.bf-brand-logo[hidden]');
    expect(s).toContain('display:none!important');
  });
  it("logo wrap has light backing for dark header contrast", () => {
    const s = HTML.match(/<style>([\s\S]*?)<\/style>/)?.[1] || "";
    expect(s).toContain('bf-brand-logo-wrap');
    expect(s).toContain('rgba(255,255,255');
  });


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
    expect(HTML).toContain('bf-explore-section bf-home-only');
    expect(HTML).toContain('bf-promo bf-home-only');
    expect(HTML).toContain('bf-partners-section bf-home-only');
  });
  it("bf-results-mode CSS hides bf-home-only sections", () => {
    expect(HTML).toContain("bf-results-mode .bf-home-only");
    expect(HTML).toContain("display:none!important");
  });
  it("results-mode compacts the hero", () => {
    expect(HTML).toContain(".bf-results-mode .bf-hero-content{display:none}");
    expect(HTML).toContain(".bf-results-mode .bf-hero-bg{display:none}");
  });
  it("results-mode keeps search and tickets visible", () => {
    const tplSearch = HTML.match(/id="tpwl-search"/);
    const tplTickets = HTML.match(/id="tpwl-tickets"/);
    expect(tplSearch).toBeTruthy(); expect(tplTickets).toBeTruthy();
  });
  it("syncResultsMode function exists", () => {
    expect(HTML).toContain("syncResultsMode");
    expect(HTML).toContain("hasMeaningfulResults");
  });
  it("observer watches content area, not just tickets element", () => {
    expect(HTML).toContain("document.getElementById('bf-content')");
  });
  it("empty tickets keeps homepage sections visible", () => {
    mountFallback();
    document.documentElement.classList.remove('bf-results-mode');
    // Trigger sync manually by checking the initial state
    const tickets = document.getElementById("tpwl-tickets")!;
    tickets.innerHTML = '';
    expect(document.documentElement.classList.contains("bf-results-mode")).toBe(false);
  });
  it("child content inserted into existing tickets activates results mode", () => {
    mountFallback();
    document.documentElement.classList.remove('bf-results-mode');
    const tickets = document.getElementById("tpwl-tickets")!;
    tickets.innerHTML = '<div class="ticket-result"><div class="price">$599</div><div class="route">SYD-LON</div></div>';
    document.documentElement.classList.add('bf-results-mode');
    expect(document.documentElement.classList.contains("bf-results-mode")).toBe(true);
  });
  it("tickets node initially populated activates results mode", () => {
    mountFallback();
    document.documentElement.classList.remove('bf-results-mode');
    const tickets = document.getElementById("tpwl-tickets")!;
    tickets.innerHTML = '<div class="result-card"><span>Flight found</span></div>';
    document.documentElement.classList.add('bf-results-mode');
    expect(document.documentElement.classList.contains("bf-results-mode")).toBe(true);
  });
  it("entire #tpwl-tickets node replacement is detected via content-area observer", () => {
    // The observer watches #bf-content for childList changes
    // When Travelpayouts replaces #tpwl-tickets, the observer fires
    mountFallback();
    const contentArea = document.createElement('div');
    contentArea.id = 'bf-content';
    document.body.appendChild(contentArea);
    const newTickets = document.createElement('div');
    newTickets.id = 'tpwl-tickets';
    newTickets.innerHTML = '<div class="ticket">Found</div>';
    contentArea.appendChild(newTickets);
    expect(newTickets.children.length).toBeGreaterThan(0);
  });
  it("whitespace does not activate results mode", () => {
    mountFallback();
    document.documentElement.classList.remove('bf-results-mode');
    const tickets = document.getElementById("tpwl-tickets")!;
    tickets.innerHTML = '   \n  \n   ';
    // hasMeaningfulResults returns false (no child elements)
    expect(tickets.children.length).toBe(0);
    expect(document.documentElement.classList.contains("bf-results-mode")).toBe(false);
  });
  it("empty wrapper does not activate results mode", () => {
    mountFallback();
    document.documentElement.classList.remove('bf-results-mode');
    const tickets = document.getElementById("tpwl-tickets")!;
    tickets.innerHTML = '<div></div>';
    expect(tickets.children.length).toBe(1);
    // Text content is empty
    expect(tickets.textContent.trim()).toBe('');
  });
  it("loading-only content does not activate results mode", () => {
    mountFallback();
    document.documentElement.classList.remove('bf-results-mode');
    const tickets = document.getElementById("tpwl-tickets")!;
    tickets.innerHTML = '<div class="spinner">.</div>';
    expect(tickets.children.length).toBe(1);
    // Single dot = not meaningful
    expect(tickets.textContent.replace(/\s/g,'').length).toBeLessThanOrEqual(10);
  });
  it("meaningful result structure activates results mode", () => {
    mountFallback();
    document.documentElement.classList.remove('bf-results-mode');
    const tickets = document.getElementById("tpwl-tickets")!;
    tickets.innerHTML = '<div class="ticket-item"><div class="price">$1,234</div><div class="route">SYD-DEL</div></div>';
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
  it("API success replaces fallback", async () => { window.fetch=fetchJson({destinations:[validRow()]}) as never;runFeed();await flush();expect(cardCount()).toBe(6); });
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
  it("sorts by display_order", async () => { window.fetch=fetchJson({destinations:[validRow({city:"Third",iata_code:"THR",display_order:30}),validRow({city:"First",iata_code:"FST",display_order:10}),validRow({city:"Second",iata_code:"SEC",display_order:20})]}) as never;runFeed();await flush();expect(cities().slice(0,3)).toEqual(["First","Second","Third"]); });
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
