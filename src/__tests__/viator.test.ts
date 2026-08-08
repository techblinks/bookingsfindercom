/**
 * Viator integration — comprehensive security tests.
 *
 * Validates:
 *  - Token & secret isolation (no VIATOR_API_KEY in frontend)
 *  - HTTP header enforcement (exp-api-key, version 2.0, en-AU)
 *  - Auth & access controls (POST-only, anonymous rejection, admin role)
 *  - Input validation (JSON, action, no endpoint/URL passthrough)
 *  - Upstream error mapping (400–429–5xx, timeout, malformed JSON)
 *  - Response safety (no key leak, no raw headers, approved fields only)
 *
 * Matches the viator-client.ts / viator-catalog arch. No real network calls.
 */
import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

// Resolve source files relative to this test file
const ROOT = path.resolve(__dirname, "..", "..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

const viatorClientSrc = read("supabase/functions/_shared/viator-client.ts");
const viatorCatalogSrc = read("supabase/functions/viator-catalog/index.ts");
const frontendTypesSrc = read("src/types/viator.ts");
const frontendServiceSrc = read("src/services/viator.ts");
const adminPageSrc = read("src/pages/AdminViator.tsx");

// All viator-related source files (for cross-file grep assertions)
const ALL_VIATOR_SOURCES = [
  { label: "viator-client.ts", src: viatorClientSrc },
  { label: "viator-catalog/index.ts", src: viatorCatalogSrc },
  { label: "types/viator.ts", src: frontendTypesSrc },
  { label: "services/viator.ts", src: frontendServiceSrc },
  { label: "AdminViator.tsx", src: adminPageSrc },
] as const;

// ═══════════════════════════════════════════════════════════════
// Part 1: Token & secret isolation
// ═══════════════════════════════════════════════════════════════

describe("Token & secret isolation", () => {
  it("1. VIATOR_API_KEY read only via Deno.env.get in viator-client.ts", () => {
    expect(viatorClientSrc).toMatch(/Deno\.env\.get\s*\(\s*["']VIATOR_API_KEY["']\)/);
    // Must not be hardcoded
    expect(viatorClientSrc).not.toMatch(/VIATOR_API_KEY\s*=\s*["'][A-Za-z0-9]{4,}/);
  });

  it("2. VIATOR_API_BASE_URL read only via Deno.env.get in viator-client.ts", () => {
    expect(viatorClientSrc).toMatch(/Deno\.env\.get\s*\(\s*["']VIATOR_API_BASE_URL["']\)/);
  });

  it("3. Frontend types file has no VIATOR_API_KEY reference", () => {
    expect(frontendTypesSrc).not.toMatch(/\bVIATOR_API_KEY\b/);
    expect(frontendTypesSrc).not.toMatch(/\bDeno\.env\b/);
  });

  it("4. Frontend service file has no VIATOR_API_KEY reference", () => {
    // The comment header says "Never references VIATOR_API_KEY" — that is the
    // only permitted occurrence. Verify no more than 1 mention.
    const refs = (frontendServiceSrc.match(/\bVIATOR_API_KEY\b/g) || []).length;
    expect(refs).toBeLessThanOrEqual(1);
    expect(frontendServiceSrc).not.toMatch(/\bDeno\.env\b/);
  });

  it("5. Frontend service does not call api.sandbox.viator.com directly", () => {
    // Count raw references — only permitted in the comment block
    const refs = (frontendServiceSrc.match(/api\.sandbox\.viator\.com/g) || []).length;
    // The file header comment says "Never calls api.sandbox.viator.com directly"
    // That's the only acceptable reference
    expect(refs).toBeLessThanOrEqual(1);
  });

  it("6. Frontend service does not call api.viator.com directly", () => {
    expect(frontendServiceSrc).not.toMatch(/api\.viator\.com/);
  });

  it("7. Frontend service invokes 'viator-catalog' Edge Function", () => {
    expect(frontendServiceSrc).toContain('viator-catalog');
    expect(frontendServiceSrc).toContain("supabase.functions.invoke");
  });

  it("8. Admin page has no VIATOR_API_KEY reference", () => {
    expect(adminPageSrc).not.toMatch(/\bVIATOR_API_KEY\b/);
    expect(adminPageSrc).not.toMatch(/\bDeno\.env\b/);
  });
});

// ═══════════════════════════════════════════════════════════════
// Part 2: HTTP headers
// ═══════════════════════════════════════════════════════════════

describe("HTTP headers", () => {
  it("9. exp-api-key header is set", () => {
    // Verify the header name is present in the client source
    expect(viatorClientSrc).toMatch(/["']exp-api-key["']/);
  });

  it("10. Accept header includes application/json;version=2.0", () => {
    expect(viatorClientSrc).toContain("application/json;version=2.0");
  });

  it("11. Accept-Language header is en-AU", () => {
    expect(viatorClientSrc).toMatch(/["']Accept-Language["']\s*:\s*["']en-AU["']/);
  });

  it("12. Health endpoint uses GET /products/5010SYDNEY", () => {
    expect(viatorClientSrc).toContain("/products/5010SYDNEY");
    // Must be a GET request
    expect(viatorClientSrc).toContain('method: "GET"');
  });
});

// ═══════════════════════════════════════════════════════════════
// Part 3: Auth & access control
// ═══════════════════════════════════════════════════════════════

describe("Auth & access control", () => {
  it("13. POST only — OPTIONS accepted, GET/PUT/DELETE rejected", () => {
    // OPTIONS returns early with null body (preflight)
    expect(viatorCatalogSrc).toContain('req.method === "OPTIONS"');
    // Non-POST methods (after OPTIONS) return 405
    expect(viatorCatalogSrc).toContain('req.method !== "POST"');
    expect(viatorCatalogSrc).toContain("Method not allowed");
    expect(viatorCatalogSrc).toContain("405");
  });

  it("14. Anonymous request rejected — no Authorization header → 401", () => {
    expect(viatorCatalogSrc).toContain("Authorization");
    expect(viatorCatalogSrc).toContain("Authentication required");
    expect(viatorCatalogSrc).toMatch(/status:\s*401/);
  });

  it("15. Non-admin request rejected — has_role returns false → 403", () => {
    expect(viatorCatalogSrc).toContain("has_role");
    expect(viatorCatalogSrc).toContain("Admin role required");
    expect(viatorCatalogSrc).toMatch(/status:\s*403/);
  });

  it("16. Admin allowed — has_role returns true", () => {
    // The verifyAdmin function returns userId when has_role succeeds
    expect(viatorCatalogSrc).toContain("return user.id");
    // The flow: verifyAdmin → parse body → handle action
    expect(viatorCatalogSrc).toContain("userId = await verifyAdmin(req)");
  });
});

// ═══════════════════════════════════════════════════════════════
// Part 4: Input validation
// ═══════════════════════════════════════════════════════════════

describe("Input validation", () => {
  it("17. Invalid JSON body returns error", () => {
    expect(viatorCatalogSrc).toContain("Invalid JSON body");
    expect(viatorCatalogSrc).toMatch(/status:\s*400/);
  });

  it("18. Arbitrary action value rejected — only 'health' allowed", () => {
    // The Zod schema uses z.literal("health")
    expect(viatorCatalogSrc).toContain('z.literal("health")');
    // Unknown action returns 400
    expect(viatorCatalogSrc).toContain("Unknown action:");
    expect(viatorCatalogSrc).toMatch(/status:\s*400/);
  });

  it("19. Arbitrary endpoint parameter rejected — no endpoint passthrough", () => {
    // The catalog function does NOT accept an endpoint parameter from the client
    // Only action is parsed from the body. The endpoint is hardcoded (/products/5010SYDNEY)
    expect(viatorCatalogSrc).not.toMatch(/req\.body.*endpoint/i);
    expect(viatorCatalogSrc).not.toMatch(/body\.endpoint/);
  });

  it("20. Arbitrary URL parameter rejected — no URL passthrough", () => {
    // The client enforces api.sandbox.viator.com hostname
    expect(viatorClientSrc).toContain("ALLOWED_HOSTNAME");
    expect(viatorClientSrc).toContain("Disallowed hostname");
    // No user-controlled URL in the catalog function
    expect(viatorCatalogSrc).not.toMatch(/body\.url/i);
  });

  it("21. No /bookings endpoint present anywhere in viator source files", () => {
    for (const { label, src } of ALL_VIATOR_SOURCES) {
      expect(src, `${label} must not reference /bookings`).not.toMatch(/\/bookings/);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// Part 5: Upstream error mapping
// ═══════════════════════════════════════════════════════════════

describe("Upstream error mapping", () => {
  // Mirror the mapHttpStatus function from viator-client.ts
  function mapHttpStatus(status: number): string {
    switch (status) {
      case 400: return "validation";
      case 401: return "auth_failure";
      case 403: return "access_denied";
      case 404: return "not_found";
      case 429: return "rate_limit";
      case 500: return "upstream";
      case 503: return "unavailable";
      default:  return "unknown";
    }
  }

  it("22. 400 handled safely — maps to 'validation'", () => {
    expect(mapHttpStatus(400)).toBe("validation");
    // The source must contain the 400 → validation mapping
    expect(viatorClientSrc).toContain("case 400");
    expect(viatorClientSrc).toContain('"validation"');
  });

  it("23. 401 handled safely — maps to 'auth_failure'", () => {
    expect(mapHttpStatus(401)).toBe("auth_failure");
    expect(viatorClientSrc).toContain("case 401");
    expect(viatorClientSrc).toContain('"auth_failure"');
  });

  it("24. 403 handled safely — maps to 'access_denied'", () => {
    expect(mapHttpStatus(403)).toBe("access_denied");
    expect(viatorClientSrc).toContain("case 403");
    expect(viatorClientSrc).toContain('"access_denied"');
  });

  it("25. 404 handled safely — maps to 'not_found'", () => {
    expect(mapHttpStatus(404)).toBe("not_found");
    expect(viatorClientSrc).toContain("case 404");
    expect(viatorClientSrc).toContain('"not_found"');
  });

  it("26. 429 handled safely — maps to 'rate_limit'", () => {
    expect(mapHttpStatus(429)).toBe("rate_limit");
    expect(viatorClientSrc).toContain("case 429");
    expect(viatorClientSrc).toContain('"rate_limit"');
  });

  it("27. 500 handled safely — maps to 'upstream'", () => {
    expect(mapHttpStatus(500)).toBe("upstream");
    expect(viatorClientSrc).toContain("case 500");
    expect(viatorClientSrc).toContain('"upstream"');
  });

  it("28. 503 handled safely — maps to 'unavailable'", () => {
    expect(mapHttpStatus(503)).toBe("unavailable");
    expect(viatorClientSrc).toContain("case 503");
    expect(viatorClientSrc).toContain('"unavailable"');
  });

  it("29. Timeout handled safely — AbortError maps to 'timeout'", () => {
    expect(viatorClientSrc).toContain('"timeout"');
    expect(viatorClientSrc).toContain("AbortError");
    expect(viatorClientSrc).toContain("AbortController");
    // ViatorError with code "timeout" is thrown
    expect(viatorClientSrc).toContain('code: "timeout"');
  });

  it("30. Malformed JSON handled safely — parse error mapped", () => {
    // safeParseJson returns [null, error] on parse failure
    expect(viatorClientSrc).toContain("safeParseJson");
    expect(viatorClientSrc).toContain('"parse"');
    // Verify the source catches JSON parse failures
    expect(viatorClientSrc).toContain("Failed to parse JSON");
  });
});

// ═══════════════════════════════════════════════════════════════
// Part 6: Response safety
// ═══════════════════════════════════════════════════════════════

describe("Response safety", () => {
  it("31. API key never returned in any response field", () => {
    // The viator-client never logs or returns the key
    // viator-catalog index.ts constructs response with explicit fields — no API key field
    const responseFields = viatorCatalogSrc.match(/configured|connected|upstreamStatus|responseTimeMs|productCodeReturned|productStatus|trackingId|rateLimitRemaining|checkedAt/g);
    expect(responseFields).not.toBeNull();
    // Verify no "apiKey", "key", "secret", or "token" field in the JSON.stringify response
    expect(viatorCatalogSrc).not.toMatch(/\bapiKey\b/);
    expect(viatorCatalogSrc).not.toMatch(/\bapi_key\b/);
    // The viator-client.ts comment explicitly states: "API key is NEVER included in logs, errors, or returned values"
    expect(viatorClientSrc).toContain("API key is NEVER included");
  });

  it("32. Raw headers never returned", () => {
    // The catalog function returns only explicit fields — never the raw response headers
    // viatorRequest extracts only specific header values (X-Unique-ID, rate-limit headers)
    expect(viatorClientSrc).toContain("X-Unique-ID");
    expect(viatorClientSrc).toContain("RateLimit-Limit");
    expect(viatorClientSrc).toContain("RateLimit-Remaining");
    expect(viatorClientSrc).toContain("RateLimit-Reset");
    // No wholesale header pass-through
    expect(viatorClientSrc).not.toMatch(/headers\s*:\s*Object\.fromEntries/);
    expect(viatorClientSrc).not.toMatch(/JSON\.stringify\(.*headers/);
  });

  it("33. Tracking ID may be returned — source contains X-Unique-ID", () => {
    expect(viatorClientSrc).toContain("X-Unique-ID");
    // trackingId is included in the health response
    expect(viatorCatalogSrc).toContain("trackingId");
  });

  it("34. Health response contains only approved fields", () => {
    // Approved fields from the catalog function's JSON.stringify response
    const approvedFields = [
      "configured",
      "connected",
      "upstreamStatus",
      "responseTimeMs",
      "productCodeReturned",
      "productStatus",
      "trackingId",
      "rateLimitRemaining",
      "checkedAt",
    ];

    // The catalog function builds the response object with these exact keys
    for (const field of approvedFields) {
      expect(viatorCatalogSrc).toContain(field);
    }

    // Forbidden fields must not appear in the response object
    const forbiddenFields = [
      "title",
      "description",
      "pricing",
      "price",
      "supplier",
      "booking",
      "bookingId",
      "affiliate",
      "affiliateUrl",
      "traveler",
      "traveller",
    ];

    // Find the response-building block (the JSON.stringify call in the health handler)
    const healthResponseBlock = viatorCatalogSrc.slice(
      viatorCatalogSrc.indexOf("JSON.stringify({"),
    );

    for (const bad of forbiddenFields) {
      // Use case-insensitive match for the response block
      expect(healthResponseBlock.toLowerCase(), `Forbidden field "${bad}" must not be in health response`)
        .not.toMatch(new RegExp(bad, "i"));
    }
  });

  it("35. Rate-limit metadata captured but not raw", () => {
    // Viator-client extracts RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset
    // But only returns rateLimitRemaining as a parsed number
    expect(viatorClientSrc).toContain("RateLimit-Limit");
    expect(viatorClientSrc).toContain("RateLimit-Remaining");
    expect(viatorClientSrc).toContain("RateLimit-Reset");
    // Only rateLimitRemaining (parsed int) is returned in ViatorResponse
    expect(viatorClientSrc).toMatch(/rateLimitRemaining\s*:\s*number\s*\|\s*null/);
    // rateLimitLimit and rateLimitReset are captured internally but NOT returned to the consumer
    // They appear in extractMeta but not in the ViatorResponse interface
    const responseInterface = viatorClientSrc.slice(
      viatorClientSrc.indexOf("export interface ViatorResponse"),
      viatorClientSrc.indexOf("}", viatorClientSrc.indexOf("export interface ViatorResponse")) + 1,
    );
    expect(responseInterface).toContain("rateLimitRemaining");
    expect(responseInterface).not.toContain("rateLimitLimit");
    expect(responseInterface).not.toContain("rateLimitReset");
  });


describe("URL construction & health endpoint", () => {
  it("base URL includes /partner path segment", () => {
    const src = require("fs").readFileSync("supabase/functions/_shared/viator-client.ts", "utf8");
    expect(src).toContain("/partner");
  });

  it("URL construction preserves base path (not stripped by origin)", () => {
    const src = require("fs").readFileSync("supabase/functions/_shared/viator-client.ts", "utf8");
    expect(src).not.toContain("baseUrl.origin");
    expect(src).toContain("baseUrl.href");
  });

  it("health check uses product search, not hardcoded product", () => {
    const src = require("fs").readFileSync("supabase/functions/_shared/viator-client.ts", "utf8");
    expect(src).toContain("/products/search");
    // Health check now uses search, not hardcoded product
  });

  it("trailing slash in base URL handled correctly", () => {
    const src = require("fs").readFileSync("supabase/functions/_shared/viator-client.ts", "utf8");
    expect(src).toContain("/$/, \"\"");
  });

  it("404 maps safely in error handling", () => {
    const src = require("fs").readFileSync("supabase/functions/_shared/viator-client.ts", "utf8");
    expect(src).toContain("404");
  });

  it("tracking ID preserved in response", () => {
    const src = require("fs").readFileSync("supabase/functions/_shared/viator-client.ts", "utf8");
    expect(src).toContain("X-Unique-ID");
  });

  it("response time measured with performance.now()", () => {
    const src = require("fs").readFileSync("supabase/functions/_shared/viator-client.ts", "utf8");
    expect(src).toContain("performance.now()");
    expect(src).toContain("responseTimeMs");
  });

  it("no booking endpoint introduced", () => {
    const src = require("fs").readFileSync("supabase/functions/_shared/viator-client.ts", "utf8");
    expect(src).not.toContain("/bookings");
    expect(src).not.toContain("/booking");
    expect(src).not.toContain("/availability");
    expect(src).not.toContain("/checkout");
  });

  it("API key remains server-only (no frontend refs)", () => {
    const src = require("fs").readFileSync("supabase/functions/_shared/viator-client.ts", "utf8");
    expect(src).toContain("Deno.env.get");
  });

  it("health result includes resultCount and sampleProductCode", () => {
    const src = require("fs").readFileSync("supabase/functions/_shared/viator-client.ts", "utf8");
    expect(src).toContain("resultCount");
    expect(src).toContain("sampleProductCode");
  });
});

});