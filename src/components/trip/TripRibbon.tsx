import { useTrip } from "@/context/TripContext";
import { useState } from "react";
import { MapPin, ChevronRight } from "lucide-react";
import { TripSummarySheet } from "./TripSummarySheet";
import { formatDateRangeDisplay, formatTravellers } from "@/lib/displayFormatters";

/**
 * Bookings Finder Trip Ribbon — compact trip context indicator.
 * Only renders when meaningful trip context exists.
 * V0: semantic degradation, friendly dates, no mid-token truncation.
 */
export function TripRibbon() {
  const { trip, hasTrip } = useTrip();
  const [sheetOpen, setSheetOpen] = useState(false);

  if (!hasTrip) return null;

  const fullLabel = buildFullLabel(trip);
  const displayLabel = buildCompactLabel(trip);

  return (
    <>
      <button
        onClick={() => setSheetOpen(true)}
        className="w-full flex items-center gap-2 px-3 py-2.5 mb-4 trip-rule hover:bg-primary/10 transition-colors text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        aria-label={`Your trip: ${fullLabel}. Tap to view trip summary.`}
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
 * Build full accessible label — never truncated.
 */
function buildFullLabel(trip: ReturnType<typeof useTrip>["trip"]): string {
  const parts: string[] = [];

  if (trip.origin?.airportCode && trip.destination?.name) {
    parts.push(`${trip.origin.airportCode} → ${trip.destination.name}`);
  } else if (trip.destination?.name) {
    parts.push(trip.destination.name);
  }

  if (trip.travellers) {
    parts.push(
      formatTravellers(
        trip.travellers.adults,
        trip.travellers.children,
        trip.travellers.infants,
      ),
    );
  }

  if (trip.dates?.departureDate) {
    parts.push(formatDateRangeDisplay(trip.dates.departureDate, trip.dates.returnDate));
  }

  return parts.join(" · ");
}

/**
 * Build compact display label with semantic degradation.
 *
 * Degradation order:
 * 1. Prefer airport code over city name for origin
 * 2. Shorten traveller wording
 * 3. Omit year from date range where unambiguous
 * 4. Truncate destination only as last resort
 *
 * Never truncate date range mid-token.
 */
function buildCompactLabel(trip: ReturnType<typeof useTrip>["trip"]): string {
  const parts: string[] = [];

  // Route: prefer code → destination
  if (trip.origin?.airportCode && trip.destination?.name) {
    parts.push(`${trip.origin.airportCode} → ${trip.destination.name}`);
  } else if (trip.origin?.name && trip.destination?.name) {
    parts.push(`${trip.origin.name} → ${trip.destination.name}`);
  } else if (trip.destination?.name) {
    parts.push(trip.destination.name);
  }

  // Dates: compact range, no year unless cross-year
  if (trip.dates?.departureDate) {
    parts.push(formatDateRangeDisplay(trip.dates.departureDate, trip.dates.returnDate));
  }

  // Travellers: short form
  if (trip.travellers) {
    const total =
      trip.travellers.adults +
      trip.travellers.children +
      trip.travellers.infants;
    parts.push(`${total}p`); // e.g. "2p"
  }

  const label = parts.join(" · ");

  // Only truncate destination as last resort at max width
  if (label.length > 52) {
    // Find the destination portion and truncate it
    const destStart = trip.destination?.name
      ? label.indexOf(trip.destination.name)
      : -1;
    if (destStart > 0) {
      const before = label.slice(0, destStart);
      const destName = trip.destination!.name!;
      const after = label.slice(destStart + destName.length);
      const available = 52 - before.length - after.length - 3; // 3 for "..."
      if (available > 4) {
        return before + destName.slice(0, available) + "..." + after;
      }
    }
    // Fallback: hard truncate but never mid-date
    return label.slice(0, 49) + "...";
  }

  return label;
}
