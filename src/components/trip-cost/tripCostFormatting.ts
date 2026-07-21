import type { SupportedCurrency } from "./types";
import { CURRENCY_MAP } from "./tripCostConfig";

/**
 * Format a monetary value for display.
 * JPY is displayed without decimal places; all others use 2 decimals.
 * Always includes the currency code to disambiguate shared $ symbols.
 * Returns a fallback string for non-finite values.
 */
export function formatCurrency(amount: number, currency: SupportedCurrency): string {
  if (!Number.isFinite(amount)) {
    return `— ${currency}`;
  }

  const meta = CURRENCY_MAP[currency];
  if (!meta) return `— ${currency}`;

  const formatter = new Intl.NumberFormat(meta.locale, {
    style: "decimal",
    minimumFractionDigits: meta.decimals,
    maximumFractionDigits: meta.decimals,
  });

  return `${formatter.format(amount)} ${currency}`;
}

/**
 * Short formatting without currency code — for compact displays.
 */
export function formatCurrencyCompact(amount: number, currency: SupportedCurrency): string {
  if (!Number.isFinite(amount)) return "—";

  const meta = CURRENCY_MAP[currency];
  if (!meta) return "—";

  const formatter = new Intl.NumberFormat(meta.locale, {
    style: "decimal",
    minimumFractionDigits: meta.decimals,
    maximumFractionDigits: meta.decimals,
  });

  return formatter.format(amount);
}
