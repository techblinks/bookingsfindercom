/**
 * viator-client.ts
 * Server-side Viator API client for Deno Edge Functions.
 *
 * --- Security rules ---
 * - NEVER log API key or Authorization headers.
 * - Only hostname api.sandbox.viator.com is allowed.
 * - No booking endpoints (GET only).
 * - Safe JSON parsing with typed errors.
 * - No automatic retries.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_BASE_URL = "https://api.sandbox.viator.com/partner";
const ALLOWED_HOSTNAME = "api.sandbox.viator.com";
const DEFAULT_TIMEOUT_MS = 15_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a validated base URL from the env var, falling back to the sandbox default. */
function buildBaseUrl(): URL {
  const raw =
    Deno.env.get("VIATOR_API_BASE_URL")?.trim() || DEFAULT_BASE_URL;

  const url = new URL(raw);

  if (url.hostname !== ALLOWED_HOSTNAME) {
    throw new Error(
      `[viator-client] Disallowed hostname "${url.hostname}". Only "${ALLOWED_HOSTNAME}" is permitted.`,
    );
  }

  // Enforce https
  url.protocol = "https:";

  return url;
}

/**
 * Parse JSON safely—never throws.
 * Returns [data, null] on success or [null, error] on failure.
 */
function safeParseJson(text: string): [unknown, null] | [null, Error] {
  try {
    return [JSON.parse(text), null];
  } catch (e) {
    return [null, e instanceof Error ? e : new Error(String(e))];
  }
}

// ---------------------------------------------------------------------------
// Error mapping
// ---------------------------------------------------------------------------

type ViatorErrorCode =
  | "validation" // 400
  | "auth_failure" // 401
  | "access_denied" // 403
  | "not_found" // 404
  | "rate_limit" // 429
  | "upstream" // 500
  | "unavailable" // 503
  | "timeout"
  | "parse"
  | "unknown";

interface ViatorErrorMeta {
  code: ViatorErrorCode;
  status: number | null;
  trackingId: string | null;
  message: string;
}

class ViatorError extends Error {
  readonly code: ViatorErrorCode;
  readonly status: number | null;
  readonly trackingId: string | null;

  constructor(meta: ViatorErrorMeta) {
    super(meta.message);
    this.name = "ViatorError";
    this.code = meta.code;
    this.status = meta.status;
    this.trackingId = meta.trackingId;
  }
}

function mapHttpStatus(status: number): ViatorErrorCode {
  switch (status) {
    case 400:
      return "validation";
    case 401:
      return "auth_failure";
    case 403:
      return "access_denied";
    case 404:
      return "not_found";
    case 429:
      return "rate_limit";
    case 500:
      return "upstream";
    case 503:
      return "unavailable";
    default:
      return "unknown";
  }
}

// ---------------------------------------------------------------------------
// Safe response metadata extraction
// ---------------------------------------------------------------------------

interface ResponseMeta {
  status: number;
  trackingId: string | null;
  rateLimitLimit: string | null;
  rateLimitRemaining: string | null;
  rateLimitReset: string | null;
}

function extractMeta(res: Response, headers: Headers): ResponseMeta {
  return {
    status: res.status,
    trackingId: headers.get("X-Unique-ID") ?? null,
    rateLimitLimit: headers.get("RateLimit-Limit") ?? null,
    rateLimitRemaining: headers.get("RateLimit-Remaining") ?? null,
    rateLimitReset: headers.get("RateLimit-Reset") ?? null,
  };
}

// ---------------------------------------------------------------------------
// Core request helper
// ---------------------------------------------------------------------------

export interface ViatorResponse<T> {
  data: T;
  status: number;
  trackingId: string | null;
  rateLimitRemaining: number | null;
  responseTimeMs: number;
}

/**
 * Make an authenticated GET request to the Viator Partner API.
 *
 * Safety guarantees:
 * - Only GET requests (no booking endpoints).
 * - Only the sandbox hostname is ever contacted.
 * - API key is NEVER included in logs, errors, or returned values.
 * - 15 s timeout by default (configurable).
 * - Safe JSON parsing—returns typed parse errors rather than crashing.
 */
