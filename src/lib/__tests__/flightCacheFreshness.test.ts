import { describe, it, expect } from "vitest";
import { formatFlightCacheAge, getFlightCacheFreshnessMessage } from "@/lib/flightCacheFreshness";

describe("formatFlightCacheAge", () => {
  it("under a minute reads 'moments ago'", () => {
    expect(formatFlightCacheAge(30)).toBe("moments ago");
  });
  it("formats minutes", () => {
    expect(formatFlightCacheAge(5 * 60)).toBe("5m ago");
  });
  it("formats hours", () => {
    expect(formatFlightCacheAge(3 * 3600)).toBe("3h ago");
  });
  it("formats days", () => {
    expect(formatFlightCacheAge(2 * 86400)).toBe("2d ago");
  });
});

describe("getFlightCacheFreshnessMessage", () => {
  it("'hit' reports BookingsFinder's own fetch age, not a provider observation age", () => {
    expect(getFlightCacheFreshnessMessage({ cacheStatus: "hit", ageSeconds: 7200 })).toBe("Recent-fare data refreshed 2h ago.");
  });

  it("'refreshed' also reports the fetch age", () => {
    expect(getFlightCacheFreshnessMessage({ cacheStatus: "refreshed", ageSeconds: 0 })).toBe("Recent-fare data refreshed moments ago.");
  });

  it("'stale' gives the explicit honest caveat, never claiming current/live", () => {
    const msg = getFlightCacheFreshnessMessage({ cacheStatus: "stale", ageSeconds: 50000 });
    expect(msg).toMatch(/unable to refresh/i);
    expect(msg).not.toMatch(/live|current|real-time/i);
  });

  it("'unavailable' returns null — caller shows its own distinct message", () => {
    expect(getFlightCacheFreshnessMessage({ cacheStatus: "unavailable" })).toBeNull();
  });

  it("no cacheStatus at all returns null", () => {
    expect(getFlightCacheFreshnessMessage({})).toBeNull();
  });
});
