import { useCallback, useEffect, useRef, useState } from "react";
import { searchLiveFlights } from "@/lib/liveFlightsApi";
import type {
  LiveFlightCabinClass,
  LiveFlightItinerary,
  LiveFlightSearchResult,
  LiveFlightTripType,
} from "@/types/liveFlights";

export interface UseLiveFlightSearchParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  tripType: LiveFlightTripType;
  adults: number;
  children: number;
  infants: number;
  cabinClass: LiveFlightCabinClass;
  currency: string;
  /** Mirrors useFlightSearch's `enabled` contract — false skips the request entirely (no loading, no error). */
  enabled?: boolean;
}

/** Round-trip only: which set of itineraries is currently being shown/chosen (Phase H). One-way never leaves "outbound". */
export type LiveFlightStep = "outbound" | "return";

export interface UseLiveFlightSearchReturn {
  status: LiveFlightSearchResult["status"] | "loading" | "idle";
  step: LiveFlightStep;
  itineraries: LiveFlightItinerary[];
  selectedOutbound: LiveFlightItinerary | null;
  errorMessage: string | null;
  currency: string;
  /** Re-runs the current step's search (outbound retry, or return-leg retry if already past step 1). */
  retry: () => void;
  /** Round-trip only: choosing an outbound itinerary fetches its return options (Phase H). No-op for one-way. */
  selectOutbound: (itinerary: LiveFlightItinerary) => void;
  /** Round-trip only: returns to step 1 without re-fetching (the original outbound list is kept). */
  backToOutbound: () => void;
}

export function useLiveFlightSearch(params: UseLiveFlightSearchParams): UseLiveFlightSearchReturn {
  const [status, setStatus] = useState<UseLiveFlightSearchReturn["status"]>("idle");
  const [step, setStep] = useState<LiveFlightStep>("outbound");
  const [outboundItineraries, setOutboundItineraries] = useState<LiveFlightItinerary[]>([]);
  const [returnItineraries, setReturnItineraries] = useState<LiveFlightItinerary[]>([]);
  const [selectedOutbound, setSelectedOutbound] = useState<LiveFlightItinerary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resultCurrency, setResultCurrency] = useState(params.currency);

  const requestSeq = useRef(0);

  const runSearch = useCallback(
    async (departureToken: string | undefined) => {
      if (params.enabled === false) {
        setStatus("idle");
        return;
      }
      if (!params.origin || !params.destination || !params.departureDate) {
        setStatus("idle");
        return;
      }

      const seq = ++requestSeq.current;
      setStatus("loading");
      setErrorMessage(null);

      const result = await searchLiveFlights({
        origin: params.origin,
        destination: params.destination,
        departureDate: params.departureDate,
        returnDate: params.returnDate,
        tripType: params.tripType,
        adults: params.adults,
        children: params.children,
        infants: params.infants,
        cabinClass: params.cabinClass,
        currency: params.currency,
        departureToken,
      });

      // A newer request superseded this one (params changed mid-flight) — drop this response.
      if (seq !== requestSeq.current) return;

      setResultCurrency(result.currency || params.currency);
      setStatus(result.status);
      if (result.status === "unavailable") {
        setErrorMessage(result.errorMessage || "Live flight search is temporarily unavailable.");
      }

      if (departureToken) {
        setReturnItineraries(result.status === "ok" ? result.itineraries : []);
      } else {
        setOutboundItineraries(result.status === "ok" ? result.itineraries : []);
      }
    },
    [
      params.enabled, params.origin, params.destination, params.departureDate, params.returnDate,
      params.tripType, params.adults, params.children, params.infants, params.cabinClass, params.currency,
    ],
  );

  // A new search (route/date/passenger/cabin/currency change) always restarts at step 1.
  useEffect(() => {
    setStep("outbound");
    setSelectedOutbound(null);
    setReturnItineraries([]);
    void runSearch(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    params.origin, params.destination, params.departureDate, params.returnDate,
    params.tripType, params.adults, params.children, params.infants, params.cabinClass,
    params.currency, params.enabled,
  ]);

  const selectOutbound = useCallback(
    (itinerary: LiveFlightItinerary) => {
      if (params.tripType !== "round_trip" || !itinerary.departureToken) return;
      setSelectedOutbound(itinerary);
      setStep("return");
      void runSearch(itinerary.departureToken);
    },
    [params.tripType, runSearch],
  );

  const backToOutbound = useCallback(() => {
    setStep("outbound");
  }, []);

  const retry = useCallback(() => {
    if (step === "return" && selectedOutbound?.departureToken) {
      void runSearch(selectedOutbound.departureToken);
    } else {
      void runSearch(undefined);
    }
  }, [step, selectedOutbound, runSearch]);

  return {
    status,
    step,
    itineraries: step === "return" ? returnItineraries : outboundItineraries,
    selectedOutbound,
    errorMessage,
    currency: resultCurrency,
    retry,
    selectOutbound,
    backToOutbound,
  };
}