export async function viatorRequest<T>(
  endpoint: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<ViatorResponse<T>> {
  const apiKey = Deno.env.get("VIATOR_API_KEY");
  if (!apiKey) {
    throw new ViatorError({
      code: "auth_failure",
      status: null,
      trackingId: null,
      message: "[viator-client] VIATOR_API_KEY environment variable is not set.",
    });
  }

  const baseUrl = buildBaseUrl();

  // Ensure endpoint starts with "/"
  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  // Build full URL preserving base path (e.g. /partner) from env var
const url = new URL(`${baseUrl.href.replace(/\/$/, "")}${normalizedEndpoint}`);

  // Enforce GET-only
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const startedAt = performance.now();

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "exp-api-key": apiKey,
        Accept: "application/json;version=2.0",
        "Accept-Language": "en-AU",
      },
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    const elapsed = Math.round(performance.now() - startedAt);

    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ViatorError({
        code: "timeout",
        status: null,
        trackingId: null,
        message: `[viator-client] Request to ${endpoint} timed out after ${timeoutMs} ms.`,
      });
    }

    // Network / other errors — mask the error to avoid leaking details
    throw new ViatorError({
      code: "unknown",
      status: null,
      trackingId: null,
      message: `[viator-client] Network error calling ${endpoint} (elapsed ${elapsed} ms).`,
    });
  }

  clearTimeout(timer);
  const elapsed = Math.round(performance.now() - startedAt);

  const meta = extractMeta(res, res.headers);

  const bodyText = await res.text();

  // Parse JSON safely
  const [parsed, parseErr] = safeParseJson(bodyText);

  if (parseErr) {
    throw new ViatorError({
      code: "parse",
      status: meta.status,
      trackingId: meta.trackingId,
      message: `[viator-client] Failed to parse JSON response from ${endpoint} (status ${meta.status}).`,
    });
  }

  // Success (2xx)
  if (res.ok) {
    const rateLimitRemaining = meta.rateLimitRemaining
      ? parseInt(meta.rateLimitRemaining, 10)
      : null;

    return {
      data: parsed as T,
      status: meta.status,
      trackingId: meta.trackingId,
      rateLimitRemaining,
      responseTimeMs: elapsed,
    };
  }

  // Non-2xx — map to typed ViatorError
  const code = mapHttpStatus(meta.status);
  throw new ViatorError({
    code,
    status: meta.status,
    trackingId: meta.trackingId,
    message: `[viator-client] Viator API returned ${meta.status} for ${endpoint}.`,
  });
}

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

export interface ViatorHealthCheckResult {
  connected: boolean;
  upstreamStatus: number | null;
  responseTimeMs: number;
  resultCount: number | null;
  sampleProductCode: string | null;
  trackingId: string | null;
  rateLimitRemaining: number | null;
}

/**
 * Perform a lightweight health check against the Viator Partner API.
 *
 * Calls GET /products/search?count=1 (lightweight search proving auth works).
 *
 * NEVER returns:
 *  - API key
 *  - Raw response body
 *  - Raw headers
 *  - Pricing data
 *  - Supplier data
 *  - Booking fields
 */
export async function viatorHealthCheck(): Promise<ViatorHealthCheckResult> {
  try {
    const result = await viatorRequest<Record<string, unknown>>("/products/5010SYDNEY");

    // Safely extract only the fields we are allowed to expose
    const body = result.data as Record<string, unknown>;

    const productCodeReturned: string | null =
      typeof body?.productCode === "string" ? body.productCode : null;

    const productStatus: string | null =
      typeof body?.status === "string" ? body.status : null;

    return {
      connected: true,
      upstreamStatus: result.status,
      responseTimeMs: result.responseTimeMs,
      productCodeReturned,
      productStatus,
      trackingId: result.trackingId,
      rateLimitRemaining: result.rateLimitRemaining,
    };
  } catch (err) {
    if (err instanceof ViatorError) {
      return {
        connected: false,
        upstreamStatus: err.status,
        responseTimeMs: 0,
        productCodeReturned: null,
        productStatus: null,
        trackingId: err.trackingId,
        rateLimitRemaining: null,
      };
    }

    // Defensive — should not happen
    return {
      connected: false,
      upstreamStatus: null,
      responseTimeMs: 0,
      productCodeReturned: null,
      productStatus: null,
      trackingId: null,
      rateLimitRemaining: null,
    };
  }
}
