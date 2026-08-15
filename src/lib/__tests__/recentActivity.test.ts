/**
 * Phase 2A-1: recent-activity model — envelope handling, item salvage,
 * duplicate resolution, string bounds, retention, dedupe, date sanitisation
 * and the pure selectors.
 *
 * Time is injected everywhere. No test reads the real clock.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  loadRecentActivity,
  recordActivity,
  clearRecentActivity,
  selectContinuationCandidate,
  selectRecentItems,
  buildDedupeKey,
  isFlightActivity,
  RECENT_ACTIVITY_STORAGE_KEY,
  RECENT_ACTIVITY_VERSION,
  MAX_STORED_ITEMS,
  MAX_RECENT_ITEMS,
  MAX_QUERY_LENGTH,
  MAX_LABEL_LENGTH,
  RETENTION_DAYS,
  type FlightActivity,
  type RecentActivityEntry,
  type StayActivity,
  type ThingsActivity,
} from "@/lib/recentActivity";

// ── Deterministic clock ──

/** 13 Aug 2026, local noon. Every expectation is relative to this. */
const NOW = new Date(2026, 7, 13, 12, 0, 0);

const daysFromNow = (days: number): Date => new Date(NOW.getTime() + days * 86_400_000);
const isoDaysAgo = (days: number): string => daysFromNow(-days).toISOString();

/** YYYY-MM-DD in local time, matching how the search forms format dates. */
function localDate(offsetDays: number): string {
  const d = daysFromNow(offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const TODAY = localDate(0);
const FUTURE = localDate(20);
const FUTURE_RETURN = localDate(28);
const PAST = localDate(-5);

/** A combining acute accent — normalises away to nothing on its own. */
const COMBINING_ACUTE = String.fromCharCode(0x0301);

// ── localStorage mock ──

let store: Record<string, string> = {};

const localStorageMock = {
  getItem: vi.fn((key: string) => (key in store ? store[key] : null)),
  setItem: vi.fn((key: string, value: string) => {
    store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete store[key];
  }),
};

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock, writable: true });

beforeEach(() => {
  store = {};
  vi.clearAllMocks();
  localStorageMock.getItem.mockImplementation((key: string) => (key in store ? store[key] : null));
  localStorageMock.setItem.mockImplementation((key: string, value: string) => {
    store[key] = value;
  });
  localStorageMock.removeItem.mockImplementation((key: string) => {
    delete store[key];
  });
});

// ── Fixtures ──

const FLIGHT_SYD_MEL = { kind: "flight", origin: "SYD", destination: "MEL" } as const;

function seed(items: unknown[], version: number = RECENT_ACTIVITY_VERSION): void {
  store[RECENT_ACTIVITY_STORAGE_KEY] = JSON.stringify({ v: version, items });
}

function storedItems(): RecentActivityEntry[] {
  const raw = store[RECENT_ACTIVITY_STORAGE_KEY];
  return raw ? JSON.parse(raw).items : [];
}

function flightEntry(
  overrides: Partial<FlightActivity> & { origin: string; destination: string; at: string },
): Record<string, unknown> {
  const { origin, destination, at, ...rest } = overrides;
  return {
    kind: "flight",
    key: `flight:${origin}-${destination}`,
    label: destination,
    origin,
    destination,
    at,
    ...rest,
  };
}

// ── Envelope failures ──

describe("recentActivity — invalid envelope", () => {
  it("returns an empty list when nothing is stored", () => {
    expect(loadRecentActivity(NOW)).toEqual([]);
    expect(localStorageMock.removeItem).not.toHaveBeenCalled();
  });

  it("discards malformed JSON and clears the key", () => {
    store[RECENT_ACTIVITY_STORAGE_KEY] = "{not json";
    expect(loadRecentActivity(NOW)).toEqual([]);
    expect(store[RECENT_ACTIVITY_STORAGE_KEY]).toBeUndefined();
    expect(localStorageMock.removeItem).toHaveBeenCalledWith(RECENT_ACTIVITY_STORAGE_KEY);
  });

  it("discards an unknown version and clears the key", () => {
    seed([flightEntry({ origin: "SYD", destination: "MEL", at: isoDaysAgo(1) })], 99);
    expect(loadRecentActivity(NOW)).toEqual([]);
    expect(store[RECENT_ACTIVITY_STORAGE_KEY]).toBeUndefined();
  });

  it("discards a missing items array and clears the key", () => {
    store[RECENT_ACTIVITY_STORAGE_KEY] = JSON.stringify({ v: RECENT_ACTIVITY_VERSION });
    expect(loadRecentActivity(NOW)).toEqual([]);
    expect(store[RECENT_ACTIVITY_STORAGE_KEY]).toBeUndefined();
  });

  it("discards a non-array items field and clears the key", () => {
    store[RECENT_ACTIVITY_STORAGE_KEY] = JSON.stringify({ v: RECENT_ACTIVITY_VERSION, items: { a: 1 } });
    expect(loadRecentActivity(NOW)).toEqual([]);
    expect(store[RECENT_ACTIVITY_STORAGE_KEY]).toBeUndefined();
  });

  it("discards a non-object payload and clears the key", () => {
    store[RECENT_ACTIVITY_STORAGE_KEY] = JSON.stringify(["nope"]);
    expect(loadRecentActivity(NOW)).toEqual([]);
    expect(store[RECENT_ACTIVITY_STORAGE_KEY]).toBeUndefined();
  });
});

// ── Item-level salvage ──

describe("recentActivity — item-level corruption is salvaged", () => {
  it("drops only the invalid entry and keeps its valid siblings", () => {
    seed([
      flightEntry({ origin: "SYD", destination: "MEL", at: isoDaysAgo(1) }),
      { kind: "flight", origin: "NOPE", destination: "???", at: isoDaysAgo(2) },
      { kind: "things", key: "things:bali|", label: "Bali", city: "Bali", at: isoDaysAgo(3) },
    ]);

    const entries = loadRecentActivity(NOW);

    expect(entries).toHaveLength(2);
    expect(entries.map(e => e.key)).toEqual(["flight:SYD-MEL", "things:bali|"]);
  });

  it("keeps valid entries when siblings are the wrong shape entirely", () => {
    seed([
      null,
      "a string",
      42,
      [],
      { kind: "unknown", at: isoDaysAgo(1) },
      { kind: "stay", destination: "Sydney", at: isoDaysAgo(1) },
    ]);

    const entries = loadRecentActivity(NOW);

    expect(entries).toHaveLength(1);
    expect(entries[0].key).toBe("stay:sydney");
  });

  it("drops entries with a missing or unparseable timestamp", () => {
    seed([
      { kind: "stay", destination: "Sydney" },
      { kind: "stay", destination: "Hobart", at: "not-a-date" },
      { kind: "stay", destination: "Perth", at: isoDaysAgo(1) },
    ]);

    expect(loadRecentActivity(NOW).map(e => e.label)).toEqual(["Perth"]);
  });

  it("drops entries timestamped far in the future", () => {
    seed([
      { kind: "stay", destination: "Sydney", at: daysFromNow(30).toISOString() },
      { kind: "stay", destination: "Perth", at: isoDaysAgo(1) },
    ]);

    expect(loadRecentActivity(NOW).map(e => e.label)).toEqual(["Perth"]);
  });

  it("returns an empty array without throwing when every item is invalid", () => {
    seed([null, { kind: "flight" }, { kind: "things" }, "x"]);

    expect(() => loadRecentActivity(NOW)).not.toThrow();
    expect(loadRecentActivity(NOW)).toEqual([]);
  });

  it("rewrites the store after salvaging so pruning is durable", () => {
    seed([
      flightEntry({ origin: "SYD", destination: "MEL", at: isoDaysAgo(1) }),
      { kind: "flight", origin: "BAD", destination: "BAD", at: isoDaysAgo(2) },
    ]);

    loadRecentActivity(NOW);

    expect(storedItems()).toHaveLength(1);
    expect(storedItems()[0].key).toBe("flight:SYD-MEL");
  });

  it("removes the key entirely when nothing survives pruning", () => {
    seed([{ kind: "flight", origin: "BAD", destination: "BAD", at: isoDaysAgo(2) }]);

    loadRecentActivity(NOW);

    expect(store[RECENT_ACTIVITY_STORAGE_KEY]).toBeUndefined();
  });

  it("repairs at most once — a second load writes nothing", () => {
    seed([
      { ...flightEntry({ origin: "SYD", destination: "MEL", at: isoDaysAgo(1) }), price: 99 },
      { kind: "flight", origin: "BAD", destination: "BAD", at: isoDaysAgo(2) },
    ]);

    loadRecentActivity(NOW);
    vi.clearAllMocks();
    loadRecentActivity(NOW);

    expect(localStorageMock.setItem).not.toHaveBeenCalled();
    expect(localStorageMock.removeItem).not.toHaveBeenCalled();
  });

  it("does not rewrite the store when every entry is already valid", () => {
    seed([flightEntry({ origin: "SYD", destination: "MEL", at: isoDaysAgo(1) })]);
    vi.clearAllMocks();

    loadRecentActivity(NOW);

    expect(localStorageMock.setItem).not.toHaveBeenCalled();
    expect(localStorageMock.removeItem).not.toHaveBeenCalled();
  });
});

