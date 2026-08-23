/**
 * BF-FLIGHTS-LIVE-2 Phase B/F — the composed currency preference hook.
 *
 * useGeoLocation is mocked here so these tests isolate the
 * priority/override/persistence behaviour from the network lookup already
 * covered by useGeoLocation.currency.test.ts.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCurrencyPreference } from "../useCurrencyPreference";

const mockUseGeoLocation = vi.fn();
vi.mock("../useGeoLocation", () => ({
  useGeoLocation: () => mockUseGeoLocation(),
}));

beforeEach(() => {
  localStorage.clear();
  mockUseGeoLocation.mockReturnValue({
    geoData: { currency: "AUD", currencySymbol: "A$" },
    loading: false,
    regionConfig: {},
  });
});

describe("useCurrencyPreference", () => {
  it("initially resolves to the geo-detected currency when nothing is stored", () => {
    const { result } = renderHook(() => useCurrencyPreference());
    expect(result.current.currency).toBe("AUD");
    expect(result.current.currencySymbol).toBe("A$");
    expect(result.current.isUserSelected).toBe(false);
  });

  it("item 6: a manual selection overrides the geo-detected currency", () => {
    const { result } = renderHook(() => useCurrencyPreference());
    act(() => result.current.setCurrency("GBP"));
    expect(result.current.currency).toBe("GBP");
    expect(result.current.currencySymbol).toBe("£");
    expect(result.current.isUserSelected).toBe(true);
  });

  it("item 7: the manual selection persists across a remount (simulated reload) and still overrides geo", () => {
    const { result, unmount } = renderHook(() => useCurrencyPreference());
    act(() => result.current.setCurrency("EUR"));
    unmount();

    // Fresh mount, same geo mock (still AUD) — a real reload would re-run
    // the geo lookup too, but the stored preference must win regardless.
    const { result: result2 } = renderHook(() => useCurrencyPreference());
    expect(result2.current.currency).toBe("EUR");
    expect(result2.current.isUserSelected).toBe(true);
  });

  it("geo detection never overwrites a deliberate selection on a geoData change", () => {
    const { result, rerender } = renderHook(() => useCurrencyPreference());
    act(() => result.current.setCurrency("GBP"));

    // Simulate the geo lookup resolving to a different currency after the
    // user already made a choice (e.g. a slow async geo response landing
    // late).
    mockUseGeoLocation.mockReturnValue({
      geoData: { currency: "JPY", currencySymbol: "¥" },
      loading: false,
      regionConfig: {},
    });
    rerender();

    expect(result.current.currency).toBe("GBP");
  });
});
