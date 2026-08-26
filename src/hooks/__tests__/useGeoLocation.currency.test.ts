/**
 * BF-FLIGHTS-LIVE-2 Phase C — geo-detected currency.
 *
 * useGeoLocation's country→currency mapping is preserved as-is per the
 * task's explicit instruction; these tests verify that existing mapping
 * for the countries the task names, plus the safe-fallback path, without
 * changing useGeoLocation.ts itself.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useGeoLocation } from "../useGeoLocation";

function stubGeoResponse(body: unknown, ok = true) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok,
      json: () => Promise.resolve(body),
    })
  );
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useGeoLocation — country to currency mapping", () => {
  it("item 1: AU resolves AUD", async () => {
    stubGeoResponse({ country_code: "AU", country_name: "Australia", city: "Sydney" });
    const { result } = renderHook(() => useGeoLocation());
    await waitFor(() => expect(result.current.geoData?.currency).toBe("AUD"));
    expect(result.current.geoData?.currencySymbol).toBe("A$");
  });

  it("item 2: US resolves USD", async () => {
    stubGeoResponse({ country_code: "US", country_name: "United States", city: "New York" });
    const { result } = renderHook(() => useGeoLocation());
    await waitFor(() => expect(result.current.geoData?.currency).toBe("USD"));
    expect(result.current.geoData?.currencySymbol).toBe("$");
  });

  it("item 3: GB resolves GBP", async () => {
    stubGeoResponse({ country_code: "GB", country_name: "United Kingdom", city: "London" });
    const { result } = renderHook(() => useGeoLocation());
    await waitFor(() => expect(result.current.geoData?.currency).toBe("GBP"));
    expect(result.current.geoData?.currencySymbol).toBe("£");
  });

  it("item 4: India (IN) resolves INR", async () => {
    stubGeoResponse({ country_code: "IN", country_name: "India", city: "Delhi" });
    const { result } = renderHook(() => useGeoLocation());
    await waitFor(() => expect(result.current.geoData?.currency).toBe("INR"));
    expect(result.current.geoData?.currencySymbol).toBe("₹");
  });

  it("resolves NZ to NZD, SG to SGD, JP to JPY, CA to CAD", async () => {
    const cases: [string, string][] = [
      ["NZ", "NZD"],
      ["SG", "SGD"],
      ["JP", "JPY"],
      ["CA", "CAD"],
    ];
    for (const [countryCode, currency] of cases) {
      localStorage.clear();
      stubGeoResponse({ country_code: countryCode, country_name: countryCode, city: "x" });
      const { result, unmount } = renderHook(() => useGeoLocation());
      await waitFor(() => expect(result.current.geoData?.currency).toBe(currency));
      unmount();
    }
  });

  it("resolves major Euro countries (DE, FR) to EUR", async () => {
    for (const countryCode of ["DE", "FR"]) {
      localStorage.clear();
      stubGeoResponse({ country_code: countryCode, country_name: countryCode, city: "x" });
      const { result, unmount } = renderHook(() => useGeoLocation());
      await waitFor(() => expect(result.current.geoData?.currency).toBe("EUR"));
      unmount();
    }
  });

  it("item 5: an unrecognised country code falls back to USD safely", async () => {
    stubGeoResponse({ country_code: "ZZ", country_name: "Unknown", city: "x" });
    const { result } = renderHook(() => useGeoLocation());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.geoData?.currency).toBe("USD");
    expect(result.current.geoData?.currencySymbol).toBe("$");
  });

  it("item 5: a failed geolocation lookup falls back to USD safely (regionConfig default, no crash)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const { result } = renderHook(() => useGeoLocation());
    await waitFor(() => expect(result.current.loading).toBe(false));
    // On a hard failure, geoData stays null (never set) rather than a
    // fabricated guess, and the region config used for defaults falls back
    // to its USD-priced default — see useGeoLocation.ts's defaultConfig.
    expect(result.current.geoData).toBeNull();
    expect(result.current.regionConfig.currency).toBe("USD");
  });

  it("does not request browser GPS — only fetches an IP-based lookup", async () => {
    stubGeoResponse({ country_code: "AU", country_name: "Australia", city: "Sydney" });
    const geolocationSpy = vi.fn();
    Object.defineProperty(navigator, "geolocation", { value: { getCurrentPosition: geolocationSpy }, configurable: true });
    renderHook(() => useGeoLocation());
    await waitFor(() => expect(geolocationSpy).not.toHaveBeenCalled());
  });
});