// ── Duplicate salvage ──

describe("recentActivity — duplicate keys in a valid envelope", () => {
  const older = flightEntry({
    origin: "SYD",
    destination: "MEL",
    at: isoDaysAgo(10),
    destinationLabel: "OLDER",
  });
  const newer = flightEntry({
    origin: "SYD",
    destination: "MEL",
    at: isoDaysAgo(1),
    destinationLabel: "NEWER",
  });

  it("keeps exactly one entry when stored oldest-first", () => {
    seed([older, newer]);

    const entries = loadRecentActivity(NOW);

    expect(entries).toHaveLength(1);
    expect((entries[0] as FlightActivity).destinationLabel).toBe("NEWER");
  });

  it("keeps exactly one entry when stored newest-first", () => {
    seed([newer, older]);

    const entries = loadRecentActivity(NOW);

    expect(entries).toHaveLength(1);
    expect((entries[0] as FlightActivity).destinationLabel).toBe("NEWER");
  });

  it("resolves to the same entry regardless of stored order", () => {
    seed([older, newer]);
    const forward = loadRecentActivity(NOW);

    store = {};
    seed([newer, older]);
    const reversed = loadRecentActivity(NOW);

    expect(forward).toEqual(reversed);
  });

  it("keeps the newest across more than two duplicates in any order", () => {
    const middle = flightEntry({
      origin: "SYD",
      destination: "MEL",
      at: isoDaysAgo(5),
      destinationLabel: "MIDDLE",
    });

    for (const order of [[older, middle, newer], [newer, middle, older], [middle, newer, older]]) {
      store = {};
      seed(order);
      const entries = loadRecentActivity(NOW);
      expect(entries).toHaveLength(1);
      expect((entries[0] as FlightActivity).destinationLabel).toBe("NEWER");
    }
  });

  it("never deletes both duplicates", () => {
    seed([older, newer]);

    expect(loadRecentActivity(NOW)).toHaveLength(1);
    expect(store[RECENT_ACTIVITY_STORAGE_KEY]).toBeDefined();
  });

  it("writes the deduplicated list back to storage", () => {
    seed([older, newer]);

    loadRecentActivity(NOW);

    expect(storedItems()).toHaveLength(1);
    expect((storedItems()[0] as FlightActivity).destinationLabel).toBe("NEWER");
  });

  it("collapses duplicates that differ only after normalisation", () => {
    seed([
      { kind: "stay", destination: "São Paulo", at: isoDaysAgo(9) },
      { kind: "stay", destination: "sao   paulo", at: isoDaysAgo(2) },
    ]);

    const entries = loadRecentActivity(NOW);

    expect(entries).toHaveLength(1);
    expect(entries[0].label).toBe("sao paulo");
  });

  it("does not collapse duplicates that only share a timestamp", () => {
    const at = isoDaysAgo(2);
    seed([
      { kind: "stay", destination: "Sydney", at },
      { kind: "stay", destination: "Perth", at },
    ]);

    expect(loadRecentActivity(NOW)).toHaveLength(2);
  });
});

// ── Cap and ordering ──

describe("recentActivity — cap and ordering", () => {
  it("caps the store at MAX_STORED_ITEMS entries", () => {
    let entries: RecentActivityEntry[] = [];
    for (let i = 0; i < MAX_STORED_ITEMS + 4; i++) {
      entries = recordActivity(
        { kind: "things", city: `City ${i}` },
        new Date(NOW.getTime() + i * 1000),
      );
    }

    expect(entries).toHaveLength(MAX_STORED_ITEMS);
    expect(storedItems()).toHaveLength(MAX_STORED_ITEMS);
  });

  it("evicts the oldest entry when the cap is exceeded", () => {
    for (let i = 0; i < MAX_STORED_ITEMS + 1; i++) {
      recordActivity({ kind: "things", city: `City ${i}` }, new Date(NOW.getTime() + i * 1000));
    }

    const labels = loadRecentActivity(NOW).map(e => e.label);
    expect(labels).not.toContain("City 0");
    expect(labels[0]).toBe(`City ${MAX_STORED_ITEMS}`);
  });

  it("returns newest entries first, whatever order storage held them in", () => {
    seed([
      { kind: "stay", destination: "Oldest", at: isoDaysAgo(10) },
      { kind: "stay", destination: "Newest", at: isoDaysAgo(1) },
      { kind: "stay", destination: "Middle", at: isoDaysAgo(5) },
    ]);

    expect(loadRecentActivity(NOW).map(e => e.label)).toEqual(["Newest", "Middle", "Oldest"]);
  });

  it("puts a newly recorded entry at the front", () => {
    recordActivity({ kind: "things", city: "Bali" }, daysFromNow(-2));
    const entries = recordActivity({ kind: "stay", destination: "Sydney" }, NOW);

    expect(entries.map(e => e.label)).toEqual(["Sydney", "Bali"]);
  });
});

// ── Retention ──

describe("recentActivity — 30-day retention", () => {
  it("drops entries older than 30 days on load", () => {
    seed([
      { kind: "stay", destination: "Fresh", at: isoDaysAgo(29) },
      { kind: "stay", destination: "Stale", at: isoDaysAgo(31) },
    ]);

    expect(loadRecentActivity(NOW).map(e => e.label)).toEqual(["Fresh"]);
  });

  it("removes expired entries from storage on load, not just from the result", () => {
    seed([
      { kind: "stay", destination: "Fresh", at: isoDaysAgo(29) },
      { kind: "stay", destination: "Stale", at: isoDaysAgo(31) },
    ]);

    loadRecentActivity(NOW);

    expect(storedItems().map(e => e.label)).toEqual(["Fresh"]);
  });

  it("drops expired entries on record", () => {
    seed([
      { kind: "stay", destination: "Stale", at: isoDaysAgo(45) },
      { kind: "things", city: "Fresh", at: isoDaysAgo(2) },
    ]);

    const entries = recordActivity(FLIGHT_SYD_MEL, NOW);

    expect(entries.map(e => e.label)).toEqual(["MEL", "Fresh"]);
    expect(storedItems().map(e => e.label)).toEqual(["MEL", "Fresh"]);
  });

  it("keeps an entry that is exactly at the retention boundary", () => {
    seed([{ kind: "stay", destination: "Boundary", at: isoDaysAgo(30) }]);

    expect(loadRecentActivity(NOW)).toHaveLength(1);
  });
});

// ── Dedupe ──

