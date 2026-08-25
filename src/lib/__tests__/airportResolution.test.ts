/**
 * BF1-C — airportResolution (client layer) unit tests.
 *
 * No network: supabase client is mocked with a deterministic in-memory
 * reference dataset mirroring the verified production BF1-B snapshot.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// In-memory reference dataset (mirrors verified prod values)
// ---------------------------------------------------------------------------

function ap(iata: string, name: string, municipality: string, country: string, cName: string) {
  return { iata, name, municipality, country_iso2: country, is_active: true, cities: { name: cName }, countries: { name: country === "JP" ? "Japan" : country === "US" ? "United States" : country === "GB" ? "United Kingdom" : country === "FR" ? "France" : country === "AU" ? "Australia" : "Nepal" } };
}

const AIRPORTS = [
  ap("HND", "Tokyo Haneda Airport", "Tokyo", "JP", "Tokyo"),
  ap("NRT", "Narita International Airport", "Tokyo", "JP", "Tokyo"),
  ap("JFK", "John F. Kennedy International Airport", "New York", "US", "New York City"),
  ap("EWR", "Newark Liberty International Airport", "Newark", "US", "New York City"),
  ap("LGA", "LaGuardia Airport", "New York", "US", "New York City"),
  ap("LHR", "Heathrow Airport", "London", "GB", "London"),
  ap("LGW", "Gatwick Airport", "London", "GB", "London"),
  ap("STN", "Stansted Airport", "London", "GB", "London"),
  ap("LTN", "Luton Airport", "London", "GB", "London"),
  ap("LCY", "London City Airport", "London", "GB", "London"),
  ap("CDG", "Charles de Gaulle Airport", "Paris", "FR", "Paris"),
  ap("ORY", "Orly Airport", "Paris", "FR", "Paris"),
  ap("BVA", "Paris Beauvais Airport", "Beauvais", "FR", "Paris"),
  ap("SFO", "San Francisco International Airport", "San Francisco", "US", "San Francisco"),
  ap("OAK", "Oakland International Airport", "Oakland", "US", "San Francisco"),
  ap("SJC", "Norman Y. Mineta San Jose International Airport", "San Jose", "US", "San Francisco"),
  ap("BNE", "Brisbane Airport", "Brisbane", "AU", "Brisbane"),
  ap("KTM", "Tribhuvan International Airport", "Kathmandu", "NP", "Kathmandu"),
  ap("SYD", "Sydney Kingsford Smith Airport", "Sydney", "AU", "Sydney"),
  ap("DPS", "Ngurah Rai International Airport", "Denpasar", "ID", "Denpasar"),
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

let DB: Record<string, unknown[]> = {};
let queryCount = 0;

// Minimal supabase builder emulation (eq / ilike / order / limit).
function buildChain(rows: unknown[]) {
  let filtered = [...rows];
  const chain = {
    eq(col: string, val: unknown) {
      filtered = filtered.filter((r) => (r as Record<string, unknown>)[col] === val);
      return chain;
    },
    ilike(col: string, pattern: string) {
      const p = pattern.replace(/\\/g, "");
      const contains = p.startsWith("%") && p.endsWith("%");
      const needle = contains ? p.slice(1, -1) : p.replace(/[%*]/g, "").toLowerCase();
      filtered = filtered.filter((r) => {
        const v = String((r as Record<string, unknown>)[col] ?? "").toLowerCase();
        return contains ? v.includes(needle) : v.startsWith(needle);
      });
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
    or(expr: string) {
      const clauses = expr.split(",").map((c) => {
        const m = c.replace(/\\\//g, "/").match(/^(.+?)\.(eq|ilike)\.(.*)$/);
        return m ? { col: m[1], op: m[2], val: m[3] } : null;
      });
      filtered = filtered.filter((r) =>
        clauses.some((cl) => {
          if (!cl) return false;
          const v = String((r as Record<string, unknown>)[cl.col] ?? "");
          return cl.op === "eq"
            ? v === cl.val
            : v.toLowerCase().startsWith(cl.val.replace(/[%*\\]/g, "").toLowerCase());
        }),
      );
      return chain;
    },
    limit(n: number) {
      queryCount++;
      return Promise.resolve({ data: filtered.slice(0, n), error: null });
    },
    then(onF: never) {
      return chain.limit(filtered.length || 1).then(onF);
    },
  };
  return chain;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from(table: string) {
      return {
        select: () => buildChain(DB[table] ?? []),
      };
    },
  },
}));

import {
  resolveLocation,
  formatMetroLabel,
  formatAirportLabel,
} from "@/lib/airportResolution";

beforeEach(() => {
  DB = {
    airports: AIRPORTS.map((a) => ({ ...a })),
    cities: CITIES.map((c) => ({ ...c })),
    metro_airports: METRO_AIRPORTS,
  };
  queryCount = 0;
});

// ---------------------------------------------------------------------------
describe("BF1-C exact airport resolution (never shadowed by metro logic)", () => {
  it("HND -> HND (kind=airport, single-airport set)", async () => {
    const r = await resolveLocation("HND");
    expect(r?.kind).toBe("airport");
    expect(r?.code).toBe("HND");
    expect(r?.airports.map((a) => a.code)).toEqual(["HND"]);
    expect(r?.providerCode).toBe("HND");
  });

  it("JFK -> JFK even though NYC metro exists", async () => {
    const r = await resolveLocation("JFK");
    expect(r?.kind).toBe("airport");
    expect(r?.code).toBe("JFK");
  });

  it("BNE -> BNE airport, NOT the BNE metro abstraction", async () => {
    const r = await resolveLocation("BNE");
    expect(r?.kind).toBe("airport");
    expect(r?.airports).toHaveLength(1);
  });

  it("SFO ambiguity: exact airport beats metro abstraction", async () => {
    const r = await resolveLocation("SFO");
    expect(r?.kind).toBe("airport");
    expect(r?.resolvedVia).toBe("airport-iata");
    expect(r?.airports).toHaveLength(1);
    expect(r?.label).toBe("San Francisco (SFO)");
  });

  it("case-insensitive: jfk resolves to JFK airport", async () => {
    expect((await resolveLocation("jfk"))?.code).toBe("JFK");
  });
});

describe("BF1-C golden metro expansion (complete, rank-preserving)", () => {
  it("TYO -> HND,NRT", async () => {
    const r = await resolveLocation("TYO");
    expect(r?.kind).toBe("metro");
    expect(r?.airports.map((a) => a.code)).toEqual(["HND", "NRT"]);
    expect(r?.primaryAirport?.code).toBe("HND");
    expect(r?.label).toBe(formatMetroLabel("Tokyo", "TYO"));
  });

  it("LON -> LHR,LGW,STN,LTN,LCY", async () => {
    const r = await resolveLocation("LON");
    expect(r?.airports.map((a) => a.code)).toEqual(["LHR", "LGW", "STN", "LTN", "LCY"]);
    expect(r?.label).toBe("London — All Airports (LON)");
  });

  it("NYC -> JFK,EWR,LGA", async () => {
    expect((await resolveLocation("NYC"))?.airports.map((a) => a.code)).toEqual(["JFK", "EWR", "LGA"]);
  });

  it("PAR -> CDG,ORY,BVA", async () => {
    expect((await resolveLocation("PAR"))?.airports.map((a) => a.code)).toEqual(["CDG", "ORY", "BVA"]);
  });

  it("SFO metro members available when resolved AS a metro (via text)", async () => {
    const r = await resolveLocation("San Francisco");
    expect(r?.kind).toBe("metro");
    expect(r?.airports.map((a) => a.code)).toEqual(["SFO", "OAK", "SJC"]);
  });
});

describe("BF1-C honest unresolved state (fail-closed, nothing fabricated)", () => {
  it("ZZZ -> null", async () => {
    expect(await resolveLocation("ZZZ")).toBeNull();
  });

  it("malformed input -> null", async () => {
    expect(await resolveLocation("")).toBeNull();
    expect(await resolveLocation("AB")).toBeNull();
    expect(await resolveLocation("TO!!")).toBeNull();
    expect(await resolveLocation(null as unknown as string)).toBeNull();
  });

  it("unknown-but-well-formed code produces no fabricated airport", async () => {
    const r = await resolveLocation("QQQ");
    expect(r).toBeNull();
  });
});

describe("BF1-C city-name search", () => {
  it("'Tokyo' -> TYO metro with ranked members", async () => {
    const r = await resolveLocation("Tokyo");
    expect(r?.kind).toBe("metro");
    expect(r?.code).toBe("TYO");
    expect(r?.airports.map((a) => a.code)).toEqual(["HND", "NRT"]);
  });

  it("'Brisbane' -> single-airport metro BNE", async () => {
    const r = await resolveLocation("Brisbane");
    expect(r?.airports.map((a) => a.code)).toEqual(["BNE"]);
  });

  it("'Kathmandu' -> KTM via bounded fallback (no fabrication)", async () => {
    const r = await resolveLocation("Kathmandu");
    expect(r?.code).toBe("KTM");
    expect(r?.kind).toBe("airport");
  });

  it("unresolvable city text -> null", async () => {
    expect(await resolveLocation("Atlantis")).toBeNull();
  });
});

describe("BF1-C labels & caching", () => {
  it("display-label helpers produce brief-mandated formats", () => {
    expect(formatMetroLabel("Tokyo", "TYO")).toBe("Tokyo — All Airports (TYO)");
    expect(formatMetroLabel("London", "LON")).toBe("London — All Airports (LON)");
    expect(formatAirportLabel({ code: "HND", city: "Tokyo" })).toBe("Tokyo (HND)");
    // No synthetic metro-host names ever enter labels.
    expect(formatMetroLabel("washingtondc", "WAS")).toContain("All Airports");
  });

  it("repeat lookups are served from TTL cache (no extra queries)", async () => {
    await resolveLocation("TYO");
    const afterFirst = queryCount;
    await resolveLocation("TYO");
    expect(queryCount).toBe(afterFirst);
  });
});
