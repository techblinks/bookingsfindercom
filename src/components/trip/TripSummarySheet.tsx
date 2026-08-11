import { useTrip } from "@/context/TripContext";
import { Link } from "react-router-dom";
import { X, Plane, Building2, Ticket, Calculator, Trash2 } from "lucide-react";
import { useEffect, useRef, useCallback } from "react";
import { formatDateRangeDisplay, formatTravellers } from "@/lib/displayFormatters";

interface TripSummarySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Trip Summary Sheet — shows verified trip context and useful actions.
 * M1 does NOT show bookings, prices, saved products, or fake selection state.
 * M1.1: Escape closes, Tab trapped inside, focus restored on close.
 * V0: friendly date display.
 */
export function TripSummarySheet({ open, onOpenChange }: TripSummarySheetProps) {
  const { trip, clearTrip } = useTrip();
  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus dialog on open; restore focus via cleanup when sheet closes
  useEffect(() => {
    if (!open) return;

    const prev = document.activeElement as HTMLElement;
    dialogRef.current?.focus();

    return () => {
      prev?.focus();
    };
  }, [open]);

  // Escape closes; Tab cycles within the dialog
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onOpenChange(false);
        return;
      }

      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [onOpenChange],
  );

  if (!open) return null;

  const destinationName = trip.destination?.name || trip.origin?.name || "";
  const hasDates = !!trip.dates?.departureDate;
  const totalTravellers = trip.travellers
    ? trip.travellers.adults + trip.travellers.children + trip.travellers.infants
    : 0;

  const handleClear = () => {
    if (window.confirm("Clear your current trip plan?")) {
      clearTrip();
      onOpenChange(false);
    }
  };

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-[60] lg:hidden outline-none"
      role="dialog"
      aria-modal="true"
      aria-label="Trip summary"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        className="absolute bottom-0 left-0 right-0 bg-background rounded-t-2xl shadow-xl max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom duration-200"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 16px)" }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3">
          <h2 className="text-lg font-bold text-foreground">Trip</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 rounded-lg hover:bg-muted transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            aria-label="Close trip summary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Trip Context */}
        <div className="px-5 pb-4">
          {/* Route */}
          {destinationName && (
            <div className="mb-3">
              {trip.origin?.airportCode ? (
                <p className="text-lg font-semibold text-foreground">
                  {trip.origin.airportCode} → {destinationName}
                </p>
              ) : (
                <p className="text-lg font-semibold text-foreground">{destinationName}</p>
              )}
            </div>
          )}

          {/* Dates + Travellers — V0: friendly display */}
          {(hasDates || totalTravellers > 0) && (
            <div className="flex items-center gap-3 mb-4 text-sm text-muted-foreground">
              {hasDates && (
                <span>
                  {trip.dates!.returnDate
                    ? formatDateRangeDisplay(trip.dates!.departureDate, trip.dates!.returnDate)
                    : formatDateRangeDisplay(trip.dates!.departureDate)}
                </span>
              )}
              {totalTravellers > 0 && (
                <span>
                  {formatTravellers(
                    trip.travellers?.adults ?? 0,
                    trip.travellers?.children ?? 0,
                    trip.travellers?.infants ?? 0,
                  )}
                </span>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="space-y-1.5">
            <SheetActionLink to="/flights" icon={Plane} label="Flights" onClick={() => onOpenChange(false)} />
            <SheetActionLink to="/hotels" icon={Building2} label="Stays" onClick={() => onOpenChange(false)} />
            <SheetActionLink to="/things-to-do" icon={Ticket} label="Things to Do" onClick={() => onOpenChange(false)} />
            <SheetActionLink to="/trip-cost" icon={Calculator} label="Trip Cost" onClick={() => onOpenChange(false)} />
          </div>

          {/* Clear */}
          <div className="mt-4 pt-4 border-t border-border">
            <button
              onClick={handleClear}
              className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive"
            >
              <Trash2 className="w-4 h-4" />
              Clear trip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SheetActionLink({
  to,
  icon: Icon,
  label,
  onClick,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <Icon className="w-4 h-4 text-primary" aria-hidden="true" />
      <span className="text-sm font-medium text-foreground">{label}</span>
    </Link>
  );
}