describe("recentActivity — deduplication", () => {
  it("replaces a duplicate flight route rather than appending", () => {
    recordActivity(
      { kind: "flight", origin: "SYD", destination: "MEL", departureDate: FUTURE },
      daysFromNow(-2),
    );
    const entries = recordActivity(
      { kind: "flight", origin: "SYD", destination: "MEL", destinationLabel: "Melbourne" },
      NOW,
    );

    expect(entries).toHaveLength(1);
    expect(entries[0].label).toBe("Melbourne");
  });

  it("does not let a new dateless search inherit the previous dates", () => {
    recordActivity(
      {
        kind: "flight",
        origin: "SYD",
        destination: "MEL",
        departureDate: FUTURE,
        returnDate: FUTURE_RETURN,
        travellers: { adults: 2, children: 0, infants: 0 },
        cabinClass: "business",
      },
      daysFromNow(-2),
    );

    const [entry] = recordActivity({ kind: "flight", origin: "SYD", destination: "MEL" }, NOW) as FlightActivity[];

    expect(entry.departureDate).toBeUndefined();
    expect(entry.returnDate).toBeUndefined();
    expect(entry.travellers).toBeUndefined();
    expect(entry.cabinClass).toBeUndefined();
  });

  it("keeps reverse routes as distinct entries", () => {
    recordActivity({ kind: "flight", origin: "SYD", destination: "MEL" }, daysFromNow(-1));
    const entries = recordActivity({ kind: "flight", origin: "MEL", destination: "SYD" }, NOW);

    expect(entries).toHaveLength(2);
    expect(entries.map(e => e.key)).toEqual(["flight:MEL-SYD", "flight:SYD-MEL"]);
  });

  it("uppercases IATA codes so casing never splits a route", () => {
    recordActivity({ kind: "flight", origin: "syd", destination: "mel" }, daysFromNow(-1));
    const entries = recordActivity({ kind: "flight", origin: "SYD", destination: "MEL" }, NOW);

    expect(entries).toHaveLength(1);
    expect(entries[0].key).toBe("flight:SYD-MEL");
  });

  it("normalises stay destinations for dedupe", () => {
    recordActivity({ kind: "stay", destination: "Sydney" }, daysFromNow(-1));
    const entries = recordActivity({ kind: "stay", destination: "  SYDNEY  " }, NOW);

    expect(entries).toHaveLength(1);
    expect(entries[0].key).toBe("stay:sydney");
  });

  it("normalises things city and query together for dedupe", () => {
    recordActivity({ kind: "things", city: "Bali", query: "Surf Lesson" }, daysFromNow(-1));
    const same = recordActivity({ kind: "things", city: "  bali ", query: "surf   lesson" }, NOW);

    expect(same).toHaveLength(1);
    expect(same[0].key).toBe("things:bali|surf lesson");

    const different = recordActivity({ kind: "things", city: "Bali", query: "diving" }, NOW);
    expect(different).toHaveLength(2);
  });

  it("treats a things search with no query as distinct from one with a query", () => {
    recordActivity({ kind: "things", city: "Bali" }, daysFromNow(-1));
    const entries = recordActivity({ kind: "things", city: "Bali", query: "diving" }, NOW);

    expect(entries.map(e => e.key)).toEqual(["things:bali|diving", "things:bali|"]);
  });

  it("strips diacritics and collapses whitespace when building keys", () => {
    expect(buildDedupeKey({ kind: "stay", destination: "  SÃO   Paulo " })).toBe("stay:sao paulo");
    expect(buildDedupeKey({ kind: "stay", destination: "Zürich" })).toBe("stay:zurich");
    expect(buildDedupeKey({ kind: "things", city: "Malmö\tCity\n" })).toBe("things:malmo city|");
  });

  it("dedupes destinations that differ only by accent or spacing", () => {
    recordActivity({ kind: "stay", destination: "São Paulo" }, daysFromNow(-1));
    const entries = recordActivity({ kind: "stay", destination: "Sao   Paulo" }, NOW);

    expect(entries).toHaveLength(1);
    expect(entries[0].key).toBe("stay:sao paulo");
  });

  it("preserves the original label casing and accents for display", () => {
    const [entry] = recordActivity({ kind: "stay", destination: "  São Paulo  " }, NOW);

    expect(entry.label).toBe("São Paulo");
    expect((entry as StayActivity).destination).toBe("São Paulo");
  });

  it("exposes the dedupe key an input would use", () => {
    expect(buildDedupeKey({ kind: "flight", origin: "syd", destination: "mel" })).toBe("flight:SYD-MEL");
    expect(buildDedupeKey({ kind: "stay", destination: "Sydney" })).toBe("stay:sydney");
    expect(buildDedupeKey({ kind: "things", city: "Bali" })).toBe("things:bali|");
    expect(buildDedupeKey({ kind: "flight", origin: "SYD", destination: "SYD" })).toBeNull();
  });
});

// ── Normalisation edge cases ──

describe("recentActivity — normalisation cannot produce an empty key", () => {
  it("rejects a whitespace-only destination or city", () => {
    expect(buildDedupeKey({ kind: "stay", destination: "   \t\n " })).toBeNull();
    expect(buildDedupeKey({ kind: "things", city: "  " })).toBeNull();
    expect(recordActivity({ kind: "stay", destination: "   " }, NOW)).toEqual([]);
    expect(store[RECENT_ACTIVITY_STORAGE_KEY]).toBeUndefined();
  });

  it("rejects a destination made only of combining marks", () => {
    const marksOnly = COMBINING_ACUTE.repeat(4);

    expect(buildDedupeKey({ kind: "stay", destination: marksOnly })).toBeNull();
    expect(buildDedupeKey({ kind: "things", city: marksOnly })).toBeNull();
    expect(recordActivity({ kind: "stay", destination: marksOnly }, NOW)).toEqual([]);
    expect(recordActivity({ kind: "things", city: marksOnly }, NOW)).toEqual([]);
  });

  it("never produces a key with an empty required place segment", () => {
    const forbidden = ["stay:", "things:|", `things:|museum`];

    for (const value of ["   ", COMBINING_ACUTE, COMBINING_ACUTE + " "]) {
      expect(forbidden).not.toContain(buildDedupeKey({ kind: "stay", destination: value }));
      expect(forbidden).not.toContain(buildDedupeKey({ kind: "things", city: value, query: "museum" }));
    }

    expect(buildDedupeKey({ kind: "things", city: "   ", query: "museum" })).toBeNull();
  });

  it("drops a query that normalises away, so payload and key agree", () => {
    const [entry] = recordActivity(
      { kind: "things", city: "Bali", query: COMBINING_ACUTE.repeat(3) },
      NOW,
    ) as ThingsActivity[];

    expect(entry.key).toBe("things:bali|");
    expect(entry.query).toBeUndefined();
  });

  it("does not let a marks-only query create a second entry for one city", () => {
    recordActivity({ kind: "things", city: "Bali", query: COMBINING_ACUTE }, daysFromNow(-1));
    const entries = recordActivity({ kind: "things", city: "Bali" }, NOW);

    expect(entries).toHaveLength(1);
    expect(entries[0].key).toBe("things:bali|");
  });

  it("keeps a place whose accents normalise but whose letters survive", () => {
    expect(buildDedupeKey({ kind: "stay", destination: `e${COMBINING_ACUTE}vian` })).toBe("stay:evian");
  });
});

// ── String bounds ──

describe("recentActivity — persisted strings are bounded", () => {
  it("keeps a label of exactly MAX_LABEL_LENGTH characters", () => {
    const exact = "a".repeat(MAX_LABEL_LENGTH);
    const [entry] = recordActivity({ kind: "stay", destination: exact }, NOW) as StayActivity[];

    expect(entry.destination).toHaveLength(MAX_LABEL_LENGTH);
    expect(entry.destination).toBe(exact);
  });

  it("truncates a label one character over the limit", () => {
    const [entry] = recordActivity(
      { kind: "stay", destination: "b".repeat(MAX_LABEL_LENGTH + 1) },
      NOW,
    ) as StayActivity[];

    expect(entry.destination).toHaveLength(MAX_LABEL_LENGTH);
    expect(entry.label).toHaveLength(MAX_LABEL_LENGTH);
  });

  it("truncates a multi-kilobyte label rather than persisting it", () => {
    const huge = "c".repeat(20_000);
    recordActivity({ kind: "things", city: huge }, NOW);

    const [entry] = storedItems() as ThingsActivity[];
    expect(entry.city).toHaveLength(MAX_LABEL_LENGTH);
    expect(store[RECENT_ACTIVITY_STORAGE_KEY].length).toBeLessThan(1_000);
  });

  it("bounds every flight label independently", () => {
    const [entry] = recordActivity(
      {
        kind: "flight",
        origin: "SYD",
        destination: "MEL",
        originLabel: "o".repeat(5_000),
        destinationLabel: "d".repeat(5_000),
      },
      NOW,
    ) as FlightActivity[];

    expect(entry.originLabel).toHaveLength(MAX_LABEL_LENGTH);
    expect(entry.destinationLabel).toHaveLength(MAX_LABEL_LENGTH);
    expect(entry.label).toHaveLength(MAX_LABEL_LENGTH);
  });

  it("keeps a query of exactly MAX_QUERY_LENGTH and truncates one over", () => {
    const exact = "q".repeat(MAX_QUERY_LENGTH);
    const [kept] = recordActivity({ kind: "things", city: "Bali", query: exact }, NOW) as ThingsActivity[];
    expect(kept.query).toBe(exact);

    const [cut] = recordActivity(
      { kind: "things", city: "Ubud", query: "r".repeat(MAX_QUERY_LENGTH + 1) },
      NOW,
    ) as ThingsActivity[];
    expect(cut.query).toHaveLength(MAX_QUERY_LENGTH);
  });

  it("truncates on code points, so a surrogate pair is never split", () => {
    const [entry] = recordActivity(
      { kind: "things", city: "Bali", query: "\u{1F600}".repeat(50) },
      NOW,
    ) as ThingsActivity[];

    // 40 whole emoji: 40 code points, 80 UTF-16 units. A unit-based slice would
    // have produced 20 emoji, or worse, a lone surrogate.
    expect(Array.from(entry.query!)).toHaveLength(MAX_QUERY_LENGTH);
    expect(entry.query!.length).toBe(MAX_QUERY_LENGTH * 2);
    expect(JSON.parse(JSON.stringify(entry.query))).toBe(entry.query);
  });

  it("keeps the whole store small even when every field is at its limit", () => {
    for (let i = 0; i < MAX_STORED_ITEMS; i++) {
      recordActivity(
        {
          kind: "flight",
          origin: `A${String.fromCharCode(65 + i)}A`,
          destination: "MEL",
          originLabel: "o".repeat(MAX_LABEL_LENGTH),
          destinationLabel: "d".repeat(MAX_LABEL_LENGTH),
          departureDate: FUTURE,
          returnDate: FUTURE_RETURN,
        },
        new Date(NOW.getTime() + i * 1000),
      );
    }

    expect(storedItems()).toHaveLength(MAX_STORED_ITEMS);
    expect(store[RECENT_ACTIVITY_STORAGE_KEY].length).toBeLessThan(8_000);
  });

  it("derives the dedupe key from the truncated text, not the original", () => {
    const long = "z".repeat(MAX_LABEL_LENGTH + 50);
    const [entry] = recordActivity({ kind: "stay", destination: long }, NOW) as StayActivity[];

    expect(entry.key).toBe(`stay:${"z".repeat(MAX_LABEL_LENGTH)}`);
    expect(entry.key.length).toBeLessThanOrEqual(MAX_LABEL_LENGTH + "stay:".length);
  });
});

