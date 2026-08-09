import { useTrip } from "@/context/TripContext";
import { useState } from "react";
import { MapPin, ChevronRight } from "lucide-react";
import { TripSummarySheet } from "./TripSummarySheet";

/**
 * Bookings Finder Trip Ribbon — compact trip context indicator.
 * Only renders when meaningful trip context exists.
 */
export function TripRibbon() {
  const { trip, hasTrip } = useTrip();
  const [sheetOpen, setSheetOpen] = useState(false);

  if (!hasTrip) return null;

  // Build the compact label
  const parts: string[] = [];

  if (trip.origin?.airportCode && trip.destination?.name) {
    parts.push(`${trip.origin.airportCode} → ${trip.destination.name}`);
  } else if (trip.destination?.name) {
    parts.push(trip.destination.name);
  }

  if (trip.dates?.departureDate) {
    let dateStr = trip.dates.departureDate;
    if (trip.dates.returnDate) {
      // Compact: "Aug 18-29"
      dateStr = formatCompactDates(trip.dates.departureDate, trip.dates.returnDate);
    }
    parts.push(dateStr);
  }

  if (trip.travellers) {
    const total = trip.travellers.adults + trip.travellers.children + trip.travellers.infants;
    parts.push(`${total} traveller${total !== 1 ? "s" : ""}`);
  }

  const label = parts.join(" · ");

  // Truncate if too long
  const displayLabel = label.length > 50 ? label.slice(0, 47) + "..." : label;

  return (
    <>
      <button
        onClick={() => setSheetOpen(true)}
        className="w-full flex items-center gap-2 px-3 py-2.5 mb-4 rounded-xl bg-primary/5 border border-primary/10 hover:bg-primary/10 transition-colors text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        aria-label={`Your trip: ${label}. Tap to view trip summary.`}
      >
        <MapPin className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
        <span className="flex-1 text-sm font-medium text-foreground truncate">{displayLabel}</span>
        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
      </button>

      <TripSummarySheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  );
}

/**
 * Format two YYYY-MM-DD dates into a compact range like "Aug 18-29"
 */
function formatCompactDates(departureDate: string, returnDate: string): string {
  try {
    const dep = new Date(departureDate + "T00:00:00");
    const ret = new Date(returnDate + "T00:00:00");
    const monthFormat: Intl.DateTimeFormatOptions = { month: "short" };

    const depMonth = dep.toLocaleDateString("en-US", monthFormat);
    const retMonth = ret.toLocaleDateString("en-US", monthFormat);
    const depDay = dep.getDate();
    const retDay = ret.getDate();

    if (depMonth === retMonth) {
      return `${depMonth} ${depDay}-${retDay}`;
    }
    return `${depMonth} ${depDay} - ${retMonth} ${retDay}`;
  } catch {
    return `${departureDate} - ${returnDate}`;
  }
}
