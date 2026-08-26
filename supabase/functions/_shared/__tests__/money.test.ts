/**
 * BF1-F MONEY CONTRACT TESTS — _shared/money.ts
 *
 * Locks: ISO-4217 normalization (fail-closed), minor-unit metadata
 * (0/2/3-decimal classes), deterministic major<->minor conversion
 * (documented HALF_UP on shortest-decimal representation), overflow and
 * malformed-input rejection, ProviderMoney minting, normalizeMoney.
 */
import { describe, it, expect } from "vitest";
import {
  CurrencyError,
  MoneyFormatError,
  MoneyOverflowError,
  getCurrencyMinorUnit,
  isSupportedCurrency,
  makeProviderMoney,
  majorToMinor,
  minorToMajor,
  normalizeCurrencyCode,
  normalizeMoney,
} from "../money.ts";

describe("BF1-F currency normalization", () => {
  it("accepts canonical codes for 0/2/3-decimal ISO classes", () => {
    expect(normalizeCurrencyCode("USD")).toBe("USD");
    expect(normalizeCurrencyCode("EUR")).toBe("EUR");
    expect(getCurrencyMinorUnit(normalizeCurrencyCode("JPY"))).toBe(0);
    expect(getCurrencyMinorUnit(normalizeCurrencyCode("KWD"))).toBe(3);
    expect(getCurrencyMinorUnit(normalizeCurrencyCode("BHD"))).toBe(3);
    expect(getCurrencyMinorUnit(normalizeCurrencyCode("AUD"))).toBe(2);
  });

  it("normalizes case and surrounding whitespace", () => {
    expect(normalizeCurrencyCode(" aud ")).toBe("AUD");
    expect(normalizeCurrencyCode("eur")).toBe("EUR");
  });

  it.each([["XXQ"], [""], ["US"], ["USDD"], ["12$"], [null], [undefined], [42], [" usd1 "]])(
    "fails closed on malformed/unknown currency %j (no defaulting)",
    (bad) => {
      expect(() => normalizeCurrencyCode(bad)).toThrow(CurrencyError);
      expect(isSupportedCurrency(bad)).toBe(false);
      expect(isSupportedCurrency("JPY")).toBe(true);
    }
  );
});

describe("BF1-F major->minor conversion", () => {
  it("converts exactly at declared precision", () => {
    const aud = normalizeCurrencyCode("AUD");
    expect(majorToMinor(123.45, aud)).toBe(12345);
    expect(majorToMinor(100, aud)).toBe(10000);
    expect(majorToMinor(10.1, aud)).toBe(1010);
    expect(majorToMinor(0.1, aud)).toBe(10);
    expect(majorToMinor(0, aud)).toBe(0);
  });

  it("rounds HALF_UP on excess digits — never silent truncation", () => {
    const aud = normalizeCurrencyCode("AUD");
    expect(majorToMinor(1.005, aud)).toBe(101); // digit-string semantics, not float artifacts
    expect(majorToMinor(123.456, aud)).toBe(12346);
    expect(majorToMinor(1.004, aud)).toBe(100);
  });

  it("handles 0-decimal currencies (HALF_UP at unit)", () => {
    const jpy = normalizeCurrencyCode("JPY");
    expect(majorToMinor(999.5, jpy)).toBe(1000);
    expect(majorToMinor(999.4, jpy)).toBe(999);
    expect(majorToMinor(1000, jpy)).toBe(1000);
  });

  it("supports negatives symmetrically (provider caches may carry them today)", () => {
    const aud = normalizeCurrencyCode("AUD");
    expect(majorToMinor(-12.34, aud)).toBe(-1234);
    expect(minorToMajor(-1234, aud)).toBe(-12.34);
  });

  it("rejects non-finite/non-numeric amounts", () => {
    const aud = normalizeCurrencyCode("AUD");
    expect(() => majorToMinor(Number.NaN, aud)).toThrow(MoneyFormatError);
    expect(() => majorToMinor(Number.POSITIVE_INFINITY, aud)).toThrow(MoneyFormatError);
    // @ts-expect-error deliberately wrong type under test
    expect(() => majorToMinor("5", aud)).toThrow(MoneyFormatError);
  });

  it("overflows past safe integer minor units fail closed", () => {
    const aud = normalizeCurrencyCode("AUD");
    expect(() => majorToMinor(90071992547409.92, aud)).toThrow(MoneyOverflowError);
  });
});

describe("BF1-F minor->major conversion", () => {
  it("is exact via decimal point placement", () => {
    const aud = normalizeCurrencyCode("AUD");
    expect(minorToMajor(1999, aud)).toBe(19.99);
    expect(minorToMajor(5, aud)).toBe(0.05);
    expect(minorToMajor(70250, aud)).toBe(702.5);
    expect(minorToMajor(0, aud)).toBe(0);
    const jpy = normalizeCurrencyCode("JPY");
    expect(minorToMajor(5000, jpy)).toBe(5000);
  });

  it("rejects fractional minor units", () => {
    const aud = normalizeCurrencyCode("AUD");
    expect(() => minorToMajor(12.5, aud)).toThrow(MoneyFormatError);
  });
});

describe("BF1-F round-trip fidelity (wire parity foundation)", () => {
  it.each([
    [100], [123.45], [99], [702.5], [489], [19.99], [0.1], [10.1], [389.4],
  ])("minorToMajor(majorToMinor(%p)) === %p", (v) => {
    const c = normalizeCurrencyCode("AUD");
    expect(minorToMajor(majorToMinor(v as number, c), c)).toBe(v);
  });
});

describe("BF1-F ProviderMoney / normalizeMoney", () => {
  it("mints validated provider money; rejects garbage", () => {
    expect(makeProviderMoney(489, "eur")).toEqual({ amountMajor: 489, currency: "EUR" });
    expect(() => makeProviderMoney(Number.NaN, "AUD")).toThrow(MoneyFormatError);
    expect(() => makeProviderMoney(10, "nope")).toThrow(CurrencyError);
  });

  it("normalizes to integer minor units only at explicit boundaries", () => {
    const pm = makeProviderMoney(19.99, "AUD");
    expect(normalizeMoney(pm)).toEqual({ amountMinor: 1999, currency: "AUD" });
    const bd = makeProviderMoney(1.234, "KWD");
    expect(normalizeMoney(bd)).toEqual({ amountMinor: 1234, currency: "KWD" }); // 3-decimal class
  });
});