// ── Storage failures ──

describe("recentActivity — storage failures", () => {
  it("treats a setItem failure as a silent no-op", () => {
    seed([{ kind: "stay", destination: "Sydney", at: isoDaysAgo(1) }]);
    localStorageMock.setItem.mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });

    let entries: RecentActivityEntry[] = [];
    expect(() => {
      entries = recordActivity(FLIGHT_SYD_MEL, NOW);
    }).not.toThrow();

    // Nothing was persisted, and the caller is handed the unchanged list.
    expect(storedItems()).toHaveLength(1);
    expect((storedItems()[0] as StayActivity).destination).toBe("Sydney");
    expect(entries.map(e => e.label)).toEqual(["Sydney"]);
    expect(entries.some(e => e.key === "flight:SYD-MEL")).toBe(false);
  });

  it("does not throw when getItem fails", () => {
    localStorageMock.getItem.mockImplementation(() => {
      throw new Error("SecurityError");
    });

    expect(() => loadRecentActivity(NOW)).not.toThrow();
    expect(loadRecentActivity(NOW)).toEqual([]);
    expect(() => recordActivity(FLIGHT_SYD_MEL, NOW)).not.toThrow();
  });

  it("does not modify any storage when getItem fails", () => {
    store["bf_trip_context"] = "trip";
    store["unrelated"] = "value";
    const before = { ...store };

    localStorageMock.getItem.mockImplementation(() => {
      throw new Error("SecurityError");
    });

    loadRecentActivity(NOW);

    expect(localStorageMock.removeItem).not.toHaveBeenCalled();
    expect(store).toEqual(before);
  });

  it("does not throw when removeItem fails", () => {
    store[RECENT_ACTIVITY_STORAGE_KEY] = "{broken";
    localStorageMock.removeItem.mockImplementation(() => {
      throw new Error("SecurityError");
    });

    expect(() => loadRecentActivity(NOW)).not.toThrow();
    expect(() => clearRecentActivity()).not.toThrow();
  });

  it("returns entries the caller cannot use to mutate module state", () => {
    recordActivity({ kind: "stay", destination: "Sydney" }, NOW);
    const first = loadRecentActivity(NOW);

    first.length = 0;
    const second = loadRecentActivity(NOW);

    expect(second).toHaveLength(1);
  });
});

describe("recentActivity — leaves neighbouring storage alone", () => {
  const neighbours = {
    bf_trip_context: JSON.stringify({ version: 1, destination: { name: "Bali" } }),
    "bookingsfinder.trip-cost.draft.v1": JSON.stringify({ version: 1, state: {} }),
    recent_airports: JSON.stringify([{ code: "SYD" }]),
    geo_location: JSON.stringify({ city: "Brisbane" }),
  };

  beforeEach(() => {
    Object.assign(store, neighbours);
  });

  it("clears only its own key", () => {
    seed([{ kind: "stay", destination: "Sydney", at: isoDaysAgo(1) }]);

    clearRecentActivity();

    expect(store[RECENT_ACTIVITY_STORAGE_KEY]).toBeUndefined();
    expect(store).toEqual(neighbours);
  });

  it("leaves neighbours untouched across load, record and repair", () => {
    seed([
      { kind: "flight", origin: "BAD", destination: "BAD", at: isoDaysAgo(1) },
      { kind: "stay", destination: "Sydney", at: isoDaysAgo(1) },
    ]);

    loadRecentActivity(NOW);
    recordActivity(FLIGHT_SYD_MEL, NOW);
    loadRecentActivity(NOW);
    clearRecentActivity();

    expect(store).toEqual(neighbours);
  });

  it("leaves neighbours untouched when the envelope is discarded", () => {
    store[RECENT_ACTIVITY_STORAGE_KEY] = "{broken";

    loadRecentActivity(NOW);

    expect(store).toEqual(neighbours);
  });
});

// ── Field allowlist and privacy ──

describe("recentActivity — persisted shape", () => {
  const HOSTILE = {
    kind: "flight",
    origin: "SYD",
    destination: "MEL",
    price: 412.5,
    fare: "cheap",
    currency: "AUD",
    url: "https://partner.example/deep-link?aff=123",
    href: "/flights?origin=SYD",
    email: "traveller@example.com",
    userId: "user_123",
    sessionId: "sess_abc",
    accessToken: "eyJhbGciOi",
    latitude: -33.86,
    longitude: 151.2,
    referrer: "https://google.com",
    notes: "honeymoon budget 5k",
    dailySpend: 250,
  };

  const FORBIDDEN_TOKENS = [
    "price", "fare", "currency", "url", "href", "email", "userId", "sessionId",
    "accessToken", "latitude", "longitude", "referrer", "notes", "dailySpend",
    "412.5", "partner.example", "traveller@example.com", "151.2", "250",
  ];

  it("never persists forbidden fields supplied by a caller", () => {
    recordActivity(HOSTILE as unknown as Parameters<typeof recordActivity>[0], NOW);

    const serialised = store[RECENT_ACTIVITY_STORAGE_KEY];
    for (const forbidden of FORBIDDEN_TOKENS) {
      expect(serialised).not.toContain(forbidden);
    }

    expect(Object.keys(storedItems()[0]).sort()).toEqual([
      "at", "destination", "key", "kind", "label", "origin",
    ]);
  });

  it("purges forbidden fields injected directly into storage", () => {
    seed([{ ...HOSTILE, at: isoDaysAgo(1) }]);

    const [entry] = loadRecentActivity(NOW);

    expect(Object.keys(entry).sort()).toEqual(["at", "destination", "key", "kind", "label", "origin"]);

    // The repair pass rewrites the store, so the tampered values do not linger.
    const serialised = store[RECENT_ACTIVITY_STORAGE_KEY];
    for (const forbidden of FORBIDDEN_TOKENS) {
      expect(serialised).not.toContain(forbidden);
    }
  });

  it("purges an invalid optional field from storage as well as from the result", () => {
    seed([
      flightEntry({ origin: "SYD", destination: "MEL", at: isoDaysAgo(1), departureDate: "2026-02-31" }),
    ]);

    loadRecentActivity(NOW);

    expect(store[RECENT_ACTIVITY_STORAGE_KEY]).not.toContain("departureDate");
  });

  it("recomputes the dedupe key instead of trusting a stored one", () => {
    seed([
      { kind: "flight", key: "flight:HACKED", label: "x", origin: "SYD", destination: "MEL", at: isoDaysAgo(1) },
    ]);

    expect(loadRecentActivity(NOW)[0].key).toBe("flight:SYD-MEL");
  });

  it("derives the label from the payload rather than trusting a stored one", () => {
    seed([
      { kind: "stay", key: "stay:sydney", label: "SOMETHING ELSE", destination: "Sydney", at: isoDaysAgo(1) },
    ]);

    expect(loadRecentActivity(NOW)[0].label).toBe("Sydney");
  });
});

