import { describe, it, expect } from "vitest";
import {
  validateDestinationInput, clampFocal, slugifyCity, selectActiveSorted,
  toPublicDestination, masterImagePath, focalToObjectPosition,
  type FlightDestinationInput, type FlightDestinationRow,
} from "@/lib/flightDestinations";

const validInput: FlightDestinationInput = {
  city: "Kathmandu", country: "Nepal", iata_code: "KTM", slug: "kathmandu",
  description: "Gateway to the Himalaya", alt_text: "Kathmandu, Nepal",
  focal_x: 0.5, focal_y: 0.4, display_order: 1, is_active: true,
};

function row(over: Partial<FlightDestinationRow>): FlightDestinationRow {
  return {
    id: "id", city: "City", country: "Country", iata_code: "ABC", slug: "city",
    description: null, alt_text: null, image_path: null, focal_x: 0.5, focal_y: 0.5,
    display_order: 0, is_active: false, created_at: "t", updated_at: "t", ...over,
  };
}

describe("validateDestinationInput", () => {
  it("passes a valid input", () => {
    expect(validateDestinationInput(validInput)).toEqual([]);
  });
  it("requires city and country", () => {
    const errs = validateDestinationInput({ ...validInput, city: "  ", country: "" });
    expect(errs.map((e) => e.field)).toEqual(expect.arrayContaining(["city", "country"]));
  });
  it("rejects a bad IATA code", () => {
    expect(validateDestinationInput({ ...validInput, iata_code: "kt" }).some((e) => e.field === "iata_code")).toBe(true);
    expect(validateDestinationInput({ ...validInput, iata_code: "KTMX" }).some((e) => e.field === "iata_code")).toBe(true);
    expect(validateDestinationInput({ ...validInput, iata_code: "K1M" }).some((e) => e.field === "iata_code")).toBe(true);
  });
  it("rejects a bad slug", () => {
    expect(validateDestinationInput({ ...validInput, slug: "New Delhi" }).some((e) => e.field === "slug")).toBe(true);
    expect(validateDestinationInput({ ...validInput, slug: "-bad-" }).some((e) => e.field === "slug")).toBe(true);
    expect(validateDestinationInput({ ...validInput, slug: "new-delhi" })).toEqual([]);
  });
  it("rejects out-of-range focal values", () => {
    expect(validateDestinationInput({ ...validInput, focal_x: 1.5 }).some((e) => e.field === "focal_x")).toBe(true);
    expect(validateDestinationInput({ ...validInput, focal_y: -0.1 }).some((e) => e.field === "focal_y")).toBe(true);
  });
  it("rejects a negative or fractional display order", () => {
    expect(validateDestinationInput({ ...validInput, display_order: -1 }).some((e) => e.field === "display_order")).toBe(true);
    expect(validateDestinationInput({ ...validInput, display_order: 1.5 }).some((e) => e.field === "display_order")).toBe(true);
  });
});

describe("clampFocal", () => {
  it("clamps to 0..1 and rounds", () => {
    expect(clampFocal(-2)).toBe(0);
    expect(clampFocal(9)).toBe(1);
    expect(clampFocal(0.123456)).toBe(0.1235);
  });
  it("falls back to 0.5 on non-finite", () => {
    expect(clampFocal(NaN)).toBe(0.5);
    expect(clampFocal(Infinity)).toBe(1);
  });
});

describe("slugifyCity", () => {
  it("produces URL-safe slugs", () => {
    expect(slugifyCity("New Delhi")).toBe("new-delhi");
    expect(slugifyCity("  São Paulo  ")).toBe("s-o-paulo");
    expect(slugifyCity("London")).toBe("london");
  });
});

describe("selectActiveSorted", () => {
  it("keeps only active rows, ordered by display_order", () => {
    const rows = [
      row({ id: "a", city: "A", is_active: true, display_order: 3 }),
      row({ id: "b", city: "B", is_active: false, display_order: 1 }),
      row({ id: "c", city: "C", is_active: true, display_order: 1 }),
      row({ id: "d", city: "D", is_active: true, display_order: 2 }),
    ];
    const out = selectActiveSorted(rows);
    expect(out.map((r) => r.id)).toEqual(["c", "d", "a"]);
    expect(out.every((r) => r.is_active)).toBe(true);
  });
  it("breaks ties by city name", () => {
    const rows = [
      row({ id: "z", city: "Zurich", is_active: true, display_order: 1 }),
      row({ id: "a", city: "Amsterdam", is_active: true, display_order: 1 }),
    ];
    expect(selectActiveSorted(rows).map((r) => r.city)).toEqual(["Amsterdam", "Zurich"]);
  });
});

describe("toPublicDestination", () => {
  it("exposes only safe public fields (no audit/internal columns)", () => {
    const pub = toPublicDestination(row({ is_active: true, created_at: "X", updated_at: "Y" }));
    expect(Object.keys(pub).sort()).toEqual(
      ["alt_text", "city", "country", "description", "display_order", "focal_x", "focal_y", "iata_code", "id", "image_path", "slug"].sort(),
    );
    expect(pub).not.toHaveProperty("is_active");
    expect(pub).not.toHaveProperty("created_at");
    expect(pub).not.toHaveProperty("updated_at");
  });
});

describe("helpers", () => {
  it("builds the master image path from slug", () => {
    expect(masterImagePath("kathmandu")).toBe("kathmandu/master-800x600.webp");
  });
  it("maps focal to CSS object-position", () => {
    expect(focalToObjectPosition(0.25, 0.75)).toBe("25% 75%");
    expect(focalToObjectPosition(-1, 2)).toBe("0% 100%");
  });
});
