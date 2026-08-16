/**
 * BookingsFinder Things pagination window (T3B).
 *
 * Pure, deterministic window builder for the Things results pagination.
 * The previous implementation rendered EVERY page number (1..totalPages),
 * which produced dozens of buttons on large result sets. This caps the
 * visible numeric window at ~7 with first/last context and non-interactive
 * ellipsis where a gap exists.
 *
 * Contract (design system §29.19 / §12):
 *   - max ~7 numeric page buttons (ellipsis is NOT counted and NOT a button)
 *   - current page always present
 *   - first and last page always present once totalPages > visible threshold
 *   - deterministic: same (currentPage, totalPages) always returns the same
 *     window
 *   - bounded: never more than `maxVisible` numeric buttons
 *   - no duplicates, no out-of-range pages
 *
 * Examples (maxVisible 7):
 *   total 3,  current 2  -> 1 2 3
 *   total 10, current 1  -> 1 2 3 4 5 6 … 10
 *   total 10, current 5  -> 1 … 3 4 5 6 7 … 10
 *   total 10, current 10 -> 1 … 5 6 7 8 9 10
 *
 * The exact edge positioning may differ slightly from the illustrative
 * examples while remaining deterministic, bounded and intuitive.
 */

export type ThingsPaginationItem =
  | { type: "page"; page: number }
  | { type: "ellipsis"; key: "leading" | "trailing" };

/**
 * Build the bounded numeric window for a pagination control.
 *
 * `currentPage` is clamped into [1, totalPages] so a stale URL `?page=` can
 * never produce an empty or out-of-range window. `totalPages` is clamped to
 * >= 1 so a zero/negative count never renders an empty control.
 */
export function getThingsPaginationWindow(
  currentPage: number,
  totalPages: number,
  maxVisible = 7,
): ThingsPaginationItem[] {
  const total = Math.max(1, Math.floor(totalPages) || 1);
  const current = Math.min(Math.max(1, Math.floor(currentPage) || 1), total);

  // Small totals render fully - no ellipsis needed.
  if (total <= maxVisible) {
    return Array.from({ length: total }, (_, i): ThingsPaginationItem => ({
      type: "page",
      page: i + 1,
    }));
  }

  // Reserve the first and last page slots; the middle window may use the
  // remaining numeric slots. Sliding window centred on the current page,
  // clamped at both ends so the window never runs off the range.
  const middleSlots = Math.max(3, maxVisible - 2);
  let start = Math.max(2, current - Math.floor(middleSlots / 2));
  let end = Math.min(total - 1, start + middleSlots - 1);
  start = Math.max(2, end - middleSlots + 1);

  const items: ThingsPaginationItem[] = [{ type: "page", page: 1 }];
  if (start > 2) items.push({ type: "ellipsis", key: "leading" });
  for (let page = start; page <= end; page += 1) {
    items.push({ type: "page", page });
  }
  if (end < total - 1) items.push({ type: "ellipsis", key: "trailing" });
  items.push({ type: "page", page: total });
  return items;
}