describe("recentActivity — input validation", () => {
  it("requires two valid, distinct IATA codes for a flight", () => {
    const rejected = [
      { origin: "SYDN", destination: "MEL" },
      { origin: "SY", destination: "MEL" },
      { origin: "123", destination: "MEL" },
      { origin: "SYD", destination: "" },
      { origin: "SYD", destination: "SYD" },
      { origin: "syd", destination: "SYD" },
    ];

    for (const route of rejected) {
      expect(recordActivity({ kind: "flight", ...route } as never, NOW)).toEqual([]);
    }
    expect(store[RECENT_ACTIVITY_STORAGE_KEY]).toBeUndefined();
  });

  it("accepts lowercase IATA input and stores it uppercased", () => {
    const [entry] = recordActivity({ kind: "flight", origin: "syd", destination: "ktm" }, NOW) as FlightActivity[];

    expect(entry.origin).toBe("SYD");
    expect(entry.destination).toBe("KTM");
  });

  it("rejects stay and things entries with no destination", () => {
    expect(recordActivity({ kind: "stay", destination: "   " }, NOW)).toEqual([]);
    expect(recordActivity({ kind: "things", city: "" }, NOW)).toEqual([]);
    expect(recordActivity({ kind: "things", city: "  ", query: "surfing" }, NOW)).toEqual([]);
  });

  it("rejects an unknown activity kind", () => {
    expect(recordActivity({ kind: "tripcost" } as never, NOW)).toEqual([]);
    expect(recordActivity({ kind: "trip", destination: "Bali" } as never, NOW)).toEqual([]);
    expect(recordActivity(null as never, NOW)).toEqual([]);
  });

  it("drops an empty query rather than storing a blank string", () => {
    const [entry] = recordActivity({ kind: "things", city: "Bali", query: "   " }, NOW) as ThingsActivity[];

    expect(entry.query).toBeUndefined();
    expect(entry.key).toBe("things:bali|");
  });

  it("drops invalid travellers, cabin, guests and rooms without losing the entry", () => {
    const [flight] = recordActivity(
      {
        kind: "flight",
        origin: "SYD",
        destination: "MEL",
        travellers: { adults: 0, children: -1, infants: 99 },
        cabinClass: "platinum",
      },
      NOW,
    ) as FlightActivity[];

    expect(flight.travellers).toBeUndefined();
    expect(flight.cabinClass).toBeUndefined();

    const [stay] = recordActivity(
      { kind: "stay", destination: "Sydney", guests: 0, rooms: 999 },
      NOW,
    ) as StayActivity[];

    expect(stay.guests).toBeUndefined();
    expect(stay.rooms).toBeUndefined();
  });

  it("keeps valid travellers and cabin", () => {
    const [flight] = recordActivity(
      {
        kind: "flight",
        origin: "SYD",
        destination: "KTM",
        travellers: { adults: 2, children: 1, infants: 0 },
        cabinClass: "Business",
      },
      NOW,
    ) as FlightActivity[];

    expect(flight.travellers).toEqual({ adults: 2, children: 1, infants: 0 });
    expect(flight.cabinClass).toBe("business");
  });
});

// ── Date rules ──

describe("recentActivity — date handling", () => {
  it("never invents dates", () => {
    const [entry] = recordActivity(FLIGHT_SYD_MEL, NOW) as FlightActivity[];

    expect(entry.departureDate).toBeUndefined();
    expect(entry.returnDate).toBeUndefined();
    expect(store[RECENT_ACTIVITY_STORAGE_KEY]).not.toContain("departureDate");
  });

  it("rejects malformed and impossible calendar dates", () => {
    const [entry] = recordActivity(
      { kind: "flight", origin: "SYD", destination: "MEL", departureDate: "2026-02-31" },
      NOW,
    ) as FlightActivity[];
    expect(entry.departureDate).toBeUndefined();

    const [other] = recordActivity(
      { kind: "flight", origin: "SYD", destination: "PER", departureDate: "20/09/2026" },
      NOW,
    ) as FlightActivity[];
    expect(other.departureDate).toBeUndefined();
  });

  it("keeps explicitly chosen future dates", () => {
    const [entry] = recordActivity(
      { kind: "flight", origin: "SYD", destination: "KTM", departureDate: FUTURE, returnDate: FUTURE_RETURN },
      NOW,
    ) as FlightActivity[];

    expect(entry.departureDate).toBe(FUTURE);
    expect(entry.returnDate).toBe(FUTURE_RETURN);
  });

  it("removes a past departure date from restore data but keeps the route", () => {
    seed([
      flightEntry({
        origin: "SYD",
        destination: "MEL",
        at: isoDaysAgo(3),
        departureDate: PAST,
        returnDate: localDate(-1),
      }),
    ]);

    const [entry] = loadRecentActivity(NOW) as FlightActivity[];

    expect(entry.key).toBe("flight:SYD-MEL");
    expect(entry.departureDate).toBeUndefined();
    expect(entry.returnDate).toBeUndefined();
  });

  it("treats a departure date of today as still usable", () => {
    seed([flightEntry({ origin: "SYD", destination: "MEL", at: isoDaysAgo(1), departureDate: TODAY })]);

    expect((loadRecentActivity(NOW)[0] as FlightActivity).departureDate).toBe(TODAY);
  });

  it("leaves the user's own past dates in storage until the entry expires", () => {
    seed([flightEntry({ origin: "SYD", destination: "MEL", at: isoDaysAgo(3), departureDate: PAST })]);

    loadRecentActivity(NOW);

    expect((storedItems()[0] as FlightActivity).departureDate).toBe(PAST);
  });

  it("strips a date that expires between two loads without touching storage", () => {
    const soon = localDate(2);
    seed([flightEntry({ origin: "SYD", destination: "MEL", at: isoDaysAgo(1), departureDate: soon })]);

    expect((loadRecentActivity(NOW)[0] as FlightActivity).departureDate).toBe(soon);
    expect((loadRecentActivity(daysFromNow(5))[0] as FlightActivity).departureDate).toBeUndefined();
    expect((storedItems()[0] as FlightActivity).departureDate).toBe(soon);
  });

  it("removes a past check-in from stay restore data", () => {
    seed([
      { kind: "stay", destination: "Sydney", checkIn: PAST, checkOut: localDate(-2), at: isoDaysAgo(4) },
    ]);

    const [entry] = loadRecentActivity(NOW) as StayActivity[];

    expect(entry.destination).toBe("Sydney");
    expect(entry.checkIn).toBeUndefined();
    expect(entry.checkOut).toBeUndefined();
  });

  it("drops a return date that precedes the departure date", () => {
    const [entry] = recordActivity(
      { kind: "flight", origin: "SYD", destination: "MEL", departureDate: FUTURE, returnDate: localDate(5) },
      NOW,
    ) as FlightActivity[];

    expect(entry.departureDate).toBe(FUTURE);
    expect(entry.returnDate).toBeUndefined();
  });

  it("drops a return or check-out date supplied without its opening date", () => {
    const [flight] = recordActivity(
      { kind: "flight", origin: "SYD", destination: "MEL", returnDate: FUTURE_RETURN },
      NOW,
    ) as FlightActivity[];
    expect(flight.returnDate).toBeUndefined();

    const [stay] = recordActivity({ kind: "stay", destination: "Sydney", checkOut: FUTURE }, NOW) as StayActivity[];
    expect(stay.checkOut).toBeUndefined();
  });

  it("drops a check-out that is not after the check-in", () => {
    const [stay] = recordActivity(
      { kind: "stay", destination: "Sydney", checkIn: FUTURE, checkOut: FUTURE },
      NOW,
    ) as StayActivity[];

    expect(stay.checkIn).toBe(FUTURE);
    expect(stay.checkOut).toBeUndefined();
  });

  it("agrees across record, load and both selectors about a past date", () => {
    seed([flightEntry({ origin: "SYD", destination: "MEL", at: isoDaysAgo(2), departureDate: PAST })]);

    const recorded = recordActivity({ kind: "things", city: "Bali" }, NOW) as FlightActivity[];
    const loaded = loadRecentActivity(NOW) as FlightActivity[];
    const flightFromRecord = recorded.find(isFlightActivity);
    const flightFromLoad = loaded.find(isFlightActivity);

    expect(flightFromRecord?.departureDate).toBeUndefined();
    expect(flightFromLoad?.departureDate).toBeUndefined();
    expect(selectContinuationCandidate(loaded, NOW)).toBeNull();
    expect(
      (selectRecentItems(loaded, null, MAX_RECENT_ITEMS, NOW).find(isFlightActivity) as FlightActivity)
        .departureDate,
    ).toBeUndefined();
  });
});

// ── Selectors ──

