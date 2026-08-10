/**
 * Display Formatters — V0 Visual Foundation.
 *
 * Human-friendly presentation-only formatting.
 * Storage remains canonical YYYY-MM-DD. No UTC conversion.
 */

/**
 * Format a YYYY-MM-DD date to a human-friendly display.
 * Examples: "Aug 18", "Dec 25", "Jan 3"
 */
export function formatDateDisplay(isoDate: string): string {
  try {
    const d = new Date(isoDate + "T00:00:00");
    if (isNaN(d.getTime())) return isoDate;
    const month = d.toLocaleDateString("en-US", { month: "short" });
    const day = d.getDate();
    return `${month} ${day}`;
  } catch {
    return isoDate;
  }
}

/**
 * Format a YYYY-MM-DD date range for compact display.
 *
 * Same-month:    "Aug 18–29"
 * Cross-month:   "Aug 29 – Sep 3"
 * Cross-year:    "Dec 30, 2026 – Jan 3, 2027"
 * Single date:   "Aug 18"
 */
export function formatDateRangeDisplay(
  departureDate: string,
  returnDate?: string | null,
): string {
  if (!departureDate) return "";

  try {
    const dep = new Date(departureDate + "T00:00:00");
    if (isNaN(dep.getTime())) {
      return returnDate ? `${departureDate} – ${returnDate}` : departureDate;
    }

    if (!returnDate) {
      return formatDateDisplay(departureDate);
    }

    const ret = new Date(returnDate + "T00:00:00");
    if (isNaN(ret.getTime())) {
      return `${departureDate} – ${returnDate}`;
    }
    const opts: Intl.DateTimeFormatOptions = { month: "short" };

    const depMonth = dep.toLocaleDateString("en-US", opts);
    const retMonth = ret.toLocaleDateString("en-US", opts);
    const depDay = dep.getDate();
    const retDay = ret.getDate();
    const depYear = dep.getFullYear();
    const retYear = ret.getFullYear();

    // Same month, same year
    if (depMonth === retMonth && depYear === retYear) {
      return `${depMonth} ${depDay}–${retDay}`;
    }

    // Different months, same year
    if (depYear === retYear) {
      return `${depMonth} ${depDay} – ${retMonth} ${retDay}`;
    }

    // Cross-year
    return `${depMonth} ${depDay}, ${depYear} – ${retMonth} ${retDay}, ${retYear}`;
  } catch {
    return returnDate
      ? `${departureDate} – ${returnDate}`
      : departureDate;
  }
}

/**
 * Format traveller count for display.
 * "1 traveller", "2 travellers", "0 travellers"
 */
export function formatTravellers(
  adults: number,
  children?: number,
  infants?: number,
): string {
  const total = adults + (children ?? 0) + (infants ?? 0);
  return `${total} traveller${total !== 1 ? "s" : ""}`;
}
