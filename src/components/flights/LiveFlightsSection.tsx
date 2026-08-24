import { useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import FlightCardSkeleton from "@/components/flights/FlightCardSkeleton";
import LiveFlightCard from "@/components/flights/LiveFlightCard";
import BookingOptionsDialog from "@/components/flights/BookingOptionsDialog";
import { useLiveFlightSearch } from "@/hooks/useLiveFlightSearch";
import { sortLiveItineraries, LIVE_FLIGHT_SORT_OPTIONS, type LiveFlightSortOption } from "@/lib/liveFlightSort";
import type { LiveFlightCabinClass, LiveFlightItinerary } from "@/types/liveFlights";

interface LiveFlightsSectionProps {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
  children: number;
  infants: number;
  cabinClass: LiveFlightCabinClass;
  currencyCode: string;
  currencySymbol: string;
  /** Page White Label fallback (Phase S) — unchanged since BF-FLIGHTS-LIVE-1. */
  onOpenFullFlightSearch: () => void;
  /** Set false only when this search cannot be represented at all (mirrors useFlightSearch's `enabled`). Live results run for every cabin, including Business — see FlightResults.tsx. */
  enabled?: boolean;
}

/**
 * BF-FLIGHTS-LIVE-4 Phase L/M — replaces the LIVE-3 embedded Travelpayouts
 * Widget with BookingsFinder-native structured live flight results. Owns
 * the round-trip two-step token flow (Phase H) and the booking-options
 * dialog (Phase J); FlightResults.tsx only supplies search params and the
 * Page White Label fallback handler.
 */
const LiveFlightsSection = ({
  origin, destination, departureDate, returnDate, adults, children, infants,
  cabinClass, currencyCode, currencySymbol, onOpenFullFlightSearch, enabled,
}: LiveFlightsSectionProps) => {
  const tripType = returnDate ? "round_trip" : "one_way";
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [activeBookingToken, setActiveBookingToken] = useState<string | null>(null);
  /*
   * BF-FLIGHTS-LIVE-4 Round 2 Phase 6/8: entirely separate from the cached
   * Travelpayouts sort (useFlightSearch's sortBy) — this only ever reorders
   * this section's own LiveFlightItinerary[] for display; it never touches
   * cached results or search.itineraries itself (sortLiveItineraries
   * returns a new array).
   */
  const [sortBy, setSortBy] = useState<LiveFlightSortOption>("best");

  const search = useLiveFlightSearch({
    origin, destination, departureDate, returnDate, tripType,
    adults, children, infants, cabinClass, currency: currencyCode, enabled,
  });

  const searchContext = {
    origin, destination, departureDate, returnDate, tripType,
    adults, children, infants, cabinClass, currency: currencyCode,
  };

  const openBookingOptions = (itinerary: LiveFlightItinerary) => {
    if (!itinerary.bookingToken) return;
    setActiveBookingToken(itinerary.bookingToken);
    setBookingDialogOpen(true);
  };

  const sortedItineraries = useMemo(
    () => sortLiveItineraries(search.itineraries, sortBy),
    [search.itineraries, sortBy],
  );

  if (search.status === "loading" || search.status === "idle") {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground animate-pulse">Searching current flight options…</p>
        {Array.from({ length: 3 }).map((_, i) => (
          <FlightCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (search.status === "unavailable") {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center space-y-3">
        <AlertTriangle className="h-6 w-6 text-amber-500 mx-auto" />
        <p className="text-sm text-muted-foreground">
          {search.errorMessage || "Live flight search is temporarily unavailable."}
        </p>
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={search.retry}>Try again</Button>
          <Button size="sm" className="gap-1.5" onClick={onOpenFullFlightSearch}>
            Open full flight search
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  if (search.status === "no_results") {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center space-y-3">
        <p className="text-sm text-muted-foreground">
          No live flights were returned for this search. Try different dates, or search directly with our partner.
        </p>
        <Button size="sm" className="gap-1.5" onClick={onOpenFullFlightSearch}>
          Open full flight search
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tripType === "round_trip" && (
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            {search.step === "outbound" ? "Step 1 — Choose your outbound flight" : "Step 2 — Choose your return flight"}
          </h3>
          {search.step === "return" && (
            <Button variant="ghost" size="sm" className="gap-1.5 h-8" onClick={search.backToOutbound}>
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to outbound flights
            </Button>
          )}
        </div>
      )}

      {/*
        * BF-FLIGHTS-LIVE-4 Round 2 Phase 7: a truthful count of THIS
        * provider's returned itineraries — never combined with, or
        * phrased like, the cached "recent fare observation(s)" count
        * elsewhere on the page (a different provider dataset), and never
        * a claim that this is every flight in the market.
        */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground tabular-nums">{sortedItineraries.length.toLocaleString()}</span>{" "}
          live flight option{sortedItineraries.length !== 1 ? "s" : ""}
        </p>
        <div role="radiogroup" aria-label="Sort live flights" className="flex min-w-0 bg-muted rounded-full p-0.5">
          {LIVE_FLIGHT_SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSortBy(opt.value)}
              role="radio"
              aria-checked={sortBy === opt.value}
              className={sortBy === opt.value
                ? "bg-card text-foreground shadow-sm px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200"
                : "text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200"
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {sortedItineraries.map((itinerary) => {
        const action =
          tripType === "round_trip" && search.step === "outbound"
            ? { type: "choose" as const, onAction: () => search.selectOutbound(itinerary) }
            : itinerary.bookingToken
              ? { type: "booking" as const, onAction: () => openBookingOptions(itinerary) }
              : { type: "none" as const };

        return <LiveFlightCard key={itinerary.id} itinerary={itinerary} currencySymbol={currencySymbol} action={action} />;
      })}

      <BookingOptionsDialog
        open={bookingDialogOpen}
        onOpenChange={setBookingDialogOpen}
        bookingToken={activeBookingToken}
        searchContext={searchContext}
        currencySymbol={currencySymbol}
        route={`${origin}-${destination}`}
        onOpenFullFlightSearch={onOpenFullFlightSearch}
      />
    </div>
  );
};

export default LiveFlightsSection;
