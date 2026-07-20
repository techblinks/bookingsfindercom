import type { SupportedCurrency, AccommodationType, ContingencyMode } from "./types";

// ── Currency metadata ──

export interface CurrencyMeta {
  code: SupportedCurrency;
  name: string;
  locale: string;
  decimals: number;
}

export const SUPPORTED_CURRENCIES: CurrencyMeta[] = [
  { code: "AUD", name: "Australian Dollar", locale: "en-AU", decimals: 2 },
  { code: "USD", name: "US Dollar",         locale: "en-US", decimals: 2 },
  { code: "NZD", name: "New Zealand Dollar",locale: "en-NZ", decimals: 2 },
  { code: "GBP", name: "British Pound",     locale: "en-GB", decimals: 2 },
  { code: "EUR", name: "Euro",              locale: "en-IE", decimals: 2 },
  { code: "CAD", name: "Canadian Dollar",   locale: "en-CA", decimals: 2 },
  { code: "JPY", name: "Japanese Yen",      locale: "ja-JP", decimals: 0 },
];

export const CURRENCY_MAP: Record<SupportedCurrency, CurrencyMeta> = Object.fromEntries(
  SUPPORTED_CURRENCIES.map((c) => [c.code, c])
) as Record<SupportedCurrency, CurrencyMeta>;

export const DEFAULT_CURRENCY: SupportedCurrency = "AUD";

// ── Accommodation types ──

export const ACCOMMODATION_TYPES: { value: AccommodationType; label: string }[] = [
  { value: "hotel",           label: "Hotel" },
  { value: "apartment",       label: "Apartment" },
  { value: "hostel",          label: "Hostel" },
  { value: "resort",          label: "Resort" },
  { value: "holiday-rental",  label: "Holiday rental" },
  { value: "family-friends",  label: "Staying with family or friends" },
  { value: "other",           label: "Other" },
];

export const DEFAULT_ACCOMMODATION_TYPE: AccommodationType = "hotel";

// ── Contingency modes ──

export interface ContingencyModeMeta {
  mode: ContingencyMode;
  label: string;
}

export const CONTINGENCY_MODES: ContingencyModeMeta[] = [
  { mode: "none",       label: "No contingency" },
  { mode: "pct-5",      label: "5%" },
  { mode: "pct-10",     label: "10% (recommended)" },
  { mode: "pct-15",     label: "15%" },
  { mode: "pct-custom", label: "Custom percentage" },
  { mode: "fixed",      label: "Fixed amount" },
];

export const DEFAULT_CONTINGENCY_MODE: ContingencyMode = "pct-10";

// ── Limits ──

export const MAX_TRAVELLERS = 20;
export const MAX_ACTIVITIES = 50;
export const MAX_TEXT_LENGTH = 100;
export const MAX_COST = 9_999_999;
