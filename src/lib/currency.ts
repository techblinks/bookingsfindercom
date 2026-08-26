/**
 * BF-FLIGHTS-LIVE-2 — single currency preference contract.
 *
 * The one place that decides which three-letter ISO currency code
 * BookingsFinder uses for a visitor, so /flights, the Recent Fare
 * Calendar/Heatmap, cached fare observations and the White Label handoff
 * never disagree with each other. Do not read geo currency or a stored
 * preference directly elsewhere — resolve through this module (or the
 * useCurrencyPreference hook, which wraps it) instead.
 *
 * Priority (Phase B): explicit user selection > geo-detected > USD fallback.
 * A deliberate user selection is never overwritten by geo detection — see
 * useCurrencyPreference.ts, where userSelected always outranks geoData.
 */

const CODE_RE = /^[A-Z]{3}$/;

export const DEFAULT_CURRENCY = "USD";

/**
 * Symbol lookup, independent of country. Mirrors the currency side of
 * useGeoLocation.ts's currencyByCountry map (kept as the geo/country
 * source of truth per Phase C — not duplicated logic, just re-keyed by
 * currency so callers that only have a currency code, not a country, can
 * still get a symbol). Falls back to the code itself for anything absent
 * rather than fabricating a symbol.
 */
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  AUD: "A$",
  GBP: "£",
  INR: "₹",
  SGD: "S$",
  AED: "د.إ",
  EUR: "€",
  CAD: "C$",
  JPY: "¥",
  CNY: "¥",
  HKD: "HK$",
  NZD: "NZ$",
  THB: "฿",
  MYR: "RM",
  PHP: "₱",
  IDR: "Rp",
  KRW: "₩",
  BRL: "R$",
  MXN: "MX$",
  ZAR: "R",
  CHF: "Fr",
  SEK: "kr",
  NOK: "kr",
  DKK: "kr",
  PLN: "zł",
  RUB: "₽",
  TRY: "₺",
};

/** Curated selector options — the currencies useGeoLocation.ts already resolves visitors into. */
export const CURRENCY_OPTIONS: { code: string; symbol: string; name: string }[] = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
];

/**
 * White Label currencies actually verified live, not assumed.
 *
 * Verified 2026-08-23 against https://flights.bookingsfinder.com by
 * appending `&currency=<CODE>` to a working `flightSearch` deep link and
 * observing whether the site's own currency toggle and displayed prices
 * changed:
 *   - Confirmed supported (toggle switched, prices re-denominated):
 *     USD, AUD, GBP, EUR, CAD, NZD
 *   - Confirmed NOT supported (param silently ignored — the toggle stayed
 *     on whatever currency the browser session had previously loaded,
 *     never switched to the requested one): INR, JPY, SGD
 *
 * Travelpayouts White Label projects configure a main currency plus a
 * specific set of "additional currencies" — this is an account-level
 * setting (see BOOKINGSFINDER_BF_FLIGHTS_LIVE_2 report Phase G for the
 * exact dashboard path), not something this codebase can expand by
 * guessing. Only extend this list after live re-verification; never infer
 * support from useGeoLocation's country map, which is unrelated to what
 * the White Label project has enabled.
 */
export const WHITE_LABEL_SUPPORTED_CURRENCIES = ["USD", "AUD", "GBP", "EUR", "CAD", "NZD"] as const;

export function isValidCurrencyCode(code: string | null | undefined): code is string {
  return !!code && CODE_RE.test(code);
}

export function isWhiteLabelSupportedCurrency(code: string | null | undefined): boolean {
  return isValidCurrencyCode(code) && (WHITE_LABEL_SUPPORTED_CURRENCIES as readonly string[]).includes(code);
}

/** Never fabricates a symbol for an unknown code — falls back to the code itself. */
export function getCurrencySymbol(code: string): string {
  return CURRENCY_SYMBOLS[code] || code;
}

/**
 * Resolve the currency to use, per the priority documented above.
 * Both inputs are validated — an invalid/malformed stored value or geo
 * result is treated as absent rather than passed through.
 */
export function resolveCurrency(params: {
  userSelected?: string | null;
  geoCurrency?: string | null;
}): string {
  if (isValidCurrencyCode(params.userSelected)) return params.userSelected;
  if (isValidCurrencyCode(params.geoCurrency)) return params.geoCurrency;
  return DEFAULT_CURRENCY;
}

// ── User preference persistence ──

const STORAGE_KEY = "bf_currency_preference";

export function getStoredCurrencyPreference(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return isValidCurrencyCode(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function setStoredCurrencyPreference(code: string): void {
  if (!isValidCurrencyCode(code)) return;
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // Storage unavailable (private browsing, quota) — preference just
    // won't persist across visits; the in-memory selection still applies.
  }
}

export function clearStoredCurrencyPreference(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
