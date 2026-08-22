/**
 * Single source of truth for which cabin classes BookingsFinder's
 * customer-facing flight search can offer (BF-0R-7 Round 1.2 item 1/2).
 *
 * Premium Economy and First were previously selectable in the search forms
 * and accepted by flightSearchValidation, but the White Label handoff
 * (whiteLabelUrl.ts) only has a verified encoding for "economy" and
 * "business" — buildWhiteLabelFlightUrl explicitly rejects anything else.
 * That mismatch meant a Premium/First search would silently fall back to a
 * generic redirect that drops the selected cabin, while the UI still
 * implied the selection was carried through to the partner.
 *
 * Every place that validates, offers, or encodes a cabin class must import
 * from here so the set of supported classes cannot drift apart again.
 * Extending support to Premium/First requires first proving out (and
 * encoding) their White Label contract, then adding them here — not adding
 * them to a form or a validator in isolation.
 */

export const SUPPORTED_CABIN_CLASSES = ["economy", "business"] as const;

export type CabinClass = (typeof SUPPORTED_CABIN_CLASSES)[number];

export function isSupportedCabinClass(value: string | null | undefined): value is CabinClass {
  return !!value && (SUPPORTED_CABIN_CLASSES as readonly string[]).includes(value);
}

export const CABIN_CLASS_LABELS: Record<CabinClass, string> = {
  economy: "Economy",
  business: "Business",
};

export const CABIN_CLASS_OPTIONS: { value: CabinClass; label: string }[] =
  SUPPORTED_CABIN_CLASSES.map((value) => ({ value, label: CABIN_CLASS_LABELS[value] }));
