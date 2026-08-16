/**
 * BookingsFinder Things pagination (T3B).
 *
 * Presentational pagination for Things result grids. The numeric window is
 * produced by the pure helper `getThingsPaginationWindow` (bounded, ~7
 * numeric buttons, non-interactive ellipsis). All existing page semantics
 * are preserved by the caller: URL `page` sync, page reset, scroll-to-results
 * and disabled boundaries stay in `ThingsToDo.goToPage`.
 *
 * A11y (design system §22 / §29.19):
 *   - `nav aria-label="Pagination"` landmark
 *   - `aria-current="page"` on the active page button
 *   - labelled Previous/Next arrow buttons
 *   - >= 44x44px touch targets (h-11 w-11)
 *   - ellipsis is a non-interactive `span`
 */
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getThingsPaginationWindow } from "@/lib/thingsPagination";

interface ThingsPaginationProps {
  currentPage: number;
  totalPages: number;
  /** Called with the target page (e.g. `goToPage` on ThingsToDo). */
  onPageChange: (page: number) => void;
  className?: string;
}

const ARROW_BUTTON_CLASS =
  "flex h-11 w-11 items-center justify-center rounded-lg border border-things-border bg-things-surface-card text-things-text-primary transition-colors hover:bg-things-surface-page disabled:cursor-not-allowed disabled:opacity-40 things-focus-ring";

const ThingsPagination = ({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: ThingsPaginationProps) => {
  // Single-page result sets render no pagination (existing page contract).
  if (totalPages <= 1) return null;

  const items = getThingsPaginationWindow(currentPage, totalPages);
  const prevDisabled = currentPage <= 1;
  const nextDisabled = currentPage >= totalPages;

  return (
    <nav
      aria-label="Pagination"
      data-testid="things-pagination"
      className={cn("flex items-center justify-center gap-2", className)}
    >
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={prevDisabled}
        className={ARROW_BUTTON_CLASS}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </button>

      {items.map((item) =>
        item.type === "ellipsis" ? (
          <span
            key={item.key}
            className="flex h-11 w-9 items-center justify-center text-things-text-muted"
            aria-hidden="true"
          >
            &hellip;
          </span>
        ) : (
          <button
            key={item.page}
            type="button"
            onClick={() => onPageChange(item.page)}
            aria-current={item.page === currentPage ? "page" : undefined}
            aria-label={
              item.page === currentPage
                ? `Page ${item.page}`
                : `Go to page ${item.page}`
            }
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-lg text-sm font-medium transition-colors things-focus-ring",
              item.page === currentPage
                ? "bg-primary text-white"
                : "border border-things-border bg-things-surface-card text-things-text-primary hover:bg-things-surface-page",
            )}
          >
            {item.page}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={nextDisabled}
        className={ARROW_BUTTON_CLASS}
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </nav>
  );
};

export default ThingsPagination;