describe("recentActivity — selectContinuationCandidate", () => {
  const routeOnly: FlightActivity = {
    kind: "flight", key: "flight:SYD-MEL", label: "MEL", at: isoDaysAgo(1),
    origin: "SYD", destination: "MEL",
  };
  const dated: FlightActivity = {
    kind: "flight", key: "flight:SYD-KTM", label: "Kathmandu", at: isoDaysAgo(3),
    origin: "SYD", destination: "KTM", departureDate: FUTURE, returnDate: FUTURE_RETURN,
  };

  it("returns null for an empty list", () => {
    expect(selectContinuationCandidate([], NOW)).toBeNull();
  });

  it("does not treat a route-only flight search as a continuation", () => {
    expect(selectContinuationCandidate([routeOnly], NOW)).toBeNull();
  });

  it("does not treat a past-dated flight as a continuation, whatever the source", () => {
    // Recorded 7 days ago for a departure 5 days ago.
    const past: FlightActivity = {
      ...dated,
      at: isoDaysAgo(7),
      departureDate: PAST,
      returnDate: undefined,
    };

    expect(selectContinuationCandidate([past], NOW)).toBeNull();
    // Same array, evaluated a day before that departure — when the entry was
    // still both in-window and future-dated. The only thing that changes the
    // answer is `now`.
    expect(selectContinuationCandidate([past], daysFromNow(-6))?.key).toBe("flight:SYD-KTM");
  });

  it("returns a future-dated flight as the continuation candidate", () => {
    const candidate = selectContinuationCandidate([routeOnly, dated], NOW);

    expect(candidate).not.toBeNull();
    expect(candidate?.key).toBe("flight:SYD-KTM");
    expect(candidate?.departureDate).toBe(FUTURE);
  });

  it("accepts a departure date of today", () => {
    expect(selectContinuationCandidate([{ ...dated, departureDate: TODAY }], NOW)?.key).toBe("flight:SYD-KTM");
  });

  it("prefers the most recent qualifying flight", () => {
    const newer: FlightActivity = { ...dated, key: "flight:BNE-NAN", origin: "BNE", destination: "NAN", at: isoDaysAgo(1) };

    expect(selectContinuationCandidate([dated, newer], NOW)?.key).toBe("flight:BNE-NAN");
  });

  it("never promotes a stay or things entry", () => {
    const stay: StayActivity = {
      kind: "stay", key: "stay:sydney", label: "Sydney", at: isoDaysAgo(1),
      destination: "Sydney", checkIn: FUTURE, checkOut: FUTURE_RETURN,
    };
    const things: ThingsActivity = {
      kind: "things", key: "things:bali|", label: "Bali", at: isoDaysAgo(1), city: "Bali",
    };

    expect(selectContinuationCandidate([stay, things], NOW)).toBeNull();
  });

  it("rejects an invalid route even when the caller supplied a plausible key", () => {
    const bogus = [
      { ...dated, key: "flight:SYD-KTM", origin: "SYDNEY", destination: "KTM" },
      { ...dated, key: "flight:SYD-SYD", origin: "SYD", destination: "SYD" },
    ] as unknown as RecentActivityEntry[];

    expect(selectContinuationCandidate(bogus, NOW)).toBeNull();
  });

  it("ignores malformed entries handed in by a caller", () => {
    const junk = [{ kind: "flight", origin: "NOPE" }, null, "x"] as unknown as RecentActivityEntry[];

    expect(selectContinuationCandidate(junk, NOW)).toBeNull();
  });

  it("canonicalises the entry it returns", () => {
    const tampered = [
      { ...dated, key: "flight:WRONG", label: "spoofed", price: 999 },
    ] as unknown as RecentActivityEntry[];

    const candidate = selectContinuationCandidate(tampered, NOW);

    expect(candidate?.key).toBe("flight:SYD-KTM");
    expect(candidate).not.toHaveProperty("price");
  });
});

describe("recentActivity — selectRecentItems", () => {
  const entries: RecentActivityEntry[] = [
    { kind: "flight", key: "flight:SYD-MEL", label: "MEL", at: isoDaysAgo(1), origin: "SYD", destination: "MEL" },
    { kind: "stay", key: "stay:sydney", label: "Sydney", at: isoDaysAgo(2), destination: "Sydney" },
    { kind: "things", key: "things:bali|", label: "Bali", at: isoDaysAgo(3), city: "Bali" },
    { kind: "flight", key: "flight:BNE-NAN", label: "NAN", at: isoDaysAgo(4), origin: "BNE", destination: "NAN" },
  ];

  it("returns at most MAX_RECENT_ITEMS, newest first", () => {
    const items = selectRecentItems(entries, null, MAX_RECENT_ITEMS, NOW);

    expect(items).toHaveLength(MAX_RECENT_ITEMS);
    expect(items.map(e => e.key)).toEqual(["flight:SYD-MEL", "stay:sydney", "things:bali|"]);
  });

  it("excludes the continuation entry passed by the caller", () => {
    const items = selectRecentItems(entries, entries[0], MAX_RECENT_ITEMS, NOW);

    expect(items.map(e => e.key)).toEqual(["stay:sydney", "things:bali|", "flight:BNE-NAN"]);
    expect(items.some(e => e.key === "flight:SYD-MEL")).toBe(false);
  });

  it("accepts a bare key as the exclusion", () => {
    const items = selectRecentItems(entries, "stay:sydney", MAX_RECENT_ITEMS, NOW);
    expect(items.map(e => e.key)).not.toContain("stay:sydney");
  });

  it("excludes correctly even when the caller's entry carries a stale key", () => {
    const stale = { ...entries[0], key: "flight:STALE" } as RecentActivityEntry;

    const items = selectRecentItems(entries, stale, MAX_RECENT_ITEMS, NOW);

    expect(items.map(e => e.key)).not.toContain("flight:SYD-MEL");
  });

  it("honours a limit that narrows the result", () => {
    expect(selectRecentItems(entries, null, 2, NOW)).toHaveLength(2);
    expect(selectRecentItems(entries, null, 0, NOW)).toEqual([]);
  });

  it("clamps a limit that would exceed the homepage invariant", () => {
    expect(entries.length).toBeGreaterThan(MAX_RECENT_ITEMS);

    expect(selectRecentItems(entries, null, 4, NOW)).toHaveLength(MAX_RECENT_ITEMS);
    expect(selectRecentItems(entries, null, 100, NOW)).toHaveLength(MAX_RECENT_ITEMS);
    expect(selectRecentItems(entries, null, Number.MAX_SAFE_INTEGER, NOW)).toHaveLength(MAX_RECENT_ITEMS);
  });

  it("falls back to the default cap for a nonsense limit", () => {
    expect(selectRecentItems(entries, null, -3, NOW)).toHaveLength(MAX_RECENT_ITEMS);
    expect(selectRecentItems(entries, null, 1.5, NOW)).toHaveLength(MAX_RECENT_ITEMS);
    expect(selectRecentItems(entries, null, Number.POSITIVE_INFINITY, NOW)).toHaveLength(MAX_RECENT_ITEMS);
    expect(selectRecentItems(entries, null, Number.NaN, NOW)).toHaveLength(MAX_RECENT_ITEMS);
  });

  it("drops malformed entries instead of rendering them", () => {
    const mixed = [entries[0], { kind: "flight", origin: "BAD" }, null] as unknown as RecentActivityEntry[];

    expect(selectRecentItems(mixed, null, MAX_RECENT_ITEMS, NOW)).toHaveLength(1);
  });

  it("canonicalises entries and strips unknown properties", () => {
    const tampered = [
      { ...entries[1], key: "stay:WRONG", price: 400, href: "https://partner.example" },
    ] as unknown as RecentActivityEntry[];

    const [item] = selectRecentItems(tampered, null, MAX_RECENT_ITEMS, NOW);

    expect(item.key).toBe("stay:sydney");
    expect(item).not.toHaveProperty("price");
    expect(item).not.toHaveProperty("href");
  });

  it("strips a past date supplied in a caller-built array", () => {
    const stale = [
      { ...entries[0], departureDate: PAST },
    ] as unknown as RecentActivityEntry[];

    const [item] = selectRecentItems(stale, null, MAX_RECENT_ITEMS, NOW) as FlightActivity[];

    expect(item.departureDate).toBeUndefined();
  });

  it("does not mutate the array or the entries it is given", () => {
    const input = [...entries];
    const snapshot = JSON.stringify(entries);

    selectRecentItems(input, null, MAX_RECENT_ITEMS, NOW);

    expect(input.map(e => e.key)).toEqual(entries.map(e => e.key));
    expect(JSON.stringify(entries)).toBe(snapshot);
  });

  it("composes with the continuation selector without repeating an item", () => {
    const dated: FlightActivity = {
      kind: "flight", key: "flight:SYD-KTM", label: "Kathmandu", at: isoDaysAgo(0),
      origin: "SYD", destination: "KTM", departureDate: FUTURE,
    };
    const all = [dated, ...entries];

    const continuation = selectContinuationCandidate(all, NOW);
    const recent = selectRecentItems(all, continuation, MAX_RECENT_ITEMS, NOW);

    expect(continuation?.key).toBe("flight:SYD-KTM");
    expect(recent.map(e => e.key)).not.toContain("flight:SYD-KTM");
    expect(recent).toHaveLength(MAX_RECENT_ITEMS);
  });
});

// ── Selector retention window ──

