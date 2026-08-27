/**
 * BookingsFinder shared MONEY CONTRACT (BF1-F).
 *
 * One pure-local module owning currency identity, minor-unit metadata and
 * deterministic major<->minor conversion. Concepts kept DISTINCT by design:
 *
 *   1. provider-reported currency  — what upstream actually stated/requested;
 *                                    never defaulted, never converted
 *   2. normalized monetary amount  — ProviderMoney { amountMajor, currency }
 *                                    today; Money { amountMinor, currency }
 *                                    minted at explicit boundaries only
 *   3. display currency            — whatever the UI currently renders
 *                                    (unchanged by BF1-F)
 *   4. future conversion currency  — FX belongs to a later package; NO rates,
 *                                    NO network, NO conversion happens here
 *
 * FAIL-CLOSED RULE: unknown/malformed currencies and non-finite/non-numeric
 * amounts throw. Nothing defaults to USD/AUD/etc. Application code cannot
 * obtain an unqualified number representing money through this contract.
 *
 * Currency minor-unit metadata PROVENANCE: static excerpt of ISO 4217
 * Table A.1 (active codes), covering currencies used by this platform plus
 * standards-notable 0- and 3-decimal cases. Intentionally NOT an exhaustive
 * 180-code table: unsupported codes fail closed so gaps surface loudly in
 * tests instead of silently mis-scaling. Extend the map when a provider
 * needs another code. Source of truth: ISO 4217 (2019+ revision).
 */

/** A validated ISO-4217 alpha-3 currency code known to BookingsFinder. */
declare const __currencyBrand: unique symbol;
export type CurrencyCode = string & { readonly [__currencyBrand]: true };

/** Thrown for unknown/malformed currency codes (fail closed). */
export class CurrencyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CurrencyError";
  }
}

/** Thrown for amounts that are not finite numbers (fail closed). */
export class MoneyFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MoneyFormatError";
  }
}

/** Thrown when a conversion would exceed Number.MAX_SAFE_INTEGER minor units. */
export class MoneyOverflowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MoneyOverflowError";
  }
}

/** ISO 4217 minor units for supported codes. */
const MINOR_UNITS: Readonly<Record<string, 0 | 2 | 3>> = {
  // 2-decimal (majority of trade currencies)
  AED: 2, ARS: 2, AUD: 2, BDT: 2, BRL: 2, CAD: 2, CHF: 2, CNY: 2, CZK: 2,
  DKK: 2, EGP: 2, EUR: 2, GBP: 2, HKD: 2, HUF: 2, IDR: 2, ILS: 2, INR: 2,
  KES: 2, KHR: 2, LAK: 2, LKR: 2, MAD: 2, MXN: 2, MYR: 2, NGN: 2, NOK: 2,
  NZD: 2, PHP: 2, PKR: 2, PLN: 2, QAR: 2, RSD: 2, RUB: 2, SAR: 2, SEK: 2,
  SGD: 2, THB: 2, TRY: 2, TWD: 2, USD: 2, ZAR: 2,
  // 0-decimal
  BIF: 0, CLP: 0, DJF: 0, GNF: 0, ISK: 0, JPY: 0, KMF: 0, KRW: 0, PYG: 0,
  RWF: 0, UGX: 0, UYI: 0, VND: 0, VUV: 0,
  // 3-decimal
  BHD: 3, IQD: 3, JOD: 3, KWD: 3, OMR: 3, TND: 3,
};

const CODE_RE = /^[A-Z]{3}$/;

/**
 * Normalize any raw currency input into a validated CurrencyCode.
 * Accepts case-insensitive strings with surrounding whitespace (" aud " ->
 * "AUD"). Anything else — empty, null, undefined, wrong shape, unknown code —
 * throws CurrencyError. NEVER substitutes a default currency.
 */
export function normalizeCurrencyCode(code: unknown): CurrencyCode {
  const s = typeof code === "string" ? code.trim().toUpperCase() : "";
  if (!CODE_RE.test(s) || !(s in MINOR_UNITS)) {
    throw new CurrencyError(`Unsupported or malformed currency code: ${JSON.stringify(code ?? null)}`);
  }
  return s as CurrencyCode;
}

/** Type-guard form of normalizeCurrencyCode; false for anything invalid. */
export function isSupportedCurrency(code: unknown): code is CurrencyCode {
  try {
    normalizeCurrencyCode(code);
    return true;
  } catch {
    return false;
  }
}

/** Minor units (decimal digits) for a validated currency code. */
export function getCurrencyMinorUnit(code: CurrencyCode): 0 | 2 | 3 {
  return MINOR_UNITS[code];
}

const MAX_SAFE_MINOR = BigInt(Number.MAX_SAFE_INTEGER);

