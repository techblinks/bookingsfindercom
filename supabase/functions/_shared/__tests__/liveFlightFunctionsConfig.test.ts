/**
 * BF-FLIGHTS-LIVE-4 — supabase/config.toml auth contract for the two new
 * live-flight functions. Mirrors the existing pattern in
 * run-optimizer/__tests__/optimizer-auth-quota.test.ts (regex over the raw
 * config.toml text — there is no supabase config-parsing library in this
 * repo's test toolchain).
 *
 * Both functions are intentionally public/anonymous-callable (BookingsFinder
 * Flights search does not require sign-in) — see the comment above these
 * entries in config.toml for why verify_jwt=false here is not equivalent to
 * exposing SERPAPI_API_KEY, and why BF-FLIGHTS-LIVE-RATE-1 remains the
 * required follow-up before substantial public traffic.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const configSource = readFileSync(join(__dirname, "..", "..", "..", "config.toml"), "utf8");

function verifyJwtFor(functionName: string): string | null {
  const escaped = functionName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const block = configSource.match(new RegExp(`\\[functions\\.${escaped}\\][\\s\\S]{0,600}?verify_jwt = (true|false)`));
  return block?.[1] ?? null;
}

describe("config.toml — live-flight functions are explicitly public (verify_jwt = false)", () => {
  it("search-live-flights has an explicit verify_jwt = false entry", () => {
    expect(verifyJwtFor("search-live-flights")).toBe("false");
  });

  it("get-live-flight-booking-options has an explicit verify_jwt = false entry", () => {
    expect(verifyJwtFor("get-live-flight-booking-options")).toBe("false");
  });

  it("both entries actually exist in config.toml (not silently absent/defaulted)", () => {
    expect(configSource).toMatch(/\[functions\.search-live-flights\]/);
    expect(configSource).toMatch(/\[functions\.get-live-flight-booking-options\]/);
  });
});
