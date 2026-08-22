/**
 * Timezone-safe provider timestamp parsing (BF-0R-7 Phase 1.1 item 1).
 *
 * These functions must read the provider's stated local date/time directly
 * from the ISO string, never via `new Date(iso).toLocaleTimeString()` /
 * `.toLocaleDateString()`, which reinterpret the instant through the
 * *browser's* local timezone and can display a different wall-clock time
 * or calendar date than what the provider actually stated. Every test here
 * stubs the process timezone to something far from the timestamps' own
 * offsets specifically to prove that reinterpretation is NOT happening.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  parseProviderLocalDateTime,
  formatProviderLocalTime,
  formatProviderLocalDate,
} from "../timezones";

const originalTZ = process.env.TZ;

beforeAll(() => {
  // Pick a host timezone far from every timestamp's own offset below, so a
  // passing test proves the offset in the string was honoured, not the
  // environment's.
  process.env.TZ = "Pacific/Kiritimati"; // UTC+14
});

afterAll(() => {
  process.env.TZ = originalTZ;
});

describe("parseProviderLocalDateTime", () => {
  it("parses year/month/day/hour/minute exactly as stated, offset and all", () => {
    expect(parseProviderLocalDateTime("2026-09-03T21:25:00+03:00")).toEqual({
      year: 2026, month: 9, day: 3, hour: 21, minute: 25,
    });
  });

  it("returns null for null/undefined/empty input", () => {
    expect(parseProviderLocalDateTime(null)).toBeNull();
    expect(parseProviderLocalDateTime(undefined)).toBeNull();
    expect(parseProviderLocalDateTime("")).toBeNull();
  });

  it("returns null for a non-ISO string", () => {
    expect(parseProviderLocalDateTime("not-a-timestamp")).toBeNull();
  });
});

describe("formatProviderLocalTime — timezone-safe", () => {
  it("returns the stated HH:MM unchanged, even with a host timezone far away", () => {
    // Host TZ is UTC+14; this timestamp states 21:25 at UTC+3. A
    // Date-based conversion would show a very different hour.
    expect(formatProviderLocalTime("2026-09-03T21:25:00+03:00")).toBe("21:25");
  });

  it("is correct for a negative-offset timestamp too", () => {
    expect(formatProviderLocalTime("2026-09-03T23:45:00-05:00")).toBe("23:45");
  });

  it("is correct for a 'Z' (UTC) timestamp", () => {
    expect(formatProviderLocalTime("2026-09-03T05:05:00Z")).toBe("05:05");
  });

  it("returns empty string for missing input", () => {
    expect(formatProviderLocalTime(null)).toBe("");
    expect(formatProviderLocalTime(undefined)).toBe("");
  });
});

describe("formatProviderLocalDate — timezone-safe", () => {
  it("does not shift the calendar date for a late-night timestamp near a day boundary", () => {
    // 23:45 on the 3rd at -05:00. In UTC this instant is 04:45 on the 4th;
    // in the stubbed host TZ (+14) it would be later still. The provider
    // STATED the 3rd, and that is the only correct answer.
    const formatted = formatProviderLocalDate("2026-09-03T23:45:00-05:00");
    expect(formatted).toContain("3");
    expect(formatted).not.toContain("4");
  });

  it("does not shift the calendar date for an early-morning positive-offset timestamp", () => {
    // 00:30 on the 3rd at +03:00. In UTC this instant is 21:30 on the 2nd.
    // The provider stated the 3rd.
    const formatted = formatProviderLocalDate("2026-09-03T00:30:00+03:00");
    expect(formatted).toContain("3");
  });

  it("returns empty string for missing input", () => {
    expect(formatProviderLocalDate(null)).toBe("");
  });
});