describe("recentActivity — selectors enforce the 30-day eligibility window", () => {
  /** Age in exact milliseconds, so the boundary can be probed precisely. */
  const agedFlight = (ms: number, overrides: Partial<FlightActivity> = {}): FlightActivity => ({
    kind: "flight",
    key: "flight:SYD-KTM",
    label: "Kathmandu",
    at: new Date(NOW.getTime() - ms).toISOString(),
    origin: "SYD",
    destination: "KTM",
    departureDate: FUTURE,
    ...overrides,
  });

  const DAY = 86_400_000;
  const THIRTY_DAYS = RETENTION_DAYS * DAY;

  it("accepts a 29-day-old flight as a continuation candidate", () => {
    expect(selectContinuationCandidate([agedFlight(29 * DAY)], NOW)?.key).toBe("flight:SYD-KTM");
  });

  it("accepts a flight that is exactly 30 days old", () => {
    expect(selectContinuationCandidate([agedFlight(THIRTY_DAYS)], NOW)?.key).toBe("flight:SYD-KTM");
  });

  it("rejects a flight one millisecond past 30 days", () => {
    expect(selectContinuationCandidate([agedFlight(THIRTY_DAYS + 1)], NOW)).toBeNull();
  });

  it("rejects a clearly expired flight", () => {
    expect(selectContinuationCandidate([agedFlight(60 * DAY)], NOW)).toBeNull();
  });

  it("does not promote an expired entry just because its departure date is future", () => {
    const stale = agedFlight(90 * DAY, { departureDate: localDate(120), returnDate: localDate(130) });

    expect(stale.departureDate! > TODAY).toBe(true);
    expect(selectContinuationCandidate([stale], NOW)).toBeNull();
  });

  it("prefers a fresh candidate and ignores the expired one entirely", () => {
    const fresh = agedFlight(2 * DAY, { key: "flight:BNE-NAN", origin: "BNE", destination: "NAN" });
    const stale = agedFlight(45 * DAY);

    expect(selectContinuationCandidate([stale, fresh], NOW)?.key).toBe("flight:BNE-NAN");
  });

  it("excludes entries older than 30 days from the recent list", () => {
    const items = [
      agedFlight(1 * DAY, { key: "flight:SYD-MEL", destination: "MEL", departureDate: undefined }),
      agedFlight(31 * DAY, { key: "flight:BNE-NAN", origin: "BNE", destination: "NAN", departureDate: undefined }),
    ];

    const recent = selectRecentItems(items, null, MAX_RECENT_ITEMS, NOW);

    expect(recent.map(e => e.key)).toEqual(["flight:SYD-MEL"]);
  });

  it("keeps an exactly-30-day-old recent item", () => {
    const items = [agedFlight(THIRTY_DAYS, { departureDate: undefined })];

    expect(selectRecentItems(items, null, MAX_RECENT_ITEMS, NOW)).toHaveLength(1);
    expect(selectRecentItems([agedFlight(THIRTY_DAYS + 1, { departureDate: undefined })], null, MAX_RECENT_ITEMS, NOW)).toEqual([]);
  });

  it("returns only the fresh entries from a mixed list", () => {
    const mixed: RecentActivityEntry[] = [
      { kind: "stay", key: "stay:sydney", label: "Sydney", at: isoDaysAgo(1), destination: "Sydney" },
      { kind: "stay", key: "stay:hobart", label: "Hobart", at: isoDaysAgo(40), destination: "Hobart" },
      { kind: "things", key: "things:bali|", label: "Bali", at: isoDaysAgo(3), city: "Bali" },
      { kind: "things", key: "things:ubud|", label: "Ubud", at: isoDaysAgo(31), city: "Ubud" },
      { kind: "flight", key: "flight:SYD-MEL", label: "MEL", at: isoDaysAgo(5), origin: "SYD", destination: "MEL" },
    ];

    const recent = selectRecentItems(mixed, null, MAX_RECENT_ITEMS, NOW);

    expect(recent.map(e => e.key)).toEqual(["stay:sydney", "things:bali|", "flight:SYD-MEL"]);
    expect(recent).toHaveLength(MAX_RECENT_ITEMS);
  });

  it("still returns at most MAX_RECENT_ITEMS once expired entries are removed", () => {
    const many: RecentActivityEntry[] = [1, 2, 3, 4, 5].map(day => ({
      kind: "stay",
      key: `stay:city${day}`,
      label: `City ${day}`,
      at: isoDaysAgo(day),
      destination: `City ${day}`,
    }));

    expect(selectRecentItems([...many, ...many.map(e => ({ ...e, key: `${e.key}-old`, at: isoDaysAgo(50) }))], null, MAX_RECENT_ITEMS, NOW))
      .toHaveLength(MAX_RECENT_ITEMS);
  });

  it("moves the same entry across the boundary on `now` alone", () => {
    // The departure date sits far enough out to stay in the future at both
    // probes, so age is the only variable that changes the answer.
    const entry = agedFlight(0, { at: isoDaysAgo(0), departureDate: localDate(60), returnDate: undefined });
    const list = [entry];
    const justInside = new Date(Date.parse(entry.at) + THIRTY_DAYS);
    const justOutside = new Date(Date.parse(entry.at) + THIRTY_DAYS + 1);

    expect(selectContinuationCandidate(list, justInside)?.key).toBe("flight:SYD-KTM");
    expect(selectContinuationCandidate(list, justOutside)).toBeNull();

    // The departure date is stripped once it is in the past, so compare on key.
    expect(selectRecentItems(list, null, MAX_RECENT_ITEMS, justInside).map(e => e.key)).toEqual(["flight:SYD-KTM"]);
    expect(selectRecentItems(list, null, MAX_RECENT_ITEMS, justOutside)).toEqual([]);
  });

  // ── Upper bound: the same clock-drift tolerance the store enforces ──

  const FUTURE_TOLERANCE_MS = DAY;

  /** A valid entry stamped `ms` ahead of NOW. */
  const futureStamped = (ms: number, overrides: Partial<FlightActivity> = {}): FlightActivity =>
    agedFlight(-ms, { departureDate: localDate(60), returnDate: undefined, ...overrides });

  it("accepts a current timestamp", () => {
    expect(selectContinuationCandidate([futureStamped(0)], NOW)?.key).toBe("flight:SYD-KTM");
    expect(selectRecentItems([futureStamped(0)], null, MAX_RECENT_ITEMS, NOW)).toHaveLength(1);
  });

  it("accepts a timestamp exactly at the future tolerance boundary", () => {
    const edge = futureStamped(FUTURE_TOLERANCE_MS);

    expect(selectContinuationCandidate([edge], NOW)?.key).toBe("flight:SYD-KTM");
    expect(selectRecentItems([edge], null, MAX_RECENT_ITEMS, NOW)).toHaveLength(1);
  });

  it("rejects a timestamp one millisecond beyond the future tolerance", () => {
    const past = futureStamped(FUTURE_TOLERANCE_MS + 1);

    expect(selectContinuationCandidate([past], NOW)).toBeNull();
    expect(selectRecentItems([past], null, MAX_RECENT_ITEMS, NOW)).toEqual([]);
  });

  it("never lets a far-future timestamp win continuation selection", () => {
    const farFuture = futureStamped(365 * DAY, { key: "flight:SYD-KTM" });
    const current = futureStamped(0, {
      key: "flight:BNE-NAN",
      origin: "BNE",
      destination: "NAN",
      at: isoDaysAgo(1),
    });

    // Sorted by `at` alone the far-future entry would come first.
    expect(Date.parse(farFuture.at)).toBeGreaterThan(Date.parse(current.at));
    expect(selectContinuationCandidate([farFuture, current], NOW)?.key).toBe("flight:BNE-NAN");
    expect(selectContinuationCandidate([current, farFuture], NOW)?.key).toBe("flight:BNE-NAN");
  });

  it("never lets a far-future timestamp appear in recent items", () => {
    const mixed: RecentActivityEntry[] = [
      { kind: "stay", key: "stay:hobart", label: "Hobart", at: daysFromNow(400).toISOString(), destination: "Hobart" },
      { kind: "stay", key: "stay:sydney", label: "Sydney", at: isoDaysAgo(1), destination: "Sydney" },
      { kind: "things", key: "things:bali|", label: "Bali", at: daysFromNow(3).toISOString(), city: "Bali" },
    ];

    const recent = selectRecentItems(mixed, null, MAX_RECENT_ITEMS, NOW);

    expect(recent.map(e => e.key)).toEqual(["stay:sydney"]);
  });

  it("rejects both ends of the window from one mixed array", () => {
    const mixed: RecentActivityEntry[] = [
      { kind: "stay", key: "stay:expired", label: "Expired", at: isoDaysAgo(31), destination: "Expired" },
      { kind: "stay", key: "stay:future", label: "Future", at: daysFromNow(9).toISOString(), destination: "Future" },
      { kind: "stay", key: "stay:valid", label: "Valid", at: isoDaysAgo(2), destination: "Valid" },
    ];

    expect(selectRecentItems(mixed, null, MAX_RECENT_ITEMS, NOW).map(e => e.key)).toEqual(["stay:valid"]);
  });

  it("moves an entry across the future boundary on `now` alone", () => {
    const entry = futureStamped(FUTURE_TOLERANCE_MS);
    const list = [entry];
    const tooEarly = new Date(Date.parse(entry.at) - FUTURE_TOLERANCE_MS - 1);

    expect(selectContinuationCandidate(list, NOW)?.key).toBe("flight:SYD-KTM");
    expect(selectContinuationCandidate(list, tooEarly)).toBeNull();
    expect(selectRecentItems(list, null, MAX_RECENT_ITEMS, tooEarly)).toEqual([]);
  });

  it("enforces the window without mutating the caller's array or entries", () => {
    const list: RecentActivityEntry[] = [agedFlight(1 * DAY), agedFlight(45 * DAY, { key: "flight:BNE-NAN", origin: "BNE", destination: "NAN" })];
    const snapshot = JSON.stringify(list);

    selectContinuationCandidate(list, NOW);
    selectRecentItems(list, null, MAX_RECENT_ITEMS, NOW);

    expect(list).toHaveLength(2);
    expect(JSON.stringify(list)).toBe(snapshot);
  });

  it("enforces the window with zero storage calls", () => {
    seed([{ kind: "stay", destination: "Ignored", at: isoDaysAgo(1) }]);
    vi.clearAllMocks();

    selectContinuationCandidate([agedFlight(45 * DAY)], NOW);
    selectRecentItems([agedFlight(45 * DAY)], null, MAX_RECENT_ITEMS, NOW);

    expect(localStorageMock.getItem).not.toHaveBeenCalled();
    expect(localStorageMock.setItem).not.toHaveBeenCalled();
    expect(localStorageMock.removeItem).not.toHaveBeenCalled();
    expect(store[RECENT_ACTIVITY_STORAGE_KEY]).toBeDefined();
  });

  it("does not prune or repair storage when it rejects an expired entry", () => {
    const expired = [{ kind: "stay", destination: "Hobart", at: isoDaysAgo(45) }];
    seed(expired);
    const before = store[RECENT_ACTIVITY_STORAGE_KEY];
    vi.clearAllMocks();

    selectRecentItems(
      [{ kind: "stay", key: "stay:hobart", label: "Hobart", at: isoDaysAgo(45), destination: "Hobart" }],
      null,
      MAX_RECENT_ITEMS,
      NOW,
    );

    expect(store[RECENT_ACTIVITY_STORAGE_KEY]).toBe(before);
    expect(localStorageMock.setItem).not.toHaveBeenCalled();
  });
});

