import { useCallback, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { FilterState } from "@/types/flight";
import FlightFiltersPanel from "./FlightFiltersPanel";
import { clearedFilters, countActiveFilters } from "./filterSummary";

/**
 * Mobile filters — the same filter controls the desktop sidebar uses, in a
 * bottom sheet, edited as a DRAFT.
 *
 * Applying filters resets pagination and re-sorts the list, so committing every
 * slider tick would make the results thrash underneath a user who is still
 * choosing. The draft is therefore local to this component:
 *
 *   open    → draft is seeded from the filters currently applied
 *   edit    → only the draft changes; results are untouched
 *   Apply   → the draft is committed through the existing updateFilter calls
 *   dismiss → nothing is committed, and the next open re-seeds from applied
 *
 * The trigger's badge always reflects APPLIED filters, never the open draft.
 */

interface MobileFiltersSheetProps {
  /** Currently applied filters — the source of truth for the badge and the draft seed. */
  filters: FilterState;
  airlines: { code: string; name: string; count: number }[];
  stopCounts: Record<number, number>;
  departureCounts: Record<string, number>;
  /** Commits a whole draft at once. */
  onApply: (next: FilterState) => void;
  totalResults: number;
  currency?: string;
  /** BF-0R-7.2 Phase G: forwarded to FlightFiltersPanel — see its doc comment. */
  hasResults?: boolean;
}

const MobileFiltersSheet = ({
  filters,
  airlines,
  stopCounts,
  departureCounts,
  onApply,
  totalResults,
  currency = "$",
  hasResults = true,
}: MobileFiltersSheetProps) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<FilterState>(filters);

  const activeCount = countActiveFilters(filters);

  /*
   * Seeding on open (rather than on every `filters` change) is what makes
   * dismissal discard cleanly: an abandoned draft is simply overwritten the next
   * time the sheet is opened.
   */
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) setDraft(filters);
      setOpen(nextOpen);
    },
    [filters],
  );

  const updateDraft = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setDraft(prev => ({ ...prev, [key]: value }));
  }, []);

  /** Clears the draft only. Nothing reaches the results until Apply. */
  const resetDraft = useCallback(() => {
    setDraft(prev => clearedFilters(prev));
  }, []);

  const applyDraft = useCallback(() => {
    onApply(draft);
    setOpen(false);
  }, [draft, onApply]);

  const triggerLabel = activeCount > 0 ? `Filters, ${activeCount} active` : "Filters";

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          aria-label={triggerLabel}
          className="h-9 shrink-0 gap-1.5 rounded-full px-3 text-xs font-semibold"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
          Filters
          {activeCount > 0 && (
            <span className="ml-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground tabular-nums">
              {activeCount}
            </span>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent
        side="bottom"
        className="flex max-h-[85vh] flex-col gap-0 rounded-t-2xl p-0"
        aria-describedby="mobile-filters-description"
      >
        <SheetHeader className="shrink-0 space-y-1 border-b border-border px-4 pb-3 pt-4 text-left">
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription id="mobile-filters-description">
            {totalResults} recent fare observation{totalResults !== 1 ? "s" : ""} match your current filters
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <FlightFiltersPanel
            variant="plain"
            filters={draft}
            airlines={airlines}
            stopCounts={stopCounts}
            departureCounts={departureCounts}
            onFilterChange={updateDraft}
            onReset={resetDraft}
            totalResults={totalResults}
            currency={currency}
            hasResults={hasResults}
          />
        </div>

        <div
          className="flex shrink-0 items-center gap-3 border-t border-border bg-background px-4 pt-3"
          style={{ paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))" }}
        >
          <Button variant="outline" onClick={resetDraft} className="h-12 flex-1 text-sm font-semibold">
            Reset
          </Button>
          <Button onClick={applyDraft} className="h-12 flex-[2] text-sm font-semibold">
            Show results
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileFiltersSheet;
