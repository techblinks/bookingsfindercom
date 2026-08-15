/**
 * Things V2 (T2A review) — production destination helper behavior.
 *
 * Locks the REAL `searchDestinations` / `displayDestination` helpers in
 * src/services/destinations.ts (the ones the DestinationAutocomplete now
 * uses), with production-shaped Tiqets-backed destinations.
 *
 * The Viator TEST_ONLY taxonomy fixture is deliberately NOT imported: these
 * tests prove the production helpers stand alone and never depend on fixture
 * data. (Fixture isolation itself is covered by the identity tests' source
 * scans and by the fixture-ref checks in viator-public tests.)
 */
import { describe, it, expect } from "vitest";
import {
  searchDestinations,
  displayDestination,
} from "@/services/destinations";
import type { ExperienceDestination } from "@/types/experiences";

/** Production-shaped Tiqets-backed destination object. */
function tiqetsDest(
  name: string,
  country: string | null,
  extra: Partial<ExperienceDestination> = {},
): ExperienceDestination {
  return {
    provider: "tiqets",
    destinationId: `dest-${name}`,
    name,
    country,
    countryId: null,
    countryCode: null,
    slug: `slug/${name.toLowerCase()}`,
    productCount: 0,
    latitude: null,
    longitude: null,
    type: null,
    parentDestinationId: null,
    lookupId: null,
    defaultCurrencyCode: null,
    timeZone: null,
    ...extra,
  };
}

const names = (dests: ExperienceDestination[]) => dests.map((d) => d.name);

describe("searchDestinations — production helper", () => {
  it("returns [] for an empty or whitespace query", () => {
    const list = [tiqetsDest("Rome", "Italy")];
    expect(searchDestinations("", list)).toEqual([]);
    expect(searchDestinations("   ", list)).toEqual([]);
  });

  it("matches by name prefix", () => {
    const list = [tiqetsDest("Rome", "Italy"), tiqetsDest("Sydney", "Australia")];
    expect(names(searchDestinations("Rom", list))).toEqual(["Rome"]);
    expect(names(searchDestinations("rome", list))).toEqual(["Rome"]);
    expect(names(searchDestinations("Syd", list))).toEqual(["Sydney"]);
  });

  it("matches by name substring", () => {
    const list = [tiqetsDest("Rome", "Italy")];
    expect(names(searchDestinations("ome", list))).toEqual(["Rome"]);
  });

  it("normalises accents", () => {
    const list = [tiqetsDest("São Paulo", "Brazil")];
    expect(names(searchDestinations("sao", list))).toEqual(["São Paulo"]);
    expect(names(searchDestinations("SAO", list))).toEqual(["São Paulo"]);
    expect(names(searchDestinations("paulo", list))).toEqual(["São Paulo"]);
  });

  it("matches by country", () => {
    const list = [tiqetsDest("Rome", "Italy")];
    expect(names(searchDestinations("Ita", list))).toEqual(["Rome"]);
    expect(names(searchDestinations("italy", list))).toEqual(["Rome"]);
  });

  it("orders prefix matches before substring matches, deterministically", () => {
    const list = [
      tiqetsDest("Cannes", "France"),
      tiqetsDest("Canberra", "Australia"),
      // "american samoa" contains "can" only as a substring.
      tiqetsDest("American Samoa", null),
    ];
    const first = names(searchDestinations("can", list));
    const second = names(searchDestinations("can", list));
    expect(first).toEqual(["Canberra", "Cannes", "American Samoa"]);
    expect(second).toEqual(first);
  });

  it("does not mutate its input", () => {
    const list = [tiqetsDest("Rome", "Italy"), tiqetsDest("Cannes", "France")];
    const snapshot = list.map((d) => ({ ...d }));
    searchDestinations("can", list);
    expect(list).toEqual(snapshot);
  });
});

describe("displayDestination — production helper", () => {
  it("renders a genuine country field unambiguously", () => {
    expect(displayDestination(tiqetsDest("Rome", "Italy"))).toBe("Rome, Italy");
    expect(displayDestination(tiqetsDest("Barcelona", "Spain"))).toBe("Barcelona, Spain");
  });

  it("falls back safely when the country is missing", () => {
    expect(displayDestination(tiqetsDest("Rome", null))).toBe("Rome");
    expect(displayDestination(tiqetsDest("Rome", ""))).toBe("Rome");
    expect(displayDestination(tiqetsDest("Rome", "   "))).toBe("Rome");
  });

  it("does not look up or depend on a taxonomy index for a country field", () => {
    // Called with an empty index: the country comes from the destination
    // itself, never from a Viator TEST_ONLY taxonomy.
    expect(displayDestination(tiqetsDest("Rome", "Italy"), [])).toBe("Rome, Italy");
  });

  it("never invents a country", () => {
    // A country-level destination whose country equals its name is not doubled.
    expect(displayDestination(tiqetsDest("United States", "United States"))).toBe("United States");
    // A Viator-shaped city with no country field and no parent chain is bare.
    const sydney = tiqetsDest("Sydney", null, {
      provider: "viator",
      type: "CITY",
    });
    expect(displayDestination(sydney)).toBe("Sydney");
  });

  it("resolves a Viator-shape country through a supplied parent chain", () => {
    const australia = tiqetsDest("Australia", null, {
      provider: "viator",
      destinationId: "2",
      type: "COUNTRY",
    });
    const sydney = tiqetsDest("Sydney", null, {
      provider: "viator",
      destinationId: "3",
      type: "CITY",
      parentDestinationId: "2",
    });
    expect(displayDestination(sydney, [australia, sydney])).toBe("Sydney, Australia");
  });
});