// ── Purity and isolation ──

describe("recentActivity — selectors are pure", () => {
  const entries: RecentActivityEntry[] = [
    { kind: "flight", key: "flight:SYD-KTM", label: "KTM", at: isoDaysAgo(1), origin: "SYD", destination: "KTM", departureDate: FUTURE },
    { kind: "stay", key: "stay:sydney", label: "Sydney", at: isoDaysAgo(2), destination: "Sydney" },
  ];

  it("touches no storage at all", () => {
    seed([{ kind: "stay", destination: "Ignored", at: isoDaysAgo(1) }]);
    vi.clearAllMocks();

    selectContinuationCandidate(entries, NOW);
    selectRecentItems(entries, entries[0], MAX_RECENT_ITEMS, NOW);

    expect(localStorageMock.getItem).not.toHaveBeenCalled();
    expect(localStorageMock.setItem).not.toHaveBeenCalled();
    expect(localStorageMock.removeItem).not.toHaveBeenCalled();
  });

  it("returns the same result for the same arguments", () => {
    expect(selectContinuationCandidate(entries, NOW)).toEqual(selectContinuationCandidate(entries, NOW));
    expect(selectRecentItems(entries, null, MAX_RECENT_ITEMS, NOW)).toEqual(
      selectRecentItems(entries, null, MAX_RECENT_ITEMS, NOW),
    );
  });

  it("is unaffected by what happens to be in storage", () => {
    const withoutStore = selectRecentItems(entries, null, MAX_RECENT_ITEMS, NOW);
    seed([{ kind: "things", city: "Somewhere else", at: isoDaysAgo(1) }]);

    expect(selectRecentItems(entries, null, MAX_RECENT_ITEMS, NOW)).toEqual(withoutStore);
  });

  it("lets `now` alone decide every date-sensitive answer", () => {
    const soon: FlightActivity[] = [
      { kind: "flight", key: "flight:SYD-KTM", label: "KTM", at: isoDaysAgo(1), origin: "SYD", destination: "KTM", departureDate: localDate(3) },
    ];

    expect(selectContinuationCandidate(soon, NOW)?.key).toBe("flight:SYD-KTM");
    expect(selectContinuationCandidate(soon, daysFromNow(10))).toBeNull();
    expect((selectRecentItems(soon, null, 3, daysFromNow(10))[0] as FlightActivity).departureDate).toBeUndefined();
  });
});

// T2B storage immutability

describe("recentActivity - T2B storage immutability", () => {
  it("RECENT_ACTIVITY_VERSION stays 1 - T2B is URL migration, not a storage migration", () => {
    expect(RECENT_ACTIVITY_VERSION).toBe(1);
  });

  it("a stored Rome things entry carries only the allowlisted fields", () => {
    recordActivity({ kind: "things", city: "Rome", query: "colosseum tour" }, NOW);

    const stored = storedItems()[0] as Record<string, unknown>;
    expect(Object.keys(stored).sort()).toEqual(["at", "city", "key", "kind", "label", "query"]);

    const serialised = JSON.stringify(stored);
    for (const forbidden of ["slug", "providerRefs", "viator", "destinationId", "href", "url"]) {
      expect(serialised).not.toContain(forbidden);
    }
  });

  it("existing version-1 Rome storage loads with no rewrite", () => {
    // A version-1 entry already stored as city "Rome" — exactly what T2A
    // would have written before T2B shipped.
    seed([
      {
        kind: "things",
        key: "things:rome|",
        label: "Rome",
        at: isoDaysAgo(1),
        city: "Rome",
      },
    ]);

    const before = store[RECENT_ACTIVITY_STORAGE_KEY];
    const entries = loadRecentActivity(NOW);

    expect(entries).toHaveLength(1);
    expect((entries[0] as ThingsActivity).city).toBe("Rome");

    // needsRepair is false: the loader returns the entry without rewriting it,
    // so the canonical URL can be rebuilt at render time from unchanged data.
    expect(localStorageMock.setItem).not.toHaveBeenCalled();
    expect(store[RECENT_ACTIVITY_STORAGE_KEY]).toBe(before);
  });

  it("recording a Rome city writes no slug or provider ref", () => {
    recordActivity({ kind: "things", city: "Rome" }, NOW);

    expect(store[RECENT_ACTIVITY_STORAGE_KEY]).not.toMatch(/slug|providerRefs|viator|destinationId/i);
  });
});

describe("recentActivity — module isolation", () => {
  it("imports nothing, so it can never pull in TripContext, Trip Cost, React, Supabase or a network client", () => {
    // The zero-dependency design cannot be observed at runtime, so this is the
    // one place the test reads the source. Everything else below is behavioural.
    const source = readFileSync(path.join(process.cwd(), "src", "lib", "recentActivity.ts"), "utf8");

    expect(source).not.toMatch(/^\s*import\s/m);
    expect(source).not.toMatch(/\brequire\s*\(/);
  });

  it("makes no network calls", () => {
    const fetchSpy = vi.fn();
    const original = globalThis.fetch;
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    try {
      recordActivity({ kind: "things", city: "Bali" }, NOW);
      loadRecentActivity(NOW);
      selectContinuationCandidate(loadRecentActivity(NOW), NOW);
      selectRecentItems(loadRecentActivity(NOW), null, MAX_RECENT_ITEMS, NOW);
      clearRecentActivity();
    } finally {
      globalThis.fetch = original;
    }

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("exposes a narrow surface: no internal coercers or normalisers", async () => {
    const surface = Object.keys(await import("@/lib/recentActivity")).sort();

    expect(surface).toEqual([
      "MAX_LABEL_LENGTH",
      "MAX_QUERY_LENGTH",
      "MAX_RECENT_ITEMS",
      "MAX_STORED_ITEMS",
      "RECENT_ACTIVITY_STORAGE_KEY",
      "RECENT_ACTIVITY_VERSION",
      "RETENTION_DAYS",
      "buildDedupeKey",
      "clearRecentActivity",
      "isFlightActivity",
      "loadRecentActivity",
      "recordActivity",
      "selectContinuationCandidate",
      "selectRecentItems",
    ]);
  });
});
