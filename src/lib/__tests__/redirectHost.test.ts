import { describe, it, expect } from "vitest";
import { validateRedirectHost, getApprovedRedirectHosts } from "../travelConfig";

describe("getApprovedRedirectHosts", () => {
  it("includes standard Aviasales hosts", () => {
    const hosts = getApprovedRedirectHosts();
    expect(hosts).toContain("aviasales.com");
    expect(hosts).toContain("www.aviasales.com");
  });

  it("includes Hotellook hosts", () => {
    const hosts = getApprovedRedirectHosts();
    expect(hosts).toContain("hotellook.com");
    expect(hosts).toContain("search.hotellook.com");
  });

  it("does NOT include bookingsfinder.com (only exact White Label host)", () => {
    const hosts = getApprovedRedirectHosts();
    expect(hosts).not.toContain("bookingsfinder.com");
  });
});

describe("validateRedirectHost", () => {
  // ── Approved hosts ──

  it("accepts www.aviasales.com", () => {
    const r = validateRedirectHost("https://www.aviasales.com/search/SYD1");
    expect(r.valid).toBe(true);
    expect(r.hostname).toBe("www.aviasales.com");
  });

  it("accepts aviasales.com", () => {
    const r = validateRedirectHost("https://aviasales.com/search/SYD1");
    expect(r.valid).toBe(true);
  });

  it("accepts search.hotellook.com", () => {
    const r = validateRedirectHost("https://search.hotellook.com/hotels?destination=Bali");
    expect(r.valid).toBe(true);
    expect(r.hostname).toBe("search.hotellook.com");
  });

  // ── Userinfo lookalike rejection ──

  it("rejects https://flights.bookingsfinder.com@evil.example", () => {
    // URL constructor interprets "flights.bookingsfinder.com" as username,
    // "evil.example" as hostname. Userinfo = lookalike vector.
    const r = validateRedirectHost("https://flights.bookingsfinder.com@evil.example/search");
    expect(r.valid).toBe(false);
    expect(r.reason).toContain("credentials");
  });

  it("rejects https://evil.example@flights.bookingsfinder.com", () => {
    const r = validateRedirectHost("https://evil.example@flights.bookingsfinder.com/search");
    expect(r.valid).toBe(false);
    expect(r.reason).toContain("credentials");
  });

  // ── Lookalike host rejection ──

  it("rejects flights.bookingsfinder.com.evil.example", () => {
    const r = validateRedirectHost("https://flights.bookingsfinder.com.evil.example/search");
    expect(r.valid).toBe(false);
    expect(r.hostname).toBe("flights.bookingsfinder.com.evil.example");
  });

  it("rejects bookingsfinder.com.evil.example", () => {
    const r = validateRedirectHost("https://bookingsfinder.com.evil.example/");
    expect(r.valid).toBe(false);
  });

  it("rejects evilflights.bookingsfinder.com (sibling subdomain)", () => {
    // White Label host is not set in test env, and even if it were,
    // only the exact hostname is approved — no root domain or sibling matching
    const r = validateRedirectHost("https://evilflights.bookingsfinder.com/");
    expect(r.valid).toBe(false);
  });

  it("rejects staging.bookingsfinder.com (sibling subdomain)", () => {
    const r = validateRedirectHost("https://staging.bookingsfinder.com/");
    expect(r.valid).toBe(false);
  });

  it("rejects arbitrary external domain", () => {
    const r = validateRedirectHost("https://evil-site.com/search");
    expect(r.valid).toBe(false);
    expect(r.reason).toContain("not an approved");
  });

  // ── Protocol attacks ──

  it("rejects javascript: pseudo-URL", () => {
    const r = validateRedirectHost("javascript:alert(1)");
    expect(r.valid).toBe(false);
    expect(r.reason).toBe("Invalid URL");
  });

  it("rejects data: URL", () => {
    const r = validateRedirectHost("data:text/html,<script>alert(1)</script>");
    expect(r.valid).toBe(false);
    expect(r.reason).toBe("Invalid URL");
  });

  it("rejects file: URL", () => {
    const r = validateRedirectHost("file:///etc/passwd");
    expect(r.valid).toBe(false);
    expect(r.reason).toBe("Invalid URL");
  });

  it("rejects empty string", () => {
    const r = validateRedirectHost("");
    expect(r.valid).toBe(false);
  });

  it("rejects http: non-localhost URL", () => {
    const r = validateRedirectHost("http://www.aviasales.com/search");
    expect(r.valid).toBe(false);
    expect(r.reason).toContain("HTTPS");
  });

  // ── Dot-boundary security ──

  it("accepts legitimate Aviasales subdomain", () => {
    const r = validateRedirectHost("https://search.aviasales.com/results");
    expect(r.valid).toBe(true);
  });

  it("rejects aviasales.com.evil.com (dot-boundary check)", () => {
    const r = validateRedirectHost("https://aviasales.com.evil.com/search");
    expect(r.valid).toBe(false);
  });

  it("accepts legitimate Hotellook subdomain", () => {
    const r = validateRedirectHost("https://api.hotellook.com/data");
    expect(r.valid).toBe(true);
  });

  it("rejects hotellook.com.evil.com", () => {
    const r = validateRedirectHost("https://hotellook.com.evil.com/search");
    expect(r.valid).toBe(false);
  });

  // ── Port safety ──

  it("hostname comparison is port-independent", () => {
    const r = validateRedirectHost("https://www.aviasales.com:443/search");
    expect(r.valid).toBe(true);
    expect(r.hostname).toBe("www.aviasales.com");
  });

  // ── White Label exact-match rule ──

  it("rejects root domain of White Label host when White Label is not configured", () => {
    // In test env, White Label host is null — bookingsfinder.com is NOT approved
    const r = validateRedirectHost("https://bookingsfinder.com/");
    expect(r.valid).toBe(false);
  });

  it("rejects sibling subdomain of White Label", () => {
    const r = validateRedirectHost("https://www.bookingsfinder.com/");
    expect(r.valid).toBe(false);
  });
});
