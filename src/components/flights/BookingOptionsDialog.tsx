import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ExternalLink, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getLiveFlightBookingOptions } from "@/lib/liveFlightsApi";
import { classifyBookingHandoff } from "@/lib/liveFlightBookingRedirect";
import type { LiveFlightBookingOption, LiveFlightSearchRequest } from "@/types/liveFlights";

interface BookingOptionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingToken: string | null;
  searchContext: LiveFlightSearchRequest | null;
  currencySymbol: string;
  route: string;
  /** Page White Label fallback — offered when a seller's own handoff can't be safely completed this round (see liveFlightBookingRedirect.ts). */
  onOpenFullFlightSearch: () => void;
}

/**
 * BF-FLIGHTS-LIVE-4 Phase J / Round 2 — lists SerpApi's booking_options for
 * a selected itinerary's bookingToken. Only ever displays what the
 * provider actually returned — no fabricated sellers, no fabricated
 * prices. Round 2: each option's booking_request is classified before any
 * CTA is offered — a resolver (post_data) handoff currently has no safe
 * completion path (see liveFlightBookingRedirect.ts) and is shown as
 * truthful information with no deceptive working button, only the White
 * Label fallback.
 */
const BookingOptionsDialog = ({ open, onOpenChange, bookingToken, searchContext, currencySymbol, route, onOpenFullFlightSearch }: BookingOptionsDialogProps) => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "ok" | "unavailable">("loading");
  const [options, setOptions] = useState<LiveFlightBookingOption[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !bookingToken || !searchContext) return;

    let cancelled = false;
    setStatus("loading");
    setOptions([]);
    setErrorMessage(null);

    getLiveFlightBookingOptions({ ...searchContext, bookingToken }).then((result) => {
      if (cancelled) return;
      if (result.status === "ok") {
        setOptions(result.options);
        setStatus("ok");
      } else {
        setErrorMessage(result.errorMessage || "Booking options are temporarily unavailable.");
        setStatus("unavailable");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [open, bookingToken, searchContext]);

  const handleSelect = (option: LiveFlightBookingOption, url: string) => {
    navigate("/live-flight-redirect", {
      state: {
        url,
        postData: null,
        bookingProvider: option.bookingProvider,
        price: option.price,
        currency: option.currency,
        route,
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Booking options</DialogTitle>
          <DialogDescription>Choose where to complete your booking. Prices are set by each provider.</DialogDescription>
        </DialogHeader>

        {status === "loading" && (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading booking options…
          </div>
        )}

        {status === "unavailable" && (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
            {errorMessage}
          </div>
        )}

        {status === "ok" && options.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">No booking options were returned for this flight.</p>
        )}

        {status === "ok" && options.length > 0 && (
          <div className="space-y-2">
            {options.map((option, index) => {
              const decision = classifyBookingHandoff(option.bookingRequest);
              return (
                <div
                  key={`${option.bookingProvider}-${index}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">{option.bookingProvider}</p>
                    {option.price !== null && (
                      <p className="text-sm text-muted-foreground">
                        {currencySymbol}
                        {option.price.toLocaleString()}
                      </p>
                    )}
                    {decision.kind !== "get" && (
                      <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">
                        Direct booking isn't available for this option yet — search with our partner instead.
                      </p>
                    )}
                  </div>
                  {decision.kind === "get" ? (
                    <Button size="sm" className="gap-1.5" onClick={() => handleSelect(option, decision.url)}>
                      Continue
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={onOpenFullFlightSearch}>
                      Open full flight search
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BookingOptionsDialog;
