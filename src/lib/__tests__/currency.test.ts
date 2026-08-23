/**
 * BF-FLIGHTS-LIVE-2 — currency preference contract.
 *
 * Covers the pure logic behind Phase B (source-of-truth priority),
 * Phase D (White-Label-verified currency allowlist) and Phase F
 * (local persistence of a manual override).
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  resolveCurrency,
  isValidCurrencyCode,
  isWhiteLabelSupportedCurrency,
  getCurrencySymbol,
  getStoredCurrencyPreference,
  setStoredCurrencyPreference,
  clearStoredCurrencyPreference,
  DEFAULT_CURRENCY,
  WHITE_LABEL_SUPPORTED_CURRENCIES,
} from "../currency";

beforeEach(() => {
  localStorage.clear();
});

describe("resolveCurrency — Phase B priority (user > geo > USD)", () => {
  it("item: falls back to USD when nothing is known (unknown/failed geolocation)", () => {
    expect(resolveCurrency({})).toBe(DEFAULT_CURRENCY);
    expect(resolveCurrency({ userSelected: null, geoCurrency: null })).toBe(DEFAULT_CURRENCY);
  });

  it("uses geo currency when no user selection exists", () => {
    expect(resolveCurrency({ geoCurrency: "AUD" })).toBe("AUD");
  });

  it("item 6: a deliberate user selection overrides geo detection", () => {
    expect(resolveCurrency({ userSelected: "GBP", geoCurrency: "AUD" })).toBe("GBP");
  });

  it("ignores a malformed geo currency and falls back to USD", () => {
    expect(resolveCurrency({ geoCurrency: "australian-dollar" })).toBe(DEFAULT_CURRENCY);
  });

  it("ignores a malformed stored user selection rather than passing it through", () => {
    expect(resolveCurrency({ userSelected: "not-a-code", geoCurrency: "GBP" })).toBe("GBP");
  });
});

describe("isValidCurrencyCode", () => {
  it("accepts a three-letter uppercase code", () => {
    expect(isValidCurrencyCode("AUD")).toBe(true);
  });
  it("rejects lowercase, wrong length, empty, and null", () => {
    expect(isValidCurrencyCode("aud")).toBe(false);
    expect(isValidCurrencyCode("AU")).toBe(false);
    expect(isValidCurrencyCode("AUDS")).toBe(false);
    expect(isValidCurrencyCode("")).toBe(false);
    expect(isValidCurrencyCode(null)).toBe(false);
    expect(isValidCurrencyCode(undefined)).toBe(false);
  });
});

describe("getCurrencySymbol", () => {
  it("returns the known symbol for a mapped code", () => {
    expect(getCurrencySymbol("AUD")).toBe("A$");
    expect(getCurrencySymbol("GBP")).toBe("£");
    expect(getCurrencySymbol("USD")).toBe("$");
  });

  it("never fabricates a symbol for an unmapped code — falls back to the code itself", () => {
    expect(getCurrencySymbol("XYZ")).toBe("XYZ");
  });
});

describe("isWhiteLabelSupportedCurrency — Phase D live-verified allowlist", () => {
  it("accepts every currency actually verified live against the White Label", () => {
    for (const code of WHITE_LABEL_SUPPORTED_CURRENCIES) {
      expect(isWhiteLabelSupportedCurrency(code)).toBe(true);
    }
  });

  it("item 13: rejects currencies confirmed NOT supported by live testing (INR, JPY, SGD) rather than assuming they work", () => {
    expect(isWhiteLabelSupportedCurrency("INR")).toBe(false);
    expect(isWhiteLabelSupportedCurrency("JPY")).toBe(false);
    expect(isWhiteLabelSupportedCurrency("SGD")).toBe(false);
  });

  it("rejects an invalid code", () => {
    expect(isWhiteLabelSupportedCurrency("not-a-code")).toBe(false);
    expect(isWhiteLabelSupportedCurrency(undefined)).toBe(false);
  });
});

describe("stored currency preference — Phase F persistence", () => {
  it("item 7: setStoredCurrencyPreference persists a value getStoredCurrencyPreference reads back", () => {
    setStoredCurrencyPreference("GBP");
    expect(getStoredCurrencyPreference()).toBe("GBP");
  });

  it("returns null when nothing has been stored", () => {
    expect(getStoredCurrencyPreference()).toBeNull();
  });

  it("refuses to persist an invalid code", () => {
    setStoredCurrencyPreference("not-a-code");
    expect(getStoredCurrencyPreference()).toBeNull();
  });

  it("clearStoredCurrencyPreference removes a persisted value", () => {
    setStoredCurrencyPreference("EUR");
    clearStoredCurrencyPreference();
    expect(getStoredCurrencyPreference()).toBeNull();
  });

  it("ignores a corrupted raw value already sitting in storage", () => {
    localStorage.setItem("bf_currency_preference", "garbage-value");
    expect(getStoredCurrencyPreference()).toBeNull();
  });
});
