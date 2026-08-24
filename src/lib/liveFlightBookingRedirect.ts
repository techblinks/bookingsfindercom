/**
 * BF-FLIGHTS-LIVE-4 Round 2 Phase 2/3/4 — corrected booking-option handoff
 * security model.
 *
 * ROUND 1 CORRECTION: Round 1 assumed booking_request.url could be an
 * arbitrary airline/OTA domain and validated it with a blanket
 * "any HTTPS host" policy. Re-checked against SerpApi's actual documented
 * Google Flights Booking Options contract (serpapi.com/google-flights-booking-options):
 * every documented booking_request example — including every one that
 * carries post_data — points at Google's OWN click-tracking/resolver
 * endpoint, consistently `https://www.google.com/travel/clk/f...`, not
 * directly at the airline/OTA. post_data is an opaque, already-encoded
 * string (e.g. `"u=EqIrCh..."`) that the docs describe as needing to be
 * sent to that resolver AS-IS — not decoded, not re-parsed into fields,
 * not re-encoded.
 *
 * That AS-IS requirement is exactly why Round 1's hidden-<form> approach
 * was wrong: `new URLSearchParams(postData)` percent-DEcodes the value,
 * and rebuilding a form and letting the browser re-serialize it on submit
 * percent-RE-encodes it — not guaranteed byte-identical to the original
 * string, and a base64-ish blob containing `+`/`/`/`=` is exactly the kind
 * of payload that round-trip can silently corrupt (a literal `+` is
 * decoded to a space by URLSearchParams, "=" mid-string can be
 * mis-interpreted as a key/value separator). A browser <form> has no way
 * to submit an exact raw string as the POST body — it can only submit
 * named fields it re-serializes itself.
 *
 * The only way to guarantee AS-IS transmission is a server-side hop that
 * POSTs the raw string as the request body verbatim, but Google's
 * click-tracking endpoint is almost certainly bound to the same
 * browser/session context that ran the original Google Flights search —
 * there is no verified fixture here (no SERPAPI_API_KEY in this
 * environment) showing what it actually returns when hit from a bare
 * server-to-server POST with no session/cookies. Building that resolver
 * on an unverified assumption would risk silently mis-handling (or
 * outright losing) a real booking action — worse than not offering the
 * button. So: POST booking requests FAIL CLOSED in this round (see
 * BookingOptionsDialog.tsx) — see the Round 2 report for the follow-up
 * (a real server-side resolver, built once actual API access exists to
 * verify Google's redirect behavior).
 *
 * GET requests (no post_data — a genuine direct deeplink, which by
 * definition CAN be an arbitrary airline/OTA site) are still supported,
 * validated by the narrow generic-safety contract below (no documented
 * host/path shape exists for this case, unlike the POST resolver case).
 */

const DANGEROUS_PROTOCOLS = new Set(["javascript:", "data:", "file:", "vbscript:"]);

/** The one documented shape for a Google Travel booking-resolver URL (used when post_data is present). Enumerate only verified shapes — do not widen to "any google.com path". */
const GOOGLE_BOOKING_RESOLVER_HOST = "www.google.com";
const GOOGLE_BOOKING_RESOLVER_PATH_PREFIX = "/travel/clk/";

function hasNoCredentialsOrCustomPort(parsed: URL): boolean {
  if (parsed.username || parsed.password) return false;
  // "" means the default port for the scheme (443 for https) — no explicit port in the URL.
  if (parsed.port !== "") return false;
  return true;
}

function parseHttpsUrl(rawUrl: string | null | undefined): URL | null {
  if (!rawUrl) return null;
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }
  if (DANGEROUS_PROTOCOLS.has(parsed.protocol)) return null;
  if (parsed.protocol !== "https:") return null;
  return parsed;
}

/**
 * Validates a booking_request.url against the ONE documented Google
 * booking-resolver shape. This is used only to classify/log what we
 * received — a match here does NOT make the POST flow available (see
 * module doc); it exists so a genuinely unrecognized resolver URL and a
 * recognized-but-deferred one can be told apart if this needs revisiting.
 */
export function isDocumentedGoogleBookingResolverUrl(rawUrl: string | null | undefined): boolean {
  const parsed = parseHttpsUrl(rawUrl);
  if (!parsed) return false;
  if (!hasNoCredentialsOrCustomPort(parsed)) return false;
  if (parsed.hostname !== GOOGLE_BOOKING_RESOLVER_HOST) return false;
  return parsed.pathname.startsWith(GOOGLE_BOOKING_RESOLVER_PATH_PREFIX);
}

/**
 * Validates a direct GET deeplink (no post_data). No documented host/path
 * shape exists for this case — by nature it can point at any airline/OTA
 * SerpApi's search surfaced — so this applies the narrowest contract that
 * IS documented/verifiable: HTTPS only, no embedded credentials, no
 * non-default port, no dangerous protocol.
 */
export function isValidDirectDeeplinkUrl(rawUrl: string | null | undefined): boolean {
  const parsed = parseHttpsUrl(rawUrl);
  if (!parsed) return false;
  return hasNoCredentialsOrCustomPort(parsed);
}

export type LiveFlightBookingHandoffDecision =
  | { kind: "get"; url: string }
  | { kind: "post_unavailable" }
  | { kind: "invalid" };

/**
 * The single place that decides whether a booking_request can be safely
 * completed in this round. Fails closed on anything not explicitly
 * verified — see module doc.
 */
export function classifyBookingHandoff(bookingRequest: { url: string | null; postData: string | null } | null): LiveFlightBookingHandoffDecision {
  if (!bookingRequest || !bookingRequest.url) return { kind: "invalid" };

  if (bookingRequest.postData) {
    // Resolver POST flow — deferred this round regardless of whether the
    // url matches the documented resolver shape (see module doc).
    return { kind: "post_unavailable" };
  }

  if (!isValidDirectDeeplinkUrl(bookingRequest.url)) return { kind: "invalid" };
  return { kind: "get", url: bookingRequest.url };
}

/**
 * Navigates to a validated GET deeplink. Caller (LiveFlightBookingRedirect.tsx)
 * is responsible for having already classified the handoff as `{kind:"get"}`
 * and for requiring an explicit traveller click before calling this — no
 * automatic background navigation.
 */
export function navigateToLiveFlightBookingDeeplink(url: string): void {
  window.location.assign(url);
}
