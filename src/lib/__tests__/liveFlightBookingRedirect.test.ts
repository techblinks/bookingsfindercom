/**
 * BF-FLIGHTS-LIVE-4 Round 2 Phase 2/3/4/5/W — corrected booking-request
 * security model: narrow, fail-closed validation; POST resolver flow
 * deferred; GET direct deeplinks still work behind explicit consent.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  isDocumentedGoogleBookingResolverUrl,
  isValidDirectDeeplinkUrl,
  classifyBookingHandoff,
  navigateToLiveFlightBookingDeeplink,
} from "@/lib/liveFlightBookingRedirect";

describe("isDocumentedGoogleBookingResolverUrl — narrow, enumerated shape only", () => {
  it("accepts the one documented resolver shape", () => {
    expect(isDocumentedGoogleBookingResolverUrl("https://www.google.com/travel/clk/f?param=1")).toBe(true);
  });

  it("rejects HTTP (not HTTPS)", () => {
    expect(isDocumentedGoogleBookingResolverUrl("http://www.google.com/travel/clk/f")).toBe(false);
  });

  it("rejects credentials embedded in the URL", () => {
    expect(isDocumentedGoogleBookingResolverUrl("https://user:pass@www.google.com/travel/clk/f")).toBe(false);
  });

  it("rejects a non-default port", () => {
    expect(isDocumentedGoogleBookingResolverUrl("https://www.google.com:8443/travel/clk/f")).toBe(false);
  });

  it("rejects an unrelated HTTPS host entirely (never 'any HTTPS host')", () => {
    expect(isDocumentedGoogleBookingResolverUrl("https://qantas.com/book")).toBe(false);
  });

  it("rejects an unrelated google.com path — does not blindly allow all google.com paths", () => {
    expect(isDocumentedGoogleBookingResolverUrl("https://www.google.com/search?q=flights")).toBe(false);
  });

  it("rejects a google.com subdomain lookalike host", () => {
    expect(isDocumentedGoogleBookingResolverUrl("https://www.google.com.evil.example/travel/clk/f")).toBe(false);
  });
});

describe("isValidDirectDeeplinkUrl — narrowest documented contract for a GET-only deeplink", () => {
  it("accepts a well-formed https URL to any host (a GET deeplink can legitimately be any airline/OTA)", () => {
    expect(isValidDirectDeeplinkUrl("https://qantas.com/book")).toBe(true);
  });

  it("rejects HTTP", () => {
    expect(isValidDirectDeeplinkUrl("http://qantas.com/book")).toBe(false);
  });

  it("rejects credentials in the URL", () => {
    expect(isValidDirectDeeplinkUrl("https://user:pass@evil.example/book")).toBe(false);
  });

  it("rejects a non-default port", () => {
    expect(isValidDirectDeeplinkUrl("https://qantas.com:8443/book")).toBe(false);
  });

  it.each(["javascript:alert(1)", "data:text/html,<script>alert(1)</script>", "file:///etc/passwd", "vbscript:msgbox(1)"])(
    "rejects dangerous protocol %s",
    (url) => {
      expect(isValidDirectDeeplinkUrl(url)).toBe(false);
    },
  );

  it("rejects null/undefined/empty/unparsable", () => {
    expect(isValidDirectDeeplinkUrl(null)).toBe(false);
    expect(isValidDirectDeeplinkUrl(undefined)).toBe(false);
    expect(isValidDirectDeeplinkUrl("")).toBe(false);
    expect(isValidDirectDeeplinkUrl("not a url")).toBe(false);
  });
});

describe("classifyBookingHandoff — the single fail-closed decision point", () => {
  it("classifies a postData-absent, valid HTTPS url as a completable GET", () => {
    const decision = classifyBookingHandoff({ url: "https://qantas.com/book", postData: null });
    expect(decision).toEqual({ kind: "get", url: "https://qantas.com/book" });
  });

  it("fails closed (post_unavailable) whenever postData is present, even for the documented Google resolver shape", () => {
    const decision = classifyBookingHandoff({ url: "https://www.google.com/travel/clk/f", postData: "u=abc123" });
    expect(decision).toEqual({ kind: "post_unavailable" });
  });

  it("fails closed (post_unavailable) for postData present with an unrecognized url too — never attempts a POST", () => {
    const decision = classifyBookingHandoff({ url: "https://unknown.example/book", postData: "u=abc123" });
    expect(decision).toEqual({ kind: "post_unavailable" });
  });

  it("fails closed (invalid) when the url itself is unsafe and postData is absent", () => {
    const decision = classifyBookingHandoff({ url: "http://qantas.com/book", postData: null });
    expect(decision).toEqual({ kind: "invalid" });
  });

  it("fails closed (invalid) when bookingRequest is null or has no url", () => {
    expect(classifyBookingHandoff(null)).toEqual({ kind: "invalid" });
    expect(classifyBookingHandoff({ url: null, postData: null })).toEqual({ kind: "invalid" });
  });

  it("never decodes, parses, or transforms postData — it is only ever inspected for presence", () => {
    const weirdPostData = "u=EqIr+Ch/RF==weird&chars";
    const decision = classifyBookingHandoff({ url: "https://www.google.com/travel/clk/f", postData: weirdPostData });
    // The only correct outcome is fail-closed — there is no code path here
    // that touches postData's content at all.
    expect(decision).toEqual({ kind: "post_unavailable" });
  });
});

describe("navigateToLiveFlightBookingDeeplink — explicit-click-only navigation, no open redirect", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("navigates via window.location.assign to exactly the given URL", () => {
    const assignSpy = vi.fn();
    Object.defineProperty(window, "location", { value: { assign: assignSpy }, writable: true });

    navigateToLiveFlightBookingDeeplink("https://qantas.com/book");
    expect(assignSpy).toHaveBeenCalledWith("https://qantas.com/book");
    expect(assignSpy).toHaveBeenCalledTimes(1);
  });
});
