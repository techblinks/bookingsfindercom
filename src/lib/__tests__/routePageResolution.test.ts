/**
 * BF1-C — route-page slug parsing + fail-closed support decision.
 * Includes a source-contract test proving the fake-IATA fabrication is gone
 * from RoutePage.tsx (same static-contract convention as suppliers-migration).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { parseRouteSlug, describeRouteSupport } from "@/lib/routePageResolution";

describe("parseRouteSlug", () => {
  it("parses simple and multi-word slugs", () => {
    expect(parseRouteSlug("london-to-dubai")).toEqual({
      originCity: "London",
      destinationCity: "Dubai",
      originSlug: "london",
      destinationSlug: "dubai",
    });
    expect(parseRouteSlug("new-york-to-los-angeles")?.originCity).toBe("New York");
  });

  it("rejects non-route slugs", () => {
    expect(parseRouteSlug("london")).toBeNull();
    expect(parseRouteSlug("london-to-")).toBeNull();
    expect(parseRouteSlug("-to-dubai")).toBeNull();
  });

  it("rejects slugs containing non-letter segments (cannot name cities)", () => {
    expect(parseRouteSlug("abc123-to-london")).toBeNull();
    expect(parseRouteSlug("london-to--dubai")).toBeNull();
  });
});

describe("describeRouteSupport — fail-closed decision", () => {
  const res = (code: string) => ({ providerCode: code });

  it("ready when both endpoints resolve via reference data", () => {
    expect(
      describeRouteSupport({ originResolution: res("LON"), destinationResolution: res("DXB") }),
    ).toEqual({ status: "ready", originCode: "LON", destinationCode: "DXB" });
  });

  it("published row codes win over resolver results", () => {
    const d = describeRouteSupport({
      publishedOriginIata: "JFK",
      publishedDestinationIata: "LHR",
      originResolution: res("NYC"),
      destinationResolution: res("LON"),
    });
    expect(d).toEqual({ status: "ready", originCode: "JFK", destinationCode: "LHR" });
  });

  it("published codes fill one endpoint while resolver fills the other", () => {
    const d = describeRouteSupport({
      publishedOriginIata: "SYD",
      destinationResolution: res("KTM"),
    });
    expect(d.status).toBe("ready");
    expect(d.originCode).toBe("SYD");
  });

  it("unsupported when either endpoint cannot be backed by real data", () => {
    expect(
      describeRouteSupport({ originResolution: res("LON"), destinationResolution: null }).status,
    ).toBe("unsupported");
    expect(describeRouteSupport({}).status).toBe("unsupported");
  });

  it("malformed published codes are ignored, not trusted", () => {
    expect(
      describeRouteSupport({
        publishedOriginIata: "12X",
        publishedDestinationIata: "TOOLONG",
        originResolution: null,
        destinationResolution: res("LHR"),
      }).status,
    ).toBe("unsupported");
  });

  it("lowercase published codes are normalized", () => {
    const d = describeRouteSupport({
      publishedOriginIata: "bne",
      publishedDestinationIata: "dps",
    });
    expect(d).toEqual({ status: "ready", originCode: "BNE", destinationCode: "DPS" });
  });
});

// ---------------------------------------------------------------------------
// Source contract — the fake-IATA path must stay dead.
// ---------------------------------------------------------------------------
const routePageSrc = readFileSync("src/pages/RoutePage.tsx", "utf8");
// Strip // comments so documentation ABOUT the old fabrication can never
// satisfy these assertions; only real code counts.
const routePageCode = routePageSrc.replace(/\/\/.*$/gm, "");

describe("BF1-C source contract: fake-IATA fabrication removed from RoutePage", () => {
  it("no first-3-letters IATA fabrication remains", () => {
    expect(routePageCode.includes("substring(0, 3)")).toBe(false);
    expect(routePageCode.includes("substring(0,3)")).toBe(false);
  });

  it("no inline cityToIATA map / getIATA helper remains", () => {
    expect(routePageCode.includes("cityToIATA")).toBe(false);
    expect(routePageCode.match(/\bgetIATA\b/)).toBeNull();
  });

  it("routes through the reference resolver + fail-closed decision", () => {
    expect(routePageSrc).toContain('from "@/lib/routePageResolution"');
    expect(routePageSrc).toContain('from "@/lib/airportResolution"');
    expect(routePageSrc).toContain("describeRouteSupport");
    expect(routePageSrc).toContain("Route not supported");
    expect(routePageSrc).toContain('content="noindex,follow"');
  });
});
