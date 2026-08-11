/**
 * Phase 2 — geo-aware "Explore flight routes" discovery.
 *
 * The landing page previously rendered a hardcoded six-route array. These tests
 * lock the replacement's safety properties: routes come from the API, prices are
 * only ever shown when the API genuinely supplied one WITH a currency, and every
 * failure mode degrades to claim-safe suggestions instead of crashing /flights.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ExploreRoutes from "@/components/flights/ExploreRoutes";
import {
  isValidRoute,
  normalisePrice,
  selectRoutes,
  formatIndicativePrice,
} from "@/hooks/useRouteDiscovery";

const geoState = {
  geoData: { defaultOrigin: "BNE", defaultOriginName: "Brisbane", city: "Brisbane", country: "Australia" },
  regionConfig: {
    defaultOrigin: "SYD",
    defaultOriginName: "Sydney",
    currency: "AUD",
    currencySymbol: "A$",
    popularRoutes: [
      { origin: "SYD", originName: "Sydney", destination: "MEL", destinationName: "Melbourne" },
      { origin: "SYD", originName: "Sydney", destination: "BNE", destinationName: "Brisbane" },
    ],
  },
  loading: false,
};

vi.mock("@/hooks/useGeoLocation", () => ({
  useGeoLocation: () => geoState,
}));

vi.mock("@/lib/supabaseConfig", () => ({
  getFunctionUrl: (n: string) => `https://example.test/functions/v1/${n}`,
  isSupabaseConfigured: () => true,
}));

const logInternalNavigation = vi.fn();
vi.mock("@/lib/analytics", () => ({
  logInternalNavigation: (...a: unknown[]) => logInternalNavigation(...a),
}));

function mockDirections(body: unknown, ok = true) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok, json: () => Promise.resolve(body) }),
  );
}

function renderSection(props = {}) {
  return render(
    <MemoryRouter>
      <ExploreRoutes {...props} />
    </MemoryRouter>,
  );
}

const AU_RESPONSE = {
  currency: "AUD",
  routes: [
    { origin: "BNE", originName: "Brisbane", destination: "SYD", destinationName: "Sydney", price: 219 },
    { origin: "BNE", originName: "Brisbane", destination: "MEL", destinationName: "Melbourne", price: 189 },
  ],
};

beforeEach(() => {
  logInternalNavigation.mockClear();
  geoState.loading = false;
  geoState.geoData = {
    defaultOrigin: "BNE",
    defaultOriginName: "Brisbane",
    city: "Brisbane",
    country: "Australia",
  };
});
afterEach(() => vi.unstubAllGlobals());

describe("Dynamic routes replace the hardcoded landing list", () => {
  it("renders routes returned by the API", async () => {
    mockDirections(AU_RESPONSE);
    renderSection();
    expect(await screen.findByText("SYD")).toBeTruthy();
    expect(screen.getByText("MEL")).toBeTruthy();
    expect(screen.getAllByText("BNE").length).toBe(2);
  });

  it("does not render the removed hardcoded Gold Coast / Kathmandu pairs", async () => {
    mockDirections(AU_RESPONSE);
    renderSection();
    await screen.findByText("SYD");
    expect(screen.queryByText("OOL")).toBeNull();
    expect(screen.queryByText("KTM")).toBeNull();
  });

  it("keeps the factual heading and makes no popularity claim", async () => {
    mockDirections(AU_RESPONSE);
    renderSection();
    await screen.findByText("SYD");
    expect(screen.getByRole("heading", { name: "Explore flight routes" })).toBeTruthy();
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/popular/i);
    expect(text).not.toMatch(/trending/i);
    expect(text).not.toMatch(/top searched/i);
  });

  it("says suggestions are region-based only when that is true", async () => {
    mockDirections(AU_RESPONSE);
    renderSection();
    await screen.findByText("SYD");
    expect(screen.getByText(/Suggested routes from Brisbane/i)).toBeTruthy();
  });

  it("names the origin the results share, not the one we asked for", async () => {
    // Regression: naming the requested origin produced "Suggested routes from
    // London" above a list of Sydney departures.
    geoState.geoData = {
      defaultOrigin: "LHR",
      defaultOriginName: "London",
      city: "London",
      country: "United Kingdom",
    };
    mockDirections({
      currency: "AUD",
      routes: [
        { origin: "SYD", originName: "Sydney", destination: "MEL", destinationName: "Melbourne", price: 129 },
      ],
    });
    renderSection();
    await screen.findByText("MEL");
    expect(screen.queryByText(/Suggested routes from London/i)).toBeNull();
    expect(screen.getByText(/Suggested routes from Sydney/i)).toBeTruthy();
  });

  it("makes no origin claim when the results span several origins", async () => {
    mockDirections({
      currency: "AUD",
      routes: [
        { origin: "SYD", originName: "Sydney", destination: "MEL", destinationName: "Melbourne" },
        { origin: "BNE", originName: "Brisbane", destination: "DPS", destinationName: "Bali" },
      ],
    });
    renderSection();
    await screen.findByText("MEL");
    expect(screen.queryByText(/Suggested routes from/i)).toBeNull();
  });
});

describe("Route validation", () => {
  it.each([
    [{ origin: "BNE", destination: "SYD" }, true],
    [{ origin: "bne", destination: "syd" }, true],
    [{ origin: "SYD", destination: "SYD" }, false], // identical
    [{ origin: "SY", destination: "MEL" }, false], // too short
    [{ origin: "SYDN", destination: "MEL" }, false], // too long
    [{ origin: "S1D", destination: "MEL" }, false], // non-alpha
    [{ origin: "", destination: "MEL" }, false],
    [{ origin: null, destination: "MEL" }, false],
    [{ destination: "MEL" }, false],
  ])("isValidRoute(%o) === %s", (route, expected) => {
    expect(isValidRoute(route as never)).toBe(expected);
  });

  it("removes duplicate routes", () => {
    const out = selectRoutes(
      [
        { origin: "BNE", destination: "SYD", price: 219 },
        { origin: "BNE", destination: "SYD", price: 999 },
        { origin: "bne", destination: "syd", price: 111 },
      ],
      "AUD",
      8,
    );
    expect(out).toHaveLength(1);
    expect(out[0].price).toBe(219); // first occurrence wins
  });

  it("rejects invalid routes from a mixed payload", () => {
    const out = selectRoutes(
      [
        { origin: "BNE", destination: "SYD" },
        { origin: "SYD", destination: "SYD" },
        { origin: "XX", destination: "MEL" },
        null,
        "nonsense",
      ],
      "AUD",
      8,
    );
    expect(out.map((r) => `${r.origin}-${r.destination}`)).toEqual(["BNE-SYD"]);
  });

  it("caps the number of routes", () => {
    const many = Array.from({ length: 30 }, (_, i) => ({
      origin: "BNE",
      destination: `D${String(i).padStart(2, "0")}`.slice(0, 3),
    }));
    expect(selectRoutes(many, "AUD", 8).length).toBeLessThanOrEqual(8);
  });

  it("drops invalid routes before render", async () => {
    mockDirections({
      currency: "AUD",
      routes: [
        { origin: "BNE", originName: "Brisbane", destination: "SYD", destinationName: "Sydney", price: 219 },
        { origin: "MEL", destination: "MEL" },
        { origin: "??", destination: "SYD" },
      ],
    });
    renderSection();
    await screen.findByText("SYD");
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });
});

describe("Price safety — never fabricated", () => {
  it("shows a genuine price with the API's currency", async () => {
    mockDirections(AU_RESPONSE);
    renderSection();
    await screen.findByText("SYD");
    expect(screen.getByText(/Indicative fare\s*A\$219/)).toBeTruthy();
  });

  it("omits the price when the API returned none", async () => {
    mockDirections({
      currency: "AUD",
      routes: [{ origin: "BNE", originName: "Brisbane", destination: "SYD", destinationName: "Sydney", price: null }],
    });
    renderSection();
    await screen.findByText("SYD");
    expect(screen.queryByText(/Indicative fare/i)).toBeNull();
  });

  it("omits the price when the response carries no currency", async () => {
    mockDirections({
      routes: [{ origin: "BNE", originName: "Brisbane", destination: "SYD", destinationName: "Sydney", price: 219 }],
    });
    renderSection();
    await screen.findByText("SYD");
    expect(screen.queryByText(/Indicative fare/i)).toBeNull();
  });

  it("never labels a USD result with the visitor's AUD symbol", async () => {
    // Region is AU, but the API answered in USD — it must render as USD.
    mockDirections({
      currency: "USD",
      routes: [{ origin: "BNE", originName: "Brisbane", destination: "SYD", destinationName: "Sydney", price: 150 }],
    });
    renderSection();
    await screen.findByText("SYD");
    expect(screen.queryByText(/A\$150/)).toBeNull();
    expect(screen.getByText(/Indicative fare\s*US\$150/)).toBeTruthy();
  });

  it("always qualifies the currency symbol, never a bare $", () => {
    // A bare "$" is ambiguous on a site quoting many currencies.
    expect(formatIndicativePrice(129, "AUD")).toContain("A$");
    expect(formatIndicativePrice(129, "USD")).toContain("US$");
    expect(formatIndicativePrice(129, "GBP")).toContain("£");
  });

  it.each([
    [0, "AUD"],
    [-5, "AUD"],
    [NaN, "AUD"],
    ["219", "AUD"],
    [219, ""],
    [219, "AUSTRALIAN"],
    [219, null],
  ])("normalisePrice(%p, %p) yields no price", (price, currency) => {
    expect(normalisePrice(price, currency)).toEqual({ price: null, currency: null });
  });

  it("renders an unrecognised currency as its ISO code, never a wrong symbol", () => {
    // Intl accepts any well-formed 3-letter code and prints the code itself,
    // which is honest: it reports exactly what the API said, with no invented
    // symbol and no FX conversion.
    // Intl separates the code from the number with a no-break space (U+00A0),
    // so match on content rather than an exact literal.
    const formatted = formatIndicativePrice(219, "ZZZ")!;
    expect(formatted).toMatch(/^ZZZ\s219$/);
    expect(formatted).not.toContain("$");
  });

  it("omits the price when either half is missing", () => {
    expect(formatIndicativePrice(null, "AUD")).toBeNull();
    expect(formatIndicativePrice(219, null)).toBeNull();
  });

  it("shows no price anywhere in the fallback state", async () => {
    mockDirections({}, false);
    renderSection();
    await screen.findByText("MEL");
    expect(screen.queryByText(/Indicative fare/i)).toBeNull();
    expect(document.body.textContent).not.toMatch(/\$\d/);
  });
});

describe("Failure and empty responses", () => {
  it("does not crash when the API returns an error status", async () => {
    mockDirections({ error: "boom" }, false);
    renderSection();
    expect(await screen.findByRole("heading", { name: "Explore flight routes" })).toBeTruthy();
  });

  it("does not crash when fetch rejects", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    renderSection();
    expect(await screen.findByRole("heading", { name: "Explore flight routes" })).toBeTruthy();
    expect(await screen.findByText("MEL")).toBeTruthy();
  });

  it("falls back safely on an empty route array", async () => {
    mockDirections({ currency: "AUD", routes: [] });
    renderSection();
    await screen.findByText("MEL");
    expect(screen.getAllByRole("listitem").length).toBeGreaterThan(0);
  });

  it("fallback suggestions are claim-safe", async () => {
    mockDirections({}, false);
    renderSection();
    await screen.findByText("MEL");
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/popular|trending|top searched/i);
    // No region claim, because these are static suggestions.
    expect(screen.queryByText(/Suggested routes from/i)).toBeNull();
  });

  it("renders nothing when there is no data and no fallback", async () => {
    geoState.regionConfig.popularRoutes = [];
    mockDirections({}, false);
    const { container } = renderSection();
    await waitFor(() => expect(container.querySelector("section")).toBeNull());
    geoState.regionConfig.popularRoutes = [
      { origin: "SYD", originName: "Sydney", destination: "MEL", destinationName: "Melbourne" },
      { origin: "SYD", originName: "Sydney", destination: "BNE", destinationName: "Brisbane" },
    ];
  });
});

describe("Geo origin selection", () => {
  it("queries the geo-inferred origin", async () => {
    mockDirections(AU_RESPONSE);
    renderSection();
    await screen.findByText("SYD");
    const body = JSON.parse((globalThis.fetch as never as { mock: { calls: never[][] } }).mock.calls[0][1].body);
    expect(body.origin).toBe("BNE");
  });

  it("prefers an origin the user already chose", async () => {
    mockDirections(AU_RESPONSE);
    renderSection({ preferredOrigin: "PER" });
    await screen.findByText("SYD");
    const body = JSON.parse((globalThis.fetch as never as { mock: { calls: never[][] } }).mock.calls[0][1].body);
    expect(body.origin).toBe("PER");
  });

  it("falls back to the region default when geo returns nothing", async () => {
    geoState.geoData = null as never;
    mockDirections(AU_RESPONSE);
    renderSection();
    await screen.findByText("SYD");
    const body = JSON.parse((globalThis.fetch as never as { mock: { calls: never[][] } }).mock.calls[0][1].body);
    expect(body.origin).toBe("SYD");
  });

  it("issues exactly one network request for the section", async () => {
    mockDirections(AU_RESPONSE);
    renderSection();
    await screen.findByText("SYD");
    await waitFor(() => expect((globalThis.fetch as never as { mock: { calls: unknown[] } }).mock.calls.length).toBe(1));
  });
});

describe("Loading state", () => {
  it("shows placeholders, not fake routes, while geo resolves", () => {
    geoState.loading = true;
    mockDirections(AU_RESPONSE);
    renderSection();
    const list = screen.getByTestId("explore-routes-list");
    expect(within(list).queryByRole("link")).toBeNull();
    expect(list.querySelectorAll("li").length).toBeGreaterThan(0);
  });

  it("placeholders are hidden from assistive tech", () => {
    geoState.loading = true;
    mockDirections(AU_RESPONSE);
    renderSection();
    const items = screen.getByTestId("explore-routes-list").querySelectorAll("li");
    items.forEach((li) => expect(li.getAttribute("aria-hidden")).toBe("true"));
  });
});

describe("Card behaviour and accessibility", () => {
  it("links into the existing validated flight-search flow", async () => {
    mockDirections(AU_RESPONSE);
    renderSection();
    await screen.findByText("SYD");
    const link = screen.getAllByRole("link")[0];
    expect(link.getAttribute("href")).toBe("/flights?origin=BNE&destination=SYD");
  });

  it("prefills only — never injects dates that would auto-search", async () => {
    mockDirections(AU_RESPONSE);
    renderSection();
    await screen.findByText("SYD");
    for (const link of screen.getAllByRole("link")) {
      expect(link.getAttribute("href")).not.toMatch(/departureDate|returnDate|passengers/);
    }
  });

  it("uses real links, not click-only divs", async () => {
    mockDirections(AU_RESPONSE);
    renderSection();
    await screen.findByText("SYD");
    expect(screen.getAllByRole("link")).toHaveLength(2);
  });

  it("gives each card a meaningful accessible name including the fare", async () => {
    mockDirections(AU_RESPONSE);
    renderSection();
    await screen.findByText("SYD");
    expect(
      screen.getByRole("link", {
        name: /Search flights from Brisbane \(BNE\) to Sydney \(SYD\)\. Indicative fare A\$219\./,
      }),
    ).toBeTruthy();
  });

  it("omits fare wording from the accessible name when there is no price", async () => {
    mockDirections({
      currency: "AUD",
      routes: [{ origin: "BNE", originName: "Brisbane", destination: "SYD", destinationName: "Sydney", price: null }],
    });
    renderSection();
    await screen.findByText("SYD");
    const link = screen.getAllByRole("link")[0];
    expect(link.getAttribute("aria-label")).not.toMatch(/Indicative fare/);
  });

  it("carries a visible focus ring", async () => {
    mockDirections(AU_RESPONSE);
    renderSection();
    await screen.findByText("SYD");
    expect(screen.getAllByRole("link")[0].className).toContain("focus-visible:ring-2");
  });

  it("emits exactly one analytics event per activation", async () => {
    mockDirections(AU_RESPONSE);
    renderSection();
    await screen.findByText("SYD");
    screen.getAllByRole("link")[0].click();
    expect(logInternalNavigation).toHaveBeenCalledTimes(1);
    expect(logInternalNavigation).toHaveBeenCalledWith(
      expect.objectContaining({ label: "BNE-SYD", href: "/flights?origin=BNE&destination=SYD" }),
    );
  });
});

describe("Mobile carousel container", () => {
  it("stays one horizontally scrollable row at every rendered width", async () => {
    // /flights renders the mobile task shell below 768, so this band only ever
    // appears from tablet up. A single scrollable row keeps it a compact strip
    // rather than wrapping into a second marketing block.
    mockDirections(AU_RESPONSE);
    renderSection();
    await screen.findByText("SYD");
    const cls = screen.getByTestId("explore-routes-list").className;
    expect(cls).toContain("overflow-x-auto");
    expect(cls).toContain("snap-x");
    expect(cls).toContain("flex");
    expect(cls).not.toContain("grid");
  });

  it("cards keep a fixed finger-friendly width so they never squash", async () => {
    mockDirections(AU_RESPONSE);
    renderSection();
    await screen.findByText("SYD");
    for (const li of screen.getAllByRole("listitem")) {
      expect(li.className).toContain("w-[210px]");
      expect(li.className).toContain("snap-start");
    }
  });

  it("uses a semantic list so the container is navigable without a pointer", async () => {
    mockDirections(AU_RESPONSE);
    renderSection();
    await screen.findByText("SYD");
    const list = screen.getByTestId("explore-routes-list");
    expect(list.tagName).toBe("UL");
    expect(list.getAttribute("aria-label")).toBe("Suggested flight routes");
  });

  it("introduces no infinite or autoplay animation", async () => {
    mockDirections(AU_RESPONSE);
    renderSection();
    await screen.findByText("SYD");
    const html = screen.getByTestId("explore-routes-list").innerHTML;
    expect(html).not.toContain("animate-bounce");
    expect(html).not.toContain("animate-spin");
  });
});