/** Expand a JS number into its exact decimal digit string (no exponent form). */
function toPlainDigits(abs: number): string {
  const s = String(abs);
  if (!s.includes("e") && !s.includes("E")) return s;
  const [m, expRaw] = s.split(/[eE]/);
  const exp = Number(expRaw);
  const neg = m.startsWith("-");
  const mantissa = neg ? m.slice(1) : m;
  const [intPart, fracPart = ""] = mantissa.split(".");
  const digits = intPart + fracPart;
  const point = intPart.length + exp;
  let out: string;
  if (point <= 0) out = "0." + "0".repeat(-point) + digits;
  else if (point >= digits.length) out = digits + "0".repeat(point - digits.length);
  else out = digits.slice(0, point) + "." + digits.slice(point);
  return out;
}

function assertFiniteNumber(amount: unknown): asserts amount is number {
  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    throw new MoneyFormatError(`Money amount must be a finite number, got ${String(amount)}`);
  }
}

/**
 * Convert a major-unit decimal amount to integer minor units.
 *
 * ROUNDING (deterministic, documented): the amount is interpreted as its
 * SHORTEST DECIMAL REPRESENTATION (String(number) semantics — what the
 * provider's JSON literal parsed to), then rounded HALF-UP at the currency's
 * declared precision on the excess digit string. Binary-float artifacts are
 * therefore irrelevant: 1.005 AUD -> 101 minor (not 100), 10.10 -> 1010,
 * 123.456 AUD -> 12346 (excess digit "6" rounds up). Never silent truncation.
 * Negative amounts are supported symmetrically (provider caches can carry
 * them today); zero is valid. Throws MoneyOverflowError beyond safe range.
 */
export function majorToMinor(amount: number, currency: CurrencyCode): number {
  assertFiniteNumber(amount);
  const units = getCurrencyMinorUnit(currency);

  const neg = amount < 0;
  const plain = toPlainDigits(Math.abs(amount));
  const [intRaw, fracRaw = ""] = plain.split(".");
  const intDigits = (intRaw === "0" ? "" : intRaw) || "";
  const padded = (fracRaw + "0".repeat(units)).slice(0, units);
  const roundDigit = fracRaw.slice(units, units + 1);
  let minor = BigInt(intDigits + padded || "0");
  if (roundDigit && roundDigit >= "5") minor += 1n;

  if (minor > MAX_SAFE_MINOR) {
    throw new MoneyOverflowError(`Amount ${amount} ${currency} exceeds safe minor-unit range`);
  }
  return Number(neg ? -minor : minor);
}

/**
 * Convert integer minor units back to a major-unit number by EXACT decimal
 * point placement (BigInt digit surgery, then one parse). For any amount that
 * round-trips through majorToMinor, minorToMajor(majorToMinor(x, c), c) === x
 * because both directions use the same shortest-representation decimal.
 * Rejects non-integers (fail closed — no implicit rounding).
 */
export function minorToMajor(amountMinor: number, currency: CurrencyCode): number {
  assertFiniteNumber(amountMinor);
  if (!Number.isInteger(amountMinor)) {
    throw new MoneyFormatError(`amountMinor must be an integer, got ${amountMinor}`);
  }
  const units = getCurrencyMinorUnit(currency);
  const neg = amountMinor < 0;
  const digits = String(BigInt(Math.abs(amountMinor))).padStart(units + 1, "0");
  const s = units === 0 ? digits : `${digits.slice(0, -units)}.${digits.slice(-units)}`;
  const out = Number(s);
  if (!Number.isSafeInteger(amountMinor)) {
    throw new MoneyOverflowError(`amountMinor ${amountMinor} outside safe integer range`);
  }
  return neg ? -out : out;
}

/**
 * Provider-reported money: the amount exactly as the provider stated it, in
 * MAJOR units, bound to a VALIDATED currency. This is the ONLY sanctioned way
 * to attach currency to a provider price — bare floats must not flow through
 * domain/application code as money.
 */
export interface ProviderMoney {
  /** Major-unit amount verbatim from the provider (finite; sign preserved). */
  readonly amountMajor: number;
  /** Validated currency the amount was reported in. */
  readonly currency: CurrencyCode;
}

/**
 * Normalized money in integer minor units. Minted ONLY at explicit
 * normalization boundaries (BF1-G price observations will use this shape);
 * BF1-F keeps ProviderMoney at the live flight boundary so displayed prices
 * cannot shift.
 */
export interface Money {
  readonly amountMinor: number;
  readonly currency: CurrencyCode;
}

/**
 * Mint ProviderMoney from raw provider values — validating finiteness and
 * normalizing the currency. Fail-closed on any malformation; performs NO
 * rounding, scaling or conversion (that is majorToMinor's job at explicit
 * boundaries).
 */
export function makeProviderMoney(rawAmount: unknown, rawCurrency: unknown): ProviderMoney {
  assertFiniteNumber(rawAmount);
  return { amountMajor: rawAmount, currency: normalizeCurrencyCode(rawCurrency) };
}

/**
 * Normalize ProviderMoney into integer-minor Money at an explicit boundary.
 * Pure local computation; deterministic HALF_UP rounding per majorToMinor.
 */
export function normalizeMoney(pm: ProviderMoney): Money {
  return { amountMinor: majorToMinor(pm.amountMajor, pm.currency), currency: pm.currency };
}
