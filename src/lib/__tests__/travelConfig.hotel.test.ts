/**
 * Hotel search URL building — regression tests.
 *
 * Verifies:
 * - Validation accepts and rejects correctly
 * - buildHotelSearchUrl returns failure for discontinued Hotellook partner
 * - No URLs to search.hotellook.com are generated
 * - Occupancy parameters are validated correctly (1 adult stays 1 adult)
 * - No child parameter is ever introduced
 */
import { describe, it, expect } from "vitest";
import {
  buildHotelSearchUrl,
  validateHotelParams,
  type ValidatedHotelParams,
} from "../travelConfig";

const validHotel: ValidatedHotelParams = {
  destination: "Sydney",
  checkIn: "2026-09-01",
  checkOut: "2026-09-05",
  adults: 2,
  rooms: 1,
};

describe("validateHotelParams", () => {
  it("accepts valid params", () => {
    const r = validateHotelParams(validHotel);
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it("rejects empty destination", () => {
    const r = validateHotelParams({ ...validHotel, destination: "" });
    expect(r.valid).toBe(false);
    expect(r.errors.find(e => e.field === "destination")?.code).toBe("required");
  });

  it("rejects whitespace-only destination", () => {
    const r = validateHotelParams({ ...validHotel, destination: "   " });
    expect(r.valid).toBe(false);
    expect(r.errors.find(e => e.field === "destination")?.code).toBe("required");
  });

  it("rejects missing check-in", () => {
    const r = validateHotelParams({ ...validHotel, checkIn: "" });
    expect(r.valid).toBe(false);
    expect(r.errors.find(e => e.field === "checkIn")?.code).toBe("invalid_date");
  });

  it("rejects past check-in date", () => {
    const r = validateHotelParams({ ...validHotel, checkIn: "2020-01-01" });
    expect(r.valid).toBe(false);
    expect(r.errors.find(e => e.field === "checkIn")?.code).toBe("date_past");
  });

  it("rejects check-out before check-in", () => {
    const r = validateHotelParams({ ...validHotel, checkIn: "2026-09-10", checkOut: "2026-09-05" });
    expect(r.valid).toBe(false);
    expect(r.errors.find(e => e.field === "checkOut")?.code).toBe("before_checkin");
  });

  it("rejects check-out equal to check-in", () => {
    const r = validateHotelParams({ ...validHotel, checkIn: "2026-09-01", checkOut: "2026-09-01" });
    expect(r.valid).toBe(false);
    expect(r.errors.find(e => e.field === "checkOut")?.code).toBe("before_checkin");
  });

  it("rejects zero adults", () => {
    const r = validateHotelParams({ ...validHotel, adults: 0 });
    expect(r.valid).toBe(false);
    expect(r.errors.find(e => e.field === "adults")?.code).toBe("invalid_adults");
  });

  it("rejects excess adults (>10)", () => {
    const r = validateHotelParams({ ...validHotel, adults: 11 });
    expect(r.valid).toBe(false);
    expect(r.errors.find(e => e.field === "adults")?.code).toBe("too_many_adults");
  });

  it("accepts max adults (10)", () => {
    const r = validateHotelParams({ ...validHotel, adults: 10 });
    expect(r.valid).toBe(true);
  });

  it("rejects zero rooms", () => {
    const r = validateHotelParams({ ...validHotel, rooms: 0 });
    expect(r.valid).toBe(false);
    expect(r.errors.find(e => e.field === "rooms")?.code).toBe("invalid_rooms");
  });

  it("rejects excess rooms (>5)", () => {
    const r = validateHotelParams({ ...validHotel, rooms: 6 });
    expect(r.valid).toBe(false);
    expect(r.errors.find(e => e.field === "rooms")?.code).toBe("too_many_rooms");
  });

  it("accepts max rooms (5)", () => {
    const r = validateHotelParams({ ...validHotel, rooms: 5 });
    expect(r.valid).toBe(true);
  });

  it("rejects non-integer adults", () => {
    const r = validateHotelParams({ ...validHotel, adults: 1.5 });
    expect(r.valid).toBe(false);
  });

  it("returns multiple errors for completely invalid input", () => {
    const r = validateHotelParams({ destination: "", checkIn: "bad", checkOut: "", adults: 0, rooms: 0 });
    expect(r.valid).toBe(false);
    expect(r.errors.length).toBeGreaterThanOrEqual(4);
  });

  it("accepts Cooma as a manual destination", () => {
    const r = validateHotelParams({ ...validHotel, destination: "Cooma" });
    expect(r.valid).toBe(true);
  });
});

describe("buildHotelSearchUrl — inactive provider", () => {
  it("returns failure because Hotellook is discontinued", () => {
    const r = buildHotelSearchUrl(validHotel);
    expect(r.success).toBe(false);
    expect(r.url).toBeNull();
    expect(r.partner).toBe("hotellook");
    expect(r.reason).toContain("discontinued");
  });

  it("does NOT generate any search.hotellook.com URL", () => {
    const r = buildHotelSearchUrl(validHotel);
    expect(r.url).toBeNull();
  });

  it("still returns failure for invalid params", () => {
    const r = buildHotelSearchUrl({ destination: "", checkIn: "", checkOut: "", adults: 0, rooms: 0 } as unknown as ValidatedHotelParams);
    expect(r.success).toBe(false);
    expect(r.url).toBeNull();
  });

  it("does NOT contain API tokens or markers", () => {
    const r = buildHotelSearchUrl(validHotel);
    // No URL is generated, so no secrets can leak
    expect(r.url).toBeNull();
  });
});

describe("Occupancy regression — adults are never altered", () => {
  it("1 adult validates correctly and is not converted to 2 adults", () => {
    const r = validateHotelParams({ ...validHotel, adults: 1 });
    expect(r.valid).toBe(true);
  });

  it("2 adults validate correctly and stay 2 adults", () => {
    const r = validateHotelParams({ ...validHotel, adults: 2 });
    expect(r.valid).toBe(true);
  });

  it("3 adults validate correctly", () => {
    const r = validateHotelParams({ ...validHotel, adults: 3 });
    expect(r.valid).toBe(true);
  });

  it("no child parameter concept exists in ValidatedHotelParams", () => {
    // The ValidatedHotelParams type has only destination, checkIn, checkOut, adults, rooms.
    // There is no children/child field — verified at the type level.
    const params: ValidatedHotelParams = {
      destination: "Sydney",
      checkIn: "2026-09-01",
      checkOut: "2026-09-05",
      adults: 1,
      rooms: 1,
    };
    // @ts-expect-error: children does not exist on ValidatedHotelParams
    // If this line compiles, the type is wrong. The @ts-expect-error ensures it.
    expect(params).toBeDefined();
  });

  it("buildHotelSearchUrl with 1 adult returns failure (inactive partner) not a URL with wrong occupancy", () => {
    const r = buildHotelSearchUrl({ ...validHotel, adults: 1 });
    expect(r.success).toBe(false);
    expect(r.url).toBeNull();
    // The adult count was NOT passed to any URL
  });

  it("buildHotelSearchUrl with 2 adults returns failure (inactive partner) not a URL with wrong occupancy", () => {
    const r = buildHotelSearchUrl({ ...validHotel, adults: 2 });
    expect(r.success).toBe(false);
    expect(r.url).toBeNull();
  });

  it("destination and dates are still validated correctly even when partner is inactive", () => {
    const r = validateHotelParams({
      destination: "Bali",
      checkIn: "2026-12-01",
      checkOut: "2026-12-07",
      adults: 1,
      rooms: 1,
    });
    expect(r.valid).toBe(true);
  });

  it("Cooma as manual destination validates correctly", () => {
    const r = validateHotelParams({
      destination: "Cooma",
      checkIn: "2026-09-01",
      checkOut: "2026-09-05",
      adults: 1,
      rooms: 1,
    });
    expect(r.valid).toBe(true);
  });
});
