import { describe, it, expect } from "vitest";
import { formatCurrency, formatCurrencyCompact } from "../tripCostFormatting";

describe("formatCurrency", () => {
  it("formats AUD with 2 decimals and code", () => {
    expect(formatCurrency(1745, "AUD")).toBe("1,745.00 AUD");
  });

  it("formats AUD zero", () => {
    expect(formatCurrency(0, "AUD")).toBe("0.00 AUD");
  });

  it("formats USD", () => {
    expect(formatCurrency(99.5, "USD")).toBe("99.50 USD");
  });

  it("formats JPY with 0 decimals", () => {
    expect(formatCurrency(120000, "JPY")).toBe("120,000 JPY");
  });

  it("formats JPY zero", () => {
    expect(formatCurrency(0, "JPY")).toBe("0 JPY");
  });

  it("formats large amount", () => {
    expect(formatCurrency(1234567.89, "AUD")).toBe("1,234,567.89 AUD");
  });

  it("rounds to 2 decimals for AUD", () => {
    expect(formatCurrency(99.999, "AUD")).toBe("100.00 AUD");
  });

  it("handles NaN gracefully", () => {
    expect(formatCurrency(NaN, "AUD")).toBe("— AUD");
  });

  it("handles Infinity gracefully", () => {
    expect(formatCurrency(Infinity, "AUD")).toBe("— AUD");
  });
});

describe("formatCurrencyCompact", () => {
  it("omits currency code", () => {
    expect(formatCurrencyCompact(1745, "AUD")).toBe("1,745.00");
  });

  it("handles JPY without code", () => {
    expect(formatCurrencyCompact(120000, "JPY")).toBe("120,000");
  });

  it("handles NaN", () => {
    expect(formatCurrencyCompact(NaN, "AUD")).toBe("—");
  });
});
