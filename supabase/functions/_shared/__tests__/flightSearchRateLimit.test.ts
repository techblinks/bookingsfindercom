/**
 * BF-FLIGHTS-CACHE-1 — in-memory cost/abuse guard for search-flights.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  getClientKey,
  checkRateLimit,
  checkIdenticalRequest,
  acquireConcurrencySlot,
  releaseConcurrencySlot,
  RateLimitError,
  __resetFlightSearchRateLimitForTests,
} from "../flightSearchRateLimit.ts";

beforeEach(() => {
  __resetFlightSearchRateLimitForTests();
});

describe("getClientKey", () => {
  it("reads the first IP from x-forwarded-for", () => {
    const req = new Request("https://example.com", { headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" } });
    expect(getClientKey(req)).toBe("1.2.3.4");
  });

  it("falls back to a shared bucket when the header is absent (never an unlimited bypass)", () => {
    const req = new Request("https://example.com");
    expect(getClientKey(req)).toBe("unknown");
  });
});

describe("checkRateLimit", () => {
  it("allows requests under the per-window limit", () => {
    for (let i = 0; i < 6; i++) {
      expect(() => checkRateLimit("client-a")).not.toThrow();
    }
  });

  it("rejects a repeated-request storm from the same client once the limit is exceeded", () => {
    for (let i = 0; i < 6; i++) checkRateLimit("client-b");
    expect(() => checkRateLimit("client-b")).toThrow(RateLimitError);
  });

  it("tracks separate clients independently", () => {
    for (let i = 0; i < 6; i++) checkRateLimit("client-c");
    expect(() => checkRateLimit("client-d")).not.toThrow();
  });
});

describe("checkIdenticalRequest", () => {
  it("allows the first occurrence of a fingerprint", () => {
    expect(() => checkIdenticalRequest("client-e", "SYD-MEL-2099-01-10")).not.toThrow();
  });

  it("rejects an immediate identical re-request from the same client", () => {
    checkIdenticalRequest("client-f", "SYD-MEL-2099-01-10");
    expect(() => checkIdenticalRequest("client-f", "SYD-MEL-2099-01-10")).toThrow(RateLimitError);
  });

  it("does not block a different fingerprint from the same client", () => {
    checkIdenticalRequest("client-g", "SYD-MEL-2099-01-10");
    expect(() => checkIdenticalRequest("client-g", "SYD-BNE-2099-01-10")).not.toThrow();
  });
});

describe("acquireConcurrencySlot / releaseConcurrencySlot", () => {
  it("rejects once the concurrency cap is reached, and recovers after release", () => {
    const acquired: number[] = [];
    try {
      for (let i = 0; i < 20; i++) {
        acquireConcurrencySlot();
        acquired.push(i);
      }
      expect(() => acquireConcurrencySlot()).toThrow(RateLimitError);
    } finally {
      acquired.forEach(() => releaseConcurrencySlot());
    }

    expect(() => acquireConcurrencySlot()).not.toThrow();
    releaseConcurrencySlot();
  });
});
