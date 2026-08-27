/**
 * BF1-C — server-side reference layer tests (_shared/reference.ts) plus the
 * static source-contract proving search-airports routes through it.
 * No network: ReferenceClientLike is a deterministic in-memory engine.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import {
  resolveLocationByCode,
  searchReferenceLocations,
} from "../reference.ts";

// ---------------------------------------------------------------------------
// Dataset (mirrors the verified production BF1-B snapshot)
// ---------------------------------------------------------------------------

function ap(iata: string, name: string, municipality: string, country_iso2: string) {
  return { iata, name, municipality, country_iso2, is_active: true };
}

const AIRPORTS = [
  ap("HND", "Tokyo Haneda Airport", "Tokyo", "JP"),
  ap("NRT", "Narita International Airport", "Tokyo", "JP"),
  ap("JFK", "John F. Kennedy International Airport", "New York", "US"),
  ap("EWR", "Newark Liberty International Airport", "Newark", "US"),
  ap("LGA", "LaGuardia Airport", "New York", "US"),
  ap("LHR", "Heathrow Airport", "London", "GB"),
  ap("LGW", "Gatwick Airport", "London", "GB"),
  ap("STN", "Stansted Airport", "London", "GB"),
  ap("LTN", "Luton Airport", "London", "GB"),
  ap("LCY", "London City Airport", "London", "GB"),
  ap("CDG", "Charles de Gaulle Airport", "Paris", "FR"),
  ap("ORY", "Orly Airport", "Paris", "FR"),
  ap("BVA", "Paris Beauvais Airport", "Beauvais", "FR"),
  ap("SFO", "San Francisco International Airport", "San Francisco", "US"),
  ap("OAK", "Oakland International Airport", "Oakland", "US"),
  ap("SJC", "San Jose International Airport", "San Jose", "US"),
  ap("BNE", "Brisbane Airport", "Brisbane", "AU"),
];

const CITIES = [
  { id: 1850147, name: "Tokyo", country_iso2: "JP", iata_code: "TYO", is_metro: true },
  { id: 2643743, name: "London", country_iso2: "GB", iata_code: "LON", is_metro: true },
  { id: 5128581, name: "New York City", country_iso2: "US", iata_code: "NYC", is_metro: true },
  { id: 2988507, name: "Paris", country_iso2: "FR", iata_code: "PAR", is_metro: true },
  { id: 5391959, name: "San Francisco", country_iso2: "US", iata_code: "SFO", is_metro: true },
  { id: 2174003, name: "Brisbane", country_iso2: "AU", iata_code: "BNE", is_metro: true },
];

const METRO_AIRPORTS = [
  { metro_code: "TYO", rank: 1, airports: AIRPORTS.find((a) => a.iata === "HND") },
  { metro_code: "TYO", rank: 2, airports: AIRPORTS.find((a) => a.iata === "NRT") },
  { metro_code: "LON", rank: 1, airports: AIRPORTS.find((a) => a.iata === "LHR") },
  { metro_code: "LON", rank: 2, airports: AIRPORTS.find((a) => a.iata === "LGW") },
  { metro_code: "LON", rank: 3, airports: AIRPORTS.find((a) => a.iata === "STN") },
  { metro_code: "LON", rank: 4, airports: AIRPORTS.find((a) => a.iata === "LTN") },
  { metro_code: "LON", rank: 5, airports: AIRPORTS.find((a) => a.iata === "LCY") },
  { metro_code: "NYC", rank: 1, airports: AIRPORTS.find((a) => a.iata === "JFK") },
  { metro_code: "NYC", rank: 2, airports: AIRPORTS.find((a) => a.iata === "EWR") },
  { metro_code: "NYC", rank: 3, airports: AIRPORTS.find((a) => a.iata === "LGA") },
  { metro_code: "PAR", rank: 1, airports: AIRPORTS.find((a) => a.iata === "CDG") },
  { metro_code: "PAR", rank: 2, airports: AIRPORTS.find((a) => a.iata === "ORY") },
  { metro_code: "PAR", rank: 3, airports: AIRPORTS.find((a) => a.iata === "BVA") },
  { metro_code: "SFO", rank: 1, airports: AIRPORTS.find((a) => a.iata === "SFO") },
  { metro_code: "SFO", rank: 2, airports: AIRPORTS.find((a) => a.iata === "OAK") },
  { metro_code: "SFO", rank: 3, airports: AIRPORTS.find((a) => a.iata === "SJC") },
  { metro_code: "BNE", rank: 1, airports: AIRPORTS.find((a) => a.iata === "BNE") },
];

// ---------------------------------------------------------------------------
// In-memory ReferenceClientLike engine
// ---------------------------------------------------------------------------

let DB: Record<string, unknown[]>;

function splitTopLevel(s: string): string[] {
  const out: string[] = [];
  let cur = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "," && s[i - 1] !== "\\") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

function ilikeMatch(value: string, pattern: string): boolean {
  const p = pattern.replace(/\\/g, "");
  const contains = p.startsWith("%") && p.endsWith("%");
  const needle = p.replace(/[%*]/g, "").toLowerCase();
  const v = value.toLowerCase();
  return contains ? v.includes(needle) : v.startsWith(needle);
}

function makeClient(tables: Record<string, unknown[]> | "broken") {
  return {
    from(table: string) {
      const rows: unknown[] = tables === "broken" ? [] : tables[table] ?? [];
      let filtered = [...rows];
      const chain = {
        select() {
          return chain;
        },
        eq(col: string, val: unknown) {
          filtered = filtered.filter((r) => (r as Record<string, unknown>)[col] === val);
          return chain;
        },
        ilike(col: string, pattern: string) {
          filtered = filtered.filter((r) =>
            ilikeMatch(String((r as Record<string, unknown>)[col] ?? ""), pattern),
          );
          return chain;
        },
        or(expr: string) {
          const clauses = splitTopLevel(expr).map((c) => {
            const m = c.match(/^(.+?)\.(eq|ilike)\.(.*)$/);
            return m ? { col: m[1], op: m[2], val: m[3] } : null;
          });
          filtered = filtered.filter((r) =>
            clauses.some((cl) => {
              if (!cl) return false;
              const v = (r as Record<string, unknown>)[cl.col];
              if (cl.op === "eq") return String(v) === cl.val.replace(/\\/g, "");
              return ilikeMatch(String(v ?? ""), cl.val);
            }),
          );
          return chain;
        },
        not(col: string, op: string, val: unknown) {
          if (op === "is" && val === null) {
            filtered = filtered.filter((r) => (r as Record<string, unknown>)[col] != null);
          }
          return chain;
        },
        order(col: string, opts?: { ascending?: boolean }) {
          filtered.sort((a, b) => {
            const av = (a as Record<string, unknown>)[col] as number;
            const bv = (b as Record<string, unknown>)[col] as number;
            return opts?.ascending === false ? bv - av : av - bv;
          });
          return chain;
        },
        limit(n: number) {
          if (tables === "broken") return Promise.reject(new Error("transport down"));
          return Promise.resolve({ data: filtered.slice(0, n), error: null });
        },
        then(onF: never) {
          return chain.limit(filtered.length || 1).then(onF);
        },
      };
      return { select: () => chain };
    },
  };
}

beforeEachInit();
function beforeEachInit() {
  DB = {
    airports: AIRPORTS.map((a) => ({ ...a })),
    cities: CITIES.map((c) => ({ ...c })),
    metro_airports: METRO_AIRPORTS,
  };
}

describe("resolveLocationByCode — deterministic precedence", () => {
  it("exact airport IATA wins even when the letters are also a metro code", async () => {
    const r = await resolveLocationByCode(makeClient(DB), "SFO");
    expect(r?.kind).toBe("airport");
    expect(r?.resolvedVia).toBe("airport-iata");
    expect(r?.airports).toHaveLength(1);
  });

  it("metro codes expand to the complete ranked set", async () => {
    expect(
      (await resolveLocationByCode(makeClient(DB), "TYO"))?.airports.map((a) => a.code),
    ).toEqual(["HND", "NRT"]);
    expect(
      (await resolveLocationByCode(makeClient(DB), "LON"))?.airports.map((a) => a.code),
    ).toEqual(["LHR", "LGW", "STN", "LTN", "LCY"]);
    expect(
      (await resolveLocationByCode(makeClient(DB), "NYC"))?.airports.map((a) => a.code),
    ).toEqual(["JFK", "EWR", "LGA"]);
    expect(
      (await resolveLocationByCode(makeClient(DB), "PAR"))?.airports.map((a) => a.code),
    ).toEqual(["CDG", "ORY", "BVA"]);
  });

  it("metro label uses the mandated format", async () => {
    expect((await resolveLocationByCode(makeClient(DB), "TYO"))?.label).toBe(
      "Tokyo — All Airports (TYO)",
    );
  });

  it("unknown codes fail closed to null — nothing fabricated", async () => {
    expect(await resolveLocationByCode(makeClient(DB), "ZZZ")).toBeNull();
    expect(await resolveLocationByCode(makeClient(DB), "QQQ")).toBeNull();
    expect(await resolveLocationByCode(makeClient(DB), "to")).toBeNull();
    expect(await resolveLocationByCode(makeClient(DB), "")).toBeNull();
  });

  it("transport failure fails closed to null", async () => {
    expect(await resolveLocationByCode(makeClient("broken"), "HND")).toBeNull();
  });
});

describe("searchReferenceLocations — bounded ranked search", () => {
  it("empty/short queries return nothing", async () => {
    expect(await searchReferenceLocations(makeClient(DB), "", 8)).toEqual([]);
    expect(await searchReferenceLocations(makeClient(DB), "s", 8)).toEqual([]);
  });

  it("'SFO' ranks the exact airport first (never shadowed)", async () => {
    const hits = await searchReferenceLocations(makeClient(DB), "SFO", 8);
    expect(hits[0].location.kind).toBe("airport");
    expect((hits[0].location as { code: string }).code).toBe("SFO");
  });

  it("'TYO' surfaces the metro group then ranked members", async () => {
    const hits = await searchReferenceLocations(makeClient(DB), "TYO", 8);
    expect(hits[0].location.kind).toBe("metro");
    expect(hits.slice(1, 3).map((h) => (h.location as { code: string }).code)).toEqual(["HND", "NRT"]);
  });

  it("city-name prefix ('bris') reaches the metro via bounded prefix match", async () => {
    const hits = await searchReferenceLocations(makeClient(DB), "bris", 8);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].location.kind).toBe("metro");
    expect(hits[0].location.code).toBe("BNE");
  });

  it("results are capped at the requested limit", async () => {
    const hits = await searchReferenceLocations(makeClient(DB), "LON", 3);
    expect(hits.length).toBeLessThanOrEqual(3);
  });

  it("transport failure yields an empty list, never fabricated rows", async () => {
    expect(await searchReferenceLocations(makeClient("broken"), "lon", 8)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Source contract — search-airports must route through the reference layer.
// ---------------------------------------------------------------------------
const fnSrc = readFileSync("supabase/functions/search-airports/index.ts", "utf8");

describe("BF1-C source contract: search-airports rewired off the static array", () => {
  it("imports the shared reference layer", () => {
    expect(fnSrc).toContain("../_shared/reference.ts");
    expect(fnSrc).toContain("searchReferenceLocations");
  });

  it("no hardcoded ~120-airport array remains", () => {
    expect(fnSrc.includes("Comprehensive airport database")).toBe(false);
    expect(fnSrc.match(/const airports\s*=\s*\[/)).toBeNull();
  });

  it("no local fuzzy-scoring machinery remains", () => {
    expect(fnSrc.includes("levenshtein")).toBe(false);
    expect(fnSrc.includes("getSimilarityScore")).toBe(false);
  });

  it("uses the anon key (public-read RLS), never service role", () => {
    expect(fnSrc).toContain("SUPABASE_ANON_KEY");
    expect(fnSrc.toUpperCase()).not.toContain("SERVICE_ROLE");
  });
});
